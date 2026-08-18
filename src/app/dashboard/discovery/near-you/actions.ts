"use server";

// ── Near You — server actions ─────────────────────────────────────
// Every action re-checks requireAccount() itself — never trusts that the
// page that rendered the form already gated it.

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import { saveEvent, unsaveEvent } from "@/lib/discovery/saved-events";
import type { EventCategory } from "@/lib/discovery/providers/events";

export async function saveEventAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/near-you");
  const ticketmasterId = String(formData.get("ticketmasterId") || "");
  const name = String(formData.get("name") || "");
  const ticketUrl = String(formData.get("ticketUrl") || "");
  if (!ticketmasterId || !name || !ticketUrl) return;
  await saveEvent(account.id, {
    id: ticketmasterId,
    name,
    ticketUrl,
    category: (formData.get("category") ? String(formData.get("category")) : "other") as EventCategory,
    imageUrl: formData.get("imageUrl") ? String(formData.get("imageUrl")) : undefined,
    localDate: formData.get("localDate") ? String(formData.get("localDate")) : undefined,
    localTime: formData.get("localTime") ? String(formData.get("localTime")) : undefined,
    venueName: formData.get("venueName") ? String(formData.get("venueName")) : undefined,
    city: formData.get("city") ? String(formData.get("city")) : undefined,
    state: formData.get("state") ? String(formData.get("state")) : undefined,
  });
  revalidatePath("/dashboard/discovery/near-you");
  revalidatePath("/dashboard/discovery/near-you/saved");
}

export async function unsaveEventAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/near-you");
  const ticketmasterId = String(formData.get("ticketmasterId") || "");
  if (!ticketmasterId) return;
  await unsaveEvent(account.id, ticketmasterId);
  revalidatePath("/dashboard/discovery/near-you");
  revalidatePath("/dashboard/discovery/near-you/saved");
}
