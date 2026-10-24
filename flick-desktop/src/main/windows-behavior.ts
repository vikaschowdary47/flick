// Pure helpers: all coordinates are Electron device-independent pixels.
export type Rect = { x: number; y: number; width: number; height: number };
export function windowsPanelBounds(icon: Rect, bounds: Rect, area: Rect, width: number, height: number): Rect {
  const gap = 6;
  width = Math.max(1, Math.min(width, area.width - 2 * gap));
  height = Math.max(1, Math.min(height, area.height - 2 * gap));
  const cx = icon.x + icon.width / 2;
  const cy = icon.y + icon.height / 2;
  const insets = [area.y - bounds.y, bounds.y + bounds.height - area.y - area.height,
    area.x - bounds.x, bounds.x + bounds.width - area.x - area.width];
  let edge = insets.indexOf(Math.max(...insets)); // top, bottom, left, right
  if (Math.max(...insets) <= 0) {
    // Auto-hidden taskbar has no work-area inset. Use the icon's closest edge.
    const distances = [Math.abs(cy - bounds.y), Math.abs(bounds.y + bounds.height - cy),
      Math.abs(cx - bounds.x), Math.abs(bounds.x + bounds.width - cx)];
    edge = distances.indexOf(Math.min(...distances));
  }
  let x = cx - width / 2;
  let y = cy - height / 2;
  if (edge === 0) y = area.y + gap;
  if (edge === 1) y = area.y + area.height - height - gap;
  if (edge === 2) x = area.x + gap;
  if (edge === 3) x = area.x + area.width - width - gap;
  x = Math.max(area.x + gap, Math.min(x, area.x + area.width - width - gap));
  y = Math.max(area.y + gap, Math.min(y, area.y + area.height - height - gap));
  return { x: Math.round(x), y: Math.round(y), width, height };
}

export function normalizeWindowsShortcut(value: string): string | null {
  const parts = value.trim().split('+').map((part) => part.trim());
  if (parts.length < 2 || parts.length > 5 || parts.some((part) => !part)) return null;
  const aliases: Record<string, string> = { ctrl: 'Ctrl', control: 'Ctrl', alt: 'Alt', shift: 'Shift', super: 'Super', win: 'Super' };
  const modifiers = parts.slice(0, -1).map((part) => aliases[part.toLowerCase()]);
  if (modifiers.some((part) => !part) || new Set(modifiers).size !== modifiers.length) return null;
  if (!modifiers.some((part) => part === 'Ctrl' || part === 'Alt' || part === 'Super')) return null;
  const last = parts.at(-1)!;
  const named = ['Space', 'Enter', 'Tab', 'Escape', 'Home', 'End', 'PageUp', 'PageDown', 'Up', 'Down', 'Left', 'Right', 'Insert', 'Delete'];
  const key = named.find((part) => part.toLowerCase() === last.toLowerCase())
    ?? (/^[a-z0-9]$/i.test(last) || /^F([1-9]|1[0-9]|2[0-4])$/i.test(last) ? last.toUpperCase() : null);
  if (!key) return null;
  return [...['Ctrl', 'Alt', 'Shift', 'Super'].filter((part) => modifiers.includes(part)), key].join('+');
}

export function replaceShortcut(current: string | null, next: string,
  register: (value: string) => boolean, unregister: (value: string) => void): boolean {
  if (current === next) return true;
  // Reserve the new shortcut before releasing the old one; conflicts keep it usable.
  try { if (!register(next)) return false; } catch { return false; }
  if (current) unregister(current);
  return true;
}

export function windowsFileName(value: string): string {
  // Display names remain unchanged in the UI; only the local disk copy is sanitized.
  let safe = Array.from(value).map((char) => char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char).join('');
  safe = safe.replace(/[ .]+$/g, '');
  if (!safe) safe = 'file';
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(safe)) safe = `_${safe}`;
  return safe;
}
