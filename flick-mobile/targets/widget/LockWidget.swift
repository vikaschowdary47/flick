import SwiftUI
import WidgetKit

// Lock Screen widgets: counts only by default, since anything shown here is
// visible without unlocking. Names/clip text appear only when the user turns
// on "Show content on Lock Screen" in Flick's Settings.
struct FlickLockView: View {
  @Environment(\.widgetFamily) var environmentFamily
  let entry: FlickEntry
  var familyOverride: WidgetFamily?
  var family: WidgetFamily { familyOverride ?? environmentFamily }

  var body: some View {
    let snapshot = entry.snapshot
    let items = SharedStore.live(snapshot.items, at: entry.date)
    let files = items.filter { $0.kind == "file" }.count
    let clips = items.filter { $0.kind == "clip" }.count
    let latest = items.first
    let showContent = snapshot.showContentOnLockScreen

    if !snapshot.lockOn {
      Text(family == .accessoryCircular ? "off" : "Flick · turned off in Flick")
        .font(.system(size: 12, weight: .semibold, design: .rounded))
    } else {
    switch family {
    case .accessoryInline:
      Text(items.isEmpty ? "Flick · nothing new" : "Flick · \(summary(files: files, clips: clips))")

    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 0) {
          Text("\(items.count)")
            .font(.system(size: 20, weight: .heavy, design: .rounded))
          Text("flick")
            .font(.system(size: 9, weight: .heavy, design: .rounded))
        }
      }

    default: // .accessoryRectangular
      VStack(alignment: .leading, spacing: 2) {
        Text("flick").font(.system(size: 13, weight: .heavy, design: .rounded))
        if let latest, showContent {
          Text(latest.title)
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .lineLimit(1)
          Text(timeLeft(latest, now: entry.date))
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
        } else {
          Text(items.isEmpty ? "Nothing new" : summary(files: files, clips: clips))
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .lineLimit(1)
          if !items.isEmpty {
            Text("Open Flick to see them")
              .font(.system(size: 11, weight: .semibold, design: .rounded))
              .foregroundStyle(.secondary)
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    }
  }

  func summary(files: Int, clips: Int) -> String {
    [files > 0 ? plural(files, "file") : nil, clips > 0 ? plural(clips, "clip") : nil]
      .compactMap { $0 }.joined(separator: " · ")
  }
}

struct FlickLockWidget: Widget {
  let kind = "FlickLock"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FlickProvider()) { entry in
      FlickLockView(entry: entry)
        .containerBackground(for: .widget) { Color.clear }
        .widgetURL(URL(string: "flick://open"))
    }
    .configurationDisplayName("Flick on the Lock Screen")
    .description("How many files and clips are waiting.")
    .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular])
  }
}
