// ── TEMPORARY DIAGNOSTIC PAGE — DELETE BEFORE FINAL MERGE ──────────
// /dashboard/discovery/admin/diagnostics/api-sports
//
// Tests the real API_SPORTS_KEY, read server-side from the real deployed
// Netlify runtime, against the real API-Sports hosts — so we're testing the
// exact path Magical Sports actually uses in production, not a sandbox's
// ability to make a curl request.
//
// The key is read once from process.env.API_SPORTS_KEY, used only in the
// outgoing request headers below, and NEVER rendered on this page, logged,
// or returned in any form — only a one-way hash + last-4-characters
// fingerprint is shown, enough to confirm "is this the same key" without
// exposing the secret itself. Owner-gated (requireOwner, re-checked here —
// this route's own existence isn't treated as protection).
//
// Every fetch below uses `cache: "no-store"` — this page always hits
// API-Sports live, never a cached response. It also purges any
// DiscoveryCache rows for api_sports that were recorded while the account
// was plan-restricted (see purgePlanRestrictedSportsCache) on every load,
// so a stale "Free plan" row can't keep shadowing a real plan upgrade.
//
// DELETE THIS FILE (and this folder) once the Sports connectivity question
// is answered and the real fix (or plan decision) has shipped.

import type { Metadata } from "next";
import { createHash } from "node:crypto";
import { requireOwner } from "@/lib/guard";
import { detectPlanRestriction, seasonParam, fetchLeagueLogo } from "@/lib/discovery/providers/sports";
import { purgePlanRestrictedSportsCache } from "@/lib/discovery/sports/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "API-Sports Diagnostic (Temporary)", robots: { index: false } };

const BASKETBALL_HOST = "https://v1.basketball.api-sports.io";
const FOOTBALL_HOST = "https://v1.american-football.api-sports.io"; // NFL/NCAAF — must match SPORT_CONFIG.nfl.host in providers/sports.ts
const NBA_LEAGUE_ID = "12";
const NFL_LEAGUE_ID = "1"; // must match SPORT_CONFIG.nfl.defaultLeague in providers/sports.ts
const NCAAF_LEAGUE_ID = "2"; // must match SPORT_CONFIG.ncaaf.defaultLeague in providers/sports.ts

// A best-effort starting guess only — a hard-coded date will always go
// stale as API-Sports' Free-plan demo window moves. What actually keeps
// the NBA test correct is the retry below: if this date is plan-restricted,
// we read the ACTUAL currently-allowed window straight out of the
// provider's own error message and retry with a date from inside it.
const INITIAL_TEST_SEASON = "2021-2022";
const INITIAL_TEST_DATE = "2021-12-25"; // NBA Christmas Day — reliably has multiple real games, if this season is in-window

interface CallResult {
  status: number | null;
  body: any;
  fetchFailed: boolean;
}

async function callApiSports(host: string, path: string, key: string): Promise<CallResult> {
  try {
    const res = await fetch(`${host}${path}`, { headers: { "x-apisports-key": key }, cache: "no-store" });
    const body = await res.json().catch(() => null);
    return { status: res.status, body, fetchFailed: false };
  } catch {
    return { status: null, body: null, fetchFailed: true };
  }
}

/** One-way fingerprint safe to display: a short SHA-256 prefix plus the
 *  key's last 4 characters — enough to confirm "is production using the
 *  same key I just upgraded" (e.g. by comparing against a fingerprint
 *  computed the same way from the key shown in the API-Sports dashboard)
 *  without ever exposing the secret itself. */
function keyFingerprint(secret: string): string {
  const hash = createHash("sha256").update(secret).digest("hex").slice(0, 12);
  const suffix = secret.length >= 4 ? secret.slice(-4) : "····";
  return `sha256:${hash}  (ends …${suffix}, ${secret.length} chars)`;
}

/** API-Sports' plan-restriction messages spell out the allowed window in
 *  plain text (e.g. "...try a date between 2021-08-01 and 2023-06-24.") —
 *  pull the LAST YYYY-MM-DD out of the message (the upper/more-recent
 *  bound) so a retry uses a date the provider is telling us, right now, is
 *  actually valid — not another guess that will just as easily go stale. */
function lastDateInMessage(message: string): string | null {
  const matches = message.match(/\d{4}-\d{2}-\d{2}/g);
  return matches && matches.length ? matches[matches.length - 1] : null;
}

