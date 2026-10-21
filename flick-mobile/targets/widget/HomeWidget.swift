import SwiftUI
import WidgetKit

struct FlickEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot
}

struct FlickProvider: TimelineProvider {
  func placeholder(in context: Context) -> FlickEntry {
    FlickEntry(date: .now, snapshot: .empty)
  }

  func getSnapshot(in context: Context, completion: @escaping (FlickEntry) -> Void) {
    completion(FlickEntry(date: .now, snapshot: SharedStore.load()))
  }

  // The app reloads the timeline whenever its lists change. Between those,
  // add entries at each item's expiry so expired items drop off on time.
  func getTimeline(in context: Context, completion: @escaping (Timeline<FlickEntry>) -> Void) {
    let snapshot = SharedStore.load()
    let now = Date.now
    var dates = [now]
    for item in snapshot.items {
      if let expires = SharedStore.iso(item.expiresAt), expires > now { dates.append(expires) }
    }
    let entries = Set(dates).sorted().prefix(12).map { FlickEntry(date: $0, snapshot: snapshot) }
    completion(Timeline(entries: Array(entries), policy: .after(now.addingTimeInterval(30 * 60))))
  }
}

// Small sticker for a file/clip: thumbnail for images, else a colored tile.
struct ItemIcon: View {
  let item: SnapshotItem
  var size: CGFloat = 28

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: size * 0.32)
        .fill(FlickColor.tile(for: item.type))
      if let image = SharedStore.thumbnail(item.thumb) {
        Image(uiImage: image).resizable().scaledToFill()
          .frame(width: size, height: size)
          .clipShape(RoundedRectangle(cornerRadius: size * 0.32))
      } else {
        Text(FlickColor.label(for: item))
          .font(.system(size: size * 0.28, weight: .heavy, design: .rounded))
          .foregroundStyle(FlickColor.navy)
      }
      RoundedRectangle(cornerRadius: size * 0.32)
        .stroke(FlickColor.navy, lineWidth: 1.5)
    }
    .frame(width: size, height: size)
  }
}

struct ItemRow: View {
  let item: SnapshotItem
  let now: Date

  var body: some View {
    // Clip rows ask the app to copy on open (works even if the widget's
    // own Copy button can't reach the clipboard).
    Link(destination: URL(string: item.kind == "clip" ? item.url + "?copy=1" : item.url)!) {
      HStack(spacing: 8) {
        ItemIcon(item: item)
        VStack(alignment: .leading, spacing: 1) {
          Text(item.title)
            .font(.system(size: 13, weight: .heavy, design: .rounded))
            .lineLimit(1)
          Text([item.kind == "file" ? item.subtitle : nil, timeLeft(item, now: now)]
            .compactMap { $0 }.joined(separator: " · "))
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
        Spacer(minLength: 0)
      }
    }
  }
}

struct EmptyState: View {
  var body: some View {
    VStack(spacing: 6) {
      Text("↗").font(.system(size: 22, weight: .heavy, design: .rounded))
        .frame(width: 34, height: 34)
        .background(RoundedRectangle(cornerRadius: 11).fill(FlickColor.coral))
        .foregroundStyle(FlickColor.navy)
      Text("Nothing yet")
        .font(.system(size: 13, weight: .heavy, design: .rounded))
      Text("Flick something over")
        .font(.system(size: 11, weight: .semibold, design: .rounded))
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

struct FlickHomeView: View {
  @Environment(\.widgetFamily) var environmentFamily
  let entry: FlickEntry
  // Set by previews/screenshot tooling; the system sets the environment.
  var familyOverride: WidgetFamily?
  var family: WidgetFamily { familyOverride ?? environmentFamily }

  var body: some View {
    let items = SharedStore.live(entry.snapshot.items, at: entry.date)
    Group {
      if items.isEmpty {
        EmptyState()
      } else if family == .systemSmall {
        small(items)
      } else {
        medium(items)
      }
    }
    .foregroundStyle(FlickColor.navy)
  }

  // Latest item, big, plus a count. Tapping opens it.
  func small(_ items: [SnapshotItem]) -> some View {
    let latest = items[0]
    return VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text("flick").font(.system(size: 14, weight: .heavy, design: .rounded))
        Spacer()
        Text("\(items.count)")
          .font(.system(size: 11, weight: .heavy, design: .rounded))
          .padding(.horizontal, 7).padding(.vertical, 2)
          .background(Capsule().fill(FlickColor.mint))
          .overlay(Capsule().stroke(FlickColor.navy, lineWidth: 1))
      }
      Spacer(minLength: 0)
      ItemIcon(item: latest, size: 44)
      Text(latest.title)
        .font(.system(size: 13, weight: .heavy, design: .rounded))
        .lineLimit(2)
      HStack {
        Text(timeLeft(latest, now: entry.date))
          .font(.system(size: 11, weight: .semibold, design: .rounded))
          .foregroundStyle(.secondary)
        Spacer(minLength: 0)
        if latest.kind == "clip" {
          CopyClipButton(compact: true)
        }
      }
    }
    .widgetURL(URL(string: latest.kind == "clip" ? latest.url + "?copy=1" : latest.url))
  }

  // Up to 3 rows (a 4th with Copy latest clip comes with the iOS 17 button).
  func medium(_ items: [SnapshotItem]) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text("flick").font(.system(size: 14, weight: .heavy, design: .rounded))
        Spacer()
        if entry.snapshot.latestClip != nil {
          CopyClipButton()
        } else {
          Text("\(plural(entry.snapshot.fileCount, "file")) · \(plural(entry.snapshot.clipCount, "clip"))")
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
        }
      }
      ForEach(items.prefix(3)) { item in
        ItemRow(item: item, now: entry.date)
      }
      Spacer(minLength: 0)
    }
  }
}

func plural(_ count: Int, _ word: String) -> String {
  "\(count) \(word)\(count == 1 ? "" : "s")"
}

struct FlickHomeWidget: Widget {
  let kind = "FlickHome"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FlickProvider()) { entry in
      FlickHomeView(entry: entry)
        .containerBackground(for: .widget) { FlickColor.cream }
    }
    .configurationDisplayName("Flick")
    .description("Your latest files and clips.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
