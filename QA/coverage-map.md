# eqlShare QA coverage map

Generated from the current desktop, mobile, website, Supabase functions, migrations, and existing tests. This file freezes the scope for the QA run.

## Products and entry points

| Area | Entry point | Primary runtime |
|---|---|---|
| Desktop | `flick-desktop/src/main/index.ts`, renderer `App.tsx` | Electron 44 / React 19 |
| Mobile | `flick-mobile/App.tsx` | Expo 57 / React Native 0.86 |
| Marketing and share web | `site/app/page.tsx`, `site/app/d/[id]/page.tsx` | Next.js 15 |
| Backend | `supabase/migrations`, `supabase/functions` | Supabase Auth, Postgres, Storage, Realtime, Edge Functions |

## Screens and states

### Desktop

- `SignIn`: sign in, sign up, email confirmation, password reset request, password reset form, Google OAuth, Apple OAuth when enabled, auth error/loading states.
- `Widget` home: Files and Clips tabs, connected/offline/signed-out status, loading, empty, error, upload, receive, drag/drop, retry, undo delete, storage nudge, limit screens, share-link status.
- `FileList`: compact popover list, expanded list, empty state, loading state, error state, file rows/cards, pin state, 24-hour expiry labels.
- `FileCard`, `CompactFileRow`, `CompactImageTile`: preview/open, drag out, pin/unpin, share link, revoke link, delete, retry download, image thumbnail and non-image file states.
- `ClipsPanel`: send clipboard, empty clipboard, clip list, copy, delete, link/text classification, busy/error states.
- `SettingsPanel` and account popover: device name, usage, density, clipboard sharing, app preferences, sign out, delete account.
- `FirstRunProfile`: display name, account type, onboarding completion and validation errors.
- `LimitScreen`: pins, storage, devices and sharing limit branches; payment-enabled upgrade branch; payment-disabled waitlist branch.
- `DeleteAccount`: confirmation, deletion progress, success and failure.
- Window modes: menu-bar popover, expanded panel, main/resizable window, full-screen-sized window, dark mode, reduced motion.
- Desktop native flows: tray open/close, right-click `Flick it`, Send clipboard menu/shortcut, global shortcut settings, file drop, auth callback, notifications, hide/restore window.

### Mobile

- `SignInScreen`: sign in, sign up, email confirmation, resend confirmation, password reset request/form, Google OAuth, Apple sign-in, loading/error/offline states.
- `HomeScreen`: Files and Clips tabs, online/offline state, empty/loading/error states, recent files, upload card, file receive, profile/onboarding gate.
- `UploadCard` and `SourceSheet`: document picker, image picker, share intent/upload, oversized-file and permission errors.
- `FileCard`, `CompactFileRow`, `ImageTile`, `FileViewer`, `FileMenu`: open/download, thumbnail, pin/unpin, share link/copy, revoke link, delete, retry, 24-hour expiry.
- `ClipsList`, `ClipCard`, `ClipChip`: clipboard send, copy, delete, link/text preview, empty clipboard and error states.
- `SettingsSheet`: device rename, usage, density, clipboard sharing, widget mode, delete account, sign out.
- `FirstRunProfile`: display name, account type and onboarding completion.
- `LimitScreen`: pins, storage, devices and sharing; payments-enabled upgrade branch; payments-disabled waitlist branch.
- Native extensions: iOS share target, iOS widget, iOS live activity; Android share intent and permissions.
- Device sizes and system states: iPhone SE, iPhone 16 Pro Max, Pixel 4a-sized, Pixel 9 Pro-sized, rotation, safe area/notch, keyboard, dark mode and Android back button.

### Website

- Landing page: hero CTA, device demo, FAQ, waitlist form, footer navigation.
- Waitlist form: empty, invalid, submitting, success, duplicate/error and offline states.
- Share download route `/d/[id]`: loading, valid share, expired/revoked/missing share, download CTA and logged-out behavior.
- Legal pages: `/privacy`, `/terms`, back navigation and contact mailto.
- Not found page and metadata/robots/sitemap behavior.

## Supabase/API coverage

### Auth and session handling

