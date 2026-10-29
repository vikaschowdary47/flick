import { NextRequest, NextResponse } from "next/server";

// The admin dashboard lives in app/admin-internal but is only reachable at a secret path
// taken from the ADMIN_PATH_SLUG environment variable (set it in Vercel, never in the repo).
// - No variable set: the dashboard does not exist (404).
// - Direct hits to /admin-internal, /admin, /dashboard and friends: ordinary 404.
const INTERNAL = "/admin-internal";

function notFound(req: NextRequest) {
  const res = NextResponse.rewrite(new URL("/__not_found__", req.url), { status: 404 });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export function middleware(req: NextRequest) {
  const slug = process.env.ADMIN_PATH_SLUG?.replace(/^\/+|\/+$/g, "");
  const path = req.nextUrl.pathname.replace(/\/+$/, "") || "/";

  if (path === INTERNAL || path.startsWith(`${INTERNAL}/`)) return notFound(req);

  if (slug && slug.length >= 16 && path === `/${slug}`) {
    const res = NextResponse.rewrite(new URL(INTERNAL, req.url));
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon|icon-|apple-touch|robots|sitemap|opengraph|landing/|email/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|css|js|txt|xml)$).*)"],
};
