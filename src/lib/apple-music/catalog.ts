// ── Apple Music — catalog search (SERVER ONLY) ────────────────────
// GET /v1/catalog/{storefront}/search — Apple's real, current Search for
// Catalog Resources endpoint (verified against Apple's Apple Music API
// documentation: term + types + limit query params, `Authorization: Bearer
// <developer token>` header, results grouped by type under `results.<type>.
// data`). One request returns artists, albums, and songs together — there is
// no separate endpoint per resource type.
//
// Deliberately independent of src/lib/spotify/catalog.ts: different API,
// different auth model (app-level developer token vs per-member OAuth
// token), different response shape. Nothing here reads a Spotify credential
// or a member's Spotify connection, and nothing in src/lib/spotify imports
// from here.

import { appleMusicDeveloperToken } from "./token";
import type {
  AppleMusicAlbumResult,
  AppleMusicArtistResult,
  AppleMusicSearchResults,
  AppleMusicSearchType,
  AppleMusicSongResult,
} from "./types";

const APPLE_MUSIC_BASE = "https://api.music.apple.com/v1";
const DEFAULT_STOREFRONT = "us";
const ALL_TYPES: AppleMusicSearchType[] = ["artists", "albums", "songs"];

function resolveArtwork(url: unknown, size = 300): string | undefined {
  return typeof url === "string" ? url.replace("{w}x{h}", `${size}x${size}`) : undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Pure: map one catalog artist resource. Exported for tests. */
export function mapArtist(a: any): AppleMusicArtistResult | null {
  const attrs = a?.attributes;
  if (!a?.id || !attrs?.name) return null;
  return {
    id: String(a.id),
    name: String(attrs.name),
    artworkUrl: resolveArtwork(attrs?.artwork?.url),
    url: typeof attrs.url === "string" ? attrs.url : undefined,
    genreNames: Array.isArray(attrs.genreNames) ? attrs.genreNames.filter((g: unknown) => typeof g === "string") : undefined,
  };
}

/** Pure: map one catalog album resource. Exported for tests. */
export function mapAlbum(a: any): AppleMusicAlbumResult | null {
  const attrs = a?.attributes;
  if (!a?.id || !attrs?.name || !attrs?.artistName) return null;
  return {
    id: String(a.id),
    name: String(attrs.name),
    artistName: String(attrs.artistName),
    artworkUrl: resolveArtwork(attrs?.artwork?.url),
    url: typeof attrs.url === "string" ? attrs.url : undefined,
    releaseDate: typeof attrs.releaseDate === "string" ? attrs.releaseDate : undefined,
    trackCount: typeof attrs.trackCount === "number" ? attrs.trackCount : undefined,
  };
}

/** Pure: map one catalog song resource. Exported for tests. */
export function mapCatalogSong(s: any): AppleMusicSongResult | null {
  const attrs = s?.attributes;
  if (!s?.id || !attrs?.name || !attrs?.artistName) return null;
  return {
    id: String(s.id),
    name: String(attrs.name),
    artistName: String(attrs.artistName),
    albumName: typeof attrs.albumName === "string" ? attrs.albumName : undefined,
    artworkUrl: resolveArtwork(attrs?.artwork?.url),
    url: typeof attrs.url === "string" ? attrs.url : undefined,
    durationMs: typeof attrs.durationInMillis === "number" ? attrs.durationInMillis : undefined,
    previewUrl: Array.isArray(attrs?.previews) && typeof attrs.previews[0]?.url === "string" ? attrs.previews[0].url : undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface CatalogSearchOptions {
  types?: AppleMusicSearchType[]; // default: artists + albums + songs
  limit?: number; // Apple: min 5, max 25 (clamped)
  storefront?: string; // default "us"
}

export interface CatalogSearchDiagnostic {
  requestAttempted: boolean;
  httpStatus: number | null;
  jsonParsed: boolean;
  resultsCounts: { artists: number; albums: number; songs: number };
  data: AppleMusicSearchResults | null;
}

/**
 * Real, live Apple Music catalog search. Returns the raw HTTP outcome too
 * (for the diagnostics page) — never fabricates a status or a result.
 */
export async function searchCatalogDiagnostic(term: string, opts: CatalogSearchOptions = {}): Promise<CatalogSearchDiagnostic> {
  const token = appleMusicDeveloperToken();
  const trimmed = term.trim();
  if (!token || !trimmed) {
    return { requestAttempted: false, httpStatus: null, jsonParsed: false, resultsCounts: { artists: 0, albums: 0, songs: 0 }, data: null };
  }

  const types = opts.types?.length ? opts.types : ALL_TYPES;
  const storefront = opts.storefront ?? DEFAULT_STOREFRONT;
  const limit = Math.min(25, Math.max(5, opts.limit ?? 10));
  const q = new URLSearchParams({ term: trimmed, types: types.join(","), limit: String(limit) });

  try {
    const res = await fetch(`${APPLE_MUSIC_BASE}/catalog/${encodeURIComponent(storefront)}/search?${q.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { requestAttempted: true, httpStatus: res.status, jsonParsed: false, resultsCounts: { artists: 0, albums: 0, songs: 0 }, data: null };
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { requestAttempted: true, httpStatus: res.status, jsonParsed: false, resultsCounts: { artists: 0, albums: 0, songs: 0 }, data: null };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = json as any;
    const artists = (Array.isArray(j?.results?.artists?.data) ? j.results.artists.data : []).map(mapArtist).filter((x: AppleMusicArtistResult | null): x is AppleMusicArtistResult => x !== null);
    const albums = (Array.isArray(j?.results?.albums?.data) ? j.results.albums.data : []).map(mapAlbum).filter((x: AppleMusicAlbumResult | null): x is AppleMusicAlbumResult => x !== null);
    const songs = (Array.isArray(j?.results?.songs?.data) ? j.results.songs.data : []).map(mapCatalogSong).filter((x: AppleMusicSongResult | null): x is AppleMusicSongResult => x !== null);
    const data = { artists, albums, songs };
    return { requestAttempted: true, httpStatus: res.status, jsonParsed: true, resultsCounts: { artists: artists.length, albums: albums.length, songs: songs.length }, data };
  } catch {
    return { requestAttempted: true, httpStatus: null, jsonParsed: false, resultsCounts: { artists: 0, albums: 0, songs: 0 }, data: null };
  }
}

/** Member-facing search: real results or null. Never a fake/empty stand-in for a failure. */
export async function searchCatalog(term: string, opts: CatalogSearchOptions = {}): Promise<AppleMusicSearchResults | null> {
  const result = await searchCatalogDiagnostic(term, opts);
  return result.data;
}
