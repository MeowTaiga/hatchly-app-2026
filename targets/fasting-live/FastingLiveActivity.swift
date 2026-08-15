import ActivityKit
import SwiftUI
import WidgetKit
import UIKit
import AppIntents

private let hatchlyPink = Color(red: 1, green: 0.42, blue: 0.616)

struct FastingLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: FastingAttributes.self) { context in
      Group {
        if context.state.showFasting {
          TimelineView(.periodic(from: .now, by: 15)) { timeline in
            FastingLockScreenView(
              state: context.state,
              done: timeline.date >= context.state.endsAt
            )
          }
        } else {
          FastingLockScreenView(state: context.state, done: false)
        }
      }
      .activityBackgroundTint(Color(red: 0.10, green: 0.07, blue: 0.09))
      .activitySystemActionForegroundColor(hatchlyPink)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          PetAvatar(size: 48)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if context.state.showFasting {
            FastingIslandTimer(state: context.state)
          } else {
            Text(context.state.todos.isEmpty ? "Done" : "\(context.state.todos.count) left")
              .font(.headline.weight(.bold))
              .foregroundStyle(hatchlyPink)
          }
        }
        DynamicIslandExpandedRegion(.center) {
          IslandCenterInfo(state: context.state)
        }
        DynamicIslandExpandedRegion(.bottom) {
          IslandExpandedBottom(state: context.state)
        }
      } compactLeading: {
        PetAvatar(size: 24)
      } compactTrailing: {
        if context.state.showFasting {
          FastingCompactTimer(state: context.state)
        } else if let first = context.state.todos.first {
          TodoGlyph(todo: first, size: 18)
        } else {
          Image(systemName: "checkmark")
            .font(.caption.weight(.bold))
            .foregroundStyle(hatchlyPink)
        }
      } minimal: {
        PetAvatar(size: 20)
      }
      .keylineTint(hatchlyPink)
    }
  }
}

private struct FastingLockScreenView: View {
  let state: FastingAttributes.ContentState
  let done: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .center, spacing: 10) {
        if state.showFasting {
          VStack(alignment: .leading, spacing: 1) {
            if done {
              Text("Done")
                .font(.title2.weight(.heavy))
                .foregroundStyle(hatchlyPink)
              Text("\(state.goalHours)h fast")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            } else {
              FastingRemainingText(endsAt: state.endsAt)
                .font(.title2.weight(.heavy))
              Text("\(state.goalHours)h · \(state.endsAt, style: .time)")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            }
          }
        } else {
          VStack(alignment: .leading, spacing: 1) {
            Text("Hey, \(state.petName)")
              .font(.subheadline.weight(.bold))
            Text(state.todos.isEmpty ? "You're all done" : "\(state.todos.count) to check off")
              .font(.caption.weight(.semibold))
              .foregroundStyle(hatchlyPink)
          }
        }
        Spacer(minLength: 0)
        PetAvatar(size: 36)
      }

      if state.showFasting {
        if done {
          DoneEatingButton()
        } else {
          FastingProgressBar(startedAt: state.startedAt, endsAt: state.endsAt)
        }
      }

      if !state.todos.isEmpty {
        LiveTodoList(todos: state.todos, compact: true)
      }
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
  }
}

private struct IslandCenterInfo: View {
  let state: FastingAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      if state.showFasting {
        Text("\(state.goalHours)h with \(state.petName)")
          .font(.subheadline.weight(.semibold))
          .lineLimit(1)
      } else {
        Text(state.petName)
          .font(.subheadline.weight(.semibold))
          .lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

private struct IslandExpandedBottom: View {
  let state: FastingAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if state.showFasting {
        TimelineView(.periodic(from: .now, by: 15)) { timeline in
          let done = timeline.date >= state.endsAt
          if done {
            DoneEatingButton()
          } else {
            HStack {
              Text("Eat at \(state.endsAt, style: .time)")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
              Spacer()
            }
            FastingProgressBar(startedAt: state.startedAt, endsAt: state.endsAt)
          }
        }
      } else if !state.todos.isEmpty {
        Text("Tap a circle to check it off")
          .font(.caption.weight(.semibold))
          .foregroundStyle(hatchlyPink)
      }

      if !state.todos.isEmpty {
        LiveTodoList(todos: state.todos, compact: false)
      } else if !state.showFasting {
        Text("You're all done")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(.secondary)
      }
    }
  }
}

private struct DoneEatingButton: View {
  var body: some View {
    if #available(iOS 17.0, *) {
      Button(intent: DoneEatingIntent()) {
        Text("I'm done eating today")
          .font(.caption.weight(.bold))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 6)
          .background(hatchlyPink)
          .foregroundStyle(.white)
          .clipShape(Capsule())
      }
      .buttonStyle(.plain)
    } else {
      Text("I'm done eating today")
        .font(.caption.weight(.bold))
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(hatchlyPink)
        .foregroundStyle(.white)
        .clipShape(Capsule())
    }
  }
}

private struct FastingIslandTimer: View {
  let state: FastingAttributes.ContentState

  var body: some View {
    TimelineView(.periodic(from: .now, by: 15)) { timeline in
      if timeline.date >= state.endsAt {
        Image(systemName: "checkmark.circle.fill")
          .font(.title3)
          .foregroundStyle(hatchlyPink)
      } else {
        FastingRemainingText(endsAt: state.endsAt)
          .font(.title3.weight(.bold))
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 88, alignment: .trailing)
      }
    }
  }
}

