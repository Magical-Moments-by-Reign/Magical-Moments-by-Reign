// ── Music — member playlists (SERVER ONLY) ─────────────────────────
// A member's own custom playlists inside Music, distinct from Apple's
// curated "Top Playlists". Every track is a real Apple Music catalog song
// (catalogId), with a display snapshot taken at add-time — nothing here is
// fabricated. Reads degrade to an empty list (never crash the page) when
// the Playlist/PlaylistTrack tables haven't been pushed to this
// environment's database yet, same convention as watchlist.ts.

import { prisma } from "@/lib/db";

export interface PlaylistTrackEntry {
  id: string;
  catalogId: string;
  name: string;
  artistName: string;
  albumName?: string;
  artworkUrl?: string;
  url?: string;
  previewUrl?: string;
}

export interface PlaylistEntry {
  id: string;
  name: string;
  createdAt: Date;
  tracks: PlaylistTrackEntry[];
}

export interface TrackInput {
  catalogId: string;
  name: string;
  artistName: string;
  albumName?: string;
  artworkUrl?: string;
  url?: string;
  previewUrl?: string;
}

export async function getMyPlaylists(accountId: string): Promise<PlaylistEntry[]> {
  const rows = await prisma.playlist
    .findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, include: { tracks: { orderBy: { addedAt: "desc" } } } })
    .catch(() => []);
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    tracks: p.tracks.map((t) => ({
      id: t.id,
      catalogId: t.catalogId,
      name: t.name,
      artistName: t.artistName,
      albumName: t.albumName ?? undefined,
      artworkUrl: t.artworkUrl ?? undefined,
      url: t.url ?? undefined,
      previewUrl: t.previewUrl ?? undefined,
    })),
  }));
}

export async function createPlaylist(accountId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await prisma.playlist.create({ data: { accountId, name: trimmed.slice(0, 120) } }).catch(() => undefined);
}

/** Ownership-checked — a playlistId that doesn't belong to this account is
 *  silently a no-op rather than an error, same as watchlist.ts's pattern. */
export async function deletePlaylist(accountId: string, playlistId: string): Promise<void> {
  await prisma.playlist.deleteMany({ where: { id: playlistId, accountId } }).catch(() => undefined);
}

export async function addTrackToPlaylist(accountId: string, playlistId: string, track: TrackInput): Promise<void> {
  const playlist = await prisma.playlist.findFirst({ where: { id: playlistId, accountId }, select: { id: true } }).catch(() => null);
  if (!playlist || !track.catalogId || !track.name || !track.artistName) return;
  await prisma.playlistTrack.upsert({
    where: { playlistId_catalogId: { playlistId, catalogId: track.catalogId } },
    update: {},
    create: {
      playlistId,
      catalogId: track.catalogId,
      name: track.name,
      artistName: track.artistName,
      albumName: track.albumName,
      artworkUrl: track.artworkUrl,
      url: track.url,
      previewUrl: track.previewUrl,
    },
  }).catch(() => undefined);
}

export async function removeTrackFromPlaylist(accountId: string, playlistId: string, catalogId: string): Promise<void> {
  const playlist = await prisma.playlist.findFirst({ where: { id: playlistId, accountId }, select: { id: true } }).catch(() => null);
  if (!playlist) return;
  await prisma.playlistTrack.deleteMany({ where: { playlistId, catalogId } }).catch(() => undefined);
}
