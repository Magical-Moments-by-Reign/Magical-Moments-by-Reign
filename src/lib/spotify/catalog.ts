// ── Spotify — catalog search (SERVER ONLY) ────────────────────────
// GET /v1/search — the only catalog endpoint this module uses. Deliberately
// avoids Browse New Releases and Get an Artist's Top Tracks, both removed
// from new Spotify apps in 2026 — Trending Music must never be built around
// either. Artwork and metadata are passed through unmodified: no cropping,
// no re-hosting, no branding overlay. Every result carries Spotify's own
// external_urls.spotify link — required attribution, not optional.

const SEARCH_URL = "https://api.spotify.com/v1/search";

export interface SpotifyArtistResult {
  id: string;
  name: string;
  imageUrl?: string;
  externalUrl: string;
}

export interface SpotifyAlbumResult {
  id: string;
  name: string;
  artistNames: string;
  imageUrl?: string;
  externalUrl: string;
}

export interface SpotifyTrackResult {
  id: string;
  name: string;
  artistNames: string;
  albumName: string;
  imageUrl?: string;
  externalUrl: string;
}

export interface SpotifySearchResults {
  artists: SpotifyArtistResult[];
  albums: SpotifyAlbumResult[];
  tracks: SpotifyTrackResult[];
}

function mapArtist(a: any): SpotifyArtistResult | null {
  if (!a?.id || !a?.name || !a?.external_urls?.spotify) return null;
  return { id: a.id, name: a.name, imageUrl: a.images?.[0]?.url, externalUrl: a.external_urls.spotify };
}

function mapAlbum(a: any): SpotifyAlbumResult | null {
  if (!a?.id || !a?.name || !a?.external_urls?.spotify) return null;
  return {
    id: a.id,
    name: a.name,
    artistNames: Array.isArray(a.artists) ? a.artists.map((x: any) => x.name).filter(Boolean).join(", ") : "",
    imageUrl: a.images?.[0]?.url,
    externalUrl: a.external_urls.spotify,
  };
}

function mapTrack(t: any): SpotifyTrackResult | null {
  if (!t?.id || !t?.name || !t?.external_urls?.spotify) return null;
  return {
    id: t.id,
    name: t.name,
    artistNames: Array.isArray(t.artists) ? t.artists.map((x: any) => x.name).filter(Boolean).join(", ") : "",
    albumName: t.album?.name ?? "",
    imageUrl: t.album?.images?.[0]?.url,
    externalUrl: t.external_urls.spotify,
  };
}

/** Searches artists, albums, and tracks in one call. `accessToken` may be
 *  either the member's own connected token or an app-level (client
 *  credentials) token — /v1/search accepts either. Returns null on any
 *  failure (expired token, network error, bad response) — never fabricated
 *  results. */
export async function searchCatalog(accessToken: string, query: string): Promise<SpotifySearchResults | null> {
  const q = query.trim();
  if (!q) return { artists: [], albums: [], tracks: [] };

  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("type", "artist,album,track");
  url.searchParams.set("limit", "6");

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await res.json().catch(() => null);
  if (!json) return null;

  return {
    artists: (json.artists?.items ?? []).map(mapArtist).filter((a: SpotifyArtistResult | null): a is SpotifyArtistResult => a !== null),
    albums: (json.albums?.items ?? []).map(mapAlbum).filter((a: SpotifyAlbumResult | null): a is SpotifyAlbumResult => a !== null),
    tracks: (json.tracks?.items ?? []).map(mapTrack).filter((t: SpotifyTrackResult | null): t is SpotifyTrackResult => t !== null),
  };
}
