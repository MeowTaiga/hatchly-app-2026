import ExpoModulesCore
import Foundation
import ActivityKit
import UIKit

public class FastingLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FastingLiveActivity")

    Function("areActivitiesEnabled") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("start") { (startedAtMs: Double, endsAtMs: Double, goalHours: Double, petName: String, petImageUri: String?, showFasting: Bool, todosJson: String) async -> Bool in
      guard #available(iOS 16.2, *) else { return false }

      let hasPetImage = await Self.prepareImage(from: petImageUri, fileName: FastingLiveConstants.petImageFileName, maxDimension: 180)
      let startedAt = Date(timeIntervalSince1970: startedAtMs / 1000)
      let endsAt = Date(timeIntervalSince1970: endsAtMs / 1000)
      let todos = await Self.prepareTodos(todosJson)
      let state = FastingAttributes.ContentState(
        startedAt: startedAt,
        endsAt: endsAt,
        goalHours: Int(goalHours),
        petName: petName,
        hasPetImage: hasPetImage,
        showFasting: showFasting,
        todos: todos
      )
      let staleDate = showFasting
        ? endsAt.addingTimeInterval(18 * 60 * 60)
        : Date().addingTimeInterval(12 * 60 * 60)
      let content = ActivityContent(state: state, staleDate: staleDate)

      return await MainActor.run {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }

        if let existing = Activity<FastingAttributes>.activities.first {
          Task { await existing.update(content) }
          return true
        }

        do {
          _ = try Activity.request(
            attributes: FastingAttributes(),
            content: content,
            pushType: nil
          )
          return true
        } catch {
          print("[FastingLive] Activity.request failed: \(error)")
          return false
        }
      }
    }

    AsyncFunction("end") { () async in
      guard #available(iOS 16.2, *) else { return }
      let activities = await MainActor.run { Activity<FastingAttributes>.activities }
      for activity in activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }

  private struct IncomingTodo: Codable {
    var id: String
    var title: String
    var emoji: String?
    var letter: String?
    var iconUrl: String?
  }

  private static func prepareTodos(_ json: String) async -> [FastingTodoItem] {
    guard let data = json.data(using: .utf8),
          let incoming = try? JSONDecoder().decode([IncomingTodo].self, from: data)
    else { return [] }

    var todos: [FastingTodoItem] = []
    for (index, todo) in incoming.prefix(FastingLiveConstants.maxTodos).enumerated() {
      let hasIcon = await prepareImage(
        from: todo.iconUrl,
        fileName: FastingLiveConstants.todoIconFileName(index),
        maxDimension: 80
      )
      let letter = (todo.letter?.isEmpty == false ? todo.letter! : String(todo.title.prefix(1))).uppercased()
      todos.append(
        FastingTodoItem(
          id: todo.id,
          title: todo.title,
          emoji: todo.emoji ?? "",
          letter: letter,
          hasIcon: hasIcon,
          iconIndex: index
        )
      )
    }
    return todos
  }

  /// Load a local or remote image, shrink it, and write PNG into the App Group
  /// so WidgetKit can display it. Live Activities drop large source PNGs.
  private static func prepareImage(from uri: String?, fileName: String, maxDimension: CGFloat) async -> Bool {
    guard let uri, !uri.isEmpty else { return false }
    guard
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: FastingLiveConstants.appGroupId
      )
    else { return false }

    var image: UIImage?
    if let fileURL = fileURL(from: uri), FileManager.default.fileExists(atPath: fileURL.path) {
      image = UIImage(contentsOfFile: fileURL.path)
    }
    if image == nil, let remote = URL(string: uri), ["http", "https"].contains(remote.scheme) {
      if let (data, _) = try? await URLSession.shared.data(from: remote) {
        image = UIImage(data: data)
      }
    }
    guard let image, let png = resizedPNG(image, maxDimension: maxDimension) else { return false }

    let dest = container.appendingPathComponent(fileName)
    do {
      if FileManager.default.fileExists(atPath: dest.path) {
        try FileManager.default.removeItem(at: dest)
      }
      try png.write(to: dest)
      return true
    } catch {
      print("[FastingLive] pet image write failed: \(error)")
      return false
    }
  }

  private static func fileURL(from uri: String) -> URL? {
    if uri.hasPrefix("file:") {
      return URL(string: uri) ?? URL(fileURLWithPath: String(uri.dropFirst("file://".count)))
    }
    if uri.hasPrefix("/") {
      return URL(fileURLWithPath: uri)
    }
    return nil
  }

  private static func resizedPNG(_ image: UIImage, maxDimension: CGFloat) -> Data? {
    let size = image.size
    guard size.width > 0, size.height > 0 else { return nil }
    let scale = min(1, maxDimension / max(size.width, size.height))
    let newSize = CGSize(
      width: max(1, (size.width * scale).rounded()),
      height: max(1, (size.height * scale).rounded())
    )
    let format = UIGraphicsImageRendererFormat.default()
    format.opaque = false
    format.scale = 1
    let renderer = UIGraphicsImageRenderer(size: newSize, format: format)
    let rendered = renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: newSize))
    }
    return rendered.pngData()
  }
}
