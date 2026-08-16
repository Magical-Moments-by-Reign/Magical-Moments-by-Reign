// ── TEMPORARY DIAGNOSTIC PAGE — DELETE BEFORE FINAL MERGE ──────────
// /dashboard/discovery/admin/diagnostics/ticketmaster
//
// Ticketmaster's Discovery API is public data — no member OAuth needed — so
// unlike the Spotify diagnostic, this page can run REAL live searches itself
// on every load and show exactly what Ticketmaster returned, no separate
// human click-through required. Each test bypasses the DiscoveryCache layer
// (calls TicketmasterProvider.search() directly) so results are always
// fresh, never a stale cached row.
//
// The API key is read once from process.env, used only inside the
// server-side request query string, and NEVER rendered, logged, or
// returned in any form.
//
// DELETE THIS PAGE (and this folder) once Ticketmaster connectivity is
// confirmed and the real fix has shipped.

import type { Metadata } from "next";
import { requireOwner } from "@/lib/guard";
import { TicketmasterProvider, SEGMENT_MAP, CLASSIFICATION_NAME_MAP, type EventCategory, type DiscoveredEvent } from "@/lib/discovery/providers/events";
import { readEventsDiagnostic, type EventsDiagnostic } from "@/lib/discovery/events-diagnostics";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ticketmaster Diagnostic (Temporary)", robots: { index: false } };

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return <p style={{ color: warn ? "#a63a2e" : undefined }}><strong>{label}:</strong> {value}</p>;
}

interface TestCase {
  label: string;
  location: string;
  category?: EventCategory;
  radiusMiles?: number;
}

const TEST_CASES: TestCase[] = [
  { label: "30032 — 25 mi (broad, no category)", location: "30032", radiusMiles: 25 },
  { label: "30032 — 50 mi", location: "30032", radiusMiles: 50 },
  { label: "30032 — 100 mi", location: "30032", radiusMiles: 100 },
  { label: "Atlanta, GA — 25 mi", location: "Atlanta, GA", radiusMiles: 25 },
  { label: "Birmingham, AL — 25 mi", location: "Birmingham, AL", radiusMiles: 25 },
];

interface TestResult {
  label: string;
  events: DiscoveredEvent[] | null;
  diag: EventsDiagnostic | null;
}

