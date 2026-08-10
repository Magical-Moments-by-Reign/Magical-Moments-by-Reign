// ── TEMPORARY DIAGNOSTIC PAGE — DELETE BEFORE FINAL MERGE ──────────
// /dashboard/discovery/admin/diagnostics/api-sports
//
// Tests the real API_SPORTS_KEY, read server-side from the real deployed
// Netlify runtime, against the real API-Basketball host — so we're testing
// the exact path Magical Sports actually uses in production, not a
// sandbox's ability to make a curl request.
//
// The key is read once from process.env.API_SPORTS_KEY, used only in the
// two outgoing request headers below, and NEVER rendered on this page,
// logged, or returned in any form. Owner-gated (requireOwner, re-checked
// here — this route's own existence isn't treated as protection).
//
// DELETE THIS FILE (and this folder) once the Sports connectivity question
// is answered and the real fix (or plan decision) has shipped.

import type { Metadata } from "next";
import { requireOwner } from "@/lib/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "API-Sports Diagnostic (Temporary)", robots: { index: false } };

const HOST = "https://v1.basketball.api-sports.io";
const NBA_LEAGUE_ID = "12";
const TEST_SEASON = "2024-2025";
const TEST_DATE = "2024-12-25"; // NBA Christmas Day — reliably has multiple real games

interface CallResult {
  status: number | null;
  body: any;
  fetchFailed: boolean;
}

async function callApiSports(path: string, key: string): Promise<CallResult> {
  try {
    const res = await fetch(`${HOST}${path}`, { headers: { "x-apisports-key": key }, cache: "no-store" });
    const body = await res.json().catch(() => null);
    return { status: res.status, body, fetchFailed: false };
  } catch {
    return { status: null, body: null, fetchFailed: true };
  }
}

function likelyCause(statusResult: CallResult, gamesResult: CallResult): string {
  if (statusResult.fetchFailed || gamesResult.fetchFailed) return "Network/host problem reaching API-Sports from this deployment — check the host URL and outbound network access.";
  if (statusResult.status === 401 || statusResult.status === 403) return "API key authentication failed — the key itself is invalid, revoked, or not recognized by API-Sports.";
  if (statusResult.status !== 200) return `Unexpected /status response (HTTP ${statusResult.status}) — likely our integration/configuration (wrong header or host), not a plan issue.`;
  if (gamesResult.status === 403) return "Free-plan restriction — authentication succeeded, but this endpoint/competition is not included in the current plan.";
  if (gamesResult.status === 429) return "Rate limit hit — the plan's request quota was exceeded for this window.";
  if (gamesResult.status === 400) return "Incorrect request parameters — the query itself was rejected (check league/season/date values).";
  if (gamesResult.status !== 200) return `Unexpected data-endpoint response (HTTP ${gamesResult.status}) — likely our integration/configuration, not a plan issue.`;
  const arr = Array.isArray(gamesResult.body?.response) ? gamesResult.body.response : [];
  if (!arr.length) return "Request succeeded (HTTP 200) but returned zero games — likely missing/unsupported data for this specific date/season rather than a connectivity or plan problem. Try a different date to confirm.";
  return "No problem found — authentication and data retrieval both succeeded.";
}

export default async function ApiSportsDiagnosticPage() {
  await requireOwner("/dashboard/discovery/admin");

  const key = process.env.API_SPORTS_KEY?.trim();

  if (!key) {
    return (
      <div style={{ padding: "2rem", maxWidth: 640, fontFamily: "monospace" }}>
        <h1>API-SPORTS DIAGNOSTIC</h1>
        <p>Environment Key Present: <strong>NO</strong></p>
        <p>API_SPORTS_KEY is not set in this deployment&rsquo;s runtime environment. If you just added it in Netlify, confirm a fresh deploy has actually picked it up (env var changes require a redeploy to take effect).</p>
      </div>
    );
  }

  const statusResult = await callApiSports("/status", key);
  const statusResponse = statusResult.body?.response;
  const authSuccess = statusResult.status === 200 && !statusResult.fetchFailed;

  const gamesResult = await callApiSports(`/games?league=${NBA_LEAGUE_ID}&season=${TEST_SEASON}&date=${TEST_DATE}`, key);
  const gamesArr = Array.isArray(gamesResult.body?.response) ? gamesResult.body.response : [];
  const cause = likelyCause(statusResult, gamesResult);

  return (
    <div style={{ padding: "2rem", maxWidth: 640, fontFamily: "monospace", lineHeight: 1.7 }}>
      <h1>API-SPORTS DIAGNOSTIC</h1>
      <p style={{ color: "#a63a2e" }}>Temporary — Owner only. Delete this page once Sports connectivity is confirmed.</p>

      <p>Environment Key Present: <strong>YES</strong></p>

      <hr />
      <h2>Authentication</h2>
      <p><strong>{authSuccess ? "SUCCESS" : "FAILED"}</strong></p>
      <p>Status Request: HTTP {statusResult.fetchFailed ? "— (fetch failed)" : statusResult.status}</p>
      {authSuccess && (
        <>
          <p>Plan: {statusResponse?.subscription?.plan ?? "unknown"}</p>
          <p>Subscription Active: {String(statusResponse?.subscription?.active ?? "unknown")}</p>
          <p>Subscription End: {statusResponse?.subscription?.end ?? "unknown"}</p>
          <p>Requests Used: {statusResponse?.requests?.current ?? "unknown"} / {statusResponse?.requests?.limit_day ?? "unknown"} per day</p>
        </>
      )}
      {!authSuccess && statusResult.body?.errors && (
        <p>Provider Message: {JSON.stringify(statusResult.body.errors)}</p>
      )}

      <hr />
      <h2>Basketball/NBA Test</h2>
      <p>Query: league={NBA_LEAGUE_ID}, season={TEST_SEASON}, date={TEST_DATE}</p>
      <p>HTTP Status: {gamesResult.fetchFailed ? "— (fetch failed)" : gamesResult.status}</p>
      <p>Results Returned: {gamesArr.length}</p>
      {gamesArr[0] && (
        <p>Sample: {gamesArr[0]?.teams?.away?.name ?? "?"} @ {gamesArr[0]?.teams?.home?.name ?? "?"}</p>
      )}
      {gamesResult.body?.errors && Object.keys(gamesResult.body.errors).length > 0 && (
        <p>Provider Message: {JSON.stringify(gamesResult.body.errors)}</p>
      )}

      <hr />
      <h2>Likely Cause</h2>
      <p><strong>{cause}</strong></p>
    </div>
  );
}
