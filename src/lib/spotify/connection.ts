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

const DISCONNECTED_VIEW: SpotifyConnectionView = { connected: false, displayName: null, scope: "", connectedAt: null };

/** Never throws — a missing table, a DB outage, or any other lookup failure
 *  degrades to "not connected" rather than crashing the Music page. This is
 *  the only place a Spotify DB error is allowed to become a thrown
 *  exception's dead end; everywhere else treats "not connected" as a normal,
 *  expected state. */
export async function getConnectionView(accountId: string): Promise<SpotifyConnectionView> {
  const row = await prisma.spotifyConnection.findUnique({ where: { accountId } }).catch(() => null);
  if (!row || row.status !== "CONNECTED") return DISCONNECTED_VIEW;
  return { connected: true, displayName: row.displayName, scope: row.scope, connectedAt: row.connectedAt };
}

/** Returns true on success, false on any failure (including a missing
 *  table) — the callback route uses this to redirect with an honest error
 *  instead of crashing when the connection can't be saved. */
export async function completeConnection(accountId: string, tokens: SpotifyTokens, profile: SpotifyProfile): Promise<boolean> {
  const result = await prisma.spotifyConnection.upsert({
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
  }).catch(() => null);
  return result !== null;
}

/** Never throws — used from a server action; a failure here should surface
 *  as "still connected" rather than crash the request. */
export async function disconnectSpotify(accountId: string): Promise<void> {
  await prisma.spotifyConnection.updateMany({ where: { accountId }, data: { status: "DISCONNECTED" } }).catch(() => null);
}

/** A valid, unexpired access token for server-side Spotify API calls —
 *  refreshes and re-persists automatically when the stored token has
 *  expired. Returns null if not connected, the lookup/refresh fails, or any
 *  step throws (marks the connection EXPIRED on a confirmed-bad token
 *  rather than leaving a silently broken one — never lets the caller crash
 *  the page instead). */
export async function getValidAccessToken(accountId: string): Promise<string | null> {
  const row = await prisma.spotifyConnection.findUnique({ where: { accountId } }).catch(() => null);
  if (!row || row.status !== "CONNECTED") return null;

  try {
    if (row.tokenExpiresAt > new Date(Date.now() + 30_000)) {
      return decryptSecret(row.accessTokenEnc);
    }
    if (!row.refreshTokenEnc) {
      await prisma.spotifyConnection.update({ where: { accountId }, data: { status: "EXPIRED" } }).catch(() => null);
      return null;
    }
    const refreshed = await refreshAccessToken(decryptSecret(row.refreshTokenEnc));
    if (!refreshed) {
      await prisma.spotifyConnection.update({ where: { accountId }, data: { status: "EXPIRED" } }).catch(() => null);
      return null;
    }
    await prisma.spotifyConnection.update({
      where: { accountId },
      data: {
        accessTokenEnc: encryptSecret(refreshed.accessToken),
        refreshTokenEnc: encryptSecret(refreshed.refreshToken ?? decryptSecret(row.refreshTokenEnc)),
        tokenExpiresAt: refreshed.expiresAt,
      },
    }).catch(() => null);
    return refreshed.accessToken;
  } catch {
    return null;
  }
}