export default async function TicketmasterDiagnosticPage() {
  await requireOwner("/dashboard/discovery/admin");

  const keyPresent = TicketmasterProvider.isConfigured();

  // ── Live test sweep — sequential (not Promise.all) so each call's
  //      diagnostic write doesn't race the next call's write to the same
  //      SystemConfig row; each row below reads back its OWN result right
  //      after its own search() call. ──
  const results: TestResult[] = [];
  for (const t of TEST_CASES) {
    const events = keyPresent ? await TicketmasterProvider.search({ location: t.location, radiusMiles: t.radiusMiles }) : null;
    const diag = keyPresent ? await readEventsDiagnostic() : null;
    results.push({ label: t.label, events, diag });
  }

  const anySuccess = results.some((r) => r.events !== null);
  const zip30032 = results[0];

  let rootCause: string;
  let fix: string;
  if (!keyPresent) {
    rootCause = "TICKETMASTER_API_KEY is missing from this deployment's runtime environment.";
    fix = "Confirm it's set in Netlify → Site configuration → Environment variables for THIS deploy context, then trigger a fresh deploy.";
  } else if (!anySuccess) {
    const sample = zip30032.diag;
    rootCause = sample
      ? `Every test search failed at the HTTP layer (30032/25mi returned status ${sample.httpStatus ?? "none"}${sample.safeError ? `, error: ${sample.safeError}` : ""}). This is a Ticketmaster-side rejection, not a code bug in how results are parsed.`
      : "Every test search failed before a diagnostic could even be recorded — check the API key value itself for stray whitespace or a copy/paste error.";
    fix = "If the status is 401/403, re-copy TICKETMASTER_API_KEY from the Ticketmaster Developer Portal (Consumer Key, not Consumer Secret) with no extra whitespace. If 429, the app's request quota is exhausted — wait and retry. If none of these, see the safe error detail in each row below.";
  } else {
    rootCause = "Live requests succeed. Any zero-result row below reflects Ticketmaster genuinely having no matching events for that search, not a failed request — check each row's own HTTP status to confirm.";
    fix = "No fix needed for connectivity. If a specific city shows 0 events, that's an honest empty result — Ticketmaster inventory varies by market and date range.";
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 820, fontFamily: "monospace", lineHeight: 1.7 }}>
      <h1>TICKETMASTER DIAGNOSTIC</h1>
      <p style={{ color: "#a63a2e" }}>Temporary — Owner only. Delete this page once Ticketmaster connectivity is confirmed.</p>

      <hr />
      <h2>1. Environment Check</h2>
      <Row label="TICKETMASTER_API_KEY present" value={keyPresent ? "YES" : "NO"} warn={!keyPresent} />
      <Row label="Endpoint" value="https://app.ticketmaster.com/discovery/v2/events.json" />
      <Row label="Auth method" value="apikey query param (Consumer Key — Consumer Secret is not used by the Discovery API)" />

      <hr />
      <h2>2. Live Test Sweep — real requests, run on this page load</h2>
      <p>Each row bypasses the cache and calls Ticketmaster directly, right now.</p>
      {results.map((r) => (
        <div key={r.label} style={{ marginBottom: "1.1rem", paddingBottom: "1rem", borderBottom: "1px solid #e5ddcf" }}>
          <p style={{ marginBottom: ".3rem" }}><strong>{r.label}</strong></p>
          <Row label="Ticketmaster request attempted" value={r.diag?.requestAttempted ? "YES" : "NO"} />
          <Row label="Postal code sent" value={r.diag?.postalCodeSent ?? "(none)"} />
          <Row label="City / state sent" value={[r.diag?.citySent, r.diag?.stateCodeSent].filter(Boolean).join(", ") || "(none)"} />
          <Row label="Radius" value={r.diag ? `${r.diag.radiusMiles} miles` : "—"} />
          <Row label="Classification sent" value={r.diag?.classificationSent ?? "(none — unfiltered)"} />
          <Row label="HTTP status" value={r.diag?.httpStatus != null ? String(r.diag.httpStatus) : "none"} warn={r.events === null} />
          <Row label="Response content type" value={r.diag?.contentType ?? "(none)"} />
          <Row label="JSON parse" value={r.diag?.jsonParsed ? "PASS" : "FAIL"} warn={r.diag ? !r.diag.jsonParsed : false} />
          <Row label="Safe Ticketmaster error" value={r.diag?.safeError ?? "(none)"} warn={!!r.diag?.safeError} />
          <Row label="_embedded.events present" value={r.diag?.embeddedEventsPresent ? "YES" : "NO"} />
          <Row label="Events returned" value={String(r.diag?.eventsReturned ?? 0)} />
          {r.events && r.events[0] && <Row label="Sample event" value={`${r.events[0].name} — ${r.events[0].venueName ?? "?"}, ${r.events[0].city ?? "?"}${r.events[0].state ? `, ${r.events[0].state}` : ""}`} />}
        </div>
      ))}

      <hr />
      <h2>3. Category Mapping (from the actual code — not hand-copied)</h2>
      <p>Outbound: our category → Ticketmaster <code>segmentName</code> (Ticketmaster's real segments: Music, Sports, Arts &amp; Theatre, Family, Film, Miscellaneous — there is no distinct "Comedy" or "Festival" segment):</p>
      {Object.entries(SEGMENT_MAP).map(([cat, seg]) => <Row key={cat} label={cat} value={`segmentName=${seg}`} />)}
      <p>Outbound, via the separate <code>classificationName</code> param (matches a genre/sub-genre name directly):</p>
      {Object.entries(CLASSIFICATION_NAME_MAP).map(([cat, name]) => <Row key={cat} label={cat} value={`classificationName=${name}`} />)}
      <p><strong>festivals</strong> and <strong>other</strong> have no outbound restriction — Ticketmaster has no matching segment or classification name for either, so those filters search unfiltered by classification rather than silently returning nothing.</p>

      <hr />
      <h2>4. Location Resolution — no geocoder, none added</h2>
      <p>No address geocoding service exists anywhere in this codebase, and none was added for this fix — Ticketmaster's own Discovery API natively accepts a ZIP, or a city + state, without needing one:</p>
      <p>• A 5-digit input → <code>postalCode</code> + <code>countryCode=US</code></p>
      <p>• "City, ST" or "City ST" with a recognized USPS state code → <code>city</code> + <code>stateCode</code> + <code>countryCode=US</code></p>
      <p>• Anything else → a plain <code>city</code> search (Ticketmaster fuzzy-matches city names)</p>
      <p>A full street address is not resolved specially — it falls through to the plain city search above, since a real street-level geocoder would be a new paid dependency this fix deliberately does not add. Flagging that here rather than adding one silently.</p>

      <hr />
      <h2>Summary</h2>
      <Row label="Existing Ticketmaster integration found" value="YES — src/lib/discovery/providers/events.ts" />
      <Row label="Existing integration reused (not duplicated)" value="YES" />
      <Row label="API key detected server-side" value={keyPresent ? "YES" : "NO"} />
      <Row label="30032 (25 mi) HTTP status" value={zip30032.diag?.httpStatus != null ? String(zip30032.diag.httpStatus) : "none"} />
      <Row label="30032 (25 mi) events returned" value={String(zip30032.diag?.eventsReturned ?? 0)} />
      <p style={{ marginTop: "1rem" }}><strong>ROOT CAUSE:</strong> {rootCause}</p>
      <p><strong>FIX:</strong> {fix}</p>
    </div>
  );
}
