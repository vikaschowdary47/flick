import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

interface FileMenuProps {
  at: { x: number; y: number };
  fileName: string;
  canPreview: boolean;
  pinned: boolean;
  onPreview: () => void;
  onShareLink: () => void;
  onRevokeShareLink: () => void;
  shareLinkActive: boolean;
  onTogglePin: () => void;
  onDelete: () => void;
  // restoreFocus: put focus back on the ⋯ button (keyboard close).
  onClose: (restoreFocus: boolean) => void;
}

// Sticker-style menu for one file card. Rendered into <body> so the card's
// transforms and the list's scrolling can't clip or offset it.
export default function FileMenu({
  at,
  fileName,
  canPreview,
  pinned,
  onPreview,
  onShareLink,
  onRevokeShareLink,
  shareLinkActive,
  onTogglePin,
  onDelete,
  onClose,
}: FileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: at.x, top: at.y });

  // Keep the menu inside the window; open from the right edge of the anchor.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }
    const { width, height } = menu.getBoundingClientRect();
    const margin = 8;
    setPosition({
      left: Math.max(margin, Math.min(at.x - width, window.innerWidth - width - margin)),
      top:
        at.y + height + margin > window.innerHeight
          ? Math.max(margin, at.y - height - 12)
          : at.y,
    });
    menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [at.x, at.y]);

  useEffect(() => {
    function closeOnOutside(event: PointerEvent): void {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose(false);
      }
    }
    const closeOnBlur = () => onClose(false);
    window.addEventListener("pointerdown", closeOnOutside, true);
    window.addEventListener("blur", closeOnBlur);
    window.addEventListener("resize", closeOnBlur);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutside, true);
      window.removeEventListener("blur", closeOnBlur);
      window.removeEventListener("resize", closeOnBlur);
    };
  }, [onClose]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      onClose(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  }

  function choose(action: () => void): void {
    onClose(true);
    action();
  }

  return createPortal(
    <div
      ref={menuRef}
      className="file-menu"
      role="menu"
      aria-label={`Actions for ${fileName}`}
      style={{ left: position.left, top: position.top }}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        className="file-menu-item"
        disabled={!canPreview}
        onClick={() => choose(onPreview)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.7" />
        </svg>
        Preview
      </button>
      <button
        type="button"
        role="menuitem"
        className="file-menu-item"
        onClick={() => choose(onTogglePin)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4h6l-1 6 3 3H7l3-3-1-6ZM12 13v7" />
        </svg>
        {pinned ? "Unpin" : "Pin"}
      </button>
      <button
        type="button"
        role="menuitem"
        className="file-menu-item"
        onClick={() => choose(shareLinkActive ? onRevokeShareLink : onShareLink)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
        {shareLinkActive ? "Revoke link" : "Share link"}
      </button>
      <button
        type="button"
        role="menuitem"
        className="file-menu-item file-menu-item-danger"
        onClick={() => choose(onDelete)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
        </svg>
        Delete
      </button>
    </div>,
    document.body,
  );
}
