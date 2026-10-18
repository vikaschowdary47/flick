# Flick: progress

Covers everything done in `flick-mobile`, `flick-desktop` and `supabase/` since commit `e524600` (the desktop redesign). All work is committed locally on `main`; nothing has been pushed. The Supabase schema and policies are unchanged.

For mobile-only detail (decisions, Expo Go steps) see [flick-mobile/PROGRESS.md](flick-mobile/PROGRESS.md).

## Flick Mobile (`flick-mobile`)

### Setup

- Expo **SDK 57** TypeScript project, strict mode. It was first created on SDK 58, then moved down because the iPhone's Expo Go only supports 57.
- `src/design/tokens.ts`: the DESIGN.md tokens rewritten for React Native (numbers, not CSS strings; sticker shadow as `shadow*`/`elevation`; spring values for Reanimated). Added `spacing`, `inputHeight`, `signInMark`, `statusDot` and `iconSize` so nothing is hard-coded.
- Nunito 600/800 via `@expo-google-fonts/nunito`.
- `src/lib/supabase.ts`: Supabase client with the publishable key only. The session is kept in AsyncStorage, and token refresh is paused while the app is in the background.
- `.env.example` has empty values. Keys live in `.env.local`. `.gitignore` covers `.env`, `.env.local` and `node_modules/`.

### Screens

- **Sign-in:** email and password pill inputs, a coral button, friendly errors.
- **Home:** logo, "flick" wordmark, status pill, the heading "Flick it to all your devices", a big coral "Flick it" pill in the thumb zone (navy text), and "Sign out".
- `App.tsx` only loads the fonts and chooses between sign-in and home.

### Features

- **Upload** (`useUpload`): document picker, then the 50 MB check, then the upload to `flick-files/<user_id>/<uuid>-<name>` (as an ArrayBuffer), then the row insert in `files`. Card states: "On its way…", "Got it!", error. If the insert fails, the uploaded object is deleted.
- **Recently sent** (`useRecentFiles`): your latest 20 rows as tilted sticker cards, with pull to refresh and live Realtime updates for inserts, updates (`delivered_at`) and deletes.
- **Card actions:** tap a card to show **preview** (eye) and **remove** (×), using the desktop's icons (`react-native-svg`).
  - Preview (`useOpenFile`): a 5-minute signed URL opened in an in-app Safari sheet.
  - Remove (`useRemoveFile`): 5-second Undo, then the row is deleted, then the stored file.
- The "Got it!" badge was removed from the cards.
- **Expiry label:** "Expires in Xh" or "Xm" on each recent card, updated every minute (`useNow`, `formatExpiry`).
- **Status pill** (`useConnectionStatus`): NetInfo (startup fetch plus a listener) is the main signal, and Realtime channel status is the second. It shows "Offline" when `isConnected === false` or `isInternetReachable === false`. When the network returns, the channel resubscribes if needed and the list is refetched.

## Flick Desktop (`flick-desktop`)

The widget already existed before this work. These are the changes:

1. **Drag duplicates fixed:** dragging a card out no longer re-uploads it into the widget. Outgoing drags are tracked and the widget's own drop zone ignores them. Drops from Finder still upload.
2. **× deletes for real:** after the 5-second Undo, the `files` row is deleted, then the storage object, then the local copy. A Realtime DELETE listener removes cards deleted on other devices or by expiry.
3. **Downloaded copy is deleted on remove,** but only if it's inside `userData/downloads`. Files dropped in from elsewhere are never deleted from disk.
4. **Expiry label:** "Expires in Xh" or "Xm" in the card's meta line, updated every minute.

## Supabase (`supabase/`): written, not deployed

- `functions/expire-files/index.ts`: an Edge Function that finds `files` rows older than 24 hours, deletes their objects from `flick-files` with the Storage API, then deletes the rows. It's protected by an `x-cron-secret` header. The service-role key exists only inside the function on Supabase, never in the apps.
- `sql/schedule-expire-files.sql`: an hourly pg_cron + pg_net job, with secrets stored in Vault. It includes check and undo queries.

