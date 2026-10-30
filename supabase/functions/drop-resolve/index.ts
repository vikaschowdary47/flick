// Public resolver for guest drops (docs: migration 20261103120000_guest_drops.sql).
// Deploy with --no-verify-jwt: the link token or the 6-character code is the
// credential, so the receiver needs no account.
//
//   GET /drop-resolve?token=<raw link token>            → files in the drop
//   GET /drop-resolve?code=K3X9QF                       → same, by code
//   GET /drop-resolve?token=...&download=1&file=<id>    → one-minute signed URL
//
// Numbers (rate limits, expiry) come from public.share_settings on every
// request, so changing them in the dashboard needs no redeploy.

import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "flick-files";
const SIGNED_URL_SECONDS = 60;
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORS = {
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (origin === "https://eqlshare.com" || origin === "https://www.eqlshare.com" || origin === "http://localhost:3000") return origin;
  return /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin) ? origin : null;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = allowedOrigin(request);
  return origin ? { ...CORS, "Access-Control-Allow-Origin": origin, Vary: "Origin" } : CORS;
}

function json(request: Request, body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Cache-Control": "no-store", "Content-Type": "application/json", ...extra },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

type DropRow = {
  id: string;
  expires_at: string;
  revoked_at: string | null;
  max_downloads: number | null;
  download_count: number;
  drop_files: {
    position: number;
    file: { id: string; name: string; size: number; storage_path: string } | null;
  }[];
};

type Settings = { code_attempts_per_minute: number; drop_downloads_per_minute: number };

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "GET") return json(request, { error: "Method not allowed" }, 405);
  if (!supabase) return json(request, { error: "Missing Supabase environment" }, 500);

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const rawCode = url.searchParams.get("code");
  const code = rawCode ? rawCode.replace(/[\s-]/g, "").toUpperCase() : null;

  // Every "not usable" case answers the same 404, so this cannot be used to
  // probe which codes or links exist.
  const notFound = () => json(request, { error: "Link not found" }, 404);

  if ((!token && !code) || (token && (token.length < 22 || token.length > 128)) || (code && !CODE_RE.test(code))) {
    return notFound();
  }

  const { data: flag } = await supabase.from("feature_flags").select("enabled").eq("name", "guest_share").maybeSingle();
  if (!flag?.enabled) return notFound();

  const { data: settings, error: settingsError } = await supabase
    .from("share_settings")
    .select("code_attempts_per_minute, drop_downloads_per_minute")
    .eq("id", true)
    .single<Settings>();
  if (settingsError || !settings) {
    console.error("drop-resolve settings failed", settingsError);
    return json(request, { error: "Temporarily unavailable" }, 503);
  }

  // Codes are short, so guessing is limited per caller. Links are 128-bit
  // secrets and are not guessable; they are limited per drop on download.
  if (code) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const bucket = `code:${await sha256Hex(forwarded)}`;
    const { data: ok, error } = await supabase.rpc("flick_rate_limit", {
      p_bucket: bucket,
      p_max: settings.code_attempts_per_minute,
    });
    if (error) return json(request, { error: "Temporarily unavailable" }, 503);
    if (!ok) return json(request, { error: "Too many requests" }, 429, { "Retry-After": "60" });
  }

  let query = supabase
    .from("drops")
    .select("id, expires_at, revoked_at, max_downloads, download_count, drop_files(position, file:files(id, name, size, storage_path))");
  query = token ? query.eq("token_hash", await sha256Hex(token)) : query.eq("code", code!);
  const { data: drop, error } = await query.maybeSingle<DropRow>();
  if (error || !drop || drop.revoked_at) return notFound();

  const files = drop.drop_files
    .filter((entry) => entry.file)
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.file!);
  if (files.length === 0) return notFound();

  const expiresMs = new Date(drop.expires_at).getTime();
  if (!Number.isFinite(expiresMs) || Date.now() >= expiresMs) {
    return json(request, { error: "Link expired", expiresAt: drop.expires_at }, 410);
  }

  const metadata = {
    files: files.map((f) => ({ id: f.id, name: f.name, size: f.size })),
    expiresAt: drop.expires_at,
    downloadsLeft: drop.max_downloads === null ? null : Math.max(0, drop.max_downloads - drop.download_count),
  };

  if (url.searchParams.get("download") !== "1") {
    await supabase.rpc("record_drop_event", { p_drop_id: drop.id, p_kind: "open" });
    return json(request, metadata);
  }

  const fileId = url.searchParams.get("file");
  const file = fileId && UUID_RE.test(fileId) ? files.find((f) => f.id === fileId.toLowerCase()) : undefined;
  if (!file) return notFound();

  const { data: allowed, error: rateError } = await supabase.rpc("flick_rate_limit", {
    p_bucket: `drop:${drop.id}`,
    p_max: settings.drop_downloads_per_minute,
  });
  if (rateError) return json(request, { error: "Temporarily unavailable" }, 503);
  if (!allowed) return json(request, { error: "Too many requests" }, 429, { "Retry-After": "60" });

  // Counted when the URL is handed out ("download started"). Refuses once
  // max_downloads is used up.
  const { data: counted, error: countError } = await supabase.rpc("record_drop_event", {
    p_drop_id: drop.id,
    p_kind: "download",
  });
  if (countError) return json(request, { error: "Temporarily unavailable" }, 503);
  if (!counted) return json(request, { error: "Download limit reached" }, 410);

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_SECONDS, { download: file.name });
  if (signedError || !signed?.signedUrl) {
    console.error("drop-resolve signing failed", { signedError });
    return json(request, { error: "Download temporarily unavailable" }, 503);
  }

  return json(request, { ...metadata, downloadUrl: signed.signedUrl });
});
