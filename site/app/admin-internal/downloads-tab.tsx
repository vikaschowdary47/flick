"use client";
import { useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { UPLOADABLE, formatBytes, isWebUrl, type PlatformRow, type PlatformStatus } from "../../lib/downloads";

const STATUS_LABEL: Record<PlatformStatus, string> = { live: "Live", coming_soon: "Coming soon", hidden: "Hidden" };

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function uploadWithProgress(path: string, file: File, token: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !anon) { reject(new Error("Supabase is not configured.")); return; }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/downloads/${path.split("/").map(encodeURIComponent).join("/")}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anon);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { resolve(); return; }
      if (xhr.status === 413) { reject(new Error("The file is larger than your Supabase storage limit (50 MB on the Free plan; raise it under Settings > Storage or upgrade).")); return; }
      let detail = "";
      try { detail = (JSON.parse(xhr.responseText) as { message?: string }).message ?? ""; } catch { /* not JSON */ }
      reject(new Error(detail || `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
}

function Card({ row, onSaved }: { row: PlatformRow; onSaved: (next: PlatformRow) => void }) {
  const [status, setStatus] = useState<PlatformStatus>(row.status);
  const [url, setUrl] = useState(row.url ?? "");
  const [version, setVersion] = useState(row.version ?? "");
  const [notes, setNotes] = useState(row.release_notes ?? "");
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canUpload = UPLOADABLE.includes(row.key);
  const hasFile = Boolean(row.storage_path);
  const publicLink = typeof window === "undefined" ? "" : `${window.location.origin}/download/${row.key}`;

  async function save(extra: Partial<PlatformRow> = {}) {
    if (!supabase) return;
    const cleanUrl = url.trim();
    if (cleanUrl && !isWebUrl(cleanUrl)) { setMessage({ kind: "err", text: "The link must start with https://" }); return; }
    if (status === "live" && !hasFile && !cleanUrl && !extra.storage_path) { setMessage({ kind: "err", text: "Add a link or upload a file before setting this to Live." }); return; }
    setBusy("Saving…");
    const { data, error } = await supabase
      .from("platform_downloads")
      .update({ status, url: cleanUrl || null, version: version.trim() || null, release_notes: notes.trim() || null, updated_at: new Date().toISOString(), ...extra })
      .eq("key", row.key)
      .select()
      .single();
    setBusy("");
    if (error || !data) { setMessage({ kind: "err", text: error?.message || "Could not save." }); return; }
    onSaved(data as PlatformRow);
    setMessage({ kind: "ok", text: "Saved." });
  }

  async function onFile(file: File | undefined) {
    if (!file || !supabase) return;
    setMessage(null);
    try {
      setBusy("Computing checksum…");
      const sha = await sha256Hex(file);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("You are signed out. Reload and sign in again.");
      const safeVersion = (version.trim() || "unversioned").replace(/[^a-zA-Z0-9._-]/g, "_");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${row.key}/${safeVersion}/${safeName}`;
      setBusy("Uploading…");
      setProgress(0);
      await uploadWithProgress(path, file, token, setProgress);
      setProgress(null);
      const oldPath = row.storage_path;
      await save({ storage_path: path, sha256: sha, size_bytes: file.size, url: null });
      setUrl("");
      if (oldPath && oldPath !== path) await supabase.storage.from("downloads").remove([oldPath]);
    } catch (err) {
      setBusy("");
      setProgress(null);
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeFile() {
    if (!supabase || !row.storage_path) return;
    if (!window.confirm("Delete the uploaded file? Visitors will lose this download until you upload another.")) return;
    const old = row.storage_path;
    await save({ storage_path: null, sha256: null, size_bytes: null, ...(status === "live" && !url.trim() ? { status: "hidden" as PlatformStatus } : {}) });
    if (status === "live" && !url.trim()) setStatus("hidden");
    await supabase.storage.from("downloads").remove([old]);
  }

  return (
    <section className="adm-card">
      <header>
        <h2>{row.label}</h2>
        <span className={`adm-pill adm-${row.status}`}>{STATUS_LABEL[row.status]}</span>
      </header>
      <div className="adm-seg" role="radiogroup" aria-label={`${row.label} visibility`}>
        {(["live", "coming_soon", "hidden"] as PlatformStatus[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={status === s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</button>
        ))}
      </div>
      <label>Version<input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="0.1.0" maxLength={40} /></label>
      {canUpload && (
        <div className="adm-file">
          <div>
            {hasFile ? <><b>{row.storage_path?.split("/").pop()}</b> <span>{formatBytes(row.size_bytes)}</span></> : <span>No file uploaded</span>}
            {row.sha256 && <code title="SHA-256">{row.sha256}</code>}
          </div>
          <input ref={fileRef} type="file" hidden onChange={(e) => void onFile(e.target.files?.[0])} accept={row.key === "mac" ? ".zip,.dmg,.pkg" : ".exe,.msi,.zip"} />
          <div className="adm-row">
            <button type="button" disabled={Boolean(busy)} onClick={() => fileRef.current?.click()}>{hasFile ? "Replace file" : "Upload file"}</button>
            {hasFile && <button type="button" className="adm-danger" disabled={Boolean(busy)} onClick={() => void removeFile()}>Remove file</button>}
          </div>
          {progress !== null && <div className="adm-bar"><i style={{ width: `${progress}%` }} /><span>{progress}%</span></div>}
        </div>
      )}
      <label>{canUpload ? "…or an external link" : row.key === "microsoft" ? "Microsoft Store link" : row.key === "ios" ? "App Store link" : "Google Play link"}
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" />
      </label>
      <label>Release notes (optional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={600} />
      </label>
      <footer>
        <button type="button" className="adm-primary" disabled={Boolean(busy)} onClick={() => void save()}>{busy || "Save"}</button>
        <span className="adm-meta">{row.download_count.toLocaleString()} downloads</span>
        {status === "live" && <button type="button" className="adm-link" onClick={() => void navigator.clipboard?.writeText(publicLink)}>Copy public link</button>}
      </footer>
      {message && <p className={`adm-msg ${message.kind}`} role="status">{message.text}</p>}
    </section>
  );
}

export function DownloadsTab({ rows, onSaved }: { rows: PlatformRow[]; onSaved: (next: PlatformRow) => void }) {
  return (
    <>
      <p className="adm-lead">Live platforms appear as download buttons on the site; Coming soon shows a badge; Hidden shows nothing.</p>
      <div className="adm-grid">
        {rows.map((row) => <Card key={row.key} row={row} onSaved={onSaved} />)}
      </div>
    </>
  );
}
