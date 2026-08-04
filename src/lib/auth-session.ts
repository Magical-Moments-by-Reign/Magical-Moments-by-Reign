// ── Secure sessions (server) ────────────────────────────────────
// Cookie-backed sessions built on the tested auth primitives in src/lib/auth.ts.
// Guarantees:
//   • The cookie holds an opaque random token; only its SHA-256 HASH is stored.
//   • HTTP-only, SameSite=Lax, Secure in production, path=/.
//   • Sessions expire, can be revoked (logout), and revoked/expired sessions
//     never authenticate. A fresh session is minted on every login (rotation).
//   • Raw tokens are NEVER logged.
//
// SERVER ONLY.

import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  newSessionToken, hashSessionToken, sessionExpiry, sessionValid, SESSION_TTL_DAYS,
} from "@/lib/auth";
import type { PlatformRole } from "@/lib/roles";
import { normalizeTier, type MembershipTier } from "@/lib/membership-access";

export const SESSION_COOKIE = "mmr_session";

function cookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

function hashMeta(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(`mmr-meta:${value}`).digest("hex").slice(0, 32);
}

/**
 * Create a new session for an account and set the cookie. Called on every
 * successful login and after a password reset (rotation). The raw token exists
 * only long enough to be placed in the HTTP-only cookie — it's never returned
 * to callers or logged.
 */
export async function createSessionForAccount(accountId: string): Promise<void> {
  const token = newSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date().toISOString();

  const hdrs = await headers();
  await prisma.session.create({
    data: {
      accountId,
      tokenHash,
      userAgentHash: hashMeta(hdrs.get("user-agent")),
      ipHash: hashMeta(hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()),
      expiresAt: new Date(sessionExpiry(now)),
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions());
}

export interface CurrentAccount {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  role: PlatformRole;
  status: string;
  guardianAccountId: string | null;
  /** Entitlements gate — see src/lib/membership-access.ts. Defaults to "free". */
  membershipTier: MembershipTier;
  sessionId: string;
  sessionTokenHash: string;
}

/**
 * Resolve the signed-in account from the session cookie, validating the session
 * against the database (not just the cookie's presence). Returns null when there
 * is no valid, unrevoked, unexpired session.
 */
export async function currentAccount(): Promise<CurrentAccount | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true, expiresAt: true, revokedAt: true,
      account: {
        select: {
          id: true, customerId: true, firstName: true, lastName: true,
          platformRole: true, status: true, guardianAccountId: true, membershipTier: true,
        },
      },
    },
  });
  if (!session || !session.account) return null;

  const ok = sessionValid(
    { expiresAt: session.expiresAt.toISOString(), revokedAt: session.revokedAt?.toISOString() ?? null },
    new Date().toISOString(),
  );
  if (!ok) return null;

  return {
    id: session.account.id,
    customerId: session.account.customerId,
    firstName: session.account.firstName,
    lastName: session.account.lastName,
    role: session.account.platformRole as PlatformRole,
    status: session.account.status,
    guardianAccountId: session.account.guardianAccountId,
    membershipTier: normalizeTier(session.account.membershipTier),
    sessionId: session.id,
    sessionTokenHash: tokenHash,
  };
}

export async function currentAccountId(): Promise<string | null> {
  const acct = await currentAccount();
  return acct?.id ?? null;
}

/** Revoke the current session and clear the cookie (logout). */
export async function endCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
}

/** Revoke every other active session for an account (keep the current one). */
export async function revokeOtherSessions(accountId: string, keepTokenHash: string): Promise<number> {
  const res = await prisma.session.updateMany({
    where: { accountId, revokedAt: null, tokenHash: { not: keepTokenHash } },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

/** Revoke ALL sessions for an account (used after a password reset). */
export async function revokeAllSessions(accountId: string): Promise<number> {
  const res = await prisma.session.updateMany({
    where: { accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

export interface ActiveSessionView {
  id: string;
  current: boolean;
  createdAt: Date;
  expiresAt: Date;
  device: string; // coarse, non-identifying label
}

/** Active sessions for the Account → Security panel (no raw tokens exposed). */
export async function listActiveSessions(accountId: string, currentTokenHash: string): Promise<ActiveSessionView[]> {
  const now = new Date();
  const rows = await prisma.session.findMany({
    where: { accountId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: { id: true, tokenHash: true, createdAt: true, expiresAt: true, userAgentHash: true },
  });
  return rows.map((s) => ({
    id: s.id,
    current: s.tokenHash === currentTokenHash,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    device: s.userAgentHash ? "Signed-in device" : "Unknown device",
  }));
}

/** Revoke a single session by id (only if it belongs to the account). */
export async function revokeSessionById(accountId: string, sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
