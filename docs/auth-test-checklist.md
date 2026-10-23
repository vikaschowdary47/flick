# Auth release test checklist

Use a staging Supabase project, installed iOS/Android builds, and a packaged Flick.app on macOS. Create disposable users with inboxes you control. Apply both new migrations and deploy delete-account first. Set the Apple feature flags only after provider setup. No real-device/OAuth checks below have been claimed as completed by code checks.

## Run on iOS, Android and desktop

### Email sign-up and existing login

- [ ] Existing email/password login still opens Home for an onboarded profile.
- [ ] Fresh email sign-up: invalid address, fewer than eight password characters and mismatched passwords produce readable errors without sending a valid sign-up request.
- [ ] Valid sign-up shows Check your email; resend is disabled for 60 seconds, then works.
- [ ] Confirmation link opens the correct app, establishes its session and shows First-run profile.
- [ ] Test confirmation with app running, backgrounded and terminated. Test a link opened on another device: show useful sign-in guidance instead of trapping the user in PKCE failure.
- [ ] Already-confirmed email sign-up shows the existing-account message when Supabase supplies that signal; verify no second Auth user was created. Repeat for an email previously used with Google/Apple. An unconfirmed existing email can follow Supabase's confirmation/resend behavior without creating a duplicate user.
- [ ] Failed login, offline requests, rate limits and unavailable providers produce readable errors. Error × dismisses; auth errors clear after 10 seconds and don't leave buttons stuck.
- [ ] Sign out, relaunch, sign in again; account/session identity is correct and no previous account's content flashes on screen.

### Password reset

- [ ] Forgot password accepts an address and sends a working reset link with production SMTP.
- [ ] Open link with app running, backgrounded and terminated: set-password screen appears before profile/Home despite the recovery session being authenticated.
- [ ] Validate password length and confirmation; a successful update opens profile/Home and the new password works after signing out.
- [ ] Expired/used link, rate limiting, missing PKCE verifier and a reset request for a nonexistent address show understandable outcomes without falsely promising account creation or delivery.
- [ ] Provider-rejected address shows the same email-service explanation on mobile and desktop; it does not claim the account is missing. Test recipient-not-authorized separately with a staging SMTP setup.

### Google regression

- [ ] Fresh Google user: browser/system auth finishes, returns to Flick and shows profile with name prefilled.
- [ ] Existing onboarded Google user goes directly to Home; no duplicate profile/device is created by repeated sign-in.
- [ ] Cancel/deny produces a readable cancellation and resets loading. On desktop, also test the explicit Cancel Google sign-in button after closing the browser tab; a normal external tab closure cannot notify Electron automatically.
- [ ] Test a denied consent callback, a timeout and retry, and a cold-launch callback.

### First-run profile

- [ ] Fresh email user has blank name; Google/first native Apple name prefills when available. Name remains editable and is not overwritten while typing.
- [ ] Personal and Business save correctly; whitespace-only or over-80-character names cannot complete onboarding.
- [ ] Save trims the name and sets onboarded_at. Relaunch and sign in on a second platform: skip onboarding and retain the saved choices.
- [ ] Legacy user with files but no profile gets a new profile and sees this screen once. Existing plan, density and clipboard preferences survive.
- [ ] Offline/load/save failure keeps Home gated, shows Retry/sign-out and retains typed input. Retry after restoring network works. A missing migration produces a recoverable load error.
- [ ] Account A cannot read/update B's profile and cannot edit plan, user_id or created_at. New metadata updates don't wipe a saved display name.

### Account deletion

- [ ] Settings exposes Delete account. Opening confirmation or pressing Cancel changes nothing.
- [ ] Only exact DELETE enables the destructive button. Busy state prevents repeated submission and dismissal while deleting.
- [ ] Delete a disposable account with pinned/unpinned files, thumbnails, orphaned bucket objects, clips, devices, profile, waitlist, public share links and rate-limit rows.
- [ ] Verify Auth user and all those rows/objects are gone; public share links no longer work. Another user's files and global plan/feature definitions remain intact.
- [ ] Current device returns to sign-in; restarting remains signed out. Its Flick-owned downloaded/opened/picker/thumbnail caches are gone. No old content appears when signing into a different account.
- [ ] Delete while a file/thumbnail download is in progress; no late write recreates a deleted account's local data. Also test delete while another device uploads.
- [ ] Simulate Storage failure: user is not deleted, error is shown, uploads are paused, and retry finishes without skipping paginated objects. Test >1,000 files in a staging account if limits allow.
- [ ] Missing, expired or forged JWT is rejected. A body user_id belonging to someone else cannot change the deletion target. Wrong/missing confirmation is rejected.
- [ ] Using a captured staging access token after successful deletion cannot read/upload to Storage or refresh the deleted session. Other devices fail on subsequent authenticated requests; local exported copies outside Flick are not remotely erased.
- [ ] If local filesystem cleanup fails, success dialog reports the local cleanup problem rather than claiming every local copy was removed.

