// ── Ticketmaster events — safe request diagnostic (server) ─────────
// Same pattern as src/lib/spotify/diagnostics.ts: persists ONLY safe,
// non-secret facts about the most recent Ticketmaster Discovery API request
// to the existing SystemConfig key/value table (no schema change), so an
// Owner-only diagnostics page can show what actually happened without
// needing Netlify log access. Overwritten on every request — holds only the
// LATEST attempt, never a history.
//
// Never stores: the API key, or anything from the response body beyond a
// short {status, detail} error pair Ticketmaster itself returns.

import { prisma } from "@/lib/db";

const DIAGNOSTIC_KEY = "ticketmaster.events.last_diagnostic";

export interface EventsDiagnostic {
  requestAttempted: boolean;
  apiKeyPresent: boolean;
  searchInput: string; // the raw location text a member typed — a city/ZIP, not a secret
  postalCodeSent: string | null;
  citySent: string | null;
  stateCodeSent: string | null;
  radiusMiles: number;
  classificationSent: string | null;
  httpStatus: number | null;
  contentType: string | null;
  jsonParsed: boolean;
  safeError: string | null;
  embeddedEventsPresent: boolean;
  eventsReturned: number;
  recordedAt: string; // ISO timestamp
}

/** Never throws — a failure to persist the diagnostic must never affect the
 *  Near You request it's observing. */
export async function writeEventsDiagnostic(diag: EventsDiagnostic): Promise<void> {
  const value = JSON.stringify(diag);
  await prisma.systemConfig
    .upsert({ where: { key: DIAGNOSTIC_KEY }, update: { value }, create: { key: DIAGNOSTIC_KEY, value } })
    .catch((err) => {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "unknown";
      console.error(`[ticketmaster] failed to persist events diagnostic (code: ${code}) — continuing without it`);
    });
}

/** Never throws — returns null if nothing has been recorded yet or the
 *  lookup fails, so the diagnostics page can show an honest "no attempt
 *  recorded yet" state instead of crashing. */
export async function readEventsDiagnostic(): Promise<EventsDiagnostic | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key: DIAGNOSTIC_KEY } }).catch(() => null);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as EventsDiagnostic;
  } catch {
    return null;
  }
}
