import DeleteAccount from "./DeleteAccount";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type RefObject } from "react";
import { DEVICE_NAME_MAX } from "../hooks/useDevice";
import type { Usage } from "../limits";
import type { Density } from "../density";
import type { Session } from "@supabase/supabase-js";
import { designTokens } from "../../../design/tokens";
import { APP_NAME } from "../../../shared/appName";

interface HeaderProps {
  accountMenuRef: RefObject<HTMLDivElement | null>;
  authReady: boolean;
  isAccountMenuOpen: boolean;
  isOnline: boolean;
  onSignOut: () => void;
  onDeleteAccount?: () => Promise<string | null>;
  setIsAccountMenuOpen: (isOpen: boolean | ((current: boolean) => boolean)) => void;
  session: Session | null;
  arrivalPulse: number;
  deviceName?: string | null;
  onRenameDevice?: (name: string) => Promise<string | null>;
  usage?: Usage | null;
  windowMode?: "popover" | "panel" | "main";
  // Expanded popover: pop out into the separate resizable window.
  onPopOut?: () => void;
  // Popover: the avatar opens the settings panel instead of a dropdown,
  // and while it's open the header shows "← Back".
  onOpenSettings?: () => void;
  settingsOpen?: boolean;
  onBack?: () => void;
  density?: Density;
  onDensityChange?: (density: Density) => void;
  clipboardSharing?: boolean | null; // null/undefined hides it (flag off)
  onClipboardSharingChange?: (on: boolean) => void;
}

export default function Header({
  accountMenuRef,
  authReady,
  isAccountMenuOpen,
  isOnline,
  onSignOut,
  onDeleteAccount,
  setIsAccountMenuOpen,
  session,
  arrivalPulse,
  deviceName = null,
  onRenameDevice,
  usage = null,
  windowMode = "popover",
  onPopOut,
  onOpenSettings,
  settingsOpen = false,
  onBack,
  density = "compact",
  onDensityChange,
  clipboardSharing = null,
  onClipboardSharingChange,
}: HeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [draftName, setDraftName] = useState(deviceName ?? "");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (isAccountMenuOpen) {
      setDraftName(deviceName ?? "");
      setNameError("");
    }
  }, [isAccountMenuOpen, deviceName]);

  async function saveDeviceName(): Promise<void> {
    if (!onRenameDevice || draftName.trim() === (deviceName ?? "")) {
      return;
    }
    setNameError((await onRenameDevice(draftName)) ?? "");
  }

  return (
    <header className="topbar">
      {settingsOpen && onBack ? (
        <button type="button" className="back-button" onClick={onBack}>
          ← Back
        </button>
      ) : (
      <div className="brand">
        <motion.div
          className="brand-lockup"
          aria-hidden="true"
          animate={
            arrivalPulse > 0 && !prefersReducedMotion
              ? { rotate: [0, -7, 5, 0] }
              : { rotate: 0 }
          }
          transition={{
            type: "spring",
            stiffness: designTokens.springs.newCard.stiffness,
            damping: designTokens.springs.newCard.damping,
            mass: designTokens.springs.newCard.mass,
          }}
        >
          <picture>
            <source media="(prefers-color-scheme: dark)" srcSet="./lockup-dark.png" />
            <img src="./lockup-light.png" alt={APP_NAME} />
          </picture>
        </motion.div>
      </div>
      )}
      <div className="header-actions">
        {onPopOut && (
          <button
            type="button"
            className="window-close-button popout-button"
            aria-label="Pop out into a separate window"
            title="Pop out into a window"
            onClick={onPopOut}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
            </svg>
          </button>
        )}
        {windowMode !== "popover" && (
          // Frameless window: our own close (hides; Flick keeps running in the menu bar).
          <button
            type="button"
            className="window-close-button"
            aria-label="Close window"
            title="Close"
            onClick={() => window.flick.hideWindow()}
          >
            ×
          </button>
        )}
        <span
          className={`status-pill ${
            !isOnline
              ? "status-pill-offline"
              : session
                ? "status-pill-connected"
                : "status-pill-signed-out"
          }`}
          role="status"
        >
          <span className="status-pill-dot" aria-hidden="true" />
          {!isOnline ? "Offline" : session ? "Connected" : "Signed out"}
        </span>
        <div className="account-menu-container" ref={accountMenuRef}>
          <button
            className="account-button"
            type="button"
            aria-label="Account"
            aria-expanded={isAccountMenuOpen}
            aria-controls={isAccountMenuOpen ? "account-menu" : undefined}
            title="Account"
            onClick={() =>
              onOpenSettings ? onOpenSettings() : setIsAccountMenuOpen((isOpen) => !isOpen)
            }
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
            </svg>
          </button>
          {isAccountMenuOpen && (
            <div
              className="account-popover"
              id="account-menu"
              role="group"
              aria-label="Account details"
            >
              {session ? (
                <>
                  <span className="account-email" title={session.user.email}>
                    {session.user.email}
                  </span>
                  {usage && (
                    <span className="account-usage">
                      {usage.pinsUsed} of {usage.maxPins} pins,{" "}
                      {Math.round(usage.storageUsedBytes / (1024 * 1024))} of{" "}
                      {usage.maxStorageMb} MB, {usage.devicesUsed} of{" "}
                      {usage.maxDevices} devices
                    </span>
                  )}
                  {onDensityChange && (
                    <div className="density-setting" role="radiogroup" aria-label="Density">
                      <span className="density-label">Density</span>
                      {(["comfy", "compact"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={density === value}
                          className="density-option"
                          onClick={() => onDensityChange(value)}
                        >
                          {value === "comfy" ? "Comfy" : "Compact"}
                        </button>
                      ))}
                      {windowMode !== "main" && (
                        <span className="density-note">The menu bar popover and panel are always compact.</span>
                      )}
                    </div>
                  )}
                  {clipboardSharing !== null && onClipboardSharingChange && (
                    <label className="clipboard-setting">
                      <input
                        type="checkbox"
                        checked={clipboardSharing}
                        onChange={(event) => onClipboardSharingChange(event.target.checked)}
                      />
                      <span>
                        <strong>Clipboard sharing</strong>
                        <br />
                        Share text and links between your devices. {APP_NAME} only reads your
                        clipboard when you tap Send clipboard.
                      </span>
                    </label>
                  )}
                  {onRenameDevice && (
                    <form
                      className="device-name-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveDeviceName();
                      }}
                    >
                      <label>
                        This device
                        <input
                          type="text"
                          value={draftName}
                          maxLength={DEVICE_NAME_MAX}
                          placeholder="Name"
                          disabled={deviceName === null}
                          aria-label="This device name"
                          onChange={(event) => setDraftName(event.target.value)}
                          onBlur={() => void saveDeviceName()}
                        />
                      </label>
                      {nameError && (
                        <span className="device-name-error" role="alert">
                          {nameError}
                        </span>
                      )}
                    </form>
                  )}
                  {onDeleteAccount && <DeleteAccount onDelete={onDeleteAccount} />}
                  <button
                    className="sign-out-button"
                    type="button"
                    onClick={onSignOut}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <span className="account-signed-out">
                  {authReady ? "You’re signed out" : "Checking sign-in…"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
