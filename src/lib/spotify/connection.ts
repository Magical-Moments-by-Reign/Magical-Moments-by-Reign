// ── Spotify — connection service (SERVER ONLY) ────────────────────
// Stores/reads SpotifyConnection. Tokens are encrypted at rest with the same
// encryptSecret/decryptSecret utility Social Studio uses (src/lib/crypto.ts)
// and are never returned to a caller outside this module — everything else
// gets metadata only (ConnectionView).

import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { refreshAccessToken, type SpotifyTokens, type SpotifyProfile } from "./oauth";

export interface SpotifyConnectionView {
  connected: boolean;
  displayName: string | null;
  scope: string;
  connectedAt: Date | null;
}

export async function getConnectionView(accountId: string): Promise<SpotifyConnectionView> {
  const row = await prisma.spotifyConnection.findUnique({ where: { accountId } });
  if (!row || row.status !== "CONNECTED") return { connected: false, displayName: null, scope: "", connectedAt: null };
  return { connected: true, displayName: row.displayName, scope: row.scope, connectedAt: row.connectedAt };
}

export async function completeConnection(accountId: string, tokens: SpotifyTokens, profile: SpotifyProfile): Promise<void> {
  await prisma.spotifyConnection.upsert({
    where: { accountId },
    create: {
      accountId,
      spotifyUserId: profile.id,
      displayName: profile.displayName,
      scope: tokens.scope,
      accessTokenEnc: encryptSecret(tokens.accessToken),
      refreshTokenEnc: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      tokenExpiresAt: tokens.expiresAt,
      status: "CONNECTED",
    },
    update: {
      spotifyUserId: profile.id,
      displayName: profile.displayName,
      scope: tokens.scope,
      accessTokenEnc: encryptSecret(tokens.accessToken),
      refreshTokenEnc: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      tokenExpiresAt: tokens.expiresAt,
      status: "CONNECTED",
    },
  });
}

export async function disconnectSpotify(accountId: string): Promise<void> {
  await prisma.spotifyConnection.updateMany({ where: { accountId }, data: { status: "DISCONNECTED" } });
}

/** A valid, unexpired access token for server-side Spotify API calls —
 *  refreshes and re-persists automatically when the stored token has
 *  expired. Returns null if not connected or the refresh fails (marks the
 *  connection EXPIRED rather than leaving a silently broken token). */
export async function getValidAccessToken(accountId: string): Promise<string | null> {
  const row = await prisma.spotifyConnection.findUnique({ where: { accountId } });
  if (!row || row.status !== "CONNECTED") return null;

  if (row.tokenExpiresAt > new Date(Date.now() + 30_000)) {
    return decryptSecret(row.accessTokenEnc);
  }
  if (!row.refreshTokenEnc) {
    await prisma.spotifyConnection.update({ where: { accountId }, data: { status: "EXPIRED" } });
    return null;
  }
  const refreshed = await refreshAccessToken(decryptSecret(row.refreshTokenEnc));
  if (!refreshed) {
    await prisma.spotifyConnection.update({ where: { accountId }, data: { status: "EXPIRED" } });
    return null;
  }
  await prisma.spotifyConnection.update({
    where: { accountId },
    data: {
      accessTokenEnc: encryptSecret(refreshed.accessToken),
      refreshTokenEnc: encryptSecret(refreshed.refreshToken ?? decryptSecret(row.refreshTokenEnc)),
      tokenExpiresAt: refreshed.expiresAt,
    },
  });
  return refreshed.accessToken;
}