## iOS-specific checks

- [ ] Build with actual Team ID, signing profiles, Sign in with Apple entitlement and existing App Group/extension entitlements. Verify on a physical iPhone; include iPad layout if shipping iPad support.
- [ ] Apple native button appears only when enabled and available; correct black/white style in light/dark mode, readable size and no duplicate submit while busy.
- [ ] New Apple authorization works with both Share My Email and Hide My Email. Profile receives the first name when supplied. Returning authorization (no name supplied) still works and does not clear the saved name.
- [ ] Native cancel resets the busy state. Offline and provider configuration failure remain recoverable.
- [ ] Revoke Flick under Apple Account settings and sign in again: first-authorization fields are handled again.
- [ ] Delete an Apple user: fresh native authorization/code exchange and token revocation succeed; cancellation of the native confirmation leaves the account intact. Reauthorize after deletion and verify a new account/profile is created.
- [ ] Test manual-revocation success guidance when no usable Apple token is available; deletion must still happen.
- [ ] After deletion: Home/Lock Screen widgets show no previous data, cached widget thumbnails and share-extension session are removed, Live Activities end, and the share extension cannot upload as the deleted user.
- [ ] Small screen, large text, keyboard open, VoiceOver and dark themes: profile and Settings confirmation remain reachable and readable.

## Android-specific checks

- [ ] Apple button stays hidden even if the mobile flag is true. Email/Google remain available.
- [ ] Google Custom Tab cancellation and app return work. Deep links resolve to the installed dev/production build, not a website/Expo Go.
- [ ] Hardware Back dismisses Settings normally; during deletion it cannot start a duplicate request. Confirmation is reachable with keyboard open, large fonts and TalkBack.
- [ ] Delete account after previewing/sharing files: app-owned cached copies are gone. Files exported to another app stay under the user's control.
- [ ] Cold launch, background resume and switching accounts do not restore the deleted session or show stale data.

## Desktop-specific checks

- [ ] On macOS, quit generic development Electron, build/launch the generated Flick.app, and verify `flick://auth-callback` returns to **Flick**, including from a cold launch. Changing only app.setName does not register a macOS protocol.
- [ ] New Apple browser OAuth signs in using Services ID, returns through Supabase to Flick and shows profile. Existing Apple user opens Home. Test cancel/deny, explicit Cancel Apple sign-in, timeout, retry and callback errors.
- [ ] If desktop receives no Apple provider refresh token at deletion, show the manual revocation instructions after deleting the account. With a token and configured server secrets, verify automatic revocation.
- [ ] Profile, Settings and typed deletion work in popover, floating panel and separate main window, with scrolling contained inside the app and usable keyboard focus.
- [ ] Deletion removes only userData/downloads and registry/cache; files originally dragged from Finder or other folders are untouched. Relaunch confirms an empty local registry and signed-out state.
- [ ] For Windows/Linux releases, test the installed package's registered `flick` URL handler and cold/warm callback routing. The included macOS test packager does not build Windows/Linux installers.

## Before publishing

- [ ] Complete Apple/Supabase/Google steps in [auth-setup.md](auth-setup.md), production SMTP and redirect allowlists. Test with the exact release build environment flags.
- [ ] Securely store the Apple key and schedule client-secret rotation before 180 days. Verify provider and deletion-function secrets use the same Apple team/IDs.
- [ ] Run local checks and SQL tests; perform a staging deletion end to end through real Auth/Storage/Edge Functions.
- [ ] Provide App Review with a usable review account and explain where account deletion is in Settings. Check privacy disclosures, retention statements and store account-deletion requirements against the implemented behavior.
- [ ] QR login is absent; no QR tables/functions/buttons were added.
