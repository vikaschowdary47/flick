import { useRef, useState, type MouseEvent } from "react";

// Shared by file cards, compact rows and grid tiles: where the ⋯ menu is
// open, opened by the ⋯ button, right-click, or the context-menu key.
export function useCardMenu() {
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function openFromContextMenu(event: MouseEvent<HTMLElement>): void {
    event.preventDefault();
    const fromKeyboard = event.clientX === 0 && event.clientY === 0;
    const rect = (menuButtonRef.current ?? event.currentTarget).getBoundingClientRect();
    setMenuAt(
      fromKeyboard ? { x: rect.right, y: rect.bottom + 6 } : { x: event.clientX, y: event.clientY },
    );
  }

  function toggleFromButton(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    if (menuAt) {
      setMenuAt(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuAt({ x: rect.right, y: rect.bottom + 6 });
  }

  function close(restoreFocus: boolean): void {
    setMenuAt(null);
    if (restoreFocus) {
      menuButtonRef.current?.focus();
    }
  }

  return { menuAt, menuButtonRef, openFromContextMenu, toggleFromButton, close };
}
