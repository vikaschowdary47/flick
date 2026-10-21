import ActivityKit
import ExpoModulesCore
import WidgetKit

// Must match FlickActivityAttributes in targets/widget/LiveActivity.swift.
struct FlickActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var count: Int
    var deviceName: String
  }
}

// Bridge between the React Native app and the Flick widgets.
// The app writes a small JSON snapshot (latest files and clips) and
// thumbnail copies into the shared App Group container; the widget
// extension reads them. Nothing here talks to the network.
public class FlickWidgetsModule: Module {
  static let appGroup = "group.dev.flickit.app"

  static var container: URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
  }

  static var thumbsDirectory: URL? {
    container?.appendingPathComponent("thumbs", isDirectory: true)
  }

  public func definition() -> ModuleDefinition {
    Name("FlickWidgets")

    // False if the App Group entitlement is missing (e.g. unsigned builds).
    Function("isAvailable") { () -> Bool in
      Self.container != nil
    }

    // Replace the snapshot the widgets read (written atomically).
    AsyncFunction("writeSnapshot") { (json: String) in
      guard let url = Self.container?.appendingPathComponent("snapshot.json") else {
        throw Exception(name: "NoAppGroup", description: "App Group container unavailable")
      }
      try Data(json.utf8).write(to: url, options: .atomic)
    }

    // Copy a downloaded thumbnail into the container as thumbs/<fileId>.jpg.
    // Returns the file name the snapshot should reference.
    AsyncFunction("saveThumbnail") { (fileId: String, sourceUri: String) -> String in
      guard let directory = Self.thumbsDirectory, let source = URL(string: sourceUri) else {
        throw Exception(name: "NoAppGroup", description: "App Group container unavailable")
      }
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      let name = "\(fileId).jpg"
      let target = directory.appendingPathComponent(name)
      if FileManager.default.fileExists(atPath: target.path) {
        return name
      }
      try FileManager.default.copyItem(at: source, to: target)
      return name
    }

    // Delete thumbnails the snapshot no longer uses (files gone or expired).
    AsyncFunction("pruneThumbnails") { (keep: [String]) in
      guard let directory = Self.thumbsDirectory,
        let names = try? FileManager.default.contentsOfDirectory(atPath: directory.path)
      else { return }
      let keepSet = Set(keep)
      for name in names where !keepSet.contains(name) {
        try? FileManager.default.removeItem(at: directory.appendingPathComponent(name))
      }
    }

    // Ask iOS to redraw the widgets now (cheap; iOS may coalesce).
    Function("reloadWidgets") {
      WidgetCenter.shared.reloadAllTimelines()
    }

    // Live Activity "N new files from <device>". Must be called while the
    // app is in the foreground (or just leaving it); iOS refuses otherwise.
    // Stale after 4 hours; iOS ends activities after 8 hours at most.
    AsyncFunction("startLiveActivity") { (count: Int, deviceName: String) in
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
      let state = FlickActivityAttributes.ContentState(count: count, deviceName: deviceName)
      let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(4 * 3600))
      if let running = Activity<FlickActivityAttributes>.activities.first {
        await running.update(content)
      } else {
        _ = try Activity.request(attributes: FlickActivityAttributes(), content: content)
      }
    }

    // The files have been seen: remove it right away.
    AsyncFunction("endLiveActivity") {
      for activity in Activity<FlickActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }

    // The share extension ("Flick it") uploads with the app's session: the
    // app keeps a copy here (tokens, project URL, publishable key, device id).
    // The extension may refresh it and write it back; the app adopts that.
    AsyncFunction("writeSession") { (json: String) in
      guard let url = Self.container?.appendingPathComponent("session.json") else {
        throw Exception(name: "NoAppGroup", description: "App Group container unavailable")
      }
      try Data(json.utf8).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }

    AsyncFunction("readSession") { () -> String? in
      guard let url = Self.container?.appendingPathComponent("session.json"),
        let data = try? Data(contentsOf: url)
      else { return nil }
      return String(data: data, encoding: .utf8)
    }

    // Wipe everything on sign-out so widgets don't show the last account.
    AsyncFunction("clear") {
      guard let container = Self.container else { return }
      try? FileManager.default.removeItem(at: container.appendingPathComponent("snapshot.json"))
      try? FileManager.default.removeItem(at: container.appendingPathComponent("session.json"))
      if let thumbs = Self.thumbsDirectory {
        try? FileManager.default.removeItem(at: thumbs)
      }
      for activity in Activity<FlickActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
