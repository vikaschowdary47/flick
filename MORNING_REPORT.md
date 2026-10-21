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
| D4 iOS Share Extension "Flick it" | `6dc7cae` | partial | Builds and embeds; sheet states rendered. Needs a real share from Photos/Files with your signed-in app to confirm uploads (and device signing with your Team ID) |
| D5 Rename device + sender name everywhere | `c04322e` | done | Already existed in both apps; added rename to the popover Settings panel and sender to widget rows |
| C1–C6 Android widget, bubble, settings | — | not started | Your second message said "Do not start … Android". The approved plan stands; `widget_mode` already has the Android keys |
| D3 | — | — | Not in your list (it went D1, D2, D4, D5) |
| F1 Sharing with friends/groups by link (plan) | `5eb2f2f` | plan | docs/PLAN_share_links.md — Size: L |
| F2 QR Receive file without sign-in (plan) | `703d755` | plan | docs/PLAN_qr_receive.md — Size: M |
| F3 Send via Gmail/Outlook from right-click (plan) | `f2eb299` | plan | docs/PLAN_email_send.md — Size: M (desktop) / L (with the share-link backend) |
| F4 Click now, share later (plan) | `19169d8` | plan | docs/PLAN_send_later.md — Size: M |
| F5 Personal vs business + per-seat billing (plan) | `ba5a997` | plan | docs/PLAN_business_plans.md — Size: L |
| F6 VS Code extension (plan) | `8673c23` | plan | docs/PLAN_vscode_extension.md — Size: M |

## Decisions I made on my own

- **Popover minimum height 140px** (was 200px): with a one-line empty state, 200px left ~70px of blank space.
- **Dev-only `FLICK_KEEP_POPOVER=1`** stops the popover hiding on blur in development, so automated screenshots work. Ignored in packaged builds.
- **A dev-only preview page** (`flick-desktop/src/renderer/dev-preview.html`) renders the real widget with sample data. Production builds only bundle `index.html`.
- **Settings panel sizes like the taller popover** (cap min(680px, 80% of screen)), since it's the same "grows downward" rule.
- **The tray right-click menu keeps its own "Show from menu bar as" and "Launch at login"** in addition to the new panel.
- **Widget screenshots are rendered from the real SwiftUI widget views** in a throwaway simulator app (not committed), because adding a widget to the Simulator's Home Screen needs manual taps. They use sample data, not your account.
- **The widget target is named `FlickWidgetExtension`**, not `FlickWidgets`: that name is taken by the app's bridge module and the two Swift modules clashed at build time.
- **"Free up space" removes after a confirm that lists the files**, oldest first, never pinned, down to 70% of the limit. One tap opens it, one tap removes; I didn't make it a single tap with no list, because it deletes files on every device.
- **Share Extension is native Swift, not React Native**: share extensions have tight memory limits and must open instantly.
- **The extension uses the app's session from the App Group file** (`session.json`, file protection on). A Keychain access group would be stronger; it needs the paid account's signing, so I noted it below as a follow-up.
- **If the extension refreshes the token, it writes the new session back** and the app adopts it on its next foreground, so a rotated refresh token can't sign either one out.
- **Widget defaults:** Home, Lock Screen and Live Activity on; Lock Screen content off; Android widget on; bubble off.
- **Device rows are read with `select("*")`** so the app doesn't break before the `widget_mode` migration is applied.
- **Android (section C) not started**, per your later message ("Do not start … Android"). B6 includes the Android keys in `widget_mode` but no Android UI.
- **Comfy cards keep the floating undo toast;** only compact layouts (popover, panel, compact window) use the inline strip.

## Found while working — needs you

1. **FIXED (with your permission): new secret set on the function and in Vault as `flick_expire_files_secret`, mis-named Vault entry deleted; a manual run returned 200 and deleted the 3-day-old `Flick-Demo.html` (row + object).** Original finding: **File expiry is not running at all.** Every hourly call to `expire-files` returns `401 {"error":"Unauthorized"}`.
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

