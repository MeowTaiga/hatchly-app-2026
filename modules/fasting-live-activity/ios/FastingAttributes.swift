import Foundation
import ActivityKit

/// Keep in sync with `targets/_shared/FastingAttributes.swift`.
struct FastingAttributes: ActivityAttributes {
  static var activityIdentifier: String { "HatchlyFasting" }

  struct ContentState: Codable, Hashable {
    var startedAt: Date
    var endsAt: Date
    var goalHours: Int
    var petName: String
    var hasPetImage: Bool
    var showFasting: Bool
    var todos: [FastingTodoItem]
  }
}

struct FastingTodoItem: Codable, Hashable {
  var id: String
  var title: String
  var emoji: String
  var letter: String
  var hasIcon: Bool
  var iconIndex: Int
}

enum FastingLiveConstants {
  static let appGroupId = "group.com.hatchly.app"
  static let petImageFileName = "fasting-pet.png"
  static let pendingDoneEatingFileName = "pending-done-eating"
  static let pendingCompleteTodosFileName = "pending-complete-todos"
  static let doneEatingURL = "hatchly://fasting/done-eating"
  static let maxTodos = 1

  static func todoIconFileName(_ index: Int) -> String {
    "live-todo-\(index).png"
  }
}
