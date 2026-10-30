// Supabase Edge Function: expire-files
//
// Deletes Flick files older than 24 hours:
//   1. finds expired rows in public.files — never pinned ones, and for files
//      that were unpinned, 24 hours counts from the unpin (unpinned_at),
//   2. deletes their objects from the flick-files bucket via the Storage API,
//   3. deletes the rows (the apps see the DELETE over Realtime and drop the card).
//
// Called hourly by pg_cron + pg_net (see supabase/sql/schedule-expire-files.sql).
// Deploy with --no-verify-jwt; requests must carry the x-cron-secret header.
//
// The service-role key is used ONLY here, server-side. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected automatically by Supabase.
// It never goes in the mobile or desktop apps.

import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "flick-files";
const LIFETIME_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500; // Storage remove() accepts up to 1000 paths per call
const MAX_BATCHES = 20; // cap one run at 10,000 files; the next hour picks up the rest

type ExpiredRow = { id: string; storage_path: string; thumb_path: string | null };

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = request.headers.get("x-cron-secret") ?? "";
  if (!expectedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cutoff = new Date(Date.now() - LIFETIME_MS).toISOString();
  let deletedRows = 0;
  let deletedObjects = 0;
  const errors: string[] = [];

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const { data: rows, error: selectError } = await supabase
      .from("files")
      .select("id, storage_path, thumb_path")
      // Pinned files never expire.
      .eq("pinned", false)
      .lt("created_at", cutoff)
      // Unpinning restarts the 24 hours: also past the cutoff since the unpin.
      .or(`unpinned_at.is.null,unpinned_at.lt.${cutoff}`)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE)
      .returns<ExpiredRow[]>();

    if (selectError) {
      errors.push(`select: ${selectError.message}`);
      break;
    }
    if (!rows || rows.length === 0) break;

    // Objects first. If storage fails, keep the rows so the next run retries;
    // deleting rows first could orphan objects nobody can find again.
    const { data: removed, error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove(
        // Each file's object plus its thumbnail, if it has one.
        rows.flatMap((row) => (row.thumb_path ? [row.storage_path, row.thumb_path] : [row.storage_path])),
      );

    if (storageError) {
      errors.push(`storage: ${storageError.message}`);
      break;
    }
    // Paths already missing from storage aren't returned, but their rows
    // are still safe to delete.
    deletedObjects += removed?.length ?? 0;

    const { error: deleteError, count } = await supabase
      .from("files")
      .delete({ count: "exact" })
      .in("id", rows.map((row) => row.id));

    if (deleteError) {
      errors.push(`delete rows: ${deleteError.message}`);
      break;
    }
    deletedRows += count ?? 0;

    if (rows.length < BATCH_SIZE) break;
  }

  // Guests: files whose guest drop has expired or been revoked, and files a
  // guest uploaded but never shared. Same order as above: objects first.
  let deletedGuestFiles = 0;
  for (let batch = 0; batch < MAX_BATCHES && errors.length === 0; batch++) {
    const { data: rows, error: guestError } = await supabase
      .rpc("flick_expired_guest_files", { p_limit: BATCH_SIZE })
      .returns<ExpiredRow[]>();
    if (guestError) {
      errors.push(`guest select: ${guestError.message}`);
      break;
    }
    if (!rows || rows.length === 0) break;

    const { error: guestStorageError } = await supabase.storage
      .from(BUCKET)
      .remove(rows.flatMap((row) => (row.thumb_path ? [row.storage_path, row.thumb_path] : [row.storage_path])));
    if (guestStorageError) {
      errors.push(`guest storage: ${guestStorageError.message}`);
      break;
    }
    const { error: guestDeleteError, count } = await supabase
      .from("files")
      .delete({ count: "exact" })
      .in("id", rows.map((row) => row.id));
    if (guestDeleteError) {
      errors.push(`guest delete rows: ${guestDeleteError.message}`);
      break;
    }
    deletedGuestFiles += count ?? 0;
    if (rows.length < BATCH_SIZE) break;
  }

  const result = { cutoff, deletedRows, deletedObjects, deletedGuestFiles, errors };
  console.log("expire-files", result);
  return json(result, errors.length > 0 ? 500 : 200);
});
