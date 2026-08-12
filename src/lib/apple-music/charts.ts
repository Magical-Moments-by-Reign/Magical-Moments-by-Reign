// ── Apple Music — albums & playlists charts (SERVER ONLY) ─────────
// Real Apple Music Catalog Charts data for the Music page's "New Releases"
// and "Playlists For You" rows. Song charts already exist and are cached
// via src/lib/discovery/service.ts's getMusicChart() (which wraps the
// existing AppleMusicProvider.chart() + Postgres DiscoveryCache) — this
// module only adds the two chart types that provider didn't already cover.
// Apple's catalog API has no "artists" chart, so artist discovery stays in
// catalog search (catalog.ts) rather than a fabricated browse row here.

import { appleMusicDeveloperToken } from "./token";
import { mapAlbum } from "./catalog";
import type { AppleMusicAlbumResult, AppleMusicPlaylistResult } from "./types";

const APPLE_MUSIC_BASE = "https://api.music.apple.com/v1";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Pure: map one catalog playlist resource. Exported for tests. */
export function mapPlaylist(p: any): AppleMusicPlaylistResult | null {
  const attrs = p?.attributes;
  if (!p?.id || !attrs?.name) return null;
  return {
    id: String(p.id),
    name: String(attrs.name),
    curatorName: typeof attrs.curatorName === "string" ? attrs.curatorName : undefined,
    description: typeof attrs?.description?.standard === "string" ? attrs.description.standard : undefined,
    artworkUrl: typeof attrs?.artwork?.url === "string" ? attrs.artwork.url.replace("{w}x{h}", "300x300") : undefined,
    url: typeof attrs.url === "string" ? attrs.url : undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface AlbumsAndPlaylistsCharts {
  albumsTitle: string;
  albums: AppleMusicAlbumResult[];
  playlistsTitle: string;
  playlists: AppleMusicPlaylistResult[];
}

/** Real Apple Music catalog charts for albums + playlists. Null on any failure — never fabricated. */
export async function getAlbumsAndPlaylistsCharts(storefront: string = "us"): Promise<AlbumsAndPlaylistsCharts | null> {
  const token = appleMusicDeveloperToken();
  if (!token) return null;

  try {
    const res = await fetch(`${APPLE_MUSIC_BASE}/catalog/${encodeURIComponent(storefront)}/charts?types=albums,playlists&limit=8`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 86_400 }, // daily, matching the existing songs chart's cadence
    });
    if (!res.ok) return null;
    const data = await res.json();

    const albumsChart = data?.results?.albums?.[0];
    const albumsRaw = Array.isArray(albumsChart?.data) ? albumsChart.data : [];
    const albums = albumsRaw.map(mapAlbum).filter((a: AppleMusicAlbumResult | null): a is AppleMusicAlbumResult => a !== null);

    const playlistsChart = data?.results?.playlists?.[0];
    const playlistsRaw = Array.isArray(playlistsChart?.data) ? playlistsChart.data : [];
    const playlists = playlistsRaw.map(mapPlaylist).filter((p: AppleMusicPlaylistResult | null): p is AppleMusicPlaylistResult => p !== null);

    if (!albums.length && !playlists.length) return null;

    return {
      albumsTitle: typeof albumsChart?.name === "string" ? albumsChart.name : "New Releases",
      albums,
      playlistsTitle: typeof playlistsChart?.name === "string" ? playlistsChart.name : "Playlists For You",
      playlists,
    };
  } catch {
    return null;
  }
}
