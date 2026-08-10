// ── Canonical domain + route protection middleware ────────────────
// Two independent jobs, canonical-domain check first:
//
// 1. Canonical domain: Netlify's own subdomain (magical-m.netlify.app) must
//    never be used to complete anything host-sensitive — Spotify OAuth is
//    the concrete case that surfaced this (the state cookie is set on
//    whichever host the flow started on; if a member starts on the Netlify
//    subdomain, the cookie never reaches the callback on the custom domain,
//    or vice versa — either way it looks like a CSRF failure, not a domain
//    mismatch). Only that ONE exact Netlify hostname is redirected — never a
//    PR deploy-preview subdomain (those don't exactly equal it) and never
//    localhost, so local dev and previews are untouched.
//
// 2. Route protection: a first line of defense that redirects unauthenticated
//    visitors away from protected areas and preserves where they were headed
//    (?next=…) so they land there after signing in. This checks only for the
//    presence of the session cookie — it is a UX convenience, NOT the
//    security boundary. The real authorization (validating the session
//    against the DB and checking roles) is enforced server-side in each
//    page/action via src/lib/guard.ts.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "mmr_session";

// The exact Netlify default hostname for this site — never a wildcard, so a
// deploy-preview subdomain (a different string) is never caught by this.
const NETLIFY_DEFAULT_HOST = "magical-m.netlify.app";

function canonicalHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com").host;
  } catch {
    return "magicalmomentsbyreign.com";
  }
}

// Authenticated, Account-based areas activated by the platform foundation.
// /dashboard and /create now require a real Account session (bridged to the
// legacy dashboard identity) — no demo login.
// Vendor dashboard joins the protected set (real authz is in requireVendor).
// NOTE: /admin is intentionally NOT here — it still supports the legacy
// mmr_admin password cookie during transition; requireAdmin handles both.
const PROTECTED_PREFIXES = ["/home", "/estate", "/account", "/notifications", "/dashboard", "/create", "/vendors/dashboard"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1. Canonical domain — exact match only, production only.
  if (process.env.NODE_ENV === "production" && req.nextUrl.hostname === NETLIFY_DEFAULT_HOST) {
    const canonical = req.nextUrl.clone();
    canonical.protocol = "https";
    canonical.host = canonicalHost();
    canonical.port = "";
    return NextResponse.redirect(canonical, 308); // preserves method + path + query
  }

  // 2. Route protection.
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
  // Runs on everything except static assets/images/favicon, so the
  // canonical-domain check applies site-wide — not just the protected
  // prefixes route protection cares about.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
