import { useEffect, useState } from "react";
import { formatAgo, siteName, type ClipRow } from "../clips";
import { useNow } from "../hooks/useNow";
import type { Density } from "../density";
import { formatSender } from "../types";
import { useClipHistory } from "../hooks/useClipHistory";
import type { ClipHistoryEntry } from "../../../shared/appSettings";

interface ClipsPanelProps {
  clips: ClipRow[];
  error: string;
  deviceId: string | null;
  deviceNames: Record<string, string>;
  onSend: (text: string) => Promise<string | null>;
  onDelete: (id: string) => void;
  sendStatus: string; // result of the last shortcut/tray send
  density: Density;
  // Popover: no heading, and only the newest `limit` clips (all when taller).
  popover?: boolean;
  limit?: number;
  // Popover: grow to the taller view (all clips and the full history).
  onShowMore?: () => void;
}

const COPIED_MS = 1500;

function ClipCard({
  clip,
  sender,
  now,
  onDelete,
  compact,
}: {
  clip: ClipRow;
  sender: string;
  now: number;
  onDelete: () => void;
  compact: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy(): Promise<void> {
    await window.flick.writeClipboard(clip.content);
    setCopied(true);
  }

  const isLink = clip.kind === "link";
  const meta = [sender, formatAgo(clip.created_at, now)].filter(Boolean).join(" · ");

  if (compact) {
    // ~40px chip: type icon, the site or first line, "from … · 10h ago",
    // a copy icon, and × on hover. Clicking the chip copies too.
    const firstLine = clip.content.split(/\r?\n/).find((line) => line.trim()) ?? clip.content;
    return (
      <article className={`clip-chip clip-card-${clip.kind}`} title={clip.content}>
        <button
          type="button"
          className="clip-chip-main"
          aria-label={`Copy ${isLink ? `link to ${siteName(clip.content)}` : "clip"}`}
          onClick={() => void copy()}
        >
          <span className="clip-chip-icon" aria-hidden="true">
            {isLink ? (
              <svg viewBox="0 0 24 24">
                <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <path d="M5 6h14M5 11h14M5 16h9" />
              </svg>
            )}
          </span>
          <span className="clip-chip-text">
            <span className="clip-chip-title">{isLink ? siteName(clip.content) : firstLine}</span>
            <span className="clip-chip-meta">{copied ? "Copied!" : meta}</span>
          </span>
        </button>
        <button
          type="button"
          className="clip-chip-icon-button"
          aria-label="Copy"
          title="Copy"
          onClick={() => void copy()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="8" y="8" width="12" height="12" rx="2.5" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
        </button>
        <button
          type="button"
          className="clip-chip-icon-button clip-chip-delete"
          aria-label="Delete clip from all devices"
          title="Delete everywhere"
          onClick={onDelete}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </article>
    );
  }

  return (
    <article className={`clip-card clip-card-${clip.kind}`}>
      <button
        type="button"
        className="clip-main"
        title={clip.content}
        aria-label={`Copy ${isLink ? `link to ${siteName(clip.content)}` : "clip"}`}
        onClick={() => void copy()}
      >
        <span className="clip-content">{isLink ? siteName(clip.content) : clip.content}</span>
        <span className="clip-meta">{copied ? "Copied!" : meta}</span>
      </button>
      <button type="button" className="clip-copy" onClick={() => void copy()}>
        {copied ? "Copied!" : "Copy"}
      </button>
      <button
        type="button"
        className="file-action-button"
        aria-label="Delete clip from all devices"
        title="Delete everywhere"
        onClick={onDelete}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </article>
  );
}

// Redesign v2 clip row (popover and panel): a small type badge, the text (two
// lines), who sent it and when, and a copy button. Click anywhere to copy.
function looksLikeCode(text: string): boolean {
  return /^\s*(\$ |npm |npx |git |cd |rm |sudo |yarn |pnpm |brew |curl |docker )|[{};]\s*$|&&|=>/.test(text);
}

const SITE_BADGES: Record<string, string> = { github: "GH", gitlab: "GL", figma: "Fi", youtube: "YT", google: "G", notion: "N", linear: "Li", vercel: "▲" };

function linkParts(url: string): { site: string; title: string; badge: string } {
  const site = siteName(url);
  const root = site.split(".").slice(-2, -1)[0] ?? site;
  const path = url.replace(/^https?:\/\/[^/]+/i, "").replace(/[?#].*$/, "").replace(/^\/+|\/+$/g, "");
  return {
    site,
    title: path ? decodeURIComponent(path) : site,
    badge: SITE_BADGES[root.toLowerCase()] ?? root.charAt(0).toUpperCase(),
  };
}

function agoLong(iso: string, now: number): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return hours < 48 ? "yesterday" : `${Math.floor(hours / 24)} days ago`;
}

function ClipRowV2({ clip, sender, now, onDelete }: { clip: ClipRow; sender: string; now: number; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);
  async function copy(): Promise<void> {
    await window.flick.writeClipboard(clip.content);
    setCopied(true);
  }
  const isLink = clip.kind === "link";
  const code = !isLink && looksLikeCode(clip.content);
  const link = isLink ? linkParts(clip.content) : null;
  const site = link?.site ?? "";
  const badge = link ? link.badge : code ? "$_" : "Aa";
  const meta = [site, sender, agoLong(clip.created_at, now)].filter(Boolean).join(", ");
  return (
    <article className="pv-clip" title={clip.content}>
      <button type="button" className="pv-clip-main" aria-label={`Copy ${isLink ? `link to ${site}` : "clip"}`} onClick={() => void copy()}>
        <span className={`pv-fav${isLink ? " is-link" : code ? " is-code" : ""}`} aria-hidden="true">{badge}</span>
        <span className="pv-t">
          <span className="pv-tx">{code ? <span className="pv-code">{clip.content}</span> : link ? link.title : clip.content}</span>
          <span className="pv-mt">{copied ? "Copied" : meta}</span>
        </span>
      </button>
      <button type="button" className="pv-ib" aria-label="Copy" title="Copy" onClick={() => void copy()}>
        {copied ? (
          <svg className="pv-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
        ) : (
          <svg className="pv-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" /><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2" /></svg>
        )}
      </button>
      <button type="button" className="pv-ib pv-clip-del" aria-label="Delete clip from all devices" title="Delete everywhere" onClick={onDelete}>
        <svg className="pv-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
      </button>
    </article>
  );
}

// One entry of this computer's clipboard history: click copies it again;
// on hover, Send shares it with your devices, Pin keeps it, × forgets it.
function HistoryRowV2({ entry, now, onSend, onPin, onRemove }: { entry: ClipHistoryEntry; now: number; onSend: () => void; onPin: () => void; onRemove: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const text = entry.text.trim();
  const isLink = /^https?:\/\/\S+$/i.test(text);
  const code = !isLink && looksLikeCode(text);
  const link = isLink ? linkParts(text) : null;
  const badge = link ? link.badge : code ? "$_" : "Aa";
  const meta = [link?.site ?? "", entry.pinned ? "Pinned" : "", agoLong(entry.copiedAt, now)].filter(Boolean).join(", ");
  return (
    <article className="pv-clip pv-hist" title={entry.text}>
      <button
        type="button"
        className="pv-clip-main"
        aria-label={`Copy ${link ? `link to ${link.site}` : "this text"} again`}
        onClick={() => void window.flick.writeClipboard(entry.text).then(() => setCopied(true))}
      >
        <span className={`pv-fav${isLink ? " is-link" : code ? " is-code" : ""}`} aria-hidden="true">{badge}</span>
        <span className="pv-t">
          <span className="pv-tx">{code ? <span className="pv-code">{text}</span> : link ? link.title : text}</span>
          <span className="pv-mt">{copied ? "Copied" : meta}</span>
        </span>
      </button>
      <span className="pv-hist-actions">
        <button type="button" className="pv-ib" aria-label="Send to your devices" title="Send to your devices" onClick={onSend}>
          <svg className="pv-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
        </button>
        <button type="button" className={`pv-ib${entry.pinned ? " is-on" : ""}`} aria-label={entry.pinned ? "Unpin" : "Pin"} aria-pressed={Boolean(entry.pinned)} title={entry.pinned ? "Unpin" : "Pin"} onClick={onPin}>
          <svg className="pv-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-1 6 3 3H7l3-3-1-6ZM12 13v7" /></svg>
        </button>
        <button type="button" className="pv-ib" aria-label="Remove from history" title="Remove" onClick={onRemove}>
          <svg className="pv-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
        </button>
      </span>
    </article>
  );
}

export const HISTORY_COMPACT = 8;

// The Clips tab: Send clipboard (reads the clipboard only on click) and the list.
export default function ClipsPanel({
  clips,
  error,
  deviceId,
  deviceNames,
  onSend,
  onDelete,
  sendStatus,
  density,
  popover = false,
  limit = Number.POSITIVE_INFINITY,
  onShowMore,
}: ClipsPanelProps) {
  const now = useNow();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendClipboard(): Promise<void> {
    const text = await window.flick.readClipboard();
    if (!text.trim()) {
      setMessage("Your clipboard is empty.");
      return;
    }
    setBusy(true);
    setMessage((await onSend(text)) ?? "Sent to your devices.");
    setBusy(false);
  }

  const status = message || sendStatus || error;
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const history = useClipHistory();

  async function sendDraft(): Promise<void> {
    if (!draft.trim()) {
      await sendClipboard();
      return;
    }
    setBusy(true);
    const result = await onSend(draft);
    setMessage(result ?? "Sent to your devices.");
    if (!result) setDraft("");
    setBusy(false);
  }

  if (popover) {
    const compactView = Number.isFinite(limit);
    const query = search.trim().toLowerCase();
    const historyRows = history.entries
      .filter((entry) => !query || entry.text.toLowerCase().includes(query))
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    const shownHistory = compactView ? historyRows.slice(0, HISTORY_COMPACT) : historyRows;
    return (
      <>
        <form
          className="pv-send"
          onSubmit={(event) => {
            event.preventDefault();
            void sendDraft();
          }}
        >
          <input
            className="pv-fld"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a clip…"
            aria-label="New clip"
            disabled={busy}
          />
          <button type="submit" className="pv-send-btn clip-send" disabled={busy} title="Option/Alt+Shift+C">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {draft.trim() ? <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /> : <><rect x="5.5" y="4.5" width="13" height="16" rx="2.5" /><path d="M9 4.5V3.8c0-.7.5-1.3 1.2-1.3h3.6c.7 0 1.2.6 1.2 1.3v.7M9 10h6M9 14h4" /></>}
            </svg>
            {busy ? "Sending…" : draft.trim() ? "Send" : "Send clipboard"}
          </button>
        </form>
        {status && <p className="pv-note" role="status">{status}</p>}
        <div className="pv-lbl">Shared with your devices<span>{clips.length}</span></div>
        {clips.length === 0 ? (
          <p className="pv-note">No clips yet. Send one from any device.</p>
        ) : (
          <div className="pv-rows pv-clips">
            {clips.slice(0, compactView ? Math.min(limit, 3) : limit).map((clip) => (
              <ClipRowV2 key={clip.id} clip={clip} now={now} sender={formatSender(clip.device_id, deviceId, deviceNames)} onDelete={() => onDelete(clip.id)} />
            ))}
          </div>
        )}
        <div className="pv-lbl">
          Copied on this {navigator.platform.startsWith("Mac") ? "Mac" : "PC"}
          {history.enabled && history.entries.length > 0 ? (
            <button type="button" className="pv-lbl-btn" onClick={history.clear} title="Clear history (keeps pinned)">Clear</button>
          ) : (
            <span>{history.entries.length}</span>
          )}
        </div>
        {!history.enabled ? (
          <div className="pv-hist-off">
            <p>Keep a history of what you copy on this computer, so you can copy it again or send it to your phone. It stays on this computer.</p>
            <button type="button" className="pv-btn" onClick={() => history.setEnabled(true)}>Turn on clipboard history</button>
          </div>
        ) : (
          <>
            {!compactView && history.entries.length > 6 && (
              <input className="pv-fld pv-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search history" aria-label="Search clipboard history" />
            )}
            {shownHistory.length === 0 ? (
              <p className="pv-note">{query ? "Nothing matches." : "Copy anything and it shows up here."}</p>
            ) : (
              <div className="pv-rows pv-clips">
                {shownHistory.map((entry) => (
                  <HistoryRowV2
                    key={entry.id}
                    entry={entry}
                    now={now}
                    onSend={() => {
                      setBusy(true);
                      void onSend(entry.text).then((result) => {
                        setMessage(result ?? "Sent to your devices.");
                        setBusy(false);
                      });
                    }}
                    onPin={() => history.pin(entry.id, !entry.pinned)}
                    onRemove={() => history.remove(entry.id)}
                  />
                ))}
                {compactView && historyRows.length > shownHistory.length && onShowMore && (
                  <button type="button" className="pv-more-row" onClick={onShowMore}>
                    Show all {historyRows.length} copied items
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <>
      {!popover && (
        <div className="section-heading">
          <div>
            <p className="eyebrow">CLIPS</p>
            <h1 id="incoming-heading">Text and links</h1>
          </div>
        </div>
      )}
      <button
        type="button"
        className="choose-files-button clip-send"
        disabled={busy}
        title="Option/Alt+Shift+C"
        onClick={() => void sendClipboard()}
      >
        {busy ? "Sending…" : "Send clipboard"}
      </button>
      {status && (
        <p className="auth-status" role="status">
          {status}
        </p>
      )}
      {clips.length === 0 ? (
        <p className="auth-status">No clips yet. Send one from any device.</p>
      ) : (
        <div className={density === "compact" ? "clips-list clips-list-compact" : "clips-list"}>
          {clips.slice(0, limit).map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              now={now}
              sender={formatSender(clip.device_id, deviceId, deviceNames)}
              onDelete={() => onDelete(clip.id)}
              compact={density === "compact"}
            />
          ))}
        </div>
      )}
    </>
  );
}
