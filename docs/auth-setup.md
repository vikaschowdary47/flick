# Flick auth setup

Task 1 already exists. Tasks 2–4 extend it; QR is intentionally excluded. Credentials and dashboard configuration below are manual. No live project settings were changed by this implementation.

## Supabase migration

Apply all existing migrations in filename order, followed by `supabase/migrations/20261030120000_first_run_profile.sql`, using the SQL Editor or your normal Supabase migration workflow. Some existing migration filenames are future-dated: do not apply the new file before its predecessors. Back up the project before production migrations.

The existing `profiles.user_id` key is retained because plans, density and clipboard settings depend on it. The new migration adds display_name, account_type and onboarded_at. It does not replace existing rows or change plans. Existing users complete the profile once. `ensure_my_profile()` creates a missing own row without exposing plan/INSERT privileges.

## Apple Developer account and native iOS

1. Enroll in the Apple Developer Program and record your Team ID (Membership details).
2. Certificates, Identifiers & Profiles → Identifiers → App IDs: register/select the explicit bundle ID `com.eqlshare.app`. Enable **Sign in with Apple** and configure it as the primary App ID. Save. Keep its existing App Groups capability for `group.com.eqlshare.app`.
3. Register the widget/share extension IDs `com.eqlshare.app.widgets` and `com.eqlshare.app.share` under the same team and existing app group. Apple sign-in belongs to the main app, not these extensions.
4. Set `expo.ios.appleTeamId` to your actual Team ID in `flick-mobile/app.json`. `ios.usesAppleSignIn: true` and the expo-apple-authentication plugin are already configured.
5. Regenerate provisioning profiles with the new main-app capability. With EAS, sync capabilities/credentials and rebuild; with local native projects, regenerate via `npx expo prebuild --platform ios`, select your team in Xcode and verify the Sign in with Apple capability and `com.apple.developer.applesignin = [Default]` entitlement. Preserve any local native customization when running prebuild.
6. Set `EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN=true` in the mobile build environment. Rebuild the native app; changing JavaScript alone doesn't add entitlements. Test on an iPhone signed into an Apple Account.

The iOS button is Apple's native control, with availability detection and light/dark variants. A random nonce is SHA-256 hashed for Apple and the raw nonce goes to Supabase. Apple's first-authorization name is saved to Auth metadata for onboarding. Subsequent authorizations may omit the name; Flick never clears an existing name in that case.

Android intentionally hides Apple. It continues to offer email and Google. No Android Apple credentials are needed.

Native configuration reference: [Expo AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/).

## Apple Developer web OAuth for desktop

