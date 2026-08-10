"use server";

// ── Discovery Content Center — server actions (OWNER ONLY) ───────
// Every action re-checks requireOwner() itself — never trusts that the page
// that rendered the form already gated it. Manual content lives in
// DiscoveryFeatured only; these actions never touch DiscoveryCache (live
// provider data), so a curation edit can never corrupt a live fetch and vice
// versa, per the architecture spec.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/guard";
import { createFeatured, deleteFeatured, type FeaturedSection } from "@/lib/discovery/admin";

const SECTIONS: FeaturedSection[] = ["today", "watch", "movie", "music_chart", "near_you", "trending"];

function parseDate(v: FormDataEntryValue | null): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parses up to 10 manual chart rows (rank/song/artist/url) from the form —
 *  used only when section === "music_chart". */
function parseChartEntries(formData: FormData): Array<{ rank: number; song: string; artist: string; url?: string }> {
  const entries: Array<{ rank: number; song: string; artist: string; url?: string }> = [];
  for (let i = 1; i <= 10; i++) {
    const song = (formData.get(`song_${i}`) as string | null)?.trim();
    const artist = (formData.get(`artist_${i}`) as string | null)?.trim();
    if (!song || !artist) continue;
    const url = (formData.get(`url_${i}`) as string | null)?.trim();
    entries.push({ rank: i, song, artist, url: url || undefined });
  }
  return entries;
}

export async function createFeaturedAction(formData: FormData): Promise<void> {
  const account = await requireOwner("/dashboard/discovery/admin");
  const section = formData.get("section") as string;
  if (!SECTIONS.includes(section as FeaturedSection)) redirect("/dashboard/discovery/admin");

  const title = (formData.get("title") as string)?.trim();
  if (!title) redirect("/dashboard/discovery/admin");

  await createFeatured({
    section: section as FeaturedSection,
    title,
    description: (formData.get("description") as string)?.trim() || null,
    imageUrl: (formData.get("imageUrl") as string)?.trim() || null,
    externalUrl: (formData.get("externalUrl") as string)?.trim() || null,
    category: (formData.get("category") as string)?.trim() || null,
    entries: section === "music_chart" ? parseChartEntries(formData) : undefined,
    startAt: parseDate(formData.get("startAt")),
    endAt: parseDate(formData.get("endAt")),
    featured: formData.get("featured") === "on",
    sortOrder: Number(formData.get("sortOrder")) || 0,
    createdById: account.id,
  });

  revalidatePath("/dashboard/discovery/admin");
  revalidatePath("/dashboard/discovery");
  revalidatePath(`/dashboard/discovery/${section === "movie" ? "movies" : section === "near_you" ? "near-you" : section === "music_chart" ? "music" : section}`);
}

export async function deleteFeaturedAction(formData: FormData): Promise<void> {
  await requireOwner("/dashboard/discovery/admin");
  const id = String(formData.get("id") || "");
  if (id) await deleteFeatured(id);
  revalidatePath("/dashboard/discovery/admin");
  revalidatePath("/dashboard/discovery");
}
