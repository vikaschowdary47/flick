import { useEffect, useRef, useState } from "react";
import type { DeviceRow } from "../hooks/useDevice";
import { useWaitlist } from "../hooks/useWaitlist";
import type { LimitKind, Usage } from "../limits";

interface LimitScreenProps {
  limit: LimitKind | null; // null hides the screen
  usage: Usage | null; // limits from the server; may still be loading
  email: string | null;
  devices: DeviceRow[];
  thisDeviceId: string | null;
  onRemoveDevice: (id: string) => Promise<string | null>;
  paymentsEnabled: boolean; // the "payments" feature flag
  onClose: () => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  ios: "iPhone",
  android: "Android",
  macos: "Mac",
  windows: "Windows",
  linux: "Linux",
  web: "Web",
};

function lastActive(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 2) {
    return "Active now";
  }
  if (minutes < 60) {
    return `Active ${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `Active ${hours}h ago` : `Active ${Math.round(hours / 24)}d ago`;
}

function copy(limit: LimitKind, usage: Usage | null): { title: string; body: string } {
  if (limit === "pins") {
    return {
      title: usage ? `You've used ${usage.maxPins} of ${usage.maxPins} pins` : "All your pins are used",
      body: "Unpin a file to pin a new one.",
    };
  }
  if (limit === "storage") {
    return {
      title: usage ? `Storage full (${usage.maxStorageMb} MB)` : "Storage full",
      body: "Delete a few old files to make room for new ones.",
    };
  }
  if (limit === "sharing") {
    return {
      title: "Share links are for files up to 50 MB",
      body: "Flick links use the same 50 MB file limit. We’ll let you know when larger links are available.",
    };
  }
  return {
    title: usage
      ? `You're signed in on ${usage.maxDevices} of ${usage.maxDevices} devices`
      : "Too many devices",
    body: "Remove a device you don't use to sign in here.",
  };
}

// Same screen as the phone's: pins, storage or devices. The secondary action
// is the Pro waitlist while the "payments" feature flag is off; turning it on
// swaps in an upgrade button (no payment code exists yet).
export default function LimitScreen({
  limit,
  usage,
  email,
  devices,
  thisDeviceId,
  onRemoveDevice,
  paymentsEnabled,
  onClose,
}: LimitScreenProps) {
  const waitlist = useWaitlist(email);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus the first button when the screen opens; Escape closes it.
  useEffect(() => {
    if (!limit) {
      return;
    }
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [limit]);

  if (!limit) {
    return null;
  }
  const { title, body } = copy(limit, usage);

  function close(): void {
    waitlist.reset();
    setRemoveError("");
    onClose();
  }

  return (
    <div className="limit-overlay">
      <div
        ref={dialogRef}
        className="limit-screen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-title"
      >
        <h2 id="limit-title">{title}</h2>
        <p className="limit-body">{body}</p>

        {limit === "devices" && (
          <div className="limit-devices">
            <p className="eyebrow">REMOVE A DEVICE</p>
            {devices.map((device) => {
              const isThis = device.id === thisDeviceId;
              return (
                <div className="limit-device" key={device.id}>
                  <span className="limit-device-text">
                    <span className="limit-device-name">{device.name}</span>
                    <span className="limit-device-meta">
                      {PLATFORM_LABELS[device.platform] ?? "Device"} ·{" "}
                      {isThis ? "This device" : lastActive(device.last_seen_at)}
                    </span>
                  </span>
                  {!isThis && (
                    <button
                      type="button"
                      className="limit-remove-button"
                      disabled={removingId !== null}
                      aria-label={`Remove ${device.name} and sign it out`}
                      onClick={async () => {
                        setRemovingId(device.id);
                        setRemoveError((await onRemoveDevice(device.id)) ?? "");
                        setRemovingId(null);
                      }}
                    >
                      {removingId === device.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              );
            })}
            {removeError && (
              <p className="limit-note" role="alert">
                {removeError}
              </p>
            )}
          </div>
        )}

        <div className="limit-actions">
          {limit !== "devices" && limit !== "sharing" && (
            // The widget list is right behind this screen: close it to delete or unpin.
            <button type="button" className="sign-in-button" onClick={close}>
              Free up space
            </button>
          )}
          {paymentsEnabled ? (
            // Later: the real upgrade flow goes here.
            <button type="button" className="sign-in-button sign-in-button-secondary" onClick={close}>
              Upgrade
            </button>
          ) : waitlist.state === "joined" ? (
            <p className="limit-note" role="status">
              We&apos;ll email you once, when more is available.
            </p>
          ) : (
            <button
              type="button"
              className="sign-in-button sign-in-button-secondary"
              disabled={waitlist.state === "saving"}
              onClick={() => void waitlist.join(limit)}
            >
              Notify me when more is available
            </button>
          )}
          {!paymentsEnabled && (
            <p className="limit-note">
              {waitlist.state === "error"
                ? "Couldn't save that. Check your connection and try again."
                : "One email, no spam. Reply “unsubscribe” to it and we'll take you off the list."}
            </p>
          )}
          <button type="button" className="limit-not-now" onClick={close}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
