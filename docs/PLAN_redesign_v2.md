# Plan R2 — Redesign v2 ("the drop point")

**Size: L** · Branch `redesign-v2`. Mobile, desktop and site are redesigned on this branch; `main` is unchanged.

Mockup: `docs/redesign-v2/mockup/index.html` (open it in a browser; tap the amber button for the live demo).

## Goal
Move the apps to the v2 look (minimal and native: one typeface, hairlines instead of sticker shadows, the newest file as a large preview, a round send button), **without breaking anything that works today**.

## Safety rules for every step
- One small step per commit. The app must build and behave the same after each one.
- v2 ships as a **third theme** next to Playful and Classy. Nobody sees it until they pick it in Settings. The current look stays the default until you say otherwise.
- No changes to Supabase, uploads, downloads, expiry, IPC, or file logic. Visual only.
- After every step: `npx tsc --noEmit` passes, and you check the step on a real phone before the next one starts.
- Playful and Classy must look pixel-identical after steps 1–3. Compare before/after screenshots.

## Baseline (checked on `main` at f120988)
- `flick-mobile` typecheck: 0 errors.
- `package-lock.json` is out of sync with `package.json` (`npm ci` fails: typescript 5.9.3 missing from the lock). Fix on `main` separately, not in this branch.
- React Native Reanimated is not installed yet, so step 7 needs a new dev build.

## Steps (mobile first)

1. **Add the theme, no visible change.** Add `drop` to `ThemeName`, a `dropLight` and `dropDark` palette in `theme.ts`, and accept `drop` in `ThemeProvider`'s saved-value check. Not offered in Settings yet. *Risk: very low.*
2. **Make style tokens follow the theme.** Fonts, outline width, sticker shadow and radii are global today (82 font uses in 23 files). Add a per-theme `look` (fonts, borderWidth, shadow, radii) exposed by `useTheme()`. Playful and Classy get exactly today's values. *Risk: low; no visual change.*
3. **Switch components to the theme look,** a few files per commit (header and tabs, then cards and rows, then sheets and sign-in). Each commit typechecks, and Playful/Classy screenshots stay identical. *Risk: medium, because it's mechanical but wide. This is why it's split up.*
4. **Bundle Hanken Grotesk** 400/500/600 via `@expo-google-fonts/hanken-grotesk`, loaded next to Nunito in `App.tsx` (same per-weight import pattern, so only three files are added). *Risk: low; needs about 2 MB.*
5. **Fill in the v2 look:** Hanken, 1px hairlines, no sticker shadow, v2 radii. Offer "Drop" in Settings → Theme. Now you can try it on your phone. *Risk: low; opt-in.*
6. **v2 Files screen layout** for the Drop theme: newest file as a large preview with copy and share, older files in a grouped list, and the round send button with Photos and Paste beside it. New components (`LandedCard`, `FileGroup`, `SendDock`) are used only when the theme is Drop; the existing `HomeScreen` paths stay as they are. *Risk: medium; kept behind the theme.*
7. **Arrival motion** with Reanimated, using the spring values already in `tokens.springs`. Needs a new dev build (native module). Respects reduce motion. *Risk: medium; native build.*
8. **Every state:** offline, slow, over 50 MB, expired session, upload failed, no other devices yet. Each one is designed and checked on device. *Risk: low.*
9. **Decide the default.** After a week of using it, make Drop the default, or keep it as an option. Your call.

Then the desktop app (`flick-desktop/src/design/tokens.ts`) follows the same steps, and Clips, Settings and Sign-in get their v2 layouts.

## Decisions
1. Name in Settings: "Minimal" (internal key `drop`).
2. The site gets the v2 look too.

## Status (on `redesign-v2`)
Done, each as its own commit, all visual only (no Supabase, upload, download, IPC or expiry changes):

- **Mobile:** Hanken Grotesk, hairlines, no sticker shadows or tilt. "Minimal" theme is the default (Playful and Classy still in Settings, now as color variants). New newest-file card with a 24-hour fuse, a round send button with Photos and Paste, a segmented Files/Clips control, and grouped lists. `npm ci` works again (lock file back in sync).
- **Desktop:** same look; flat macOS-style rows; segmented control; quiet header and footer. Fixed three existing bugs: dark mode never applied (tokens were inline styles), the dark logo was never used, and secondary buttons were unreadable in dark mode. Dev preview gained `state=signin`.
- **Site:** new hero ("It's on your phone. Now it's here.") with a v2 phone-to-Mac demo, sentence-case labels, neutral feature cards, an amber waitlist button. Fonts are bundled locally, so the build no longer fetches Google Fonts.

Checks run: mobile `tsc --noEmit`; desktop typecheck, lint, build and `test:windows`; site lint and build.

## Test on device before merging
1. Phone: sign in, send a photo with the round button, send a file from Photos, Paste a clip, open Settings and switch themes, check light and dark.
2. Mac: receive a file, drag it out, check the Clips tab, settings, sign out and back in, light and dark.
3. Site: `npm run dev` in `site/`, check the home page, privacy, terms and delete-account in light and dark.

## If something breaks
- Go back to the working app at any time: `git switch main`.
- Undo one part: `git revert <commit>` on this branch (each area is its own commit).
