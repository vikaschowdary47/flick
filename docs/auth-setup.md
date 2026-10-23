# Flick auth setup

Task 1 already exists. Tasks 2–4 extend it; QR is intentionally excluded. Credentials and dashboard configuration below are manual. No live project settings were changed by this implementation.

## Supabase migration

Apply all existing migrations in filename order, followed by `supabase/migrations/20261030120000_first_run_profile.sql`, using the SQL Editor or your normal Supabase migration workflow. Some existing migration filenames are future-dated: do not apply the new file before its predecessors. Back up the project before production migrations.

The existing `profiles.user_id` key is retained because plans, density and clipboard settings depend on it. The new migration adds display_name, account_type and onboarded_at. It does not replace existing rows or change plans. Existing users complete the profile once. `ensure_my_profile()` creates a missing own row without exposing plan/INSERT privileges.

## Apple Developer account and native iOS

1. Enroll in the Apple Developer Program and record your Team ID (Membership details).
2. Certificates, Identifiers & Profiles → Identifiers → App IDs: register/select the explicit bundle ID `dev.flickit.app`. Enable **Sign in with Apple** and configure it as the primary App ID. Save. Keep its existing App Groups capability for `group.dev.flickit.app`.
3. Register the widget/share extension IDs `dev.flickit.app.widgets` and `dev.flickit.app.share` under the same team and existing app group. Apple sign-in belongs to the main app, not these extensions.
4. Set `expo.ios.appleTeamId` to your actual Team ID in `flick-mobile/app.json`. `ios.usesAppleSignIn: true` and the expo-apple-authentication plugin are already configured.
5. Regenerate provisioning profiles with the new main-app capability. With EAS, sync capabilities/credentials and rebuild; with local native projects, regenerate via `npx expo prebuild --platform ios`, select your team in Xcode and verify the Sign in with Apple capability and `com.apple.developer.applesignin = [Default]` entitlement. Preserve any local native customization when running prebuild.
6. Set `EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN=true` in the mobile build environment. Rebuild the native app; changing JavaScript alone doesn't add entitlements. Test on an iPhone signed into an Apple Account.

The iOS button is Apple's native control, with availability detection and light/dark variants. A random nonce is SHA-256 hashed for Apple and the raw nonce goes to Supabase. Apple's first-authorization name is saved to Auth metadata for onboarding. Subsequent authorizations may omit the name; Flick never clears an existing name in that case.

Android intentionally hides Apple. It continues to offer email and Google. No Android Apple credentials are needed.

Native configuration reference: [Expo AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/).

## Apple Developer web OAuth for desktop

1. Identifiers → **Services IDs** → register a distinct ID, for example `dev.flickit.web`. This is the browser OAuth client, not the iOS bundle ID or desktop bundle ID.
2. Enable Sign in with Apple on that Services ID → Configure. Associate the primary App ID `dev.flickit.app`.
3. Add your Supabase Auth hostname as a Website Domain, e.g. `<project-ref>.supabase.co`, and the exact **Return URL** `https://<project-ref>.supabase.co/auth/v1/callback`. If using a Supabase custom Auth domain, use the corresponding hostname/callback consistently. Copy the callback displayed in Supabase's Apple provider settings. Apple receives HTTPS here; `flick://auth-callback` is the later app redirect, not Apple's Return URL.
4. Keys → create a key with **Sign in with Apple** enabled and associate the primary App ID. Download the `.p8` once and store it securely outside this repository. Record the Key ID and Team ID.
5. Generate a client-secret JWT locally. Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_SERVICES_ID=dev.flickit.web` (or your chosen ID), and `APPLE_PRIVATE_KEY_PATH` to the `.p8` file, then run `node flick-desktop/scripts/create-apple-secret.mjs`. Treat its output as a secret; paste it only into Supabase's Apple Secret Key field. It expires after 180 days; rotate before expiry and keep the `.p8` safe.
6. If you use Hide My Email and send mail to Apple's relay addresses, configure your sending domains/addresses in Apple's Sign in with Apple email communication settings and verify SPF/DKIM for your SMTP provider.

Provider configuration and secret-rotation reference: [Supabase Apple sign-in](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## Supabase dashboard: Apple and app redirects

1. Authentication → Sign In / Providers → Apple: enable the provider. Set the allowed Client IDs to include both your Services ID (`dev.flickit.web`) and native bundle ID (`dev.flickit.app`), using the dashboard's comma-separated list format. Paste the generated Services-ID client secret into **Secret Key** and save. Keep nonce checking enabled.
2. Authentication → URL Configuration → Redirect URLs: allow `flick://auth-callback` for desktop and `flick://auth-callback**` for mobile email callbacks with the email query parameter. Confirm the actual callback emitted by your installed Expo build; if it uses `flick:///auth-callback`, add `flick:///auth-callback**` too. Use installed development/production builds rather than relying on Expo Go callback URLs. Keep the Site URL as your actual HTTPS app/marketing site, not an unrelated default.
3. Set `VITE_ENABLE_APPLE_SIGN_IN=true` in the desktop build environment. Rebuild after any VITE flag change.
4. On macOS run `npm run package:mac` in `flick-desktop`. Launch the printed `dist/mac-<timestamp>/Flick.app` after quitting development Electron. The bundle declares `flick` in Info.plist and registers itself at launch. Test Google and Apple in this bundle. `npm start`/`npm run dev` still launch generic Electron and do not provide reliable macOS scheme registration.
5. This packaging command creates a local ad-hoc signed app. Distribution requires your normal Developer ID signing/notarization pipeline. A Windows installer must register `flick` to the installed Flick executable; Linux packaging must install the corresponding desktop MIME handler. This change does not supply those installers.

Deep-link reference: [Electron deep links](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app).

## Existing email and Google dashboard checks

- Authentication → Providers → Email: enable email/password and email confirmation. Configure a real custom SMTP sender under SMTP Settings; the default Supabase sender restricts recipients. Verify sender/domain and delivery logs.
- Authentication → Email Templates: check **Confirm signup**, **Reset password**, and **Resend signup** behavior. Templates should use Supabase's generated `{{ .ConfirmationURL }}` rather than a hard-coded website. Verify redirect parameters survive the link.
- Google Cloud Console → APIs & Services → Credentials → the existing OAuth web client: Authorized redirect URI must include `https://<project-ref>.supabase.co/auth/v1/callback` (or the custom Auth hostname). Keep the existing Google client ID/secret in Supabase → Authentication → Providers → Google. Add testers on the Google OAuth consent screen while the app is in testing; complete publishing/verification when required. Apple does not require changing Google's callback to `flick://`.
- Keep publishable keys in clients; service-role keys and Apple `.p8` keys belong only in server secrets. Never put them in `EXPO_PUBLIC_*` or `VITE_*` variables.
