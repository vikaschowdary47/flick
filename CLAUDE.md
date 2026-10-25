# Flick Mobile

## What Flick is

A cross-platform file sharing app. On the phone you pick a file (later: Share → "Send to Laptop"), and it instantly appears in the Flick desktop widget on your laptop, where it can be dragged into any other app. Files are shared across ALL of the user's devices. There is no device picker anywhere in the UI.

This folder is the phone app (`flick-mobile`). The desktop app lives in a separate folder (`flick-desktop`, Electron + React) and is built separately.

## Developer context

- Solo developer. Knows React, React Native, JavaScript, and Python.
- Explain native/platform-specific parts (Expo config, share extension, dev builds) clearly, since those are newer.

## Tech stack

- Expo (React Native) with TypeScript
- Supabase: Auth, Storage, Realtime (same project as the desktop app)
- `@supabase/supabase-js`, `@react-native-async-storage/async-storage` (persist the login session), `expo-document-picker`
- Fonts: Nunito (weights 600 and 800) via `@expo-google-fonts/nunito` and `expo-font`
- Animation (later): React Native Reanimated, using the spring values in tokens

## Environment

- `.env` holds `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Provide `.env.example` with empty values; `.env` is gitignored.
- NEVER use a secret or service_role key in the app. Only the publishable key. Row-level security protects the data.

## Supabase setup (already created, do not change the schema)

- Table `public.files`: id, user_id, name, size (max 52428800 bytes = 50 MB), mime_type, storage_path (unique), created_at, delivered_at.
- Private storage bucket: `flick-files`.
- RLS: users can only read, insert, update, and delete their own rows and their own folder in the bucket.
- Storage path rule: `<user_id>/<uuid>-<filename>`. The first folder MUST equal the signed-in user's id, or the upload is rejected.
- The desktop app listens for new rows in `files` via Realtime, so inserting a row is what makes a file appear on the laptop.

## Upload flow

1. User taps "eqlShare it" and picks a file with the document picker.
2. Reject files over 50 MB with a friendly message.
3. Upload to bucket `flick-files` at `<user_id>/<uuid>-<filename>`. React Native can't upload a plain File object, so read the file as an ArrayBuffer (via `expo-file-system`) before uploading.
4. Insert a row in `files` (name, size, mime_type, storage_path, user_id).
5. Show states: uploading, "Got it!", error.

## Design

Follow DESIGN.md in this folder (playful look: cream, coral, yellow, mint, lilac, sticker cards, Nunito).

- All colors, radii, font names, sizes, shadow, and spring values live in `src/design/tokens.ts`. Never hard-code values.
- Text on coral is navy, not white.
- Touch targets at least 44px. Respect safe areas. Haptic tap on send and receive (later).
- Mobile screen: wordmark and status pill, heading "eqlShare it to all your devices", selected file as a sticker card, "RECENTLY SENT" list with "Got it!" badges, and a large amber "eqlShare it" pill button in the thumb zone.

## Build order (one step at a time, stop and let me check after each)

1. Expo project, tokens, Nunito, Supabase client, `useSession` hook.
2. Sign-in screen and home screen (header, status pill, "eqlShare it" button), no uploads yet.
3. Upload flow (above) and card states.
4. "Recently sent" list from the `files` table.
5. Polish: sticker-card tilt, springy animations, haptics, reduced-motion support.
6. Later: iOS share extension ("Send to Laptop"), which needs a development build (not Expo Go).
7. Later: photos via `expo-image-picker`; receiving files sent from the laptop.

## Out of scope for now

- Share extension, Android build, AI features, VS Code integration, premium plan, direct Wi-Fi transfer, App Store submission.

## Conventions

- TypeScript strict mode.
- Structure: `src/components`, `src/hooks` (for example `useSession`, `useUpload`), `src/design/tokens.ts`, `src/lib/supabase.ts`. App.tsx only chooses between sign-in and home.
- Keep Supabase logic in hooks, never inside visual components.
- Small, focused commits.
- Handle failures gracefully: large files, flaky connections, expired sessions.

## Working style (to save usage limits)

- One small task per prompt. Only touch the files named in the prompt.
- For risky steps, show a short plan first and wait for my OK.
- Do not scan the whole project unless asked.

## Commands

- Start: `npx expo start` (scan the QR code with Expo Go on the iPhone, same Wi-Fi)
- Typecheck: `npx tsc --noEmit`

## First task

Do build step 1 only: create the Expo TypeScript project in this folder, create `src/design/tokens.ts` from DESIGN.md, install the packages above, set up the Supabase client and `useSession` hook. Show me the tokens file first, then stop.

Removing a file with × deletes it everywhere (Supabase row, stored file, and this device’s downloaded copy), after a 5-second Undo. Never delete anything outside userData/downloads

Files expire and are deleted everywhere (Supabase row and stored file, plus each device’s downloaded copy) 24 hours after upload. This is a deliberate MVP choice, to be revisited after user feedback.
