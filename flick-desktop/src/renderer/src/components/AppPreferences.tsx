import { useEffect, useState } from "react";
import type { DesktopAppSettings } from "../../../shared/appSettings";
import { APP_NAME } from "../../../shared/appName";

// Themed on/off switch: coral when on, cream when off, navy outline.
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" aria-hidden="true" />
    </button>
  );
}

export function AppPreferences() {
  const [app, setApp] = useState<DesktopAppSettings | null>(null);
  const [shortcutDraft, setShortcutDraft] = useState("");
  const [appMessage, setAppMessage] = useState("");
  const [savingShortcut, setSavingShortcut] = useState(false);
  useEffect(() => {
    void window.flick.getAppSettings().then((settings) => { setApp(settings); setShortcutDraft(settings.shortcut); })
      .catch(() => setAppMessage("Couldn't load app settings. Reopen Settings to try again."));
  }, []);

  return <>
      {app && !app.isWindows && (
        <section className="settings-group">
          <p className="settings-label">Show from menu bar as</p>
          <div className="settings-segments" role="radiogroup" aria-label="Show from menu bar as">
            {(
              [
                ["popover", "Popover"],
                ["panel", "Floating panel"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={app.showAs === value}
                className="settings-segment"
                onClick={() => {
                  setApp({ ...app, showAs: value });
                  void window.flick.setShowAs(value);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {app?.isWindows && <section className="settings-group">
        <label className="settings-label" htmlFor="settings-shortcut">Open / close {APP_NAME} shortcut</label>
        <input id="settings-shortcut" className="settings-input" value={shortcutDraft} maxLength={60}
          placeholder="Ctrl+Shift+Space" disabled={savingShortcut} spellCheck={false}
          onChange={(event) => setShortcutDraft(event.target.value)} />
        <p className="settings-help">Type a combination such as Ctrl+Shift+Space or Ctrl+Alt+F.</p>
        <button type="button" className="settings-segment" disabled={savingShortcut} onClick={() => {
          setSavingShortcut(true); setAppMessage("");
          void window.flick.setShortcut(shortcutDraft).then((result) => {
            setApp(result.settings);
            if (result.error) setAppMessage(result.error);
            else { setShortcutDraft(result.settings.shortcut); setAppMessage("Shortcut saved."); }
          }).catch(() => setAppMessage("Couldn't save that shortcut. Try again.")).finally(() => setSavingShortcut(false));
        }}>{savingShortcut ? "Saving…" : "Save shortcut"}</button>
        {!app.shortcutRegistered && <p className="settings-help" role="alert">{app.shortcutError ?? "The shortcut is unavailable. Choose another combination."}</p>}
        {!app.canLaunchAtLogin && <p className="settings-help">Install {APP_NAME} to enable Start with Windows.</p>}
      </section>}
      {appMessage && <p className="settings-help" role="status">{appMessage}</p>}

      {app?.canLaunchAtLogin && (
        <section className="settings-group settings-row">
          <p className="settings-label">{app.isWindows ? "Start with Windows" : "Launch at login"}</p>
          <Toggle
            label={app.isWindows ? "Start with Windows" : "Launch at login"}
            checked={app.launchAtLogin}
            onChange={(on) => {
              void window.flick.setLaunchAtLogin(on).then(setApp)
                .catch(() => setAppMessage("Couldn't change startup settings. Please try again."));
            }}
          />
        </section>
      )}

  </>;
}
