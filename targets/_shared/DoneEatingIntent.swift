import AppIntents
import ActivityKit
import Foundation

/// Shared with the app and widget so Live Activity buttons can open Hatchly.
@available(iOS 17.0, *)
struct DoneEatingIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "I'm done eating today"
  static var description = IntentDescription("Start the next fast after your eating window.")
  static var openAppWhenRun: Bool = true

  func perform() async throws -> some IntentResult {
    guard
      let url = FileManager.default
        .containerURL(forSecurityApplicationGroupIdentifier: FastingLiveConstants.appGroupId)?
        .appendingPathComponent(FastingLiveConstants.pendingDoneEatingFileName)
    else { return .result() }
    try? "1".write(to: url, atomically: true, encoding: .utf8)
    return .result()
  }
}

@available(iOS 17.0, *)
struct CompleteTodoIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Complete todo"
  static var description = IntentDescription("Check off a Hatchly todo from the Lock Screen.")
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Goal ID")
  var goalId: String

  init() {
    self.goalId = ""
  }

  init(goalId: String) {
    self.goalId = goalId
  }

  func perform() async throws -> some IntentResult {
    guard !goalId.isEmpty else { return .result() }
    guard
      let url = FileManager.default
        .containerURL(forSecurityApplicationGroupIdentifier: FastingLiveConstants.appGroupId)?
        .appendingPathComponent(FastingLiveConstants.pendingCompleteTodosFileName)
    else { return .result() }
    let existing = (try? String(contentsOf: url, encoding: .utf8)) ?? ""
    let next = existing
      .split(whereSeparator: \.isNewline)
      .map(String.init)
      .filter { !$0.isEmpty && $0 != goalId } + [goalId]
    try? next.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8)
    await Self.removeTodoFromLiveActivity(goalId)
    return .result()
  }

  private static func removeTodoFromLiveActivity(_ goalId: String) async {
    guard #available(iOS 16.2, *) else { return }
    for activity in Activity<FastingAttributes>.activities {
      var state = activity.content.state
      state.todos.removeAll { $0.id == goalId }
      if state.todos.isEmpty && !state.showFasting {
        await activity.end(nil, dismissalPolicy: .immediate)
      } else {
        await activity.update(
          ActivityContent(state: state, staleDate: activity.content.staleDate)
        )
      }
    }
  }
}
