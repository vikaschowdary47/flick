import { motion, useReducedMotion } from "framer-motion";
import type { RefObject } from "react";
import type { Session } from "@supabase/supabase-js";
import { designTokens } from "../../../design/tokens";

interface HeaderProps {
  accountMenuRef: RefObject<HTMLDivElement | null>;
  authReady: boolean;
  isAccountMenuOpen: boolean;
  isOnline: boolean;
  onSignOut: () => void;
  setIsAccountMenuOpen: (isOpen: boolean | ((current: boolean) => boolean)) => void;
  session: Session | null;
  arrivalPulse: number;
}

export default function Header({
  accountMenuRef,
  authReady,
  isAccountMenuOpen,
  isOnline,
  onSignOut,
  setIsAccountMenuOpen,
  session,
  arrivalPulse,
}: HeaderProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <header className="topbar">
      <div className="brand">
        <motion.div
          className="brand-mark"
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
          <svg viewBox="0 0 32 32">
            <path d="M10 22 22 10M12 10h10v10" />
          </svg>
        </motion.div>
        <span className="brand-name">flick</span>
      </div>
      <div className="header-actions">
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
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
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
