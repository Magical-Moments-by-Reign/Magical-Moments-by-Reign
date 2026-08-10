// ── TEMPORARY DIAGNOSTIC PAGE — DELETE BEFORE FINAL MERGE ──────────
// /dashboard/discovery/admin/diagnostics/spotify
//
// Tests the real deployed Netlify -> Spotify path end to end, using
// whatever SPOTIFY_CLIENT_ID/SECRET is actually set in this runtime — not a
// local simulation. Two checks run without any human clicking through
// Spotify's consent screen (env + Client Credentials Flow auth + catalog
// search), because Client Credentials validates the same client_id/secret
// pair the Authorization Code flow uses, without needing a user. The full
// human consent -> callback round trip still requires a real click-through
// (see the "Connect Flow" section below) — this page tells you exactly what
// that does and doesn't prove.
//
// The client secret is read once from process.env, used only inside the
// server-side Basic-auth header, and NEVER rendered, logged, or returned in
// any form. requireOwner()-gated, re-checked here.
//
// DELETE THIS PAGE (and this folder) once Spotify connectivity is confirmed
// and the real fix has shipped.

import type { Metadata } from "next";
import { requireOwner } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { spotifyClientId, spotifyClientSecret, spotifyRedirectUri } from "@/lib/spotify/config";
import { getAppAccessToken } from "@/lib/spotify/oauth";
import { searchCatalog } from "@/lib/spotify/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Spotify Diagnostic (Temporary)", robots: { index: false } };

const EXPECTED_CALLBACK = "https://magicalmomentsbyreign.com/api/spotify/callback";

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return <p style={{ color: warn ? "#a63a2e" : undefined }}><strong>{label}:</strong> {value}</p>;
}

