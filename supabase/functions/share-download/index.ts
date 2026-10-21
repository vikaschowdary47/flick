// Public share-link resolver. Deploy with --no-verify-jwt because the raw
// link id is the bearer credential; the id is hashed before every lookup.
// The function returns metadata plus a one-minute signed URL that includes
// Supabase's download disposition, so HTML/SVG never render inline.

import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "flick-files";
const SIGNED_URL_SECONDS = 60;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type ShareRow = {
  id_hash: string;
  expires_at: string;
  revoked_at: string | null;
  file: {
    name: string;
    size: number;
    mime_type: string;
    storage_path: string;
    created_at: string;
    pinned: boolean;
    unpinned_at: string | null;
    device: { name: string } | null;
  } | null;
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Cache-Control": "no-store", "Content-Type": "application/json", ...extraHeaders },
  });
}

function routeId(request: Request): string | null {
  const url = new URL(request.url);
  const pathId = url.pathname.split("/").filter(Boolean).at(-1);
  return pathId || url.searchParams.get("id");
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fileExpiresAt(file: ShareRow["file"]): number {
  if (!file) return 0;
  if (file.pinned) return Number.POSITIVE_INFINITY;
  const start = Math.max(
    new Date(file.created_at).getTime(),
    file.unpinned_at ? new Date(file.unpinned_at).getTime() : 0,
  );
  return start + 24 * 60 * 60 * 1000;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  if (!supabase) return json({ error: "Missing Supabase environment" }, 500);

  const rawId = routeId(request);
  if (!rawId || rawId.length < 22 || rawId.length > 128) {
    return json({ error: "Link not found" }, 404);
  }

  const idHash = await sha256Hex(rawId);
  const { data, error } = await supabase
    .from("share_links")
    .select("id_hash, expires_at, revoked_at, file:files(name, size, mime_type, storage_path, created_at, pinned, unpinned_at, device:devices(name))")
    .eq("id_hash", idHash)
    .maybeSingle<ShareRow>();

  // Missing, revoked, and deleted-file links deliberately look identical so
  // this endpoint cannot be used to list or probe other users' files.
  if (error || !data || data.revoked_at || !data.file) {
    return json({ error: "Link not found" }, 404);
  }

  const expiresAt = Math.min(new Date(data.expires_at).getTime(), fileExpiresAt(data.file));
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    return json({ error: "Link expired", expiresAt: new Date(expiresAt).toISOString() }, 410);
  }

  const { data: allowed, error: rateError } = await supabase.rpc("flick_share_link_rate_limit", {
    p_id_hash: idHash,
  });
  if (rateError) {
    console.error("share-download rate limit failed", rateError);
    return json({ error: "Temporarily unavailable" }, 503);
  }
  if (!allowed) {
    return json({ error: "Too many requests" }, 429, { "Retry-After": "60" });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(data.file.storage_path, SIGNED_URL_SECONDS, { download: data.file.name });
  if (signedError || !signed?.signedUrl) {
    console.error("share-download signing failed", { storagePath: data.file.storage_path, signedError });
    return json({ error: "Download temporarily unavailable" }, 503);
  }

  return json({
    fileName: data.file.name,
    size: data.file.size,
    mimeType: "application/octet-stream",
    senderName: data.file.device?.name ?? "A friend",
    expiresAt: new Date(expiresAt).toISOString(),
    downloadUrl: signed.signedUrl,
  });
});
