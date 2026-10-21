import { useState } from "react";
import { NUDGE_AT, oldestToRemove } from "../freeUpSpace";
import type { Usage } from "../limits";
import { type CloudFile, formatFileSize } from "../types";

interface StorageNudgeProps {
  usage: Usage | null;
  files: CloudFile[];
  onRemove: (file: CloudFile) => void; // the normal remove (with Undo)
}

// At 80%+ of storage: one line with "Free up space", which expands into a
// confirm listing the oldest files (never pinned) before removing them.
export default function StorageNudge({ usage, files, onRemove }: StorageNudgeProps) {
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (!usage || dismissed) {
    return null;
  }
  const max = usage.maxStorageMb * 1024 * 1024;
  const share = max > 0 ? usage.storageUsedBytes / max : 0;
  if (share < NUDGE_AT) {
    return null;
  }
  const suggested = oldestToRemove(files, usage.storageUsedBytes, max);
  const freed = suggested.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="storage-nudge" role="status">
      {!confirming ? (
        <div className="storage-nudge-row">
          <span>
            You’ve used {Math.round(share * 100)}% of your {usage.maxStorageMb} MB
          </span>
          <button type="button" className="storage-nudge-button" onClick={() => setConfirming(true)}>
            Free up space
          </button>
          <button
            type="button"
            className="storage-nudge-close"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
          >
            ×
          </button>
        </div>
      ) : suggested.length === 0 ? (
        <div className="storage-nudge-row">
          <span>Everything left is pinned. Unpin or delete a file to make room.</span>
          <button type="button" className="storage-nudge-button" onClick={() => setConfirming(false)}>
            OK
          </button>
        </div>
      ) : (
        <div className="storage-nudge-confirm">
          <span>
            Remove the {suggested.length === 1 ? "oldest file" : `${suggested.length} oldest files`} (
            {formatFileSize(freed)}) from all your devices? Pinned files are kept.
          </span>
          <ul>
            {suggested.slice(0, 4).map((file) => (
              <li key={file.id}>
                {file.name} · {formatFileSize(file.size)}
              </li>
            ))}
            {suggested.length > 4 && <li>+{suggested.length - 4} more</li>}
          </ul>
          <div className="storage-nudge-actions">
            <button
              type="button"
              className="storage-nudge-button storage-nudge-remove"
              onClick={() => {
                suggested.forEach(onRemove);
                setConfirming(false);
              }}
            >
              {suggested.length === 1 ? "Remove it" : `Remove ${suggested.length} files`}
            </button>
            <button type="button" className="storage-nudge-cancel" onClick={() => setConfirming(false)}>
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
