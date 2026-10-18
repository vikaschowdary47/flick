# Flick Mobile: progress

## Done (build steps 1–4)

| Step | What | Commit |
|---|---|---|
| 1 | Expo SDK 57 TypeScript project (strict), tokens, Nunito 600/800, Supabase client, `useSession` (session kept in AsyncStorage) | `79feede` |
| 2 | Sign-in screen (email/password pills, coral button) and home screen (logo, wordmark, status pill, coral "Flick it" pill in the thumb zone) | `178e2d1` |
| 3 | Upload flow: document picker → 50 MB check → upload bytes to `flick-files/<user_id>/<uuid>-<filename>` → insert row in `files`. Card states: uploading (mint, "On its way…"), "Got it!" (lilac), error (coral outline) | `01f0f71` |
| 4 | "RECENTLY SENT": your latest 20 rows from `files` as sticker cards. Pull to refresh, and live updates over Realtime | (latest commit) |

Checks: `npx tsc --noEmit` passes, `npx expo export --platform ios` bundles, and `npx expo start` launches Metro. I haven't run it on a real iPhone or against your Supabase project; that's yours to test.

## Files

- `App.tsx`: loads the fonts, then shows sign-in or home.
- `src/lib/supabase.ts`: Supabase client (publishable key only). It pauses token refresh while the app is in the background.
- `src/hooks/useSession.ts`, `useUpload.ts`, `useRecentFiles.ts`: all the Supabase logic lives here.
- `src/components/`: LogoMark, StatusPill, Header, PillButton, FileCard, UploadCard, SignInScreen, HomeScreen.
- `src/lib/types.ts`, `src/lib/format.ts`: types, size formatting, and the storage-safe file name.

## Decisions

- **Added to tokens (append only, approved values unchanged):** a `spacing` scale (4/8/12/20/28/40) and `layout.inputHeight` 52, `signInMark` 56, `statusDot` 8, so nothing is hard-coded.
- **Env file:** your keys stay in `.env.local` (Expo reads it). `.env.example` has empty values. `.gitignore` covers `.env`, `.env.local` and `node_modules/`.
- **Extra packages:** `expo-file-system` reads the picked file as an ArrayBuffer, `expo-crypto` makes the UUID, `react-native-url-polyfill` is needed by supabase-js on React Native, and `react-native-safe-area-context` handles safe areas.
- **Storage name is cleaned up:** in the storage path, special characters (spaces, emoji, and so on) become `_`, because storage keys reject some of them. The `name` column keeps the original name, so the laptop shows it as-is.
- **If the row insert fails after the upload worked,** the uploaded object is deleted so nothing is left orphaned.
- **"Got it!" in Recently sent means the laptop downloaded the file:** the desktop sets `delivered_at`. Until then the card says "Waiting for your devices". The card for the file you just uploaded shows "Got it!" as soon as the upload and insert succeed.
- **The status pill always says "Connected" when signed in.** I didn't build an offline check because it needs another package (`@react-native-community/netinfo`).
- Error messages are friendly versions of what Supabase returns: wrong password, network drop, expired session, file too big.

## Since then

- Tap a recent card to show **preview** (eye) and **remove** (×), matching the desktop. Preview opens a 5-minute signed link in an in-app Safari sheet.
- × deletes the row and the stored file for every device after a 5-second Undo (desktop too). Both apps listen for DELETE events.
- Desktop: dragging a card out no longer re-uploads it (duplicates bug).
- Desktop: removing a file also deletes its downloaded copy, but only inside `userData/downloads`.
- **24-hour expiry.** Both apps show "Expires in Xh" ("Xm" under an hour) on every card, updated once a minute. A server-side Edge Function deletes expired files, and the apps drop the card through their existing delete handling.

## 24-hour expiry: what you need to do in Supabase

Nothing has been deployed or run against your project. The files are:
- `supabase/functions/expire-files/index.ts`: the Edge Function. It finds rows older than 24 h, deletes their objects from `flick-files` with the Storage API, then deletes the rows. Tables and policies are unchanged.
- `supabase/sql/schedule-expire-files.sql`: schedules the function hourly with pg_cron + pg_net.

The function uses the service-role key, which Supabase injects automatically and which stays on Supabase's servers. It is not in either app. Calls are protected by a shared secret header (`x-cron-secret`), so nobody else can trigger it.

Steps (from the repo root, `~/Desktop/flick`):

1. Install the Supabase CLI: `brew install supabase/tap/supabase`
2. Log in and link the project (your project ref is in the dashboard URL, `https://supabase.com/dashboard/project/<PROJECT_REF>`):
   ```
   supabase login
   supabase init          # only if asked; creates supabase/config.toml, keep the existing functions folder
   supabase link --project-ref <PROJECT_REF>
   ```
3. Create a random secret and store it for the function:
   ```
   openssl rand -hex 32          # copy the output
   supabase secrets set CRON_SECRET=<paste-it>
   ```
4. Deploy the function without JWT checks (it checks the secret header instead):
   ```
   supabase functions deploy expire-files --no-verify-jwt
   ```
5. Test it once by hand. This deletes anything already older than 24 h:
   ```
   curl -i -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/expire-files" \
     -H "x-cron-secret: <paste-it>"
   ```
   You should get `200` and JSON like `{"deletedRows":0,"deletedObjects":0,"errors":[]}`. A request without the header must return `401`.
6. Schedule it: open `supabase/sql/schedule-expire-files.sql`, replace `<PROJECT_REF>` and `<CRON_SECRET>`, then paste it into **Dashboard → SQL Editor** and run it.
7. Check it after the next full hour:
   ```sql
   select * from cron.job_run_details order by start_time desc limit 5;
   select status_code, content from net._http_response order by created desc limit 5;
   ```
   Logs are also in **Dashboard → Edge Functions → expire-files → Logs**.

If you change the secret later, update both `supabase secrets set CRON_SECRET=...` and the Vault entry (`flick_expire_files_secret`).

## Not done / next

- Step 5 polish: Reanimated springs, haptics, reduced motion. Cards already have a small static tilt.
- Offline status pill (see above).
- No upload progress percentage. supabase-js doesn't report upload progress, so it shows a spinner.
- Steps 6–7 (share extension, photos, receiving files) are out of scope for now.
- Schema and policies are unchanged. Nothing was pushed.

## Run it on your iPhone with Expo Go

1. Install **Expo Go** from the App Store. It must support **SDK 57**; update it if it says the project is incompatible.
2. Check that `flick-mobile/.env.local` has your real `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. In a terminal:
   ```
   cd ~/Desktop/flick/flick-mobile
   npx expo start
   ```
4. Put the iPhone on the **same Wi-Fi** as the Mac. Open the iPhone **Camera**, scan the QR code in the terminal, and tap the banner to open it in Expo Go.
   - If it can't connect (some routers or VPNs block it), stop with Ctrl+C and run `npx expo start --tunnel`.
5. **Test sign-in:** use the same email and password you use in the desktop app. You should land on the home screen with a mint "Connected" pill. Close Expo Go completely and reopen it: you should still be signed in.
6. **Test an upload:** start the desktop app and sign in there too. On the phone, tap **Flick it** and pick a small file from Files (for example, a PDF). The card goes mint "On its way…", then lilac "Got it!". The file should appear in the desktop widget. Once the laptop downloads it, its "Recently sent" row gets a "Got it!" badge.
7. **Test the size limit:** pick something over 50 MB. You should get the friendly "Flick handles files up to 50.0 MB" message and nothing is uploaded.
8. After you change the code, shake the phone (or press `r` in the terminal) to reload.
