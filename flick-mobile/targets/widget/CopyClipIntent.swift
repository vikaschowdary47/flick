import AppIntents
import SwiftUI
import UIKit
import WidgetKit

// "Copy latest clip" on the widget (iOS 17 interactive widgets). Copies the
// newest clip from the shared snapshot without opening Flick. If iOS ever
// refuses the clipboard to the widget, tapping the clip row still works:
// it opens Flick with ?copy=1 and the app copies it.
struct CopyLatestClipIntent: AppIntent {
  static var title: LocalizedStringResource = "Copy latest clip"
  static var description = IntentDescription("Copies your newest Flick clip to the clipboard.")

  func perform() async throws -> some IntentResult {
    if let clip = SharedStore.load().latestClip {
      UIPasteboard.general.string = clip.content
    }
    return .result()
  }
}

// Small sticker button used on the widgets.
struct CopyClipButton: View {
  var compact = false

  var body: some View {
    Button(intent: CopyLatestClipIntent()) {
      Label(compact ? "Copy" : "Copy latest clip", systemImage: "doc.on.doc")
        .font(.system(size: 11, weight: .heavy, design: .rounded))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Capsule().fill(FlickColor.yellow))
        .overlay(Capsule().stroke(FlickColor.navy, lineWidth: 1.2))
        .foregroundStyle(FlickColor.navy)
    }
    .buttonStyle(.plain)
  }
}
