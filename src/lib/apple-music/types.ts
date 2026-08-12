// ── Apple Music — catalog search types (SERVER + UI) ──────────────
// Plain data shapes for real Apple Music Catalog API results. No field here
// is ever fabricated — every value comes straight from Apple's own
// `attributes` object, and any field Apple didn't return is left undefined
// rather than guessed at.

export interface AppleMusicArtistResult {
  id: string;
  name: string;
  url?: string; // Apple Music web page for the artist, when Apple returns one
  genreNames?: string[];
}

export interface AppleMusicAlbumResult {
  id: string;
  name: string;
  artistName: string;
  artworkUrl?: string;
  url?: string;
  releaseDate?: string;
  trackCount?: number;
}

export interface AppleMusicSongResult {
  id: string;
  name: string;
  artistName: string;
  albumName?: string;
  artworkUrl?: string;
  url?: string;
  durationMs?: number;
}

export type AppleMusicSearchType = "artists" | "albums" | "songs";

export interface AppleMusicSearchResults {
  artists: AppleMusicArtistResult[];
  albums: AppleMusicAlbumResult[];
  songs: AppleMusicSongResult[];
}
