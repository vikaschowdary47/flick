import { useEffect, useState } from "react";
import type { Usage } from "../limits";

interface SettingsPanelProps {
  email: string | null;
  usage: Usage | null;
  // null hides Clipboard sharing (the "clipboard" feature flag is off).
  clipboardSharing: boolean | null;
  onClipboardSharingChange: (on: boolean) => void;
  onSignOut: () => void;
}

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

function UsageBar({ label, used, max, text }: { label: string; used: number; max: number; text: string }) {
  const share = max > 0 ? Math.min(1, used / max) : 0;
  return (
    <div className="usage-bar">
      <div className="usage-bar-labels">
        <span>{label}</span>
        <span>{text}</span>
      </div>
      <div
        className={`usage-bar-track${share >= 0.8 ? " usage-bar-high" : ""}`}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={used}
      >
        <span className="usage-bar-fill" style={{ width: `${Math.round(share * 100)}%` }} />
      </div>
    </div>
  );
}

// Settings inside the menu bar popover: replaces the list (the header shows
// "← Back"), so nothing floats over it or gets clipped. Density isn't here:
// the popover is always compact (it's in the pop-out window's menu).
export default function SettingsPanel({
  email,
  usage,
  clipboardSharing,
  onClipboardSharingChange,
  onSignOut,
}: SettingsPanelProps) {
  const [app, setApp] = useState<{ showAs: "popover" | "panel"; canLaunchAtLogin: boolean; launchAtLogin: boolean } | null>(
    null,
  );
  useEffect(() => {
    void window.flick.getAppSettings().then(setApp);
  }, []);

  const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

  return (
    <div className="settings-panel">
      <section className="settings-group">
        {email && <p className="settings-email">{email}</p>}
        {usage && (
          <div className="usage-bars">
            <UsageBar label="Pins" used={usage.pinsUsed} max={usage.maxPins} text={`${usage.pinsUsed}/${usage.maxPins}`} />
            <UsageBar
              label="Storage"
              used={usage.storageUsedBytes}
              max={usage.maxStorageMb * 1024 * 1024}
              text={`${mb(usage.storageUsedBytes)} MB/${usage.maxStorageMb} MB`}
            />
            <UsageBar
              label="Devices"
              used={usage.devicesUsed}
              max={usage.maxDevices}
              text={`${usage.devicesUsed}/${usage.maxDevices}`}
            />
          </div>
        )}
      </section>

      {clipboardSharing !== null && (
        <section className="settings-group settings-row">
          <div>
            <p className="settings-label">Clipboard sharing</p>
            <p className="settings-help">
              Share text and links between your devices. Flick only reads your clipboard when you tap Send clipboard.
            </p>
          </div>
          <Toggle label="Clipboard sharing" checked={clipboardSharing} onChange={onClipboardSharingChange} />
        </section>
      )}

      {app && (
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

      {app?.canLaunchAtLogin && (
        <section className="settings-group settings-row">
          <p className="settings-label">Launch at login</p>
          <Toggle
            label="Launch at login"
            checked={app.launchAtLogin}
            onChange={(on) => {
              setApp({ ...app, launchAtLogin: on });
              void window.flick.setLaunchAtLogin(on);
            }}
          />
        </section>
      )}

      <button type="button" className="settings-sign-out" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
