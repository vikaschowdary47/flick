import { NextRequest, NextResponse } from "next/server";

// Public, counted download link: eqlshare.com/download/mac -> the live file or store page.
// Only rows an admin has set to "live" resolve; everything else goes back to the home page.
export const dynamic = "force-dynamic";

const KEYS = new Set(["mac", "windows", "ios", "android", "microsoft"]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const home = new URL("/", req.url);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!KEYS.has(key) || !base || !anon) return NextResponse.redirect(home, 302);

  let target: string | null = null;
  try {
    const res = await fetch(`${base}/rest/v1/rpc/record_download`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_key: key }),
      cache: "no-store",
    });
    if (res.ok) target = (await res.json()) as string | null;
  } catch {
    target = null;
  }
  if (!target) return NextResponse.redirect(home, 302);

  if (target.startsWith("storage:")) {
    const path = target.slice("storage:".length);
    const filename = path.split("/").pop() ?? "eqlShare";
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    return NextResponse.redirect(`${base}/storage/v1/object/public/downloads/${encoded}?download=${encodeURIComponent(filename)}`, 302);
  }
  // Admin-entered links must be plain http(s); anything else is ignored.
  if (!/^https?:\/\//i.test(target)) return NextResponse.redirect(home, 302);
  return NextResponse.redirect(target, 302);
}
