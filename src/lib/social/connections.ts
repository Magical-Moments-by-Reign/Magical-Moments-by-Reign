// ── Social connection service ───────────────────────────────────
// Create, list, and revoke a customer's social connections. Tokens
// are encrypted before they touch the database and are NEVER returned
// to callers — the public shape (ConnectionView) is metadata only.
//
// Connections are made through each platform's official OAuth flow.
// In this build the exchange runs in SANDBOX mode (no real app
// credentials); realOAuthEnabled() is the single switch that flips it
// to live authorize + token-exchange once credentials + app review
// are in place.

import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { getPlatform, type PlatformId } from "@/lib/social/platforms";

export interface ConnectionView {
  platform: PlatformId;
  profileName: string;
  status: string; // CONNECTED | EXPIRED | DISCONNECTED
  connectedAt: Date;
  scopes: string[];
}

export function realOAuthEnabled(platform: PlatformId): boolean {
  // Live mode needs a client id + secret for the platform.
  const key = `${platform.toUpperCase()}_CLIENT_ID`;
  return Boolean(process.env[key] && process.env[`${platform.toUpperCase()}_CLIENT_SECRET`]);
}

/** Metadata-only list for a user. Never includes tokens. */
export async function listConnections(userId: string): Promise<ConnectionView[]> {
  const rows = await prisma.socialConnection.findMany({
    where: { userId, NOT: { status: "DISCONNECTED" } },
    orderBy: { connectedAt: "asc" },
  });
  return rows.map((r) => ({
    platform: r.platform as PlatformId,
    profileName: r.profileName,
    status: r.status,
    connectedAt: r.connectedAt,
    scopes: r.scopes ? r.scopes.split(" ").filter(Boolean) : [],
  }));
}

export async function connectedPlatformIds(userId: string): Promise<PlatformId[]> {
  const rows = await prisma.socialConnection.findMany({
    where: { userId, status: "CONNECTED" },
    select: { platform: true },
  });
  return rows.map((r) => r.platform as PlatformId);
}

/**
 * Complete a connection (the OAuth callback). In sandbox mode this is
 * invoked by the labeled demo consent screen; in live mode it's the
 * real redirect callback after exchanging the code for tokens.
 */
export async function completeConnection(params: {
  userId: string;
  platform: PlatformId;
  profileName: string;
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
}): Promise<void> {
  const { userId, platform } = params;
  const accessTokenEnc = encryptSecret(params.accessToken);
  const refreshTokenEnc = params.refreshToken ? encryptSecret(params.refreshToken) : null;

  await prisma.socialConnection.upsert({
    where: { userId_platform: { userId, platform } },
    update: {
      profileName: params.profileName,
      status: "CONNECTED",
      scopes: params.scopes.join(" "),
      accessTokenEnc,
      refreshTokenEnc,
    },
    create: {
      userId,
      platform,
      profileName: params.profileName,
      status: "CONNECTED",
      scopes: params.scopes.join(" "),
      accessTokenEnc,
      refreshTokenEnc,
    },
  });
}

/** SANDBOX: simulate a successful authorization without any password
 *  ever touching Magical Moments. Produces a demo profile + fake token. */
export async function completeSandboxConnection(userId: string, platform: PlatformId): Promise<void> {
  const p = getPlatform(platform);
  if (!p) throw new Error("Unknown platform");
  const demoNames: Record<PlatformId, string> = {
    instagram: "@magicalmoments.demo",
    facebook: "Magical Moments (Demo Page)",
    tiktok: "@magicalmoments.demo",
    youtube: "Magical Moments (Demo Channel)",
  };
  await completeConnection({
    userId,
    platform,
    profileName: demoNames[platform],
    accessToken: `sandbox-${platform}-${Math.random().toString(36).slice(2)}`,
    scopes: p.scopes,
  });
}

export async function disconnect(userId: string, platform: PlatformId): Promise<void> {
  // Best practice would also revoke the token with the platform here.
  await prisma.socialConnection.updateMany({
    where: { userId, platform },
    data: { status: "DISCONNECTED", accessTokenEnc: "", refreshTokenEnc: null },
  });
}

/** For demoing the "Connection Expired" state + reconnect flow. */
export async function markExpired(userId: string, platform: PlatformId): Promise<void> {
  await prisma.socialConnection.updateMany({
    where: { userId, platform },
    data: { status: "EXPIRED" },
  });
}
