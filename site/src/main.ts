import "./styles.css";

type ShareResponse = {
  fileName: string;
  size: number;
  senderName: string;
  expiresAt: string;
  downloadUrl: string;
};

const SHARE_FUNCTION_URL =
  import.meta.env.VITE_SHARE_FUNCTION_URL ??
  "https://bqfzoiquzjldgxoolvvz.supabase.co/functions/v1/share-download";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Flick share page is missing its root element.");
const root = app;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function timeLeft(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return "Expired";
  const minutes = Math.ceil(remaining / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h left` : `${Math.ceil(hours / 24)}d left`;
}

function shell(content: string): void {
  root.innerHTML = `
    <main class="page-shell">
      <div class="brand"><span class="brand-mark" aria-hidden="true">↗</span><span>flick</span></div>
      ${content}
      <p class="banner">Sent with Flick <span>—</span> get it free</p>
    </main>`;
}

function showError(title: string, body: string): void {
  shell(`<section class="card error-card"><div class="sticker">✦</div><h1>${title}</h1><p>${body}</p></section>`);
}

function showFile(file: ShareResponse): void {
  shell(`
    <section class="card file-card">
      <div class="file-sticker" aria-hidden="true">↓</div>
      <p class="eyebrow">A file from ${escapeHtml(file.senderName)}</p>
      <h1>${escapeHtml(file.fileName)}</h1>
      <p class="meta"><span>${formatBytes(file.size)}</span><span>·</span><span id="time-left">${timeLeft(file.expiresAt)}</span></p>
      <a class="download-button" href="${escapeAttribute(file.downloadUrl)}">Download</a>
    </section>`);
  const time = document.querySelector<HTMLSpanElement>("#time-left");
  const timer = window.setInterval(() => {
    if (!time) return;
    time.textContent = timeLeft(file.expiresAt);
    if (time.textContent === "Expired") window.clearInterval(timer);
  }, 30_000);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

async function load(): Promise<void> {
  const id = window.location.pathname.split("/").filter(Boolean).at(-1);
  if (!id || id === "d") {
    showError("That link is missing", "Ask the sender to send the Flick link again.");
    return;
  }
  shell(`<section class="card loading-card"><div class="spinner" aria-hidden="true" /><h1>Getting your file…</h1><p>Just a second.</p></section>`);
  try {
    const response = await fetch(`${SHARE_FUNCTION_URL}/${encodeURIComponent(id)}`);
    const body = await response.json() as Partial<ShareResponse> & { error?: string };
    if (!response.ok || !body.fileName || !body.downloadUrl || !body.expiresAt) {
      if (response.status === 410 || body.error === "Link expired") {
        showError("This Flick link expired", "The file is no longer available.");
      } else {
        showError("This Flick link is unavailable", "It may have been revoked or deleted.");
      }
      return;
    }
    showFile(body as ShareResponse);
  } catch {
    showError("Couldn’t reach Flick", "Check your connection and try the link again.");
  }
}

void load();
