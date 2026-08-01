// ── Admin auth (lightweight) ────────────────────────────────────
// A single shared admin password gate for the internal admin area.
// The password is compared to ADMIN_PASSWORD; on success we set an
// httpOnly cookie holding a SHA-256 hash of the password so the raw
// secret is never stored in the browser. This is intentionally simple
// (single operator) — swap for full auth when multi-user admin arrives.

import { cookies } from "next/headers";
import { createHash } from "crypto";

const COOKIE = "mmr_admin";

function tokenFor(password: string): string {
  return createHash("sha256").update(`mmr:${password}`).digest("hex");
}

/** The configured admin password, or null if the admin area is disabled. */
export function adminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

export async function isAdmin(): Promise<boolean> {
  const pw = adminPassword();
  if (!pw) return false;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === tokenFor(pw);
}

/** Verify a submitted password and set the session cookie. Returns success. */
export async function signInAdmin(password: string): Promise<boolean> {
  const pw = adminPassword();
  if (!pw || password !== pw) return false;
  const jar = await cookies();
  jar.set(COOKIE, tokenFor(pw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return true;
}

export async function signOutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