- Desktop and mobile: `getSession`, `onAuthStateChange`, `setSession`, `exchangeCodeForSession`, `signInWithPassword`, `signUp`, `resend`, `resetPasswordForEmail`, `updateUser`, `signOut`.
- OAuth: desktop Google/Apple OAuth redirect and callback; mobile Google OAuth session exchange and Apple `signInWithIdToken`; cancelled/invalid callback handling.
- Account deletion: `functions.invoke("delete-account")`, local sign-out and cleanup; Edge Function calls `auth.getUser`, `account_deletions.upsert`, Storage list/remove, and `auth.admin.deleteUser`.

### Database tables and RPCs

- `files`: list/select, insert, delete, update pin, realtime changes; ownership and 24-hour filtering.
- `clips`: list/select, insert, delete, realtime changes; 24-hour filtering.
- `devices`: list, rename, widget mode update, realtime changes.
- `profiles`: read/update settings; `ensure_my_profile` RPC.
- `feature_flags`: read and realtime changes; `clipboard` and `payments` on/off branches.
- `waitlist`: authenticated waitlist insert; `marketing_waitlist` anonymous website insert.
- `share_links`: read owned links, insert, revoke/update; sender-only ownership behavior.
- RPCs: `register_device`, `remove_device`, `get_usage`, `ensure_my_profile`, `flick_limits_for`, `flick_share_link_rate_limit`.
- Limits: 500 MB storage, 3 pins, device count limit, share-link limit, and usage reporting.

### Storage and functions

- Bucket `flick-files`: upload, download, signed URL, remove file and thumbnail, failed-row cleanup.
- `expire-files`: scheduled select of expired files, Storage removal, database deletion, missing-object/error handling.
- `share-download`: public share-link resolution, origin/CORS handling, rate limiting, signed download URL, expired/revoked/missing responses.
- `delete-account`: deletion of all owned file/thumbnail objects and cascaded rows.

### Error and data cases

- No network, timeout, expired session, unauthorized/forbidden user, oversized file, storage/pin/device/share limits, missing rows/objects, duplicate email, invalid email/password, empty/huge/weird filenames, Unicode and special characters, malformed deep links, expired/revoked share links, and partial cleanup failures.

## Links and deep links

- `https://eqlshare.com` and `https://www.eqlshare.com` website origins.
- `https://eqlshare.com/d/<id>` share-download links.
- `https://eqlshare.com/privacy`, `https://eqlshare.com/terms`, sitemap and robots endpoints.
- `mailto:hello@eqlshare.com` contact links.
- `flick://auth-callback` desktop/mobile OAuth and email confirmation callback.
- `flick://file/<id>` and `flick://clip/<id>` widget/deep-link targets.
- Supabase project URL from desktop/mobile environment configuration.
- Google OAuth, Apple OAuth and Apple identity endpoints used by auth flows.
- Supabase Edge Function URLs for `delete-account`, `share-download` and `expire-files`.

## Feature flags and settings

- `feature_flags.clipboard`: enables Clips UI, clipboard setting, native clipboard shortcut/menu and Clips subscriptions.
- `feature_flags.payments`: switches limit UI from waitlist CTA to upgrade/purchase UI.
- `profiles.clipboard_enabled`: per-user clipboard sharing setting; Clips are active only when both this and `clipboard` are enabled.
- `profiles.ui_density`: `compact` or `comfy` desktop/main-window density.
- `devices.widget_mode`: widget/live-activity behavior.
- System dark mode and reduced-motion preference.

## Planned repeatable test artifacts

- `tests/api/supabase-api.test.mjs`: health, contract and opt-in integration tests.
- `QA/maestro/`: mobile happy-path flows for iOS and Android.
- `QA/playwright/`: website and share-route browser flows.
- `QA/screenshots/`: captured evidence, when a supported simulator/device/browser is available.

## Execution constraints to record

- Destructive integration cases require a dedicated test account and `QA_ALLOW_DESTRUCTIVE=true`.
- OAuth, email confirmation, Apple sign-in and native share flows require provider configuration or a real/simulated device.
- The QA run must not modify application source files.
