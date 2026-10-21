import Foundation

// Uploads to Flick with the app's session (read from the App Group), using
// the same Supabase calls as the app: storage object, then the files row
// (which is what makes it appear on the other devices). Text and links
// become clips. Server-side rules (RLS, 50 MB, storage limit) still apply.

struct SharedSession: Codable {
  var version: Int
  var by: String
  var updatedAt: Double
  var accessToken: String
  var refreshToken: String
  var expiresAt: Double
  var userId: String
  var supabaseUrl: String
  var publishableKey: String
  var deviceId: String?
}

enum FlickShareError: LocalizedError {
  case notSignedIn
  case tooLarge(Int)
  case storageFull
  case clipsOff
  case server(String)

  var errorDescription: String? {
    switch self {
    case .notSignedIn: return "Open Flick and sign in first."
    case .tooLarge(let bytes): return "That one's \(bytes / 1_048_576) MB. Flick handles files up to 50 MB."
    case .storageFull: return "Storage full. Open Flick to free up space."
    case .clipsOff: return "Clips are turned off. Turn on Clipboard sharing in Flick."
    case .server(let message): return message
    }
  }
}

final class FlickUploader {
  static let appGroup = "group.dev.flickit.app"
  static let bucket = "flick-files"
  static let maxBytes = 52_428_800

  private var session: SharedSession

  init() throws {
    guard let url = Self.sessionURL, let data = try? Data(contentsOf: url),
      let session = try? JSONDecoder().decode(SharedSession.self, from: data),
      !session.supabaseUrl.isEmpty
    else { throw FlickShareError.notSignedIn }
    self.session = session
  }

  static var sessionURL: URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
      .appendingPathComponent("session.json")
  }

  // Refresh the access token if it's about to expire, and hand the new
  // session back to the app (it adopts it next time it opens).
  private func freshToken() async throws -> String {
    if session.expiresAt - Date().timeIntervalSince1970 > 60 { return session.accessToken }
    var request = URLRequest(url: URL(string: "\(session.supabaseUrl)/auth/v1/token?grant_type=refresh_token")!)
    request.httpMethod = "POST"
    request.setValue(session.publishableKey, forHTTPHeaderField: "apikey")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": session.refreshToken])
    let (data, response) = try await URLSession.shared.data(for: request)
    guard (response as? HTTPURLResponse)?.statusCode == 200,
      let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      let access = json["access_token"] as? String, let refresh = json["refresh_token"] as? String
    else { throw FlickShareError.notSignedIn }
    session.accessToken = access
    session.refreshToken = refresh
    session.expiresAt = (json["expires_at"] as? Double) ?? Date().timeIntervalSince1970 + 3600
    session.by = "extension"
    session.updatedAt = Date().timeIntervalSince1970 * 1000
    if let url = Self.sessionURL, let encoded = try? JSONEncoder().encode(session) {
      try? encoded.write(to: url, options: .atomic)
    }
    return access
  }

  private func request(_ path: String, method: String, token: String, contentType: String, body: Data?) -> URLRequest {
    var request = URLRequest(url: URL(string: "\(session.supabaseUrl)\(path)")!)
    request.httpMethod = method
    request.setValue(session.publishableKey, forHTTPHeaderField: "apikey")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue(contentType, forHTTPHeaderField: "Content-Type")
    request.httpBody = body
    return request
  }

  private func check(_ data: Data, _ response: URLResponse) throws {
    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    guard (200..<300).contains(status) else {
      let text = String(data: data, encoding: .utf8) ?? ""
      if text.contains("storage_limit") { throw FlickShareError.storageFull }
      if status == 401 || status == 403 { throw FlickShareError.notSignedIn }
      throw FlickShareError.server("Couldn't flick that (\(status)).")
    }
  }

  static func safeName(_ name: String) -> String {
    let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: ".-_"))
    let cleaned = String(name.unicodeScalars.map { allowed.contains($0) ? Character($0) : "_" })
    return String(cleaned.suffix(120)).isEmpty ? "file" : String(cleaned.suffix(120))
  }

  func uploadFile(data: Data, name: String, mimeType: String) async throws {
    guard data.count <= Self.maxBytes else { throw FlickShareError.tooLarge(data.count) }
    let token = try await freshToken()
    let path = "\(session.userId)/\(UUID().uuidString.lowercased())-\(Self.safeName(name))"
    var upload = request("/storage/v1/object/\(Self.bucket)/\(path)", method: "POST", token: token, contentType: mimeType, body: data)
    upload.setValue("false", forHTTPHeaderField: "x-upsert")
    let (uploadData, uploadResponse) = try await URLSession.shared.data(for: upload)
    try check(uploadData, uploadResponse)

    var row: [String: Any] = [
      "user_id": session.userId, "name": name, "size": data.count,
      "mime_type": mimeType, "storage_path": path,
    ]
    if let deviceId = session.deviceId { row["device_id"] = deviceId }
    var insert = request("/rest/v1/files", method: "POST", token: token, contentType: "application/json",
      body: try JSONSerialization.data(withJSONObject: row))
    insert.setValue("return=minimal", forHTTPHeaderField: "Prefer")
    let (insertData, insertResponse) = try await URLSession.shared.data(for: insert)
    do {
      try check(insertData, insertResponse)
    } catch {
      // Same as the app: no row, so remove the object again.
      let cleanup = request("/storage/v1/object/\(Self.bucket)", method: "DELETE", token: token,
        contentType: "application/json", body: try? JSONSerialization.data(withJSONObject: ["prefixes": [path]]))
      _ = try? await URLSession.shared.data(for: cleanup)
      throw error
    }
  }

  func sendClip(_ text: String) async throws {
    let content = String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(10_000))
    guard !content.isEmpty else { return }
    let token = try await freshToken()
    let isLink = content.range(of: #"^https?://\S+$"#, options: .regularExpression) != nil
    var row: [String: Any] = ["user_id": session.userId, "kind": isLink ? "link" : "text", "content": content]
    if let deviceId = session.deviceId { row["device_id"] = deviceId }
    var insert = request("/rest/v1/clips", method: "POST", token: token, contentType: "application/json",
      body: try JSONSerialization.data(withJSONObject: row))
    insert.setValue("return=minimal", forHTTPHeaderField: "Prefer")
    let (data, response) = try await URLSession.shared.data(for: insert)
    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    // RLS refuses clips when the feature or the user's setting is off.
    if status == 401 || status == 403 { throw FlickShareError.clipsOff }
    try check(data, response)
  }
}
