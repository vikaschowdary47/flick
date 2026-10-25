# Plan F1 — Sharing with friends and groups by link

**Size: L** · Plan only, nothing built.

## Goal
Send a file (or clip) to someone who isn't you: a friend, a client, a small group. Today everything in Flick goes to *your own* devices only.

## User flow
1. On any file or clip: menu → **Share link**.
2. Pick: *Anyone with the link* (default) or *Only people I choose* (by email), and an expiry (1 hour, 24 hours — never longer than the file's own 24-hour life).
3. eqlShare copies a link like `eqlshare.com/f/8kq2xz`. Share it anywhere.
4. The recipient opens it in a browser: a sticker-style page with the file name, size, sender's display name, "Expires in 5h", a **Download** button, and "Sent with Flick — get the app" at the bottom.
5. Groups (phase 2): a saved list of people ("Design team"); sharing to a group emails or notifies each member, and members with Flick get it in their list with "from Alex".
6. The sender sees, per link: opened N times, downloaded N times, and a **Revoke** button.

## Data model
- `share_links`: `id`, `owner_id`, `file_id` or `clip_id`, `slug` (random, unguessable, ~10 chars), `mode` (`anyone` | `invitees`), `expires_at`, `revoked_at`, `max_downloads` (optional), `created_at`.
- `share_link_invitees`: `link_id`, `email`, `user_id` (once they sign in), `accepted_at`.
- `share_link_events`: `link_id`, `kind` (`open` | `download`), `at`, coarse country (no IP stored).
- Phase 2: `groups`, `group_members`.
- RLS: owners manage their own links; nobody reads links directly. Public access only through an Edge Function `GET /s/<slug>` that checks expiry, revocation and invitees, then returns a short-lived signed URL for the object.
- Expiry stays 24 hours: a link can't outlive its file. The expiry job also deletes the file's links.

## Cost / risk
- **Abuse risk is the big one:** public links make Flick a file host. Need: rate limits per link and owner, a size cap (the existing 50 MB), malware scanning before public download (paid service, e.g. VirusTotal or ClamAV in a container), a report-abuse link, and the ability to disable an account's links.
- Bandwidth: public downloads count against Supabase egress. Cap downloads per link (e.g. 50) on the free plan.
- A small web page (static HTML + Edge Function) on a domain you own.
- Privacy: the page shows the sender's display name, not email.

## Size
L: Edge Function, web page, two or three tables, link UI in both apps, revoke and stats, abuse controls. Groups add another M.

## Open questions
1. Which path on eqlshare.com should links use (`eqlshare.com/f/`)?
2. Can recipients without Flick download, or must they sign up? (Recommendation: no sign-up for "anyone" links.)
3. Is malware scanning required before launch, or only for "anyone" links above a size?
4. Do shared files count against the *sender's* storage limit only? (Recommendation: yes.)
5. Should invitees who have Flick get the file in their app, or only by link?
