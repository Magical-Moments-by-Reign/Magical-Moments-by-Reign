"use server";

// ── Music — server actions ──────────────────────────────────────────
// Every action re-checks requireAccount() itself — never trusts that the
// page that rendered the form already gated it.

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import { createPlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist } from "@/lib/discovery/playlists";

const MUSIC_PATH = "/dashboard/discovery/music";

export async function createPlaylistAction(formData: FormData): Promise<void> {
  const account = await requireAccount(MUSIC_PATH);
  const name = String(formData.get("name") || "");
  if (!name.trim()) return;
  await createPlaylist(account.id, name);
  revalidatePath(MUSIC_PATH);
}

export async function deletePlaylistAction(formData: FormData): Promise<void> {
  const account = await requireAccount(MUSIC_PATH);
  const playlistId = String(formData.get("playlistId") || "");
  if (!playlistId) return;
  await deletePlaylist(account.id, playlistId);
  revalidatePath(MUSIC_PATH);
}

export async function addTrackToPlaylistAction(formData: FormData): Promise<void> {
  const account = await requireAccount(MUSIC_PATH);
  const playlistId = String(formData.get("playlistId") || "");
  const catalogId = String(formData.get("catalogId") || "");
  const name = String(formData.get("name") || "");
  const artistName = String(formData.get("artistName") || "");
  if (!playlistId || !catalogId || !name || !artistName) return;
  await addTrackToPlaylist(account.id, playlistId, {
    catalogId,
    name,
    artistName,
    albumName: formData.get("albumName") ? String(formData.get("albumName")) : undefined,
    artworkUrl: formData.get("artworkUrl") ? String(formData.get("artworkUrl")) : undefined,
    url: formData.get("url") ? String(formData.get("url")) : undefined,
    previewUrl: formData.get("previewUrl") ? String(formData.get("previewUrl")) : undefined,
  });
  revalidatePath(MUSIC_PATH);
}

export async function removeTrackFromPlaylistAction(formData: FormData): Promise<void> {
  const account = await requireAccount(MUSIC_PATH);
  const playlistId = String(formData.get("playlistId") || "");
  const catalogId = String(formData.get("catalogId") || "");
  if (!playlistId || !catalogId) return;
  await removeTrackFromPlaylist(account.id, playlistId, catalogId);
  revalidatePath(MUSIC_PATH);
}