private struct FastingCompactTimer: View {
  let state: FastingAttributes.ContentState

  var body: some View {
    TimelineView(.periodic(from: .now, by: 15)) { timeline in
      if timeline.date >= state.endsAt {
        Image(systemName: "checkmark")
          .font(.caption.weight(.bold))
          .foregroundStyle(hatchlyPink)
      } else {
        FastingRemainingText(endsAt: state.endsAt)
          .font(.caption.weight(.bold))
          .frame(maxWidth: 64)
          .multilineTextAlignment(.trailing)
      }
    }
  }
}

private struct FastingRemainingText: View {
  let endsAt: Date

  var body: some View {
    TimelineView(.periodic(from: .now, by: 15)) { timeline in
      Text(remainingLabel(now: timeline.date, endsAt: endsAt))
        .foregroundStyle(hatchlyPink)
        .minimumScaleFactor(0.6)
        .lineLimit(1)
    }
  }
}

private func remainingLabel(now: Date, endsAt: Date) -> String {
  let remaining = endsAt.timeIntervalSince(now)
  if remaining <= 0 { return "0 min" }
  if remaining >= 3600 {
    return "\(Int(remaining / 3600))hr"
  }
  let mins = max(1, Int(ceil(remaining / 60)))
  return "\(mins) min"
}

private struct LiveTodoList: View {
  let todos: [FastingTodoItem]
  var compact: Bool = false

  var body: some View {
    VStack(alignment: .leading, spacing: compact ? 4 : 6) {
      ForEach(todos, id: \.id) { todo in
        LiveTodoRow(todo: todo, compact: compact)
      }
    }
  }
}

private struct LiveTodoRow: View {
  let todo: FastingTodoItem
  var compact: Bool = false

  var body: some View {
    HStack(spacing: 8) {
      TodoGlyph(todo: todo, size: compact ? 22 : 26)
      Text(todo.title)
        .font(compact ? .caption.weight(.semibold) : .subheadline.weight(.semibold))
        .lineLimit(1)
      Spacer(minLength: 4)
      TodoCheckButton(goalId: todo.id)
    }
    .padding(.vertical, compact ? 3 : 5)
    .padding(.leading, 8)
    .padding(.trailing, 4)
    .background(Color.white.opacity(0.10))
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }
}

private struct TodoCheckButton: View {
  let goalId: String

  var body: some View {
    if #available(iOS 17.0, *) {
      Button(intent: CompleteTodoIntent(goalId: goalId)) {
        Image(systemName: "circle")
          .font(.system(size: 18, weight: .bold))
          .foregroundStyle(hatchlyPink)
          .frame(width: 34, height: 34)
          .background(hatchlyPink.opacity(0.22), in: Circle())
      }
      .buttonStyle(.plain)
    } else {
      Image(systemName: "circle")
        .font(.system(size: 17, weight: .semibold))
        .foregroundStyle(hatchlyPink)
        .frame(width: 32, height: 32)
    }
  }
}

private struct TodoGlyph: View {
  let todo: FastingTodoItem
  let size: CGFloat

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
        .fill(hatchlyPink.opacity(0.18))
      if todo.hasIcon, let image = LiveTodoIcon.load(todo.iconIndex) {
        Image(uiImage: image)
          .resizable()
          .scaledToFit()
          .padding(size * 0.1)
      } else if !todo.emoji.isEmpty {
        Text(todo.emoji)
          .font(.system(size: size * 0.58))
      } else {
        Text(todo.letter)
          .font(.system(size: size * 0.42, weight: .heavy))
          .foregroundStyle(hatchlyPink)
      }
    }
    .frame(width: size, height: size)
  }
}

private struct PetAvatar: View {
  let size: CGFloat

  var body: some View {
    ZStack {
      Circle().fill(hatchlyPink.opacity(0.22))
      if let image = FastingPetImage.load() {
        Image(uiImage: image)
          .resizable()
          .scaledToFit()
          .padding(size * 0.08)
      } else {
        Image(systemName: "pawprint.fill")
          .font(.system(size: size * 0.42))
          .foregroundStyle(hatchlyPink)
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
  }
}

private struct FastingProgressBar: View {
  let startedAt: Date
  let endsAt: Date

  var body: some View {
    TimelineView(.periodic(from: .now, by: 30)) { context in
      let total = max(1, endsAt.timeIntervalSince(startedAt))
      let elapsed = context.date.timeIntervalSince(startedAt)
      let progress = min(1, max(0, elapsed / total))
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          Capsule().fill(Color.white.opacity(0.18))
          Capsule()
            .fill(hatchlyPink)
            .frame(width: geo.size.width * progress)
        }
      }
      .frame(height: 4)
    }
  }
}

private enum FastingPetImage {
  static func load() -> UIImage? {
    loadGroupFile(FastingLiveConstants.petImageFileName)
  }
}

private enum LiveTodoIcon {
  static func load(_ index: Int) -> UIImage? {
    loadGroupFile(FastingLiveConstants.todoIconFileName(index))
  }
}

private func loadGroupFile(_ name: String) -> UIImage? {
  guard
    let url = FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: FastingLiveConstants.appGroupId)?
      .appendingPathComponent(name),
    let data = try? Data(contentsOf: url)
  else { return nil }
  return UIImage(data: data)
}
