"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandMark } from "../../../components/brand-mark";

type ShareResponse = { fileName: string; size: number; senderName: string; expiresAt: string };
type DownloadResponse = ShareResponse & { downloadUrl: string };
type PageState = { kind: "loading" } | { kind: "error"; title: string; body: string } | { kind: "file" | "started"; file: ShareResponse };

const SHARE_FUNCTION_URL = process.env.NEXT_PUBLIC_SHARE_FUNCTION_URL ?? "https://bqfzoiquzjldgxoolvvz.supabase.co/functions/v1/share-download";

function formatBytes(bytes: number): string { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`; if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`; return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`; }
function timeLeft(expiresAt: string): string { const remaining = new Date(expiresAt).getTime() - Date.now(); if (remaining <= 0) return "Expired"; const minutes = Math.ceil(remaining / 60_000); if (minutes < 60) return `${minutes}m left`; const hours = Math.floor(minutes / 60); return hours < 24 ? `${hours}h left` : `${Math.ceil(hours / 24)}d left`; }

export default function ShareDownloadPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [downloading, setDownloading] = useState(false);
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const id = params.id;
    if (!id) { setState({ kind: "error", title: "That link is missing", body: "Ask the sender to send the eqlShare link again." }); return; }
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`${SHARE_FUNCTION_URL}/${encodeURIComponent(id)}`);
        const body = await response.json() as Partial<ShareResponse> & { error?: string };
        if (!response.ok || !body.fileName || !body.expiresAt) { if (!cancelled) setState({ kind: "error", title: response.status === 410 || body.error === "Link expired" ? "This link has expired" : "This link is unavailable", body: response.status === 410 || body.error === "Link expired" ? "The file is no longer available." : "It may have been revoked or deleted." }); return; }
        if (!cancelled) { const file = body as ShareResponse; setRemaining(timeLeft(file.expiresAt)); setState({ kind: "file", file }); }
      } catch { if (!cancelled) setState({ kind: "error", title: "Couldn’t reach eqlShare", body: "Check your connection and try the link again." }); }
    }
    void load();
    return () => { cancelled = true; };
  }, [params.id]);

  useEffect(() => { if (state.kind !== "file") return; const timer = window.setInterval(() => setRemaining(timeLeft(state.file.expiresAt)), 30_000); return () => window.clearInterval(timer); }, [state]);

  async function startDownload() {
    if ((state.kind !== "file" && state.kind !== "started") || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(`${SHARE_FUNCTION_URL}/${encodeURIComponent(params.id)}?download=1`);
      const body = await response.json() as Partial<DownloadResponse> & { error?: string };
      if (!response.ok || !body.downloadUrl) { setState({ kind: "error", title: response.status === 404 || response.status === 410 || body.error === "Link expired" ? "This link has expired" : "Couldn’t download this file", body: response.status === 404 || response.status === 410 || body.error === "Link expired" ? "The file is no longer available." : "Please try again in a moment." }); return; }
      const anchor = document.createElement("a"); anchor.href = body.downloadUrl; anchor.download = state.file.fileName; anchor.hidden = true; document.body.append(anchor); anchor.click(); anchor.remove(); setState({ kind: "started", file: state.file });
    } catch { setState({ kind: "error", title: "Couldn’t reach eqlShare", body: "Check your connection and try again." }); } finally { setDownloading(false); }
  }

  return <main className="share-page"><div className="share-brand"><BrandMark size={34}/><span>eql<span>Share</span></span></div>{state.kind === "loading" && <section className="share-card"><span className="share-spinner"/><h1>Getting your file…</h1><p>Just a second.</p></section>}{state.kind === "error" && <section className="share-card"><div className="share-sticker">✦</div><h1>{state.title}</h1><p>{state.body}</p></section>}{(state.kind === "file" || state.kind === "started") && <section className="share-card"><div className="share-sticker">{state.kind === "started" ? "✓" : "↓"}</div><p className="share-eyebrow">{state.kind === "started" ? "Your download is on its way" : `A file from ${state.file.senderName}`}</p><h1>{state.kind === "started" ? "Download started" : state.file.fileName}</h1>{state.kind === "started" ? <p className="share-message">Check your Downloads folder.</p> : <p className="share-meta"><span>{formatBytes(state.file.size)}</span><span>·</span><span>{remaining}</span></p>}<button className="share-button" type="button" onClick={() => void startDownload()} disabled={downloading}>{downloading ? "Preparing download…" : state.kind === "started" ? "Download again" : "Download"}</button></section>}<p className="share-banner">Sent with eqlShare <span>—</span> get it free</p></main>;
}
