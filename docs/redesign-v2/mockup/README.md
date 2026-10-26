# eqlShare v2: the drop point

Open `index.html`. Tap the amber button on the phone in the first section to watch a file fly to the Mac. Use the theme switch at the top for light and dark.

Mockup only. No app code changed. Sample files (photo, invoice, floor plan, palette) are generated for the mockup; the logo and app icon are yours.

## Direction

- The logo is a mark dropping into a slot, so the newest file lands large at the top and everything older stays quiet.
- One loud element per screen: the round amber send button. Amber means "this sends something" and is used nowhere else.
- A thin amber line under the newest file is the 24-hour fuse.

## Minimal and clear

- One typeface (Hanken Grotesk) in three weights: 400, 500, 600.
- Edges are 1px hairlines. Only things that float (the Mac popover, a file being dragged) get a soft shadow.
- No outlines, offset shadows, pills, blobs or all-caps labels.
- Native structure on each platform: iOS grouped lists, a translucent macOS popover, and Android status and gesture bars.

## Screens

- Live demo: phone sends, Mac receives.
- iPhone: files, clips, settings, sign in, first run.
- Android (Redmi): files, clips.
- Mac popover: files, clips with a file dragged over, settings, empty.
- Widgets: Home Screen small and medium, Lock Screen, Dynamic Island.
- The system: color, type, motion, rules.

## Contrast (WCAG AA 4.5:1)

| Pair | Ratio |
| --- | --- |
| Ink #1A1712 on canvas #F3F2EF | 16.0 |
| Ink 2 #5E5A52 on canvas | 6.1 |
| Ink 3 #726D64 on canvas | 4.6 |
| Ink on amber #F5B83D | 8.8 |
| Danger #C2384A on white | 5.3 |
| Dark: ink 2 #A8A398 on #161513 | 7.3 |

Toggles are ink-on when light and amber-on when dark, so the "on" state passes 3:1 against the surface. The default iOS green does not.

## To build it

- Swap Nunito for Hanken Grotesk (400/500/600) and update `src/design/tokens.ts` in both apps with the colors above.
- Replace the sticker shadows with a 1px hairline token.
- Keep the spring values in tokens: arrive uses stiffness 380 and damping 30; press scales to 0.94 over 160 ms.
