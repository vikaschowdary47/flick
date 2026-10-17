# Flick

## What Flick is
A cross-platform file sharing app. On the phone, you tap Share → "Send to Laptop" (or an upload button). The file instantly appears in a small always-on-top desktop widget as a thumbnail card. You can drag the card straight onto the desktop or into any other app (Finder, Slack, WhatsApp Desktop, email, etc.).

Why: AirDrop only works Apple to Apple, and Quick Share is mostly Android and Windows. Flick should work between iPhone, Android, Mac, and Windows.

## Current focus: DESKTOP APP FIRST
We are building the desktop app (`flick-desktop`) first. The mobile app (`flick-mobile`) comes later. Do not start on mobile until the desktop widget works.

Project folders (already created, separate folders, not a monorepo):
- `flick-desktop/` — Electron + React desktop widget (this is where we work now)
- `flick-mobile/` — React Native app (later)

Not included yet: VS Code extension, AI features, Android/Windows builds, direct Wi-Fi transfer, premium plan.

## Developer context
- Solo developer. Knows React, React Native, JavaScript, and Python.
- Prefer TypeScript/JavaScript everywhere.
- Explain the Electron-specific parts (main process vs renderer process, IPC bridge, `startDrag`) clearly, since those are new.

## Tech stack
- **Desktop:** Electron + React, Mac first. Small always-on-top window.
- **Backend:** Supabase (Auth, Storage, Realtime). No custom server.
- **Mobile (later):** React Native, iPhone first, with an iOS share extension for "Send to Laptop".

## How it works
1. Phone uploads a file to Supabase Storage and inserts a row in a `files` table (id, user_id, name, size, mime_type, storage_path, created_at, delivered_at).
2. Desktop subscribes to the `files` table via Supabase Realtime for the signed-in user.
3. On a new row, the desktop downloads the file to a temp folder immediately, then shows a card in the widget.
4. Dragging a card calls Electron's `webContents.startDrag()` with the local temp file path. A card can only be dragged out once the file is on disk.
5. After delivery, set `delivered_at` and delete the cloud copy. Cloud storage is temporary.

## Desktop build order (do one step at a time, test before moving on)
1. Electron + React window: small, always-on-top, one hardcoded file card.
2. Drag-out: make that card draggable into Finder, Slack, and other apps using `startDrag()`. Prove this feels native before anything else.
3. Supabase project: auth, `files` table, private storage bucket, row-level security so users only see their own files.
4. Connect desktop to Realtime: auto-download new files and show cards.
5. A simple test upload page or script to send files in (stand-in for the phone app).
6. Polish: multiple cards, remove card, file type icons or thumbnails, clear temp files, menu bar/tray behavior.

## Mobile build order (later, in `flick-mobile`)
1. Sign in and pick-and-upload screen.
2. iOS share extension ("Send to Laptop" in the share sheet).
3. Receive files from the desktop (desktop to phone).

## Limits and costs to design around
- Supabase free tier: 1 GB storage, 5 GB egress, 50 MB max upload per file.
- Egress (downloads) is the main cost, so delete files after delivery.
- Later ideas: same-Wi-Fi direct transfer (free, no size limit) and a premium plan for large cloud transfers.

## Conventions
- TypeScript preferred, strict mode on.
- Never commit secrets. Use `.env` files and provide a `.env.example`.
- Small, focused commits.
- Handle failures gracefully: large files, flaky connections, duplicate uploads, expired sessions.

## Commands (fill in as the project is created)
- Desktop dev: `cd flick-desktop && npm run dev`
- Lint/typecheck: `npm run lint && npm run typecheck`

## First task
In `flick-desktop`, set up an Electron + React (TypeScript) app with a small always-on-top window showing one hardcoded file card that can be dragged out into Finder using `startDrag()`. Explain the main process vs renderer process split and the IPC bridge as you go.
