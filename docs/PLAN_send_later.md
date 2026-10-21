# Plan F4 — "Click now, share later"

**Size: M** · Plan only, nothing built.

## Goal
Grab something now (a photo, file, text, link) and decide later where it goes, without it disappearing after 24 hours before you've used it. Think of it as a short-term shelf.

## User flow
1. Anywhere you can flick (app button, share sheet, desktop tray), choose **Save for later** instead of sending.
2. It lands in a **Later** section (both apps), marked "Not sent yet", and isn't pushed to your other devices' download folders.
3. From Later, one tap: **Send to my devices** (becomes a normal flick and starts the normal 24-hour life), **Share link** (F1), or **Email** (F3).
4. Later items keep longer: 7 days by default, with a reminder notification on day 6 ("3 things waiting in Later").

## Data model
- `files` gets `state` (`sent` | `later`, default `sent`) and `later_until` (timestamptz, nullable).
- Realtime and desktop download logic ignore `state = 'later'`, so nothing downloads until it's sent.
- The expiry job deletes `sent` files after 24 hours (unchanged) and `later` files after `later_until`.
- Sending sets `state = 'sent'` and resets `created_at` to now, so the 24 hours start at sending. That needs a small exception in the trigger that currently locks `created_at` (a SECURITY DEFINER function `send_later_item(id)` would do it safely).
- Storage limit: Later items count, same as now.

## Cost / risk
- **Changes expiry and delivery rules**, which are sensitive. Needs careful tests: nothing in Later must ever be deleted early or downloaded by other devices.
- Longer retention costs more storage. Fine for the free plan's 500 MB; a natural Pro perk is "Later for 30 days".
- Reminders need push notifications (not built yet).

## Size
M: two columns, one function, a migration to the expiry function, a Later section and actions in both apps. Reminders add S–M once push exists.

## Open questions
1. How long should Later keep things on free (7 days?) and on Pro?
2. Should clips be savable for later too?
3. Is "Later" visible on all devices (so you can send from the Mac something you saved on the phone)? (Recommendation: yes, visible everywhere, downloaded nowhere.)
