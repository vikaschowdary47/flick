import { AppPreferences, Toggle } from "./AppPreferences";
import DeleteAccount from "./DeleteAccount";
import { useEffect, useState } from "react";
import { DEVICE_NAME_MAX } from "../hooks/useDevice";
import type { Usage } from "../limits";

interface SettingsPanelProps {
  email: string | null;
  usage: Usage | null;
  // null hides Clipboard sharing (the "clipboard" feature flag is off).
  clipboardSharing: boolean | null;
  onClipboardSharingChange: (on: boolean) => void;
  onSignOut: () => void;
  onDeleteAccount?: () => Promise<string | null>;
  // This device's name, shown as "from …" on your other devices.
  deviceName: string | null;
  onRenameDevice: (name: string) => Promise<string | null>;
}

function Meter({ label, used, max, text }: { label: string; used: number; max: number; text: string }) {
  const share = max > 0 ? Math.min(1, used / max) : 0;
  return (
    <div className="pv-r">
      <span className="pv-k">{label}</span>
      <span
        className={`pv-meter${share >= 0.8 ? " is-high" : ""}`}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={used}
      >
        <i style={{ width: `${Math.round(share * 100)}%` }} />
      </span>
      <span className="pv-v">{text}</span>
    </div>
  );
}

// Settings inside the menu bar popover or floating panel: replaces the list
// (the header shows "← Back"), so nothing floats over it or gets clipped.
export default function SettingsPanel({
  email,
  usage,
  clipboardSharing,
  onClipboardSharingChange,
  onSignOut,
  onDeleteAccount,
  deviceName,
  onRenameDevice,
}: SettingsPanelProps) {
  const [draftName, setDraftName] = useState(deviceName ?? "");
  const [nameMessage, setNameMessage] = useState("");
  useEffect(() => setDraftName(deviceName ?? ""), [deviceName]);
  async function saveName(): Promise<void> {
    if (draftName.trim() === (deviceName ?? "")) {
      return;
    }
    setNameMessage((await onRenameDevice(draftName)) ?? "Saved");
  }
  const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

  return (
    <div className="settings-panel pv-form">
      <div className="pv-box">
        <div className="pv-r">
          <span className="pv-k pv-ellipsis" title={email ?? undefined}>{email ?? "Signed in"}</span>
          {usage?.plan && <span className="pv-v">{usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} plan</span>}
        </div>
        {usage && (
          <>
            <Meter
              label="Storage"
              used={usage.storageUsedBytes}
              max={usage.maxStorageMb * 1024 * 1024}
              text={`${mb(usage.storageUsedBytes)} of ${usage.maxStorageMb} MB`}
            />
            <Meter label="Pins" used={usage.pinsUsed} max={usage.maxPins} text={`${usage.pinsUsed} of ${usage.maxPins}`} />
            <Meter label="Devices" used={usage.devicesUsed} max={usage.maxDevices} text={`${usage.devicesUsed} of ${usage.maxDevices}`} />
          </>
        )}
      </div>

      <div className="pv-box">
        <label className="pv-r" htmlFor="settings-device-name">
          <span className="pv-k">{navigator.platform.startsWith("Mac") ? "This Mac" : "This PC"}</span>
          <input
            id="settings-device-name"
            className="pv-input"
            type="text"
            value={draftName}
            maxLength={DEVICE_NAME_MAX}
            placeholder="Name"
            disabled={deviceName === null}
            onChange={(event) => {
              setDraftName(event.target.value);
              setNameMessage("");
            }}
            onBlur={() => void saveName()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void saveName();
              }
            }}
          />
        </label>
        <AppPreferences />
      </div>
      {nameMessage && <p className="pv-help" role="status">{nameMessage}</p>}

      {clipboardSharing !== null && (
        <>
          <div className="pv-box">
            <div className="pv-r">
              <span className="pv-k">Clipboard sharing</span>
              <Toggle label="Clipboard sharing" checked={clipboardSharing} onChange={onClipboardSharingChange} />
            </div>
            {clipboardSharing && (
              <div className="pv-r">
                <span className="pv-k">Clipboard shortcut</span>
                <span className="pv-v"><span className="pv-kbd">{navigator.platform.startsWith("Mac") ? "⌥⇧C" : "Alt+Shift+C"}</span></span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="pv-btns">
        <button type="button" className="pv-btn" onClick={onSignOut}>
          Sign out
        </button>
        {onDeleteAccount && <DeleteAccount onDelete={onDeleteAccount} />}
      </div>
    </div>
  );
}
