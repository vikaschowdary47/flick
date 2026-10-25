# Claude Code prompt: Flick auth (sign-up, Apple, account deletion, QR login)

Paste everything below the line into Claude Code, run from the folder that contains both `flick-mobile` and `flick-desktop`.

---

You're working on Flick: a file and clipboard sharing app. `flick-mobile` is React Native; `flick-desktop` is the desktop app. Backend is Supabase (auth, Postgres, storage, realtime, edge functions). Today both apps have **email/password login and Google login, but no sign-up page**. We need testers on the App Store and Play Store by Saturday, Oct 24, so keep changes focused and don't break the existing login.

## Before writing code
1. Read both apps' auth code: login screens, Supabase client setup, auth/session state, navigation guards, and deep-link handling. Identify the desktop framework (Electron, Tauri, etc.).
2. Read the existing UI components and theme. Match the current playful, compact style (cream, coral, yellow, mint, lilac) and dark mode if present. Reuse existing components; don't introduce a new UI library.
3. Give me a short plan listing files you'll add or change in each app, plus any Supabase SQL or edge functions. Wait for my OK before building.

## Flow to build
Login screen → Email sign-up / Google / Apple / QR (desktop only).
New users (from email, Google or Apple) → First-run profile → Home.
QR login → straight to Home (that user already has an account).

## Tasks, in priority order (commit after each one)

### 1. Email sign-up + password reset (both apps)
- Sign-up screen: email, password, confirm password. Validate inline (valid email, password at least 8 characters, passwords match). Show Supabase errors in plain language (e.g. "An account with this email already exists").
- Use `supabase.auth.signUp` with `emailRedirectTo` pointing back into the app (mobile deep link; desktop deep link or a localhost callback, whatever the existing Google login uses).
- After sign-up, show a "Check your email" screen with a resend button (60-second cooldown).
- Handle the confirmation link: open the app, establish the session, route to First-run profile.
- Add "Don't have an account? Sign up" on the login screen and "Already have an account? Log in" on sign-up.
- Forgot password: "Forgot password?" on login → enter email → `resetPasswordForEmail` with a redirect → screen to set a new password (`updateUser({ password })`) → back to Home.
- Tell me exactly which redirect URLs I need to add in the Supabase dashboard (Auth → URL Configuration) and which email templates to check.

### 2. First-run profile (both apps)
- Create a `profiles` table if one doesn't exist: `id uuid primary key references auth.users on delete cascade`, `display_name text`, `account_type text check (account_type in ('personal','business'))`, `onboarded_at timestamptz`, `created_at timestamptz default now()`. Enable RLS so users can only read and update their own row. Provide the SQL as a migration file.
- After any sign-in, if `onboarded_at` is null, show First-run profile: display name (prefill from the Google/Apple name if available) and Personal / Business. Save, set `onboarded_at`, go to Home.
- Existing users who already have data should not get stuck: if they have no profile row, create it on login and show the screen once.

### 3. Sign in with Apple
- Mobile: native Sign in with Apple on iOS (`expo-apple-authentication` if this is Expo, otherwise `@invertase/react-native-apple-authentication`), then `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`. Use a hashed nonce. On Android, use the Supabase OAuth web flow or hide the button. Your call; explain which.
- Desktop: same browser-based OAuth approach as the existing Google login.
- Follow Apple's button guidelines. List the Apple Developer and Supabase dashboard steps I need to do (Services ID, key, return URLs). I don't have the Apple developer account set up yet, so build it so it works once I add the credentials.

### 4. Account deletion (required by Apple)
- Settings → "Delete account" with a confirmation step (type DELETE or similar).
- Supabase edge function `delete-account`: verify the caller's JWT, delete the user's storage files, their rows (files, clips, devices, profile, etc.; check the actual schema), then `auth.admin.deleteUser`. Never expose the service role key to the clients.
- Sign out locally and clear any downloaded/cached files on that device afterward.

### 5. QR login on desktop (only if 1 to 4 are done and tested)
- Table `qr_login_requests`: `id uuid`, `token_hash text`, `status text` (pending / approved / used / expired), `desktop_name text`, `user_id uuid null`, `login_token_hash text null`, `created_at`, `expires_at` (2 minutes). RLS locked down; edge functions do the writes.
- Desktop: "Log in with phone" on the login screen. Calls an edge function `qr-create` that returns a request id and a random one-time token. Show a QR encoding `flick://qr-login?id=...&t=...`. Refresh the QR when it expires. Listen with Supabase Realtime (or poll every 2s) for approval.
- Mobile (must be signed in): a "Scan to log in" option (Settings or the scan screen). Scan → confirmation sheet "Log in on <desktop name>?" → Approve calls edge function `qr-approve` with the user's JWT, id and token.
- `qr-approve`: check the token hash, expiry and pending status; then use `auth.admin.generateLink({ type: 'magiclink', email })` and store the returned hashed token for that request; mark it approved.
- Desktop receives approval, calls `qr-claim` to fetch the hashed token once (mark it used), then `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` to sign in.
- Security: single use, 2-minute expiry, never put a password, session or user email in the QR, always require approval on the phone, and rate-limit `qr-create`.
- If the user lands on Home this way, skip First-run profile unless `onboarded_at` is null.

## Rules
- Don't remove or rewrite the existing email and Google login; extend them.
- No secrets in client code. Service-role work goes in edge functions.
- Keep each task in its own commit with a clear message.
- When done, give me: a test checklist for each flow on iOS, Android and desktop, plus every manual dashboard step I need to do (Supabase, Apple, Google).
