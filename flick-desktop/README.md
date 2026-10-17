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

`npm run start` builds and opens the production app. `npm test` runs the lint
and TypeScript checks; it does not launch the app. Use `npm run lint` and
`npm run typecheck` to run either check separately, and `npm run build` to
create production bundles.

## Electron process split

- `src/main/index.ts` runs in Electron's **main process**. It creates the
  always-on-top window. The earlier local demo-file seed and downloads-folder
  scan are disabled; local registry entries from older versions are not shown.
- `src/renderer/src/` runs in the window's **renderer process**. React displays
  the signed-in user's cloud files and handles file selection, uploads, and
  Realtime events; it has no direct access to Node.js or Electron APIs.
- `src/preload/index.ts` is the narrow **IPC bridge**. It exposes only
  the remaining local-file operations from the earlier prototype through
  `contextBridge`; the cloud-file UI does not call them.
- Supabase auth sessions are persisted in the renderer's `localStorage`.
  Supabase Storage uploads and `public.files` metadata are scoped to the signed-in
  user's ID.

The preload bundle is CommonJS so it can run with Electron's renderer sandbox
enabled. `contextIsolation` stays on and `nodeIntegration` stays off.

## Supabase project setup

1. Create a Supabase project.
2. Open the project's **SQL Editor**, paste in [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the `files` table, private `flick-files` bucket, owner-only row/storage policies, 50 MB upload limit, and Realtime publication entry.
3. In **Authentication → Providers → Email**, enable email sign-in. Configure email confirmation and your SMTP provider under **Authentication → SMTP Settings** before production use.
4. Copy `.env.example` to `.env.local`, then fill in the project URL and publishable key from **Project Settings → API**.
5. Restart the desktop app and sign in using an existing Supabase email/password account. The app currently provides sign-in only; create accounts through Supabase or add a sign-up flow separately.

Only use the Supabase publishable key in the desktop app. Never put a `service_role` or secret key in a `VITE_` variable; Vite exposes those variables to the renderer. The files table expects storage object paths in the form `<user_id>/<file_id>/<filename>`, matching the storage access policies. The renderer uses Supabase JS `localStorage` persistence for auth sessions; session data is stored in Electron's renderer profile, not in the main process. While signed in, the desktop subscribes to new `public.files` rows for that user and logs each row to the renderer console.

The SQL is safe to re-run for this initial setup. It does not configure the Supabase Auth provider; enable email sign-in in the dashboard as described above.
