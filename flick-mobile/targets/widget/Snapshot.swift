import Foundation
import SwiftUI

// The snapshot the app writes (src/lib/widgetSnapshot.ts, version 1).
struct SnapshotItem: Codable, Identifiable, Hashable {
  let id: String
  let kind: String // "file" | "clip"
  let type: String // image | document | archive | other | link | text
  let title: String
  let subtitle: String
  let sender: String
  let createdAt: String
  let expiresAt: String
  let pinned: Bool
  let thumb: String?
  let url: String
}

struct LatestClip: Codable, Hashable {
  let id: String
  let content: String
}

struct WidgetSnapshot: Codable {
  let version: Int
  let updatedAt: String
  let items: [SnapshotItem]
  let fileCount: Int
  let clipCount: Int
  let latestClip: LatestClip?
  let showContentOnLockScreen: Bool
  // Switched off in eqlDrop's Settings (missing in older snapshots = on).
  var homeEnabled: Bool? = nil
  var lockEnabled: Bool? = nil

  var homeOn: Bool { homeEnabled ?? true }
  var lockOn: Bool { lockEnabled ?? true }

  static let empty = WidgetSnapshot(
    version: 1, updatedAt: "", items: [], fileCount: 0, clipCount: 0,
    latestClip: nil, showContentOnLockScreen: false)
}

enum SharedStore {
  static let appGroup = "group.dev.flickit.app"

  // Lets a screenshot harness point at a folder of sample data.
  static var containerOverride: URL?

  static var container: URL? {
    containerOverride ?? FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
  }

  static func load() -> WidgetSnapshot {
    guard let url = container?.appendingPathComponent("snapshot.json"),
      let data = try? Data(contentsOf: url),
      let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    else { return .empty }
    return snapshot
  }

  // Only items that haven't expired at `date` (the app may not have run).
  static func live(_ items: [SnapshotItem], at date: Date) -> [SnapshotItem] {
    items.filter { (iso($0.expiresAt) ?? .distantFuture) > date }
  }

  static func thumbnail(_ name: String?) -> UIImage? {
    guard let name, let url = container?.appendingPathComponent("thumbs/\(name)") else { return nil }
    return UIImage(contentsOfFile: url.path)
  }

  static func iso(_ string: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.date(from: string) ?? ISO8601DateFormatter().date(from: string)
  }
}

// Flick's playful palette (design/tokens), light and dark.
enum FlickColor {
  static let cream = Color(red: 1.0, green: 0.973, blue: 0.933)
  static let navy = Color(red: 0.106, green: 0.129, blue: 0.251)
  static let coral = Color(red: 0.965, green: 0.451, blue: 0.506)
  static let yellow = Color(red: 1.0, green: 0.839, blue: 0.42)
  static let mint = Color(red: 0.557, green: 0.89, blue: 0.784)
  static let lilac = Color(red: 0.788, green: 0.722, blue: 0.996)
  static let darkBackground = Color(red: 0.063, green: 0.078, blue: 0.165)

  static func tile(for type: String) -> Color {
    switch type {
    case "image": return yellow
    case "document", "text": return lilac
    case "archive", "link", "other": return mint
    default: return cream
    }
  }

  static func label(for item: SnapshotItem) -> String {
    switch item.type {
    case "link": return "URL"
    case "text": return "TXT"
    default:
      let ext = (item.title as NSString).pathExtension.uppercased()
      return ext.isEmpty ? "FILE" : String(ext.prefix(4))
    }
  }
}

func timeLeft(_ item: SnapshotItem, now: Date) -> String {
  if item.pinned { return "Pinned" } // pinned files don't expire
  guard let expires = SharedStore.iso(item.expiresAt) else { return "" }
  let minutes = Int(ceil(expires.timeIntervalSince(now) / 60))
  if minutes <= 0 { return "Expiring…" }
  return minutes < 60 ? "\(minutes)m left" : "\(minutes / 60)h left"
}