export default async function SpotifyDiagnosticPage() {
  await requireOwner("/dashboard/discovery/admin");

  // ── 1. Environment check ──
  const clientId = spotifyClientId();
  const clientSecret = spotifyClientSecret();
  const clientIdPresent = Boolean(clientId);
  const clientSecretPresent = Boolean(clientSecret);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "(not set — falling back to hardcoded default)";
  const computedRedirect = spotifyRedirectUri();
  const callbackMatches = computedRedirect === EXPECTED_CALLBACK;

  // ── 2. Spotify auth test (Client Credentials Flow — validates the
  //      id/secret pair directly, no user consent needed) ──
  const appToken = clientIdPresent && clientSecretPresent ? await getAppAccessToken() : null;
  const authSuccess = appToken?.ok ?? false;

  // ── 4. Database check ──
  let dbApplied = false;
  let dbConnectionCount: number | null = null;
  let dbError: string | null = null;
  try {
    dbConnectionCount = await prisma.spotifyConnection.count();
    dbApplied = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Unknown database error";
  }

  // ── 5. Catalog/search test (only meaningful if step 2 succeeded) ──
  const searchResult = authSuccess && appToken?.accessToken ? await searchCatalog(appToken.accessToken, "Beyoncé") : null;
  const searchAttempted = authSuccess && !!appToken?.accessToken;
  const searchSuccess = searchAttempted && searchResult !== null;
  const searchResultCount = searchResult ? searchResult.artists.length + searchResult.albums.length + searchResult.tracks.length : 0;

  // ── Root cause / fix derivation ──
  let rootCause: string;
  let fix: string;
  if (!clientIdPresent || !clientSecretPresent) {
    rootCause = "SPOTIFY_CLIENT_ID and/or SPOTIFY_CLIENT_SECRET is missing from this deployment's runtime environment.";
    fix = "Confirm both are set in Netlify → Site configuration → Environment variables for THIS deploy context (production vs. deploy previews are separate), then trigger a fresh deploy — env var changes don't apply to an already-running deploy.";
  } else if (!callbackMatches) {
    rootCause = `The computed redirect URI (${computedRedirect}) does not exactly match the registered Spotify redirect URI (${EXPECTED_CALLBACK}). Spotify rejects the whole flow — a mismatch here (scheme, www, trailing slash, or a Netlify preview/localhost URL leaking into NEXT_PUBLIC_BASE_URL) fails Spotify's redirect_uri validation before anything else runs.`;
    fix = `Set NEXT_PUBLIC_BASE_URL to exactly "https://magicalmomentsbyreign.com" (no trailing slash) in Netlify's production environment variables, and confirm the Spotify Developer Dashboard's Redirect URIs field has exactly "${EXPECTED_CALLBACK}" — both sides must match character-for-character.`;
  } else if (!authSuccess) {
    rootCause = `Spotify rejected the client_id/client_secret pair itself (HTTP ${appToken?.status ?? "—"}) — independent of any user or redirect URI. This means the values stored in Netlify don't match what's registered in the Spotify Developer Dashboard for this app.`;
    fix = "Re-copy SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET directly from the Spotify Developer Dashboard → Magical Moments By Reign → Settings, with no extra whitespace, and re-save them in Netlify. If the secret was ever regenerated in the Spotify dashboard, the old one in Netlify is now invalid.";
  } else if (!dbApplied) {
    rootCause = `Credentials and callback URL are correct, but the production database doesn't have the SpotifyConnection table yet (${dbError}).`;
    fix = "Run the production database migration/push (the same prepare-db step used for every other schema change) against the production DATABASE_URL, then redeploy.";
  } else if (!searchSuccess) {
    rootCause = "Authentication succeeds and the database is ready, but a real Spotify catalog request still failed — check the error detail above; this points at something in the request itself (host, headers, or a transient Spotify-side issue) rather than credentials.";
    fix = "Re-run this diagnostic in a few minutes to rule out a transient issue. If it persists, the search request construction itself needs review.";
  } else {
    rootCause = "No problem found in anything testable without a live user click-through: credentials authenticate, the callback URL matches exactly, the database is ready, and a real Spotify catalog search succeeded.";
    fix = "The remaining, untestable-from-here step is a real human completing the Connect Spotify flow in a browser. If that still doesn't work, the most likely cause is Spotify's Development Mode blocking your specific test account — see the Development Mode section below.";
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 720, fontFamily: "monospace", lineHeight: 1.7 }}>
      <h1>SPOTIFY DIAGNOSTIC</h1>
      <p style={{ color: "#a63a2e" }}>Temporary — Owner only. Delete this page once Spotify connectivity is confirmed.</p>

      <hr />
      <h2>1. Environment Check</h2>
      <Row label="SPOTIFY_CLIENT_ID present" value={clientIdPresent ? "YES" : "NO"} warn={!clientIdPresent} />
      <Row label="SPOTIFY_CLIENT_SECRET present" value={clientSecretPresent ? "YES" : "NO"} warn={!clientSecretPresent} />
      <Row label="NEXT_PUBLIC_BASE_URL" value={baseUrl} />
      <Row label="Computed Spotify Redirect URI" value={computedRedirect} />
      <Row label="Expected (registered) callback" value={EXPECTED_CALLBACK} />
      <Row label="Callback exact match" value={callbackMatches ? "YES" : "NO — MISMATCH"} warn={!callbackMatches} />

      <hr />
      <h2>2. Spotify Auth Test (Client Credentials Flow)</h2>
      <p>Validates SPOTIFY_CLIENT_ID/SECRET directly with Spotify — no user consent needed for this check.</p>
      <Row label="Spotify credential authentication" value={authSuccess ? "SUCCESS" : "FAILED"} warn={!authSuccess} />
      <Row label="HTTP status" value={appToken?.status != null ? String(appToken.status) : "— (not attempted, see step 1)"} />
      {!authSuccess && appToken?.errorBody != null && <Row label="Safe Spotify error" value={JSON.stringify(appToken.errorBody)} warn />}

      <hr />
      <h2>3. Connect Spotify Flow — stage by stage</h2>
      <p>Stages 1–2 below are proven live by this page (steps 1–2 above). Stage 3 onward requires a real human clicking through Spotify&rsquo;s consent screen in a browser — that cannot be simulated from a server-rendered diagnostic page.</p>
      <p>1. Member clicks CONNECT SPOTIFY → builds the authorize URL: <strong>{callbackMatches ? "verified correct" : "BLOCKED — see redirect URI mismatch above"}</strong></p>
      <p>2. Credentials recognized by Spotify: <strong>{authSuccess ? "verified live above" : "BLOCKED — see auth test above"}</strong></p>
      <p>3. Spotify consent screen → 4. /api/spotify/callback → 5. state validation → 6. code exchange → 7. profile retrieved → 8. SpotifyConnection saved → 9. redirect to /dashboard/discovery/music: <strong>requires a live click-through — see &ldquo;How to test the real flow&rdquo; below</strong></p>

      <hr />
      <h2>4. Database Check</h2>
      <Row label="SpotifyConnection table reachable" value={dbApplied ? "YES" : "NO"} warn={!dbApplied} />
      {dbApplied
        ? <Row label="Existing connections in production" value={String(dbConnectionCount)} />
        : <Row label="Error" value={dbError ?? "unknown"} warn />}

      <hr />
      <h2>5. Spotify Catalog/Search Test</h2>
      <p>Query: &ldquo;Beyoncé&rdquo; (artist/album/track search) via the app-level token from step 2.</p>
      <Row label="Spotify catalog request" value={!searchAttempted ? "NOT ATTEMPTED (step 2 failed)" : searchSuccess ? "SUCCESS" : "FAILED"} warn={searchAttempted && !searchSuccess} />
      <Row label="Results returned" value={String(searchResultCount)} />
      {searchResult?.artists[0] && <Row label="Sample result" value={searchResult.artists[0].name} />}

      <hr />
      <h2>6. Development Mode</h2>
      <p>The Spotify app is in Development Mode. Under current Spotify platform rules, ONLY Spotify accounts explicitly added under:</p>
      <p><strong>Spotify Developer Dashboard → Magical Moments By Reign → Settings → User Management</strong></p>
      <p>can complete the consent screen and connect — this is a per-Spotify-account allow-list of up to 25 users, separate from your Spotify Developer account itself (being the app&rsquo;s developer does not automatically allow-list your personal listening account). Add the exact email address tied to whichever Spotify account will be used to test the Connect flow. A non-allow-listed account does not reach our callback at all — it dead-ends on Spotify&rsquo;s own screen, which looks like nothing happening rather than an error on our side.</p>

      <hr />
      <h2>How to test the real flow (stage 3 onward)</h2>
      <p>1. Add the test Spotify account&rsquo;s email under User Management (above), if not already added.</p>
      <p>2. Log into Magical Moments as that member on the deployed site, visit /dashboard/discovery/music, click Connect Spotify.</p>
      <p>3. Approve on Spotify&rsquo;s consent screen. You should land back on /dashboard/discovery/music with a &ldquo;Connected to Spotify&rdquo; status and a real search box.</p>
      <p>4. If it fails, note exactly where — stuck on Spotify&rsquo;s screen (Development Mode), or a `?spotify=...` error code in the URL when it returns (invalid_state, exchange_failed, profile_failed) — and re-run this diagnostic page immediately after, since steps 1/2/4/5 above will reflect the same live environment the failed attempt just used.</p>

      <hr />
      <h2>Summary Report</h2>
      <Row label="Spotify credentials present" value={clientIdPresent && clientSecretPresent ? "YES" : "NO"} />
      <Row label="Callback exact match" value={callbackMatches ? "YES" : "NO"} />
      <Row label="Spotify authentication" value={authSuccess ? "SUCCESS" : "FAILED"} />
      <Row label="OAuth authorization" value={callbackMatches && authSuccess ? "SUCCESS (code-verified; live click-through still required)" : "BLOCKED"} />
      <Row label="Callback" value="Requires live click-through — see section 3" />
      <Row label="Production DB migration" value={dbApplied ? "APPLIED" : "NOT APPLIED"} />
      <Row label="SpotifyConnection saved" value={dbApplied && (dbConnectionCount ?? 0) > 0 ? "YES" : "NO"} />
      <Row label="Spotify API catalog/search request" value={searchSuccess ? "SUCCESS" : "FAILED"} />
      <Row label="Music UI" value="See /dashboard/discovery/music directly — Connect/Connected status and search now live" />
      <Row label="Development Mode user access" value="ACTION REQUIRED unless already added — see section 6" />
      <p style={{ marginTop: "1rem" }}><strong>ROOT CAUSE:</strong> {rootCause}</p>
      <p><strong>FIX:</strong> {fix}</p>
    </div>
  );
}