**_-----Done----_**

### What you still need to do

1. Install the Supabase CLI, then `supabase login` and `supabase link --project-ref <ref>`.
2. `openssl rand -hex 32`, then `supabase secrets set CRON_SECRET=<value>`.
3. `supabase functions deploy expire-files --no-verify-jwt`.
4. Test once with `curl` (see flick-mobile/PROGRESS.md for the exact command). Expect `200` with the secret and `401` without it.
5. Fill in `<PROJECT_REF>` and `<CRON_SECRET>` in the SQL file and run it in the SQL Editor.
6. After the next full hour, check `cron.job_run_details`.
   **_-----Done----_**

## Commits

| Commit    | What                                                          |
| --------- | ------------------------------------------------------------- |
| `79feede` | Mobile: Expo project, tokens, Supabase client, useSession     |
| `178e2d1` | Mobile: sign-in and home screens                              |
| `01f0f71` | Mobile: upload flow and card states                           |
| `92915a0` | Mobile: recently sent list                                    |
| `374578a` | Mobile: PROGRESS.md                                           |
| `1ddefc3` | Mobile: downgrade to Expo SDK 57                              |
| `0b7229a` | Mobile: tap to preview                                        |
| `b2b14c3` | Mobile: preview/remove actions, badge removed                 |
| `274615c` | Desktop: drag no longer re-uploads                            |
| `f744be1` | Desktop: × deletes from Supabase, listens for deletes         |
| `0b61141` | Mobile: × deletes from Supabase                               |
| `fd409ef` | Desktop: delete the downloaded copy (userData/downloads only) |
| `bc9c4ca` | Desktop: "Expires in" label                                   |
| `4541f61` | Mobile: "Expires in" label                                    |
| `2807ba2` | Supabase: expire-files function and cron SQL                  |
| `a6e22f9` | Mobile: PROGRESS.md expiry setup steps                        |
| `83156f7` | Mobile: Offline status via NetInfo, resync on reconnect       |

## Known issues (to fix next)

### Desktop: can't drag and drop files from VS Code
- **Why:** VS Code's explorer doesn't hand over real files when you drag. It sends a list of `file://` links (`text/uri-list`) and its own data types instead. The widget only accepts drags that contain `Files`, so it ignores them.
- **Fix idea:** also accept `text/uri-list` drops. Send the `file://` paths to the main process, which reads them from disk and uploads them like a normal drop. Only accept local `file://` links, and keep the existing 50 MB check.

### Mobile: opening a file uses Safari instead of the user's apps
- **Now:** "Preview" opens a signed link in an in-app Safari sheet.
- **What other apps do** (Files, Dropbox, Google Drive, WhatsApp, Slack): download the file to the phone first, then
  1. show it in **Quick Look**, the built-in iOS preview for PDFs, images, video, Office and iWork files, text and more, with a share button, or
  2. open the **share sheet / "Open in…"** so the user picks the app: Files, Photos, Pages, Adobe, Mail, AirDrop, and so on. iOS remembers the apps they use often.
- **Fix idea:** download the file with `expo-file-system`, then call `expo-sharing`'s `shareAsync(uri, { mimeType, UTI })`. On iOS that opens the share sheet with a Quick Look preview at the top, so you get both options at once, and it works in Expo Go. Delete the downloaded copy afterwards. A Quick Look-only screen would need a native module, so that waits for the development build.

## Not done yet

- Step 5 polish: Reanimated springs, haptics, reduced-motion support.
- Upload progress percentage on mobile (it shows a spinner).
- Later steps: iOS share extension (needs a development build), photos, receiving files on the phone.
- Manual testing still needed: the desktop drag fix, delete across devices, airplane mode, and the expiry function once deployed.
- Housekeeping:
  - Remove the duplicate files left by the drag bug with ×.
  - Consider gitignoring `flick-desktop/*.tsbuildinfo`, which is rewritten on every typecheck.
