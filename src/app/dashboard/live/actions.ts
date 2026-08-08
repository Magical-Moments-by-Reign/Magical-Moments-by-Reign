"use server";

// ── Magical Moments Live — host actions ─────────────────────────
// Ownership-checked room lifecycle. Members create/open rooms for their own
// occasions and drive SCHEDULED → LIVE → ENDED. Audience never reaches these.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { createRoom, activeRoomForExperience, setStatus } from "@/lib/live/rooms";

/** Go Live for an occasion (or a standalone room). Reopens an existing
 *  scheduled/live room for the occasion instead of creating duplicates. */
export async function goLiveAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const experienceId = (formData.get("experienceId") as string)?.trim() || null;
  let title = (formData.get("title") as string)?.trim() || "";
  const scheduledStartRaw = (formData.get("scheduledStart") as string)?.trim();

  // Default the title from the occasion when not supplied.
  if (!title && experienceId) {
    const exp = await prisma.experience.findFirst({ where: { id: experienceId, accountId: account.id }, select: { title: true } });
    title = exp?.title ? `${exp.title} — Live` : "Live";
  }
  if (!title) title = "Live";

  if (experienceId) {
    const existing = await activeRoomForExperience(account.id, experienceId);
    if (existing) redirect(`/live/${existing.id}`);
  }

  const room = await createRoom({
    accountId: account.id,
    experienceId,
    title,
    scheduledStart: scheduledStartRaw ? new Date(scheduledStartRaw) : null,
  });
  if (!room) redirect("/dashboard/live"); // occasion not owned → bail safely
  revalidatePath("/dashboard/live");
  redirect(`/live/${room.id}`);
}

export async function startLiveAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const id = String(formData.get("roomId") || "");
  if (id) { await setStatus(account.id, id, "LIVE"); revalidatePath(`/live/${id}`); }
}

export async function endLiveAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live");
  const id = String(formData.get("roomId") || "");
  if (id) { await setStatus(account.id, id, "ENDED"); revalidatePath(`/live/${id}`); redirect("/dashboard/live"); }
}
