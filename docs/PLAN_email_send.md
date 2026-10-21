# Plan F3 — Send via Gmail / Outlook from the right-click menu

**Size: M (desktop) / L (with the share-link backend)** · Plan only, nothing built.

## Goal
From the desktop, right-click a file (in Flick or in Finder/Explorer) → **Send with Flick via Gmail/Outlook**, which opens a draft with a Flick link instead of a heavy attachment.

## User flow
1. Right-click a file card in Flick → **Email a link…**, or in Finder → Services / Share → **Flick: email a link**.
2. Flick uploads it (if it isn't in Flick yet) and creates a share link (needs F1).
3. Flick opens a new draft in the user's mail app with the subject "Sharing <file name>", a short body ("Here's <file name> (2.4 MB). The link expires in 24 hours."), and the link.
   - Default: a `mailto:` draft in the system mail app (works with Apple Mail and Outlook desktop).
   - Gmail on the web: open `https://mail.google.com/mail/?view=cm&su=…&body=…` in the browser.
   - A setting picks Mail app / Gmail on the web / Outlook on the web.
4. Optional later: real attachments under 20 MB for people who prefer them.

## Data model
None beyond F1's `share_links`. Store the preferred mail target per device in `settings.json` (desktop) or AsyncStorage (mobile).

## Cost / risk
- **Depends on F1** (share links). Without F1 the only option is attaching the file itself.
- Gmail/Outlook APIs (sending without opening a draft) need OAuth scopes and Google's app verification, which is slow and costly. **Avoid:** drafts through URLs are enough.
- Finder integration: macOS Services or a Share extension for macOS. Windows: a right-click entry via the installer (registry). Each OS is a separate piece of work.
- Mobile: the same idea fits the existing Share action ("Email a link").

## Size
M for the in-app right-click plus mailto/Gmail/Outlook-web drafts once F1 exists. L if Finder/Explorer integration is included.

## Open questions
1. Is a draft (the user presses Send) acceptable, or should Flick send the email itself? (Recommendation: draft.)
2. Which default: system mail app or Gmail on the web?
3. Is Finder/Explorer right-click needed in v1, or only inside Flick?