1. Identifiers → **Services IDs** → register a distinct ID, for example `com.eqlshare.web`. This is the browser OAuth client, not the iOS bundle ID or desktop bundle ID.
2. Enable Sign in with Apple on that Services ID → Configure. Associate the primary App ID `com.eqlshare.app`.
3. Add your Supabase Auth hostname as a Website Domain, e.g. `<project-ref>.supabase.co`, and the exact **Return URL** `https://<project-ref>.supabase.co/auth/v1/callback`. If using a Supabase custom Auth domain, use the corresponding hostname/callback consistently. Copy the callback displayed in Supabase's Apple provider settings. Apple receives HTTPS here; `flick://auth-callback` is the later app redirect, not Apple's Return URL.
4. Keys → create a key with **Sign in with Apple** enabled and associate the primary App ID. Download the `.p8` once and store it securely outside this repository. Record the Key ID and Team ID.
5. Generate a client-secret JWT locally. Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_SERVICES_ID=com.eqlshare.web` (or your chosen ID), and `APPLE_PRIVATE_KEY_PATH` to the `.p8` file, then run `node flick-desktop/scripts/create-apple-secret.mjs`. Treat its output as a secret; paste it only into Supabase's Apple Secret Key field. It expires after 180 days; rotate before expiry and keep the `.p8` safe.
6. If you use Hide My Email and send mail to Apple's relay addresses, configure your sending domains/addresses in Apple's Sign in with Apple email communication settings and verify SPF/DKIM for your SMTP provider.

Provider configuration and secret-rotation reference: [Supabase Apple sign-in](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## Supabase dashboard: Apple and app redirects

1. Authentication → Sign In / Providers → Apple: enable the provider. Set the allowed Client IDs to include both your Services ID (`com.eqlshare.web`) and native bundle ID (`com.eqlshare.app`), using the dashboard's comma-separated list format, with the Services ID first because desktop OAuth uses it. Paste the generated Services-ID client secret into **Secret Key** and save. Keep nonce checking enabled.
2. Authentication → URL Configuration → Redirect URLs: allow `https://www.eqlshare.com/auth/callback` (desktop hand-off page) and `eqlshare://auth-callback**` plus `eqlshare:///auth-callback**` (mobile, current scheme). Legacy: allow `flick://auth-callback` for desktop and `flick://auth-callback**` for mobile email callbacks with the email query parameter. Confirm the actual callback emitted by your installed Expo build; if it uses `flick:///auth-callback`, add `flick:///auth-callback**` too. Use installed development/production builds rather than relying on Expo Go callback URLs. Keep the Site URL as your actual HTTPS app/marketing site, not an unrelated default.
3. Set `VITE_ENABLE_APPLE_SIGN_IN=true` in the desktop build environment. Rebuild after any VITE flag change.
4. On macOS run `npm run package:mac` in `flick-desktop`. Launch the printed `dist/mac-<timestamp>/Flick.app` after quitting development Electron. The bundle declares `flick` in Info.plist and registers itself at launch. Test Google and Apple in this bundle. `npm start`/`npm run dev` still launch generic Electron and do not provide reliable macOS scheme registration.
5. This packaging command creates a local ad-hoc signed app. Distribution requires your normal Developer ID signing/notarization pipeline. A Windows installer must register `flick` to the installed Flick executable; Linux packaging must install the corresponding desktop MIME handler. This change does not supply those installers.

Deep-link reference: [Electron deep links](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app).

## Existing email and Google dashboard checks

- Authentication → Providers → Email: enable email/password and email confirmation. Configure a real custom SMTP sender under SMTP Settings; the default Supabase sender restricts recipients. Verify sender/domain and delivery logs.
- Authentication → Email Templates: check **Confirm signup**, **Reset password**, and **Resend signup** behavior. Templates should use Supabase's generated `{{ .ConfirmationURL }}` rather than a hard-coded website. Verify redirect parameters survive the link.
- Google Cloud Console → APIs & Services → Credentials → the existing OAuth web client: Authorized redirect URI must include `https://<project-ref>.supabase.co/auth/v1/callback` (or the custom Auth hostname). Keep the existing Google client ID/secret in Supabase → Authentication → Providers → Google. Add testers on the Google OAuth consent screen while the app is in testing; complete publishing/verification when required. Apple does not require changing Google's callback to `flick://`.
- Keep publishable keys in clients; service-role keys and Apple `.p8` keys belong only in server secrets. Never put them in `EXPO_PUBLIC_*` or `VITE_*` variables.

## Account-deletion deployment and Apple revocation secrets

