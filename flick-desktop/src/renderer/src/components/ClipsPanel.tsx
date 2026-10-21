import { useEffect, useState } from "react";
import { formatAgo, siteName, type ClipRow } from "../clips";
import { useNow } from "../hooks/useNow";
import type { Density } from "../density";
import { formatSender } from "../types";

interface ClipsPanelProps {
  clips: ClipRow[];
  error: string;
  deviceId: string | null;
  deviceNames: Record<string, string>;
  onSend: (text: string) => Promise<string | null>;
  onDelete: (id: string) => void;
  sendStatus: string; // result of the last shortcut/tray send
  density: Density;
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
    // Single-line chip: text or site name, time; click copies, × deletes.
    return (
      <article className={`clip-chip clip-card-${clip.kind}`} title={`${clip.content}\n${meta}`}>
        <button
          type="button"
          className="clip-chip-main"
          aria-label={`Copy ${isLink ? `link to ${siteName(clip.content)}` : "clip"}`}
          onClick={() => void copy()}
        >
          <span className="clip-chip-text">
            {copied ? "Copied!" : isLink ? siteName(clip.content) : clip.content}
          </span>
          <span className="clip-chip-time">{formatAgo(clip.created_at, now)}</span>
        </button>
        <button
          type="button"
          className="clip-chip-delete"
          aria-label="Delete clip from all devices"
          title="Delete everywhere"
          onClick={onDelete}
        >
          ×
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

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">CLIPS</p>
          <h1 id="incoming-heading">Text and links</h1>
        </div>
      </div>
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
          {clips.map((clip) => (
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
