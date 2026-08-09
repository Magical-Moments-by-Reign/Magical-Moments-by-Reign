// ── Magical Moments Live — Agora token service (SERVER ONLY) ────
//
// The ONLY place the Agora app certificate is used. It is read from the server
// environment and used to sign short-lived tokens; it is NEVER returned to a
// caller and NEVER sent to the browser. The app ID is public by design (Agora
// requires it client-side to join) and is the only value exposed.
//
//   AGORA_APP_ID          — public (client needs it to join)
//   AGORA_APP_CERTIFICATE — SECRET (server-only signing key)

import { RtcRole, RtcTokenBuilder, RtmTokenBuilder } from "agora-token";
import { TOKEN_TTL_SECONDS, type AgoraRoleName } from "./core";

function appId(): string | undefined { return process.env.AGORA_APP_ID || undefined; }
function appCertificate(): string | undefined { return process.env.AGORA_APP_CERTIFICATE || undefined; }

/** True only when both the app id and the (secret) certificate are configured. */
export function agoraConfigured(): boolean {
  return Boolean(appId() && appCertificate());
}

/** The PUBLIC app id — safe to hand the browser. Null when unconfigured. */
export function agoraAppId(): string | null {
  return appId() ?? null;
}

export interface IssuedTokens {
  appId: string;
  channel: string;
  uid: number;
  rtcToken: string;
  rtmToken: string;
  role: AgoraRoleName;
  expiresInSeconds: number;
}

/**
 * Build a short-lived RTC token scoped to ONE channel with a publisher/
 * subscriber role, plus an RTM token for chat/reactions. Returns null when
 * Agora isn't configured. The certificate never leaves this function.
 */
export function issueTokens(input: {
  channel: string;
  uid: number; // 0 lets Agora assign; a stable uid is also fine
  role: AgoraRoleName;
  ttlSeconds?: number;
}): IssuedTokens | null {
  const id = appId();
  const cert = appCertificate();
  if (!id || !cert) return null;

  const ttl = input.ttlSeconds ?? TOKEN_TTL_SECONDS;
  const privilegeExpire = Math.floor(Date.now() / 1000) + ttl;
  const rtcRole = input.role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  const rtcToken = RtcTokenBuilder.buildTokenWithUid(id, cert, input.channel, input.uid, rtcRole, ttl, privilegeExpire);
  // RTM identity is the string uid; used for chat + reactions on the same room.
  const rtmToken = RtmTokenBuilder.buildToken(id, cert, String(input.uid), ttl);

  return { appId: id, channel: input.channel, uid: input.uid, rtcToken, rtmToken, role: input.role, expiresInSeconds: ttl };
}
