"use server";

// ── Watch TV Show — server actions ────────────────────────────────
// Every action re-checks requireAccount() itself — never trusts that the
// page that rendered the form already gated it.

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import { addToLineup, removeFromLineup, toggleFavorite } from "@/lib/discovery/watchlist";

export async function addToLineupAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/watch");
  const tmdbId = String(formData.get("tmdbId") || "");
  const title = String(formData.get("title") || "");
  const posterUrl = formData.get("posterUrl") ? String(formData.get("posterUrl")) : undefined;
  if (!tmdbId || !title) return;
  await addToLineup(account.id, tmdbId, title, posterUrl);
  revalidatePath("/dashboard/discovery/watch");
}

export async function removeFromLineupAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/watch");
  const tmdbId = String(formData.get("tmdbId") || "");
  if (!tmdbId) return;
  await removeFromLineup(account.id, tmdbId);
  revalidatePath("/dashboard/discovery/watch");
}

export async function toggleFavoriteAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/watch");
  const tmdbId = String(formData.get("tmdbId") || "");
  if (!tmdbId) return;
  await toggleFavorite(account.id, tmdbId);
  revalidatePath("/dashboard/discovery/watch");
}
