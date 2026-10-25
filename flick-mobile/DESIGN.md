# eqlDrop design spec (playful look)

Mockup reference: https://claude.ai/artifact/GWLSCTVZPw5VyT7h5TeRvE (boards "Desktop widget (playful)" and "Mobile app (playful)").

Build the desktop widget first (`flick-desktop`). The mobile app (`flick-mobile`) reuses the same tokens later.

## Principles
- Playful but calm: sticker-like cards, soft offset shadows, springy motion. One animated quirk, not many.
- Files are shared across ALL of the user's devices. There is no device picker anywhere in the UI.
- Do not change any IPC, Supabase, or file logic. This is a visual redesign only.

## Tokens
Put every value below in ONE file, `src/design/tokens.ts`, and reference tokens everywhere (no hard-coded colors). The same file will be copied into `flick-mobile`.

Colors
- cream (background): #FFF8EE
- navy (text, outlines, shadows): #1B2140
- muted text: #6B6F8A
- coral (brand, primary button, image placeholder): #F67381
- yellow: #FFD66B
- mint (connected, downloading card): #8EE3C8
- lilac: #C9B8FF
- Text on coral is navy, not white (white fails contrast).
- Add a dark variant later (deep navy background, same accents).

Shape and type
- Font: Nunito (weights 600 and 800), bundled locally, not loaded from a CDN. System UI as fallback.
- Window radius 24px, card radius 20px, thumbnail radius 14px, pills fully rounded.
- Card shadow: `0 4px 0 #1B2140` (flat offset, like a sticker). Cards have a small tilt between -1.5deg and +1deg that straightens on hover.
- Sizes: wordmark 24px/800, heading 28px/800, card title 16px/800, meta 13px/600, eyebrow 13px/800 with 0.08em letter spacing.

## Desktop widget layout (about 440x520, resizable, frameless, always on top)
1. Header (drag region): logo mark (32px coral rounded square with an up-right arrow), "eqlDrop" wordmark, and a status pill on the right.
2. Eyebrow "ON THIS MAC" and heading like "3 files landed".
3. Card list (12px gap). Each card: 52px thumbnail or type tile, file name, "size · state" line, and a "drag me" pill on hover when ready.
4. Footer helper: "Drop files here, or send something over!"

Status pill states: Connected (mint), Signed out, Offline. Never show "Ready" when signed out.

Card colors by file type: images yellow (with real thumbnail), PDF and docs lilac, archives and other mint, fallback cream with navy outline.

Card states
- Downloading: mint card with a progress ring (navy stroke on cream track) and text "On its way... 64%". Not draggable yet.
- Ready: "Got it!" and draggable (`startDrag` only once the file is on disk).
- Error: coral outline and a short message.

Sign-in: a compact centered screen with the logo above the form, same palette, pill inputs and a coral button.

Empty state: "Nothing yet. Send something with eqlDrop!"

## Motion
- New card: slides in with a springy overshoot.
- Remove: quick flick away with a small spin.
- Drag: card tilts and lifts. Do not animate other elements during a drag.
- Header icon does a tiny wiggle when a file arrives. One-time confetti on the very first received file only.
- Keep animations under about 400ms. Respect `prefers-reduced-motion`.
- Use Framer Motion springs on desktop. Record spring settings (stiffness, damping) in tokens so mobile can match them with Reanimated.

## Accessibility
- Real `<button>` elements for actions, `aria-label` on icon-only buttons, visible keyboard focus rings.
- Text contrast at least 4.5:1. Touch targets at least 44px on mobile.

## Mobile notes (later)
- Same tokens, fonts, and microcopy.
- Screen: wordmark and status pill ("2 devices online"), heading "eqlDrop it to all your devices", the selected file as a lilac sticker card, a "RECENTLY SENT" list with "Got it!" badges, and a large coral "eqlDrop it" pill button in the thumb zone.
- Haptic tap on send and receive. Respect safe areas.
