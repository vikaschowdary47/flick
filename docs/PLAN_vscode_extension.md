# Plan F6 — VS Code extension

**Size: M** · Plan only, nothing built.

## Goal
Get files and snippets between your phone/laptop and the editor without leaving VS Code: drop a screenshot from your phone into a Markdown file, or send a code snippet to your phone.

## User flow
1. Install "Flick" from the VS Code Marketplace → **Sign in to Flick** (opens the browser; same Supabase account, PKCE loopback like the desktop app).
2. A **Flick** view in the sidebar: your latest files and clips (same compact rows), live.
3. Actions on a file:
   - **Insert into editor**: images become `![name](path)` after saving into the workspace (`assets/` by default); text files insert their content.
   - **Save to workspace…**: pick a folder.
   - **Copy link** (needs F1).
4. Send from the editor: select text → right-click → **Flick selection to my devices** (becomes a clip). In the Explorer, right-click a file → **Flick to my devices** (uploads it).
5. A status bar item shows "Flick: 2 new" when something arrives.

## Data model
None new. The extension is another client of the same tables, Realtime and storage, and registers as a device (`platform: 'vscode'`, so the `devices.platform` check needs `vscode` added) to get "from VS Code" labels.

## Cost / risk
- Session storage: VS Code's `SecretStorage` (OS keychain) for the refresh token.
- Counts as a device toward the 4-device free limit. Maybe don't count editor clients? (Open question.)
- Webviews in VS Code are sandboxed; drag and drop from the sidebar into the editor is limited, so explicit "Insert" commands are more reliable.
- Marketplace publishing needs a publisher account (free).

## Size
M: TypeScript extension (reuses the desktop's Supabase logic), a sidebar tree view or webview, five commands, sign-in.

## Open questions
1. Should VS Code count as one of the 4 devices?
2. Default folder for images inserted into Markdown (`assets/`, next to the file, or ask)?
3. Also target Cursor / other VS Code forks (same extension, Open VSX registry)?