function likelyCause(statusResult: CallResult, planIsPro: boolean, sportResults: { label: string; result: CallResult; restriction: string | null }[]): string {
  if (statusResult.fetchFailed) return "Network/host problem reaching API-Sports from this deployment — check outbound network access.";
  if (statusResult.status === 401 || statusResult.status === 403) return "API key authentication failed — the key itself is invalid, revoked, or not recognized by API-Sports. This is NOT the upgraded key, or it isn't set correctly in Netlify.";
  if (statusResult.status !== 200) return `Unexpected /status response (HTTP ${statusResult.status}) — likely our integration/configuration (wrong header or host), not a plan issue.`;

  const restricted = sportResults.find((r) => r.restriction);
  if (restricted) {
    return `${planIsPro ? "The account IS reporting Pro, but" : "The account is NOT reporting Pro, and"} ${restricted.label} still returned a plan-restriction message: "${restricted.restriction}". ${planIsPro ? "If the plan is genuinely Pro and this still happens after the cache purge above, the restriction is coming from somewhere else — double-check the upgrade actually applies to this sport's product line (API-Sports sells per-sport AND all-sport bundles) and that this deployment's API_SPORTS_KEY is the exact key on the upgraded account (compare the fingerprint above against the key on the API-Sports dashboard)." : "Confirm the Netlify API_SPORTS_KEY was actually updated to the new key and a fresh deploy has picked it up — env var changes need a redeploy to take effect."}`;
  }
  if (!planIsPro) return "Fresh /status call succeeded but does not report a Pro plan. Either the upgrade hasn't propagated on API-Sports' side yet, or the key currently set in Netlify's API_SPORTS_KEY is not the same key that was upgraded — compare the fingerprint above against the key shown on the API-Sports dashboard.";
  const emptyResult = sportResults.find((r) => {
    const arr = Array.isArray(r.result.body?.response) ? r.result.body.response : [];
    return !arr.length;
  });
  if (emptyResult) return `Pro plan confirmed, no plan restriction reported, but ${emptyResult.label} returned zero games for the date tested — likely a genuine no-games-that-day result rather than a connectivity or plan problem.`;
  return "No problem found — Pro plan confirmed via a fresh /status call, cache purged of any stale restriction rows, and live game data returned successfully.";
}