1. Apply `supabase/migrations/20261031120000_account_deletion.sql` after the profile migration. It adds a server-owned cleanup marker and a restrictive policy on the private `flick-files` bucket. Keep this policy alongside the existing owner-only policies. It blocks uploads while cleanup is pending and blocks a deleted user's otherwise unexpired JWT.
2. Deploy from the repo root: `supabase functions deploy delete-account --project-ref <project-ref> --no-verify-jwt`. The function itself verifies each Bearer token with `auth.getUser(token)`; do not remove that check. It uses the Supabase-injected `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. No cron secret is needed for this user-initiated function.
3. Supabase Dashboard → Edge Functions → Secrets: add `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (the full `.p8` PEM, multiline or escaped newlines), `APPLE_IOS_CLIENT_ID=com.eqlshare.app`, and `APPLE_SERVICES_ID=com.eqlshare.web` (or your actual Services ID). Use the same team/key/primary App ID grouping as sign-in. These are server secrets, separate from the public feature flags. The deletion function signs a short-lived client secret itself; rotating the web OAuth JWT in the Auth dashboard does not require changing the `.p8` unless that key is revoked.
4. Confirm the edge function is deployed in the same project as each client's publishable key. Check function logs on test failures, without logging authorization headers, Apple codes/tokens or private keys.
5. Deletion requires a validated signed-in caller and `confirmation: "DELETE"`. It ignores any body-supplied user ID. It marks cleanup pending, recursively removes the user's bucket prefix (including orphaned uploads and thumbnails), and deletes Auth only when storage cleanup succeeds. Auth-user deletion cascades files, clips, devices, profiles, waitlist entries and share links; share-link rate limits cascade from their links. Global feature flags and plan definitions stay intact.
6. A failed cleanup leaves the account and marker for retry. The message says uploads may be paused. Restore the failing service and retry from Settings; don't delete storage metadata directly in SQL. A deliberately abandoned deletion should only be resumed/reversed by a project administrator after inspecting the remaining objects.
7. iOS Apple users authorize again during deletion so the server can exchange a fresh Apple code. Desktop uses an available Apple provider refresh token. The server verifies Apple's signed identity and its subject against the caller's linked Apple identity before revocation. If there is no usable Apple token/configuration, deletion still completes and the success dialog tells the user to revoke Flick manually in their Apple Account settings. Do not claim automatic revocation when the response has `appleRevocationRequired: true`.
8. On successful deletion, clients sign out locally. Desktop removes only Flick's own `userData/downloads` directory, clears its registry and HTTP cache, and blocks late download writes. Mobile clears opened/uploaded/picker/thumbnail caches, widget snapshots/thumbnails, the share-extension session and Live Activities. Copies the user already exported to Photos, Files, Downloads or other apps are outside Flick's storage and remain under their control. Other devices will need to sign out/refresh; remote OS caches cannot be erased by this device.

Apple's deletion/revocation behavior, including the manual fallback when tokens are unavailable: [Apple TN3194](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple). Revocation endpoint: [Apple token revocation](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens).

## Local verification

- Desktop: `cd flick-desktop && npm test && npm run build`. `npm run package:mac` also checks that the test bundle can be created; verify its signature with `codesign --verify --deep --strict <path-to-Flick.app>`.
- Mobile: `cd flick-mobile && npx tsc --noEmit`; `npx expo config --type public` checks config/plugin resolution. Builds need your Apple Team ID and signing credentials.
- Deletion handler: `node --experimental-strip-types --test supabase/functions/delete-account/handler.test.mjs` (Node 22.6+ with type stripping).
- Edge types: `deno check supabase/functions/delete-account/index.ts`.
- Mocked Apple revocation: `deno test --allow-env supabase/functions/delete-account/apple.test.ts`. Tests stub every Apple endpoint and use generated test keys.
- On a disposable Supabase database after migrations, run `supabase/tests/first_run_profile.sql` and `supabase/tests/account_deletion.sql` as postgres with `ON_ERROR_STOP=1`. They roll back their fixture users. Never run destructive account tests against a real customer account.

The implementation was checked with desktop lint/types/build, mobile types/Expo config, a local signed macOS test bundle, nine deletion-handler tests, four mocked Apple tests, and PostgreSQL migration/RLS tests. The SQL compatibility run loaded the full repository schema/migrations into temporary PostgreSQL with stand-ins for managed Auth/Storage/cron objects. This is not a hosted Supabase integration test. Real Google/Apple OAuth, SMTP delivery, native iOS/Android UI and App Store provisioning still require the manual checklist in [auth-test-checklist.md](auth-test-checklist.md).
