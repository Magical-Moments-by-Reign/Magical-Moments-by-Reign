// ── Spotify — safe profile-request diagnostic (server) ─────────────
// Persists ONLY safe, non-secret facts about the most recent GET /v1/me
// call so the Owner-only diagnostics page can show what actually happened
// without needing Netlify log access. Stored in SystemConfig (existing
// key/value table — no schema change) under one fixed key, overwritten on
// every attempt, so this only ever holds the LATEST result, never a history.
//
// Never stores: access token, refresh token, authorization code, OAuth
// state, client secret, the full Spotify profile response, or any personal
// field (email, display name, images, etc.) — see ProfileDiagnostic below,
// which is the complete list of fields ever written here.

import { prisma } from "@/lib/db";

const DIAGNOSTIC_KEY = "spotify.profile.last_diagnostic";

export type ProfileErrorCategory =
  | "none"
  | "network"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "spotify_error"
  | "invalid_json"
  | "missing_id";

export interface ProfileDiagnostic {
  requestAttempted: boolean;
  httpStatus: number | null;
  contentType: string | null;
  jsonParsed: boolean;
  spotifyErrorCode: string | null;
  spotifyErrorMessage: string | null;
  category: ProfileErrorCategory;
  containsId: boolean;
  recordedAt: string; // ISO timestamp
}

/** Never throws — a failure to persist the diagnostic must never affect the
 *  OAuth callback it's observing. */
export async function writeProfileDiagnostic(diag: ProfileDiagnostic): Promise<void> {
  const value = JSON.stringify(diag);
  await prisma.systemConfig
    .upsert({ where: { key: DIAGNOSTIC_KEY }, update: { value }, create: { key: DIAGNOSTIC_KEY, value } })
    .catch((err) => {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "unknown";
      console.error(`[spotify] failed to persist profile diagnostic (code: ${code}) — continuing without it`);
    });
}

/** Never throws — returns null if nothing has been recorded yet or the
 *  lookup fails (e.g. table doesn't exist), so the diagnostics page can show
 *  an honest "no attempt recorded yet" state instead of crashing. */
export async function readProfileDiagnostic(): Promise<ProfileDiagnostic | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key: DIAGNOSTIC_KEY } }).catch(() => null);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as ProfileDiagnostic;
  } catch {
    return null;
  }
}
