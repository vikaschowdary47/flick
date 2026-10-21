import SwiftUI
import UIKit
import UniformTypeIdentifiers

// "Flick it" from the iOS share sheet: a small sticker sheet that uploads
// what was shared (photos as JPEG, files as they are, text/links as clips)
// and closes itself when done.
final class ShareViewController: UIViewController {
  private let model = ShareModel()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .clear
    let host = UIHostingController(rootView: ShareSheetView(model: model, close: { [weak self] in self?.finish() }))
    host.view.backgroundColor = .clear
    addChild(host)
    host.view.frame = view.bounds
    host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(host.view)
    host.didMove(toParent: self)

    let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
    Task { await model.send(providers) }
  }

  private func finish() {
    extensionContext?.completeRequest(returningItems: nil)
  }
}

@MainActor
final class ShareModel: ObservableObject {
  enum Phase { case sending(done: Int, total: Int), finished, failed(String) }
  @Published var phase: Phase = .sending(done: 0, total: 0)

  func send(_ providers: [NSItemProvider]) async {
    let uploader: FlickUploader
    do {
      uploader = try FlickUploader()
    } catch {
      phase = .failed(error.localizedDescription)
      return
    }
    let total = providers.count
    phase = .sending(done: 0, total: total)
    do {
      for (index, provider) in providers.enumerated() {
        try await send(provider, with: uploader)
        phase = .sending(done: index + 1, total: total)
      }
      phase = .finished
    } catch {
      phase = .failed(error.localizedDescription)
    }
  }

  private func send(_ provider: NSItemProvider, with uploader: FlickUploader) async throws {
    // Photos: JPEG (HEIC converted), keeping the original name where possible.
    if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier),
      let loaded = try? await loadFile(provider, type: .image)
    {
      let (data, name) = loaded
      if let image = UIImage(data: data), !name.lowercased().hasSuffix(".png"), !name.lowercased().hasSuffix(".gif"),
        let jpeg = image.jpegData(compressionQuality: 0.9)
      {
        let base = (name as NSString).deletingPathExtension
        try await uploader.uploadFile(data: jpeg, name: "\(base.isEmpty ? "photo" : base).jpg", mimeType: "image/jpeg")
      } else {
        try await uploader.uploadFile(data: data, name: name, mimeType: mimeType(for: name))
      }
      return
    }
    // Any other file (PDF, video, zip…), but not a web link.
    if !provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) || provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier),
      provider.hasItemConformingToTypeIdentifier(UTType.data.identifier),
      let loaded = try? await loadFile(provider, type: .data)
    {
      let (data, name) = loaded
      try await uploader.uploadFile(data: data, name: name, mimeType: mimeType(for: name))
      return
    }
    // Links and text become clips.
    if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
      let url = try? await provider.loadItem(forTypeIdentifier: UTType.url.identifier) as? URL
    {
      try await uploader.sendClip(url.absoluteString)
      return
    }
    if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
      let text = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String
    {
      try await uploader.sendClip(text)
    }
  }

  private func loadFile(_ provider: NSItemProvider, type: UTType) async throws -> (Data, String) {
    try await withCheckedThrowingContinuation { continuation in
      provider.loadFileRepresentation(forTypeIdentifier: type.identifier) { url, error in
        guard let url, let data = try? Data(contentsOf: url) else {
          continuation.resume(throwing: error ?? FlickShareError.server("Couldn't read that file."))
          return
        }
        let name = provider.suggestedName.map { name in
          (name as NSString).pathExtension.isEmpty ? "\(name).\(url.pathExtension)" : name
        } ?? url.lastPathComponent
        continuation.resume(returning: (data, name))
      }
    }
  }

  private func mimeType(for name: String) -> String {
    UTType(filenameExtension: (name as NSString).pathExtension.lowercased())?.preferredMIMEType
      ?? "application/octet-stream"
  }
}

struct ShareSheetView: View {
  @ObservedObject var model: ShareModel
  let close: () -> Void

  private let cream = Color(red: 1.0, green: 0.973, blue: 0.933)
  private let navy = Color(red: 0.106, green: 0.129, blue: 0.251)
  private let coral = Color(red: 0.965, green: 0.451, blue: 0.506)
  private let mint = Color(red: 0.557, green: 0.89, blue: 0.784)

  var body: some View {
    VStack {
      Spacer()
      VStack(alignment: .leading, spacing: 12) {
        HStack(spacing: 10) {
          Text("↗")
            .font(.system(size: 18, weight: .heavy, design: .rounded))
            .frame(width: 34, height: 34)
            .background(RoundedRectangle(cornerRadius: 11).fill(coral))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(navy, lineWidth: 1.5))
          Text("Flick it").font(.system(size: 20, weight: .heavy, design: .rounded))
          Spacer()
        }
        content
      }
      .foregroundStyle(navy)
      .padding(18)
      .background(RoundedRectangle(cornerRadius: 24).fill(cream))
      .overlay(RoundedRectangle(cornerRadius: 24).stroke(navy, lineWidth: 2))
      .padding(16)
    }
    .background(Color.black.opacity(0.25).ignoresSafeArea())
  }

  @ViewBuilder
  private var content: some View {
    switch model.phase {
    case .sending(let done, let total):
      HStack(spacing: 10) {
        ProgressView().tint(navy)
        Text(total > 1 ? "Sending \(min(done + 1, total)) of \(total)…" : "Sending to your devices…")
          .font(.system(size: 15, weight: .semibold, design: .rounded))
      }
      Button("Cancel", action: close)
        .font(.system(size: 14, weight: .heavy, design: .rounded))
    case .finished:
      Text("Got it! On all your devices")
        .font(.system(size: 15, weight: .heavy, design: .rounded))
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(Capsule().fill(mint))
        .overlay(Capsule().stroke(navy, lineWidth: 1.5))
        .task {
          try? await Task.sleep(nanoseconds: 1_200_000_000)
          close()
        }
    case .failed(let message):
      Text(message).font(.system(size: 15, weight: .semibold, design: .rounded))
      Button("Close", action: close)
        .font(.system(size: 14, weight: .heavy, design: .rounded))
    }
  }
}
