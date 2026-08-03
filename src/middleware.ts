// ── Route protection middleware ─────────────────────────────────
// A first line of defense that redirects unauthenticated visitors away from
// protected areas and preserves where they were headed (?next=…) so they land
// there after signing in. This checks only for the presence of the session
// cookie — it is a UX convenience, NOT the security boundary. The real
// authorization (validating the session against the DB and checking roles) is
// enforced server-side in each page/action via src/lib/guard.ts.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "mmr_session";

// Authenticated, Account-based areas activated by the platform foundation.
// /dashboard and /create now require a real Account session (bridged to the
// legacy dashboard identity) — no demo login.
// Vendor dashboard joins the protected set (real authz is in requireVendor).
// NOTE: /admin is intentionally NOT here — it still supports the legacy
// mmr_admin password cookie during transition; requireAdmin handles both.
const PROTECTED_PREFIXES = ["/home", "/account", "/notifications", "/dashboard", "/create", "/vendors/dashboard"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/home", "/account/:path*", "/notifications/:path*", "/dashboard/:path*", "/create", "/vendors/dashboard/:path*"],
};
