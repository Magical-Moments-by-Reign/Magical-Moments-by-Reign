// ── Music — chart provider (SERVER ONLY) ─────────────────────────
// Generic MusicProvider interface + an Apple Music Catalog Charts adapter.
// Apple Music charts are official, licensed rankings — we never re-derive or
// estimate a rank ourselves. When no chart provider is configured, the UI
// falls back to an owner-curated DiscoveryFeatured "music_chart" list, always
// labeled as a Magical Moments chart (see providers/index.ts + service.ts).

import { appleMusicConfigured, appleMusicDeveloperToken } from "./apple-music-token";

export type MusicGenre = "top" | "rnb" | "hip-hop" | "pop" | "country" | "gospel" | "afrobeats";

export interface MusicChartEntry {
  rank: number;
  song: string;
  artist: string;
  artworkUrl?: string;
  listenUrl?: string; // external — Apple Music's own page for the song
}

export interface MusicChart {
  chartTitle: string;
  genre: MusicGenre;
  entries: MusicChartEntry[];
  isOfficial: true; // live-provider charts are always official; manual ones set this false in service.ts
}

export interface MusicProvider {
  readonly slug: string;
  readonly name: string;
  readonly attribution: string;
  isConfigured(): boolean;
  chart(genre: MusicGenre, storefront?: string): Promise<MusicChart | null>;
}

const APPLE_MUSIC_BASE = "https://api.music.apple.com/v1";

// Apple Music's `charts` endpoint takes a `genre` id, not a free-text label —
// these are Apple's published genre ids for the storefront charts.
const GENRE_IDS: Record<MusicGenre, string | undefined> = {
  top: undefined, // omitting genre = the overall Top Songs chart
  rnb: "15", // R&B/Soul
  "hip-hop": "18", // Hip-Hop/Rap
  pop: "14",
  country: "6",
  gospel: "22", // Christian/Gospel
  afrobeats: "50000063", // Afrobeats (regional genre id)
};

const GENRE_TITLES: Record<MusicGenre, string> = {
  top: "Top Songs", rnb: "R&B", "hip-hop": "Hip-Hop/Rap", pop: "Pop",
  country: "Country", gospel: "Gospel", afrobeats: "Afrobeats",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Pure: map one Apple Music catalog song → a chart entry. Exported for tests. */
export function mapSong(s: any, rank: number): MusicChartEntry | null {
  const attrs = s?.attributes;
  if (!attrs?.name || !attrs?.artistName) return null;
  return {
    rank,
    song: String(attrs.name),
    artist: String(attrs.artistName),
    artworkUrl: typeof attrs?.artwork?.url === "string" ? attrs.artwork.url.replace("{w}x{h}", "300x300") : undefined,
    listenUrl: typeof attrs?.url === "string" ? attrs.url : undefined,
  };
}

export const AppleMusicProvider: MusicProvider = {
  slug: "apple_music",
  name: "Apple Music",
  attribution: "Charts provided by Apple Music.",

  isConfigured(): boolean {
    return appleMusicConfigured();
  },

  async chart(genre: MusicGenre, storefront: string = "us"): Promise<MusicChart | null> {
    const token = appleMusicDeveloperToken();
    if (!token) return null;

    const q = new URLSearchParams({ types: "songs", limit: "10" });
    const genreId = GENRE_IDS[genre];
    if (genreId) q.set("genre", genreId);

    try {
      const res = await fetch(`${APPLE_MUSIC_BASE}/catalog/${encodeURIComponent(storefront)}/charts?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 86_400 }, // daily
      });
      if (!res.ok) return null;
      const data = await res.json();
      const songsChart = data?.results?.songs?.[0];
      const raw = Array.isArray(songsChart?.data) ? songsChart.data : [];
      const entries = raw.map((s: any, i: number) => mapSong(s, i + 1)).filter((e: MusicChartEntry | null): e is MusicChartEntry => e !== null);
      if (!entries.length) return null;
      return { chartTitle: typeof songsChart?.name === "string" ? songsChart.name : GENRE_TITLES[genre], genre, entries, isOfficial: true };
    } catch {
      return null;
    }
  },
};
