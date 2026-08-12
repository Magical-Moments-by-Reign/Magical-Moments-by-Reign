// ── TEMPORARY DIAGNOSTIC PAGE — DELETE BEFORE FINAL MERGE ──────────
// /dashboard/discovery/admin/diagnostics/apple-music
//
// Apple Music catalog search only needs the app-level developer token (no
// member OAuth), so — like the Ticketmaster diagnostic — this page runs a
// REAL live search itself on every load: one request, "Beyoncé", asking for
// artists + albums + songs together (Apple's search endpoint returns all
// three from a single call). Nothing here is faked — if credentials are
// missing or the request fails, that is reported honestly, never papered
// over with placeholder results.
//
// The private key is read once from process.env, used only inside the
// server-side signer, and NEVER rendered, logged, or returned in any form —
// only the four presence booleans below ever reach this page's output.
//
// DELETE THIS PAGE (and this folder) once Apple Music connectivity is
// confirmed and the catalog search feature has shipped.

import type { Metadata } from "next";
import { requireOwner } from "@/lib/guard";
import { appleMusicCredentialPresence } from "@/lib/apple-music/config";
import { appleMusicDeveloperToken } from "@/lib/apple-music/token";
import { searchCatalogDiagnostic } from "@/lib/apple-music/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Apple Music Diagnostic (Temporary)", robots: { index: false } };

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return <p style={{ color: warn ? "#a63a2e" : undefined }}><strong>{label}:</strong> {value}</p>;
}

const TEST_TERM = "Beyoncé";

