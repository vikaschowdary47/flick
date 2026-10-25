import ActivityKit
import SwiftUI
import WidgetKit

// Must match FlickActivityAttributes in modules/flick-widgets (same name and
// fields): the app starts the activity, the widget extension draws it.
struct FlickActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var count: Int
    var deviceName: String
  }
}

func newFilesText(_ state: FlickActivityAttributes.ContentState) -> String {
  let files = state.count == 1 ? "1 new file" : "\(state.count) new files"
  return state.deviceName.isEmpty ? files : "\(files) from \(state.deviceName)"
}

// Lock Screen / banner presentation.
struct FlickActivityBanner: View {
  let state: FlickActivityAttributes.ContentState

  var body: some View {
    HStack(spacing: 12) {
      Text("↗")
        .font(.system(size: 20, weight: .heavy, design: .rounded))
        .frame(width: 40, height: 40)
        .background(RoundedRectangle(cornerRadius: 13).fill(FlickColor.coral))
        .overlay(RoundedRectangle(cornerRadius: 13).stroke(FlickColor.navy, lineWidth: 1.5))
        .foregroundStyle(FlickColor.navy)
      VStack(alignment: .leading, spacing: 2) {
        Text(newFilesText(state))
          .font(.system(size: 15, weight: .heavy, design: .rounded))
          .lineLimit(1)
        Text("Tap to open eqlDrop")
          .font(.system(size: 12, weight: .semibold, design: .rounded))
          .foregroundStyle(.secondary)
      }
      Spacer(minLength: 0)
    }
    .padding(14)
  }
}

struct FlickCountBadge: View {
  let count: Int
  var body: some View {
    Text("\(count)")
      .font(.system(size: 13, weight: .heavy, design: .rounded))
      .foregroundStyle(FlickColor.navy)
      .frame(minWidth: 20, minHeight: 20)
      .background(Circle().fill(FlickColor.mint))
  }
}

struct FlickLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: FlickActivityAttributes.self) { context in
      FlickActivityBanner(state: context.state)
        .activityBackgroundTint(FlickColor.cream)
        .activitySystemActionForegroundColor(FlickColor.navy)
        .foregroundStyle(FlickColor.navy)
        .widgetURL(URL(string: "flick://open"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text("↗")
            .font(.system(size: 18, weight: .heavy, design: .rounded))
            .frame(width: 34, height: 34)
            .background(RoundedRectangle(cornerRadius: 11).fill(FlickColor.coral))
            .foregroundStyle(FlickColor.navy)
        }
        DynamicIslandExpandedRegion(.trailing) {
          FlickCountBadge(count: context.state.count)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(newFilesText(context.state))
            .font(.system(size: 14, weight: .heavy, design: .rounded))
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text("Tap to open eqlDrop")
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
        }
      } compactLeading: {
        Text("↗").font(.system(size: 14, weight: .heavy, design: .rounded)).foregroundStyle(FlickColor.coral)
      } compactTrailing: {
        FlickCountBadge(count: context.state.count)
      } minimal: {
        FlickCountBadge(count: context.state.count)
      }
      .widgetURL(URL(string: "flick://open"))
    }
  }
}
