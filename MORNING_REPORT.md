# Morning report

Work done overnight on the list you left (A → B → D → F plans). Updated after every commit.
Nothing was applied to the real Supabase project, deployed, pushed, or deleted.

## Status

| Item | Commit | Status | Note |
|---|---|---|---|
| A1 Open Flick grows the same popover | `017077b` | done | Same width/view, grows downward ~180ms, top pinned; Show less; pop-out icon |
| A3 Footer counts active tab | `1b1cae7` | done | Clips tab counts clips, Files tab counts files |
| A4 Compact clip chips, tab outline | `1b1cae7` | done | 40px chips; single-border selected tab |
| A5 Inline undo strip | `b692d14` | done | 28px strip in place, tile overlay, toast only for Comfy |
| A2 Smaller tiles + real thumbnails | `017077b` (tiles), `5f499a1` (thumbnails) | partial | 5 tiles/row (~64px) done. No thumbnail bug found: every image in the DB was uploaded *before* the thumbnail code existed (newest JPG 06:38 UTC, thumbnail commit 06:44 UTC). Desktop thumbnail generation verified in the real renderer (1600×1200 → 200×150 JPEG, 1.5 KB). A real upload + display needs your sign-in — see test list |
| A7 Settings panel in the popover | `9704b5e` | done | Replaces the list with ← Back; grows to fit (456px here, nothing clipped); usage bars (coral ≥80%); themed toggles; no density in popover |
| A6 Pinned file shows "Expiring…" | — | blocked (needs you) | Display is correct: the file is 3 days past expiry because the expiry job fails (see "Found while working" #1). Pinned files expire like others by design. No code change |
| B1 Widgets bridge + snapshot writer | `8d02bb3` | done | Swift module in modules/flick-widgets; platform-neutral buildSnapshot; no-op in Expo Go; clears on sign-out; iOS build verified |
| B2 Home Screen widget (small, medium) | `c5ac064` | done | targets/widget (FlickWidgetExtension); thumbnails, deep links; build verified; screenshots rendered from the real views (docs/screenshots/widget-*.png) |
| B3 Copy latest clip (iOS 17) | `ffca161` | partial | Button + App Intent built and rendered; whether iOS lets the widget write the clipboard can only be checked on a device with the widget placed — fallback (tap clip → app copies) is in place |
| B4 Lock Screen widgets | `0a03fb6` | done | Inline / circular / rectangular; counts only unless Show content on Lock Screen is on; build verified; docs/screenshots/lock-*.png |
| B5 Live Activity + Dynamic Island | `bdaf7b7` | partial | Built and rendered; starts when Flick goes to background with unseen files, ends on open, stale after 4h. Can't start while Flick is closed without push (out of scope). Real start/end needs your signed-in app on a device or Simulator |
| B6 widget_mode + Settings toggles | `65e4cbe` | done | Migration file (tested on local Postgres) + iOS toggles; Android toggles deferred with Android (your later instruction: don't start Android) |
| D1 Limits + 80% free-up-space prompt | `bcac866` | done | Server limits/config table existed (20261022 migration); added 80% banner + confirm listing oldest unpinned files, both apps; desktop screenshots |
| D2 Limit notice + waitlist opt-in | `11d0aa9` | done | Existed (waitlist table + limit screens); new wording in both apps; fixed the popover clipping the limit screen (found by screenshot) |

## Decisions I made on my own

- **Popover minimum height 140px** (was 200px): with a one-line empty state, 200px left ~70px of blank space.
- **Dev-only `FLICK_KEEP_POPOVER=1`** stops the popover hiding on blur in development, so automated screenshots work. Ignored in packaged builds.
- **A dev-only preview page** (`flick-desktop/src/renderer/dev-preview.html`) renders the real widget with sample data. Production builds only bundle `index.html`.
- **Settings panel sizes like the taller popover** (cap min(680px, 80% of screen)), since it's the same "grows downward" rule.
- **The tray right-click menu keeps its own "Show from menu bar as" and "Launch at login"** in addition to the new panel.
- **Widget screenshots are rendered from the real SwiftUI widget views** in a throwaway simulator app (not committed), because adding a widget to the Simulator's Home Screen needs manual taps. They use sample data, not your account.
- **The widget target is named `FlickWidgetExtension`**, not `FlickWidgets`: that name is taken by the app's bridge module and the two Swift modules clashed at build time.
- **"Free up space" removes after a confirm that lists the files**, oldest first, never pinned, down to 70% of the limit. One tap opens it, one tap removes; I didn't make it a single tap with no list, because it deletes files on every device.
- **Widget defaults:** Home, Lock Screen and Live Activity on; Lock Screen content off; Android widget on; bubble off.
- **Device rows are read with `select("*")`** so the app doesn't break before the `widget_mode` migration is applied.
- **Android (section C) not started**, per your later message ("Do not start … Android"). B6 includes the Android keys in `widget_mode` but no Android UI.
- **Comfy cards keep the floating undo toast;** only compact layouts (popover, panel, compact window) use the inline strip.

## Found while working — needs you

1. **File expiry is not running at all.** Every hourly call to `expire-files` returns `401 {"error":"Unauthorized"}`.
   The cron job reads the Vault secret `flick_expire_files_secret`, which doesn't exist. Vault has `flick_project_url`
   and a secret whose *name* is your publishable key (`sb_publishable_…`), so `vault.create_secret(value, name)`
   was probably called with the wrong value. That's why the 3-day-old pinned `Flick-Demo.html` shows "Expiring…".
   Fix (you need the value you used for `supabase secrets set CRON_SECRET=…`, or set a new one in both places):
   ```sql
   -- in the SQL editor
   select vault.create_secret('<same value as the function''s CRON_SECRET>', 'flick_expire_files_secret');
   -- optional cleanup of the mis-named secret (check it first):
   -- delete from vault.secrets where name like 'sb_publishable_%';
   ```
   Then check: `select status_code, content from net._http_response order by created desc limit 1;` → 200 after the next hour.
2. **Thumbnails: none have been stored yet** (0 objects under `*/thumbs/` in storage; the newest JPG, uploaded 06:38 today, has no `thumb_path`). See A2 below.

## Migrations / deploys for you to run (in order)

1. `supabase/migrations/20261027120000_widget_mode.sql` — per-device widget switches (B6). Tested on a throwaway local Postgres 14.

## What to test

_(filled in at the end)_

## Screenshots

In `docs/screenshots/`: popover loading / error / empty / files, compact vs expanded, clips compact / taller, undo, settings.

## Worth reviewing first

_(filled in at the end)_