export default async function AppleMusicDiagnosticPage() {
  await requireOwner("/dashboard/discovery/admin");

  const presence = appleMusicCredentialPresence();
  const credentialsPresent = presence.teamId && presence.keyId && presence.privateKey;

  const token = credentialsPresent ? appleMusicDeveloperToken() : null;
  const tokenGenerated = token !== null;

  const test = tokenGenerated
    ? await searchCatalogDiagnostic(TEST_TERM, { types: ["artists", "albums", "songs"], limit: 5 })
    : { requestAttempted: false, httpStatus: null, jsonParsed: false, resultsCounts: { artists: 0, albums: 0, songs: 0 }, data: null };

  const totalResults = test.resultsCounts.artists + test.resultsCounts.albums + test.resultsCounts.songs;
  const artistPass = test.resultsCounts.artists > 0;
  const albumPass = test.resultsCounts.albums > 0;
  const songPass = test.resultsCounts.songs > 0;
  const sampleArtist = test.data?.artists[0]?.name;
  const sampleAlbum = test.data?.albums[0]?.name;
  const sampleSong = test.data?.songs[0]?.name;

  let rootCause: string;
  let fix: string;
  if (!credentialsPresent) {
    const missing = [!presence.teamId && "APPLE_MUSIC_TEAM_ID", !presence.keyId && "APPLE_MUSIC_KEY_ID", !presence.privateKey && "APPLE_MUSIC_PRIVATE_KEY"].filter(Boolean).join(", ");
    rootCause = `Missing from this deployment's runtime environment: ${missing}.`;
    fix = "Confirm all three are set in Netlify → Site configuration → Environment variables for THIS deploy context (production vs. deploy-preview scoping can differ), then trigger a fresh deploy.";
  } else if (!tokenGenerated) {
    rootCause = "All three credentials are present, but ES256 signing still failed. The signer already auto-repairs the most common paste mistakes (quoted value, literal \\n instead of real newlines, CRLF line endings, a UTF-8 BOM, and a base64 body pasted without the BEGIN/END PRIVATE KEY lines) — signing failing after all of that means the key content itself doesn't match, or was truncated/corrupted during copy.";
    fix = "Re-download the .p8 file fresh from Apple Developer → Certificates, Identifiers & Profiles → Keys (a key can only be downloaded once, but you can revoke and generate a new one if the original is lost), open it in a plain text editor, select all, and re-paste the entire contents into APPLE_MUSIC_PRIVATE_KEY in Netlify. Confirm APPLE_MUSIC_KEY_ID matches that same key's Key ID exactly.";
  } else if (!test.requestAttempted || test.httpStatus === null) {
    rootCause = "The developer token generated successfully, but the request to Apple's servers never completed (network-level failure).";
    fix = "Check outbound network access from this deploy context to api.music.apple.com. Retry — this can be transient.";
  } else if (test.httpStatus === 401) {
    rootCause = "Apple rejected the developer token (HTTP 401) — the token is well-formed but Apple doesn't consider it valid.";
    fix = "Confirm the Key ID and Team ID match the same MusicKit key in Apple Developer → Certificates, Identifiers & Profiles → Keys, and that the key hasn't been revoked.";
  } else if (test.httpStatus !== 200) {
    rootCause = `Apple returned HTTP ${test.httpStatus} for the live catalog search.`;
    fix = "See Apple's status code for this response — 403 usually means the key lacks Apple Music API access, 429 means the request quota is exhausted.";
  } else if (totalResults === 0) {
    rootCause = `The request succeeded (HTTP 200) but returned zero results for "${TEST_TERM}" across all three types — unexpected for a well-known artist.`;
    fix = "Re-check the response shape against Apple's current Search for Catalog Resources documentation in case Apple has changed field names.";
  } else {
    rootCause = "Live catalog search succeeds end-to-end. No fix needed for connectivity.";
    fix = "None — Apple Music catalog search is working.";
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 820, fontFamily: "monospace", lineHeight: 1.7 }}>
      <h1>APPLE MUSIC DIAGNOSTIC</h1>
      <p style={{ color: "#a63a2e" }}>Temporary — Owner only. Delete this page once Apple Music catalog search is confirmed.</p>

      <hr />
      <h2>1. Environment Check</h2>
      <Row label="APPLE_MUSIC_TEAM_ID present" value={presence.teamId ? "YES" : "NO"} warn={!presence.teamId} />
      <Row label="APPLE_MUSIC_KEY_ID present" value={presence.keyId ? "YES" : "NO"} warn={!presence.keyId} />
      <Row label="APPLE_MUSIC_PRIVATE_KEY present" value={presence.privateKey ? "YES" : "NO"} warn={!presence.privateKey} />
      <Row label="APPLE_MUSIC_MEDIA_ID present" value={presence.mediaId ? "YES" : "NO"} />
      <p>Note: the Media ID identifies the MusicKit key pairing on Apple&rsquo;s side. It is not sent as a token claim or request parameter for server-side catalog calls — it becomes required only if a future client-side MusicKit JS (user-authorized) flow is added.</p>

      <hr />
      <h2>2. Developer Token Generation</h2>
      <Row label="Algorithm" value="ES256, header kid = Key ID, claims iss/iat/exp" />
      <Row label="Result" value={tokenGenerated ? "SUCCESS" : "FAILED"} warn={!tokenGenerated} />

      <hr />
      <h2>3. Live Catalog Search — real request, run on this page load</h2>
      <Row label="Endpoint" value={`GET https://api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(TEST_TERM)}&types=artists,albums,songs&limit=5`} />
      <Row label="Search term" value={TEST_TERM} />
      <Row label="Request attempted" value={test.requestAttempted ? "YES" : "NO"} />
      <Row label="HTTP status" value={test.httpStatus != null ? String(test.httpStatus) : "none"} warn={test.httpStatus !== 200} />
      <Row label="JSON parsed" value={test.jsonParsed ? "PASS" : "FAIL"} warn={test.requestAttempted && !test.jsonParsed} />
      <Row label="Results returned (total)" value={String(totalResults)} />

      <hr />
      <h2>4. Per-Type Results</h2>
      <Row label="Artist search" value={artistPass ? "PASS" : "FAIL"} warn={!artistPass} />
      {sampleArtist && <Row label="Sample artist" value={sampleArtist} />}
      <Row label="Album search" value={albumPass ? "PASS" : "FAIL"} warn={!albumPass} />
      {sampleAlbum && <Row label="Sample album" value={sampleAlbum} />}
      <Row label="Track search" value={songPass ? "PASS" : "FAIL"} warn={!songPass} />
      {sampleSong && <Row label="Sample track" value={sampleSong} />}
      <Row label="Artwork present on sample" value={test.data?.songs[0]?.artworkUrl || test.data?.albums[0]?.artworkUrl ? "YES" : "NO"} />
      <Row label="Apple Music URL present on sample" value={test.data?.songs[0]?.url || test.data?.albums[0]?.url ? "YES" : "NO"} />

      <hr />
      <h2>Summary</h2>
      <Row label="Apple credentials present" value={credentialsPresent ? "YES" : "NO"} />
      <Row label="Developer token generation" value={tokenGenerated ? "SUCCESS" : "FAILED"} />
      <Row label="Apple Music API HTTP status" value={test.httpStatus != null ? String(test.httpStatus) : "none"} />
      <Row label="Real catalog results" value={totalResults > 0 ? "YES" : "NO"} />
      <p style={{ marginTop: "1rem" }}><strong>ROOT CAUSE:</strong> {rootCause}</p>
      <p><strong>FIX:</strong> {fix}</p>
    </div>
  );
}
