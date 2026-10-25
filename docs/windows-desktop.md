# eqlShare for Windows

## Build and download

The Windows target is an x64 NSIS installer named `eqlShare-Setup.exe`. It includes the eqlShare multi-size `.ico`, creates a Start Menu shortcut with AppUserModelID `dev.flickit.desktop`, and registers `flick://` for authentication callbacks. The existing macOS packaging command is unchanged.

On Windows, in `flick-desktop`:

```sh
npm ci
npm run package:win
```

Output: `flick-desktop/dist/windows/eqlShare-Setup.exe`.

Public build configuration:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- Optional `VITE_FLICK_SHARE_BASE_URL`
- Optional `VITE_ENABLE_APPLE_SIGN_IN=true`, after the Apple web provider is configured

No service-role key, Apple private key or OAuth secret belongs in these build variables. Existing Supabase app callback allowlists still need `flick://auth-callback` as described in [auth-setup.md](auth-setup.md).

## Building from this Mac

Cross-building Windows installers on macOS is possible with compatible Wine/tooling (or a Windows VM/container). This Apple Silicon Mac has no Wine installed. The Windows installer was **not built or run locally**, and no native Windows behavior has been claimed as tested here. Native Windows CI is the supplied build route. See [electron-builder cross-platform documentation](https://www.electron.build/docs/features/multi-platform-build/).

The workflow `.github/workflows/windows-desktop.yml` runs on `windows-latest`:

1. GitHub repository → Settings → Secrets and variables → Actions → Variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The workflow also accepts Secrets with those names as a fallback. Add the optional public variables above if needed.
2. Push the Windows-support commit to GitHub. This local task does not push or trigger a remote build.
3. Actions → **Windows desktop installer** → **Run workflow**, or push a change under `flick-desktop` to `main`.
4. After checks/build succeed, download artifact **eqlShare-Windows-x64**, unzip it and run `eqlShare-Setup.exe`.

The workflow validates config, installs locked dependencies, runs lint/typecheck and Windows helper tests, builds the app/NSIS installer, then uploads only the installer. Build artifacts expire after 14 days. It does not publish a release.

The test installer is unsigned. Configure Windows code signing before public distribution; unsigned builds can trigger Windows SmartScreen. The `.ico` is committed and can be regenerated with `npm run icon:win`. Electron was updated from 44.9.0 to 44.9.1 for the certificate-trust security patch; electron-builder is a development dependency.

## Windows behavior

- Left-click the tray icon to toggle the compact popover. It anchors beside the taskbar for bottom/top/left/right positions, clamps to that monitor's work area and accommodates an auto-hidden taskbar. Closing the panel hides it; **Quit** exits eqlShare.
- Right-click offers **Open**, **Settings**, **Quit**. Settings is accessible even before sign-in. Windows always uses the compact tray popover; macOS keeps its existing popover/floating-panel preference.
- **Ctrl+Shift+Space** toggles eqlShare globally. In Settings, enter another combination (such as `Ctrl+Alt+F`) and save. Conflicts keep the prior working shortcut. Startup conflicts are shown in Settings and the first-launch tip. `Alt+Shift+C` remains reserved for Send clipboard.
- **Start with Windows** is enabled on the installed app's first launch. It starts hidden via `--hidden`. The toggle uses Electron's Windows login-item API. Later changes in Windows Startup/Task Manager are respected rather than overwritten on every app launch. Development Electron does not register itself to run at login.
- A realtime file or clip INSERT from another known device produces a Windows toast and tray dot. Initial history loads and this device's own inserts do not produce toasts. Duplicate realtime notices are suppressed. Toast text omits file names and clipboard contents; clicking a toast opens eqlShare. Windows notification permissions/Do Not Disturb can suppress OS presentation.
- A one-time first-visible-launch dialog explains the tray, current shortcut and how to pin the tray icon. It is saved per installation/user profile. A hidden login launch waits until the panel is opened to show the tip.
- Cold-launch callbacks are read from `process.argv`; running-app callbacks use `second-instance`. Only the intended `flick://auth-callback` endpoint is accepted. macOS keeps `open-url` handling.
- Finder/macOS Quick Look and `scutil` remain macOS-only. Windows uses `shell.openPath`, OS hostnames, platform paths, and Windows-safe names for downloaded local copies. Remote file display names remain unchanged.

## Checks completed on Mac

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:windows`: 11 tests covering taskbar edges, negative monitor origins, tiny work areas, auto-hide geometry, shortcut validation/conflicts, cold/running deep-link argument parsing, NSIS identity/icon configuration and Windows filenames
- electron-builder configuration schema validation
- Dependency installation audit: zero vulnerabilities after the Electron patch

These checks do not replace the native Windows checklist below. NSIS compilation, Windows registry/startup behavior, toast delivery and shell interaction must be verified on Windows.

## Windows test checklist

### Installer and protocol

- [ ] Run the GitHub workflow; confirm the artifact contains exactly the expected `eqlShare-Setup.exe` installer.
- [ ] Install on a clean Windows 11 x64 account and, if supported for release, Windows 10 x64. Verify the eqlShare icon on the installer, installed executable, Start Menu and tray.
- [ ] Test a user/install path containing spaces and non-ASCII characters.
- [ ] Complete email confirmation, password recovery, Google sign-in and configured Apple web sign-in from both a cold launch and while eqlShare is already running. Verify one eqlShare process/window handles the callback.
- [ ] Cancel a browser auth flow and use eqlShare's explicit cancel control; verify the loading state clears. Closing an external browser tab alone cannot notify Electron.
- [ ] Launch the installed shortcut again while eqlShare runs: it opens the existing app, not another instance. A duplicate `--hidden` launch stays quiet.
- [ ] Upgrade/reinstall and check that protocol handling and existing settings still work. Uninstall and verify installer-owned shortcuts/protocol registration are removed. App data is deliberately retained by the uninstaller configuration.

### System tray and panel

- [ ] First visible launch shows the tray/shortcut/pinning tip once. Restart: no repeat. A hidden login launch does not interrupt the desktop with this tip.
- [ ] Left-click opens; a second left-click closes without flickering back open. Click another app to hide eqlShare. Close the panel: eqlShare remains in the tray.
- [ ] Right-click **Open**, **Settings**, **Quit** all work. Open Settings before sign-in as well as after sign-in. Quit removes the tray icon and releases shortcuts.
- [ ] Check bottom taskbar on Windows 11, and top/left/right where the Windows version supports moving it (normally Windows 10). The panel appears outside the taskbar and stays inside the work area.
- [ ] Test auto-hide, the hidden-icons overflow, tray icon pinning, multiple monitors, negative monitor origins and 100%/150%/200% display scaling. Move the taskbar/change displays while eqlShare runs, then reopen it.
- [ ] Verify scrolling, Settings, sign-in and first-run profile remain usable on small screens. Dragging a file out of eqlShare still works across apps.

### Global shortcut

- [ ] Ctrl+Shift+Space opens/closes eqlShare while another app is active, regardless of which monitor was used last.
- [ ] Change to a valid combination in Settings; new shortcut works immediately, old shortcut is released, and restart preserves the new choice.
- [ ] Try an invalid combination, an OS-reserved combination and a combination held by another app. Show an error and retain the previous working shortcut.
- [ ] Reserve the saved shortcut in another app before starting eqlShare. eqlShare still launches; the tip/Settings shows the conflict and permits selecting another shortcut.
- [ ] Alt+Shift+C cannot replace the toggle shortcut and still sends the clipboard only when that feature is enabled.

### Start with Windows

- [ ] After the first installed launch, Settings shows Start with Windows on and Windows Startup lists eqlShare.
- [ ] Sign out/restart Windows: eqlShare starts hidden in the tray and continues syncing when signed in. No empty panel steals focus.
- [ ] Toggle startup off, restart Windows and confirm Flick does not launch. Toggle on and retest.
- [ ] Disable eqlShare through Windows Startup/Task Manager. A later manual eqlShare launch must not silently turn it back on.
- [ ] Launch via development Electron: it must not add generic Electron to Windows Startup.

### Notifications and files

- [ ] Send a file from a phone/second computer with eqlShare hidden: one Windows toast appears, tray dot changes and the file syncs. Click the toast to open eqlShare.
- [ ] Repeat for a text/link clip with clipboard sharing enabled. Toast must not expose clipboard text or the file name.
- [ ] Sending from this Windows device and loading existing file/clip history must not generate arrival toasts.
- [ ] Reconnect realtime and verify duplicate delivery doesn't produce duplicate toasts. Disable Windows notifications/enable Do Not Disturb: syncing must continue without crashing.
- [ ] Download/open/drag-out/delete files with spaces, Unicode and Windows-reserved characters/device names. Local disk names are safe and remote display names remain intact.
- [ ] Run the existing auth/account-deletion checklist on Windows; deleting a user clears only eqlShare-owned downloads, not original files dragged in from Explorer.

### Mac regression

- [ ] Existing Option+Shift+F, tray menu, popover/panel preference, click-away, launch-at-login and Quick Look still work.
- [ ] Existing macOS packaging/deep-link flow still targets eqlShare.app. No Windows first-launch tip, startup registration, shortcut editor or toast path appears on Mac.