0. ~~Fix the expiry secret~~ — done (see "Found while working" #1).
1. `supabase/migrations/20261027120000_widget_mode.sql` — per-device widget switches (B6). Tested on a throwaway local Postgres 14.
   The apps work before you run it (device rows are read with `select("*")`); the widget toggles just won't save until it's applied.

No function deploys needed. (The thumbnails/expiry function change from yesterday is already deployed, per your message.)

## What to test

**Before testing on iPhone:** add your Apple Team ID to `flick-mobile/app.json` as `ios.appleTeamId`, then `cd flick-mobile && npx expo prebuild -p ios && npx expo run:ios --device`.
If CocoaPods errors with "Unicode Normalization not appropriate for ASCII-8BIT", run `export LANG=en_US.UTF-8` first.
Expo Go still works for everything except widgets, Live Activity and the share extension.

### Mac (desktop)
- [ ] Sign in; click the tray icon: compact popover (6 newest), sized to content, never over 440px.
- [ ] **Open Flick** → grows downward to show everything, same look; **Show less** shrinks it; click-away hides; reopen is compact.
- [ ] Pop-out icon (taller state) opens the separate window.
- [ ] Clips tab: 40px chips; footer "+N more" counts clips on Clips and files on Files.
- [ ] Remove a file: slim "Removed · Undo" strip in place; Undo restores; after 5s it collapses. Image tile: dimmed with Undo.
- [ ] Avatar → Settings panel (← Back): usage bars, This device name, Clipboard sharing, Show from menu bar as, Launch at login, Sign out — nothing cut off on your 14" screen.
- [ ] Flick a new **photo** from the phone: the desktop tile shows a **real thumbnail** (A2 — the key thing I couldn't test).
- [ ] At 80%+ storage (lower `plan_limits.max_storage_mb` to test): yellow banner → Free up space → confirm lists oldest unpinned files.
- [ ] Hit a limit in the popover: the limit screen fits completely; "Notify me when more is available" saves to `waitlist`.

### iPhone (development build)
- [ ] Flick a new photo: the compact grid shows its thumbnail; the Mac shows it too.
- [ ] Add the **Flick** widget (small and medium) and the **Lock Screen** widgets. They show the latest items (Lock Screen: counts only).
- [ ] Tap a widget row → Flick opens that file's menu. Tap a clip → Clips tab and the clip is copied.
- [ ] Medium widget **Copy latest clip** → paste somewhere. (Tell me if iOS blocked it; the tap-the-clip fallback covers it.)
- [ ] Settings → Widgets on this iPhone: turn Home Screen widget off → widget says "Turned off in Flick". Turn on "Show content on Lock Screen" → names appear there.
- [ ] Send a file from the Mac, then swipe Flick away (background): a Live Activity "1 new file from <Mac>" appears; open Flick → it disappears.
- [ ] In Photos, Share → **Flick it** with 2 photos → "Sending 1 of 2…" → "Got it!" → both on the Mac. Share a link from Safari → appears as a clip.
- [ ] Sign out → widgets clear.

### Android
- [ ] Nothing new tonight (Android work not started). Quick regression: upload, Preview, Share, Clips still work in Expo Go.

## Screenshots

All in `docs/screenshots/` (desktop from the dev-preview page in the real Electron window; iOS rendered from the real SwiftUI views with sample data):
- Desktop popover: `popover-loading`, `popover-error`, `popover-empty`, `popover-files`, `popover-compact`, `popover-expanded`, `popover-clips-compact`, `popover-clips-taller`, `popover-undo`, `popover-settings`, `popover-storage-nudge`, `popover-storage-confirm`, `popover-limit-waitlist`
- iOS widgets: `widget-small`, `widget-small-clip`, `widget-small-empty`, `widget-small-turned-off`, `widget-medium`
- Lock Screen: `lock-inline`, `lock-circular`, `lock-rectangular`, `lock-rectangular-content`
- Live Activity: `live-activity-banner`, `live-activity-island`
- Share sheet: `share-sending`, `share-done`, `share-error` (the 🚫 in `share-sending` is the offscreen renderer failing to draw the system spinner; it's a normal spinner on a phone)

## Worth reviewing first

1. **The expiry job was failing (401) since setup** — now fixed and verified (200, expired file removed). Next hourly run (:00) should show 200 in `net._http_response`.
2. **Share extension session handling** (`flick-mobile/targets/share/FlickUploader.swift`, `src/hooks/useShareSession.ts`): the app writes its session tokens to the App Group so the extension can upload as you. The file is protected (until first unlock) and only the app and its extensions can read it, but a **Keychain access group** would be the stronger home once your Apple account can sign it. Also review the refresh hand-back: the extension may rotate the refresh token and the app adopts it on next open.
3. **"Free up space" deletes several files at once** (after a confirm that lists them). Mobile removes them without the 5-second Undo (the confirm replaces it); desktop gives each its Undo strip. Check you're happy with that difference.
4. **The popover now loads usage all the time** (one small RPC per file-list change) for the 80% banner, instead of only when menus open.
5. **Live Activity without push** only starts when Flick goes to the background; it can't appear for files that arrive while Flick is fully closed. Push (commit 7) would fix that after launch.
6. **`npx expo prebuild` rewrites `npm run android` to `expo run:android`** every time it runs. Android still uses Expo Go, so I restored it to `expo start --android`; if you run prebuild yourself, discard that one-line change in `flick-mobile/package.json`.
7. **The iOS app now needs a development build for widgets/share**; `npm run ios` builds it. Expo Go still runs the app without those parts.
