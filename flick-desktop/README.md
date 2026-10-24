# Flick Desktop

The desktop app is a small, always-on-top Electron window. After email sign-in,
it lists the signed-in user's Supabase files and supports uploading through the
plus button or by dropping files into the window. Cloud files are private to
that account.

## Run

```sh
npm install
npm run dev
```

`npm run start` builds JavaScript and opens it through the development Electron executable. On macOS use `npm run package:mac` for a local Flick.app with the auth callback scheme; distribution still requires Developer ID signing/notarization. `npm test` runs the lint
and TypeScript checks; it does not launch the app. Use `npm run lint` and
`npm run typecheck` to run either check separately, and `npm run build` to
create production bundles.

## Electron process split

- `src/main/index.ts` runs in Electron's **main process**. It creates the
  always-on-top window. The earlier local demo-file seed and downloads-folder
  scan are disabled; local registry entries from older versions are not shown.
  Supabase downloads are saved in `userData/downloads/` and registered with
  their Supabase row ID so the mapping persists across restarts.
- `src/renderer/src/` runs in the window's **renderer process**. React displays
  the signed-in user's cloud files, uploads files, downloads undelivered rows,
  and handles Realtime events; it has no direct access to Node.js or Electron
  APIs.
- `src/preload/index.ts` is the narrow **IPC bridge**. It lets the renderer ask
  the main process to save downloaded bytes locally, then start a native file
  drag for the registered path using `webContents.startDrag()`.
- Supabase auth sessions are persisted in the renderer's `localStorage`.
  Supabase Storage uploads and `public.files` metadata are scoped to the signed-in
  user's ID. Rows with `delivered_at` unset are downloaded to the local
  downloads folder, then marked delivered; the cloud copy is retained.

The preload bundle is CommonJS so it can run with Electron's renderer sandbox
enabled. `contextIsolation` stays on and `nodeIntegration` stays off.

## Supabase project setup

1. Create a Supabase project.
2. Open the project's **SQL Editor**, paste in [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the `files` table, private `flick-files` bucket, owner-only row/storage policies, 50 MB upload limit, and Realtime publication entry.
3. In **Authentication → Providers → Email**, enable email sign-in. Configure email confirmation and your SMTP provider under **Authentication → SMTP Settings** before production use.
4. Copy `.env.example` to `.env.local`, then fill in the project URL and publishable key from **Project Settings → API**.
5. Restart the desktop app and sign in using an existing Supabase email/password account. Email sign-up, password reset, Google, optional Apple, first-run profiles and account deletion are implemented. Apply the auth migrations and configure providers before testing.

Only use the Supabase publishable key in the desktop app. Never put a `service_role` or secret key in a `VITE_` variable; Vite exposes those variables to the renderer. The files table expects storage object paths in the form `<user_id>/<file_id>/<filename>`, matching the storage access policies. The renderer uses Supabase JS `localStorage` persistence for auth sessions; session data is stored in Electron's renderer profile, not in the main process. While signed in, the desktop subscribes to new `public.files` rows for that user and logs each row to the renderer console.

The SQL is safe to re-run for this initial setup. It does not configure the Supabase Auth provider; enable email sign-in in the dashboard as described above.

Auth setup, Apple credentials and deployment: [docs/auth-setup.md](../docs/auth-setup.md). Full iOS, Android and desktop checks: [docs/auth-test-checklist.md](../docs/auth-test-checklist.md).

Windows NSIS packaging, GitHub Actions artifact download, tray behavior and native test checklist: [docs/windows-desktop.md](../docs/windows-desktop.md). Run `npm run package:win` on a Windows build host.
