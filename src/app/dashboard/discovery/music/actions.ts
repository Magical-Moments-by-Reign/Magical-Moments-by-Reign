"use server";

// ── Music page — Spotify connection actions ───────────────────────

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import { disconnectSpotify } from "@/lib/spotify/connection";

export async function disconnectSpotifyAction(): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/music");
  await disconnectSpotify(account.id);
  revalidatePath("/dashboard/discovery/music");
}
