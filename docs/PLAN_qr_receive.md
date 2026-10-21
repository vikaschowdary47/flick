# Plan F2 — "Receive file" with a QR code, no sign-in

**Size: M** · Plan only, nothing built.

## Goal
Someone nearby (no Flick account, no phone number) sends *you* a file by scanning a QR code on your screen.

## User flow
1. On your phone or Mac: **Receive file** → a full-screen QR code, the short code underneath ("FLK-482-913"), and "Waiting… expires in 10:00".
2. The sender scans it with their camera. A web page opens (no app needed): "Send to Vikas" → pick a file (or paste text) → **Send**.
3. The file uploads into *your* Flick storage and appears on all your devices with "from a guest" plus an optional name the sender typed.
4. Your screen shows "Got it! design.pdf from Sam" with a chime. The code then stops working, or keeps accepting until the 10 minutes run out (your choice when you create it).

## Data model
- `receive_sessions`: `id`, `owner_id`, `code` (random, single-use by default), `expires_at` (10 min), `max_files` (default 1), `max_bytes` (50 MB), `used_count`, `created_at`.
- `files` gets `guest_label` (text, nullable) for "from Sam (guest)".
- Upload path: the web page calls an Edge Function `POST /r/<code>` that validates the session, then returns a **signed upload URL** scoped to `<owner_id>/guest/<uuid>-<name>`. The function inserts the `files` row after the upload. Guests never get a token for your account.
- Expiry job: also deletes expired `receive_sessions`.

## Cost / risk
- **Spam/abuse:** only someone who can see your screen can send, and the code expires fast and is single-use by default. Still rate-limit per code and IP, and enforce the owner's storage limit (the existing trigger).
- Malicious files arrive on your devices: show "from a guest" clearly; never auto-open; consider scanning (see F1).
- Needs the same small web page and domain as F1 (shared work).

## Size
M: one table, one Edge Function, a small upload page, a QR screen in both apps (mobile can use `react-native-qrcode-svg`; desktop an inline SVG QR).

## Open questions
1. Single file per code, or "keep receiving for 10 minutes"?
2. Should guests be able to send text and links too, as clips?
3. Show the sender's typed name, or keep it fully anonymous?
4. Should receiving count toward the owner's 500 MB like any upload? (Recommendation: yes.)
