// ── Apple Music — developer token (SERVER ONLY) ──────────────────
// Re-exported from the shared Apple Music module (src/lib/apple-music/token)
// so the chart provider here (music.ts) and the catalog search module
// (src/lib/apple-music/catalog.ts) share exactly one ES256 signing
// implementation instead of two that could drift apart. See that file for
// the full implementation and the required env vars.

export { appleMusicDeveloperToken, appleMusicConfigured } from "../../apple-music/token";
