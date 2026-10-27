import { motion, useReducedMotion } from "framer-motion";
import { designTokens } from "../../../design/tokens";
import { APP_NAME } from "../../../shared/appName";

// Header for the menu bar popover and floating panel (redesign v2): the app
// mark and name, who's online, then small icon buttons. The main window keeps
// the larger Header.
interface PopoverHeaderProps {
  isOnline: boolean;
  signedIn: boolean;
  otherDevices: string[];
  arrivalPulse: number;
  settingsOpen: boolean;
  onBack?: () => void;
  onOpenSettings?: () => void;
  onAddFiles?: () => void;
  isUploading?: boolean;
  onPopOut?: () => void;
  onClose?: () => void;
}

export function AppMark({ size = 20 }: { size?: number }) {
  return (
    <svg className="pv-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7.5" fill="#F5B83D" />
      <rect x="8" y="6.5" width="16" height="4.5" rx="2.25" fill="#2B2210" />
      <polygon points="9.5,15 22.5,15 16,24" fill="#2B2210" stroke="#2B2210" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function Icon({ d, flip = false }: { d: string; flip?: boolean }) {
  return (
    <svg className="pv-i" viewBox="0 0 24 24" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d={d} />
    </svg>
  );
}

const GEAR =
  "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z";
const PLUS = "M12 5.5v13M5.5 12h13";
const CHEV = "m9 5.5 6.5 6.5L9 18.5";
const POPOUT = "M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4";
const CLOSE = "M6.5 6.5l11 11M17.5 6.5l-11 11";

export default function PopoverHeader({
  isOnline,
  signedIn,
  otherDevices,
  arrivalPulse,
  settingsOpen,
  onBack,
  onOpenSettings,
  onAddFiles,
  isUploading = false,
  onPopOut,
  onClose,
}: PopoverHeaderProps) {
  const reduceMotion = useReducedMotion();
  if (settingsOpen && onBack) {
    return (
      <header className="topbar pv-head">
        <button type="button" className="pv-ib" aria-label="Back" onClick={onBack}>
          <Icon d={CHEV} flip />
        </button>
        <b className="pv-title">Settings</b>
        <span className="pv-grow" />
      </header>
    );
  }
  // On the right: "● Connected", or "● 2 devices" with their names on hover.
  const live = isOnline && signedIn;
  const label = !isOnline ? "Offline" : !signedIn ? "Signed out" : otherDevices.length > 0 ? `${otherDevices.length} ${otherDevices.length === 1 ? "device" : "devices"}` : "Connected";
  return (
    <header className="topbar pv-head">
      <motion.span
        className="pv-mark-wrap"
        animate={arrivalPulse > 0 && !reduceMotion ? { rotate: [0, -12, 9, 0] } : { rotate: 0 }}
        transition={{ type: "spring", ...designTokens.springs.newCard }}
      >
        <AppMark />
      </motion.span>
      <b className="pv-title" translate="no">{APP_NAME}</b>
      <span className="pv-grow" />
      <span
        className={`pv-status${live ? " is-live" : ""}${live && otherDevices.length > 0 ? " has-devices" : ""}`}
        role="status"
        tabIndex={live && otherDevices.length > 0 ? 0 : undefined}
        aria-label={live && otherDevices.length > 0 ? `Connected to ${otherDevices.join(", ")}` : label}
      >
        <i aria-hidden="true" />
        <span>{label}</span>
        {live && otherDevices.length > 0 && (
          <span className="pv-devices" aria-hidden="true">
            <b>Signed in on</b>
            {otherDevices.map((name, index) => (
              <span key={`${name}-${index}`}>{name}</span>
            ))}
          </span>
        )}
      </span>
      {onPopOut && (
        <button type="button" className="pv-ib" aria-label="Pop out into a separate window" title="Pop out" onClick={onPopOut}>
          <Icon d={POPOUT} />
        </button>
      )}
      {onAddFiles && (
        <button
          type="button"
          className="pv-ib"
          aria-label={isUploading ? "Uploading…" : "Send files from this computer"}
          title={isUploading ? "Uploading…" : "Send files"}
          disabled={isUploading}
          onClick={onAddFiles}
        >
          <Icon d={PLUS} />
        </button>
      )}
      {onOpenSettings && (
        <button type="button" className="pv-ib" aria-label="Settings" title="Settings" onClick={onOpenSettings}>
          <Icon d={GEAR} />
        </button>
      )}
      {onClose && (
        <button type="button" className="pv-ib" aria-label="Close window" title="Close" onClick={onClose}>
          <Icon d={CLOSE} />
        </button>
      )}
    </header>
  );
}