export default async function ApiSportsDiagnosticPage() {
  await requireOwner("/dashboard/discovery/admin");

  const key = process.env.API_SPORTS_KEY?.trim();

  if (!key) {
    return (
      <div style={{ padding: "2rem", maxWidth: 680, fontFamily: "monospace" }}>
        <h1>API-SPORTS DIAGNOSTIC</h1>
        <p>Environment Key Present: <strong>NO</strong></p>
        <p>API_SPORTS_KEY is not set in this deployment&rsquo;s runtime environment. If you just added it in Netlify, confirm a fresh deploy has actually picked it up (env var changes require a redeploy to take effect).</p>
      </div>
    );
  }

  // 1) One-time cleanup, every load: clear any DiscoveryCache rows recorded
  // while the account was plan-restricted, so a stale row from before the
  // upgrade can't keep shadowing the real, current plan for the rest of its
  // TTL. Safe to run repeatedly — a no-op once the table's already clean.
  const purgedCount = await purgePlanRestrictedSportsCache();

  // 2) Fresh account/status check — queried against BOTH the basketball and
  // football hosts. API-Sports ties subscription/plan/quota to the key, not
  // the host, so on a genuine "ALL SPORTS" plan both should report the same
  // thing; a mismatch would itself be a useful signal.
  const statusResult = await callApiSports(BASKETBALL_HOST, "/status", key);
  const statusResultFootball = await callApiSports(FOOTBALL_HOST, "/status", key);
  const statusResponse = statusResult.body?.response;
  const statusResponseFootball = statusResultFootball.body?.response;
  const authSuccess = statusResult.status === 200 && !statusResult.fetchFailed;
  const planName = String(statusResponse?.subscription?.plan ?? "").toLowerCase();
  const planIsPro = authSuccess && planName.includes("pro");

  // 3) Fresh NFL request — current season/date, exactly the query path the
  // live Sports page uses (see providers/sports.ts seasonParam/SPORT_CONFIG).
  const todayISO = new Date().toISOString().slice(0, 10);
  const nflSeason = seasonParam("nfl", todayISO);
  const nflResult = await callApiSports(FOOTBALL_HOST, `/games?league=${NFL_LEAGUE_ID}&season=${nflSeason}&date=${todayISO}`, key);
  const nflArr = Array.isArray(nflResult.body?.response) ? nflResult.body.response : [];
  const nflRestriction = authSuccess ? detectPlanRestriction(nflResult.body) : null;

  // 4) Existing NBA test, kept as a second data point — self-correcting
  // retry in case the account (or this specific date) is still restricted.
  const firstAttempt = await callApiSports(BASKETBALL_HOST, `/games?league=${NBA_LEAGUE_ID}&season=${INITIAL_TEST_SEASON}&date=${INITIAL_TEST_DATE}`, key);
  const firstRestriction = authSuccess ? detectPlanRestriction(firstAttempt.body) : null;
  let nbaResult = firstAttempt;
  let nbaDateUsed = INITIAL_TEST_DATE;
  let nbaSeasonUsed = INITIAL_TEST_SEASON;
  let retried = false;
  if (firstRestriction) {
    const suggested = lastDateInMessage(firstRestriction);
    if (suggested) {
      const retryDate = new Date(new Date(suggested).getTime() - 5 * 86_400_000).toISOString().slice(0, 10);
      const retrySeason = seasonParam("nba", retryDate);
      nbaResult = await callApiSports(BASKETBALL_HOST, `/games?league=${NBA_LEAGUE_ID}&season=${retrySeason}&date=${retryDate}`, key);
      nbaDateUsed = retryDate;
      nbaSeasonUsed = retrySeason;
      retried = true;
    }
  }
  const nbaArr = Array.isArray(nbaResult.body?.response) ? nbaResult.body.response : [];
  const nbaRestriction = authSuccess ? detectPlanRestriction(nbaResult.body) : null;

  // 5) NFL/NCAAF league-identity check — exactly what fetchLeagueLogo(sport)
  // itself queries (/leagues?id=X on the football host), plus the REAL
  // parsed result from that same function, so this page answers directly
  // whether a missing card-grid logo is a provider gap or a parser bug —
  // never a guess either way.
  const nflLeagueResult = await callApiSports(FOOTBALL_HOST, `/leagues?id=${NFL_LEAGUE_ID}`, key);
  const ncaafLeagueResult = await callApiSports(FOOTBALL_HOST, `/leagues?id=${NCAAF_LEAGUE_ID}`, key);
  const [nflLogoParsed, ncaafLogoParsed] = await Promise.all([fetchLeagueLogo("nfl"), fetchLeagueLogo("ncaaf")]);

  const cause = likelyCause(statusResult, planIsPro, [
    { label: "the NFL test", result: nflResult, restriction: nflRestriction },
    { label: "the NBA test", result: nbaResult, restriction: nbaRestriction },
  ]);

  return (
    <div style={{ padding: "2rem", maxWidth: 720, fontFamily: "monospace", lineHeight: 1.7 }}>
      <h1>API-SPORTS DIAGNOSTIC</h1>
      <p style={{ color: "#a63a2e" }}>Temporary — Owner only. Delete this page once Sports connectivity is confirmed.</p>

      <p>Environment Key Present: <strong>YES</strong></p>
      <p>Key Fingerprint: <strong>{keyFingerprint(key)}</strong></p>
      <p style={{ color: "#666" }}>Compare this fingerprint&rsquo;s last-4-characters (and, if you can compute a SHA-256 of the key shown on the API-Sports dashboard, the hash) against the key on the upgraded Pro account to confirm production is using that exact key.</p>

      <hr />
      <h2>Cache Purge</h2>
      <p>Plan-restricted rows removed from DiscoveryCache this load: <strong>{purgedCount}</strong></p>
      <p style={{ color: "#666" }}>{purgedCount > 0
        ? "These rows were recorded while the account was plan-restricted and would otherwise keep reporting that for the rest of their cache TTL (up to 3h) even after the upgrade. Removed — the next live Sports page view will fetch fresh."
        : "Nothing to purge — no stale plan-restricted rows found (either already clean, or none were ever cached)."}
      </p>

      <hr />
      <h2>Account Status (fresh, no-store)</h2>
      <p><strong>{authSuccess ? "AUTHENTICATED" : "FAILED"}</strong></p>
      <p>Status Request (basketball host {BASKETBALL_HOST}): HTTP {statusResult.fetchFailed ? "— (fetch failed)" : statusResult.status}</p>
      <p>Status Request (football host {FOOTBALL_HOST}): HTTP {statusResultFootball.fetchFailed ? "— (fetch failed)" : statusResultFootball.status}</p>
      {authSuccess && (
        <>
          <p>Plan: <strong>{statusResponse?.subscription?.plan ?? "unknown"}</strong> {planIsPro ? "✅ Pro detected" : "⚠️ Pro NOT detected"}</p>
          <p>Plan (via football host, cross-check): {statusResponseFootball?.subscription?.plan ?? "unknown"}</p>
          <p>Subscription Active: {String(statusResponse?.subscription?.active ?? "unknown")}</p>
          <p>Subscription End: {statusResponse?.subscription?.end ?? "unknown"}</p>
          <p>Requests Used: {statusResponse?.requests?.current ?? "unknown"} / {statusResponse?.requests?.limit_day ?? "unknown"} per day</p>
        </>
      )}
      {!authSuccess && statusResult.body?.errors && (
        <p>Provider Message: {JSON.stringify(statusResult.body.errors)}</p>
      )}

      <hr />
      <h2>NFL Test — Current Season/Date (fresh, no-store)</h2>
      <p>Host: {FOOTBALL_HOST}</p>
      <p>Query: league={NFL_LEAGUE_ID}, season={nflSeason}, date={todayISO}</p>
      <p>HTTP Status: {nflResult.fetchFailed ? "— (fetch failed)" : nflResult.status}</p>
      <p>Results Returned: {nflArr.length}</p>
      {nflArr[0] && <p>Sample: {nflArr[0]?.teams?.away?.name ?? "?"} @ {nflArr[0]?.teams?.home?.name ?? "?"}</p>}
      {nflRestriction && <p>Provider Message: <strong>Plan restriction</strong> — &ldquo;{nflRestriction}&rdquo;</p>}
      {!nflRestriction && nflResult.body?.errors && Object.keys(nflResult.body.errors).length > 0 && (
        <p>Provider Message: {JSON.stringify(nflResult.body.errors)}</p>
      )}

      <hr />
      <h2>NBA Test (fresh, no-store)</h2>
      <p>Host: {BASKETBALL_HOST}</p>
      <p>Attempt 1 — Query: league={NBA_LEAGUE_ID}, season={INITIAL_TEST_SEASON}, date={INITIAL_TEST_DATE}</p>
      {firstRestriction && <p>Attempt 1 result: <strong>Plan restriction</strong> — &ldquo;{firstRestriction}&rdquo;</p>}
      {retried && (
        <>
          <p>Retried using the date range the provider itself suggested (minus 5 days, to land inside a played game rather than exactly on the boundary):</p>
          <p>Attempt 2 — Query: league={NBA_LEAGUE_ID}, season={nbaSeasonUsed}, date={nbaDateUsed}</p>
        </>
      )}
      <p>Final HTTP Status: {nbaResult.fetchFailed ? "— (fetch failed)" : nbaResult.status}</p>
      <p>Results Returned: {nbaArr.length}</p>
      {nbaArr[0] && <p>Sample: {nbaArr[0]?.teams?.away?.name ?? "?"} @ {nbaArr[0]?.teams?.home?.name ?? "?"}</p>}
      {nbaRestriction && <p>Provider Message (final attempt): &ldquo;{nbaRestriction}&rdquo;</p>}
      {!nbaRestriction && nbaResult.body?.errors && Object.keys(nbaResult.body.errors).length > 0 && (
        <p>Provider Message: {JSON.stringify(nbaResult.body.errors)}</p>
      )}

      <hr />
      <h2>NFL/NCAAF League Logo Test (fresh, no-store)</h2>
      <p style={{ color: "#666" }}>Exactly what the Explore-grid card and per-sport header query via fetchLeagueLogo() — answers whether a generic-icon card is a provider gap or a code bug, not a guess either way.</p>
      {[
        { label: "NFL", leagueId: NFL_LEAGUE_ID, result: nflLeagueResult, parsed: nflLogoParsed },
        { label: "NCAAF", leagueId: NCAAF_LEAGUE_ID, result: ncaafLeagueResult, parsed: ncaafLogoParsed },
      ].map(({ label, leagueId, result, parsed }) => {
        const item = Array.isArray(result.body?.response) ? result.body.response[0] : null;
        const rawLogo = item?.league?.logo ?? item?.logo;
        return (
          <div key={label} style={{ marginBottom: "1rem" }}>
            <p><strong>{label}</strong> — Host: {FOOTBALL_HOST}, Query: /leagues?id={leagueId}</p>
            <p>HTTP Status: {result.fetchFailed ? "— (fetch failed)" : result.status}</p>
            <p>League Object Found: {item ? "YES" : "NO"}</p>
            {item && <p>League Name (raw): {item?.league?.name ?? item?.name ?? "—"}</p>}
            <p>Raw &lsquo;logo&rsquo; Field: {typeof rawLogo === "string" ? `"${rawLogo}"` : String(rawLogo)}</p>
            <p>Our Parser (fetchLeagueLogo) Result: {parsed ?? "null — see reason below"}</p>
            {!parsed && (
              <p style={{ color: "#a63a2e" }}>
                {!item
                  ? "No league object at this id in the response — wrong league id, or the account's plan doesn't include this league's data for /leagues."
                  : typeof rawLogo !== "string"
                    ? "Provider genuinely returned no logo field for this league — a real provider gap, not a parser bug."
                    : !rawLogo.trim().toLowerCase().startsWith("https://")
                      ? "Provider returned a logo value that isn't a real https:// URL — parser correctly rejected it."
                      : "Provider returned what looks like a valid https:// logo but our parser rejected it as a placeholder/unavailable marker — check the placeholder-string filter in fetchLeagueLogo."}
              </p>
            )}
            {result.body?.errors && Object.keys(result.body.errors).length > 0 && <p>Provider Message: {JSON.stringify(result.body.errors)}</p>}
          </div>
        );
      })}

      <hr />
      <h2>Likely Cause</h2>
      <p><strong>{cause}</strong></p>
    </div>
  );
}
