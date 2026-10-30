# Guest sharing: backend contract

Built in `supabase/migrations/20261103120000_guest_drops.sql`, `supabase/functions/drop-resolve`, and a guest pass in `supabase/functions/expire-files`. Ships **off**: set `feature_flags.guest_share` to `true` to turn it on. Site, mobile and desktop all use the same calls.

## Settings (table `share_settings`, one row, edit in the dashboard)
Guest link minutes (60), signed-in minutes (1440), max files per drop (guest 5, signed-in 20), guest max total MB (50), guest drops per hour (10), code tries per minute (20), downloads per minute per drop (60). Hard ceilings are enforced by CHECK constraints, so a typo cannot create a long-lived public link. Clients read this table (anon can read) to show "1 hour" from the source of truth.

## Client flow
1. `supabase.auth.signInAnonymously()` (guest). Turn on CAPTCHA for anonymous sign-ins in Supabase Auth settings before launch.
2. Upload to `flick-files/<uid>/<uuid>-<name>` and insert the `files` row, exactly like a signed-in upload.
3. Make a random token (at least 22 chars), SHA-256 it, then `rpc('create_drop', { p_file_ids, p_token_hash })` → `{ drop_id, code, expires_at }`. Link: `eqlshare.com/d/<token>`; code: the 6 characters.
4. Receiver: `GET /functions/v1/drop-resolve?token=…` or `?code=…` → files and expiry. Add `&download=1&file=<id>` for a 60-second signed URL.
5. Sign-in: link the identity to the guest (same user id), refresh the session, then `rpc('extend_my_drops')`. Live links go to 24 hours; expired or revoked ones stay dead.

Error messages from `create_drop`: `guest_share_disabled`, `drop_no_files`, `drop_too_many_files`, `drop_too_big`, `drop_rate_limit`, `drop_files_not_found`.

## Download tracking
`drops.open_count` and `drops.download_count` (owner can read them; optional `max_downloads` caps a link). A download is counted when the signed URL is issued ("download started"), so it can overcount a cancelled download. No IP or identity is stored.

## Cleanup
`expire-files` (hourly) also deletes files of guests whose drop has expired or been revoked, and guest uploads never shared. The link itself stops working at `expires_at` immediately; the file can linger up to an hour. Old anonymous users are not purged yet.

## Tests
`supabase/tests/guest_drops.sql` (run on a disposable DB as postgres). Not yet run against a real Supabase project; run locally against a stub of `auth`.
