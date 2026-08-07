"use server";

// ── Concierge & Reservations — server actions ───────────────────
// Thin, ownership-checked shells over the reservation service. Members can
// submit requests, save drafts, submit drafts, and cancel — never confirm.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import { intakeFor, getServiceCategory } from "@/lib/reservations/catalog";
import { createReservationRequest, cancelReservation, submitDraft } from "@/lib/reservations/service";

/** Build a short human title from the intake payload. */
function titleFor(serviceType: string, details: Record<string, string>): string {
  const svc = getServiceCategory(serviceType);
  if (serviceType === "restaurants") {
    const bits = [details.cuisine?.trim(), details.city?.trim() ? `in ${details.city.trim()}` : "", details.guests?.trim() ? `for ${details.guests.trim()}` : ""].filter(Boolean);
    return bits.length ? `Dining ${bits.join(" ")}`.replace(/\s+/g, " ").trim() : "Restaurant reservation request";
  }
  if (details.title?.trim()) return details.title.trim();
  return `${svc?.label ?? "Concierge"} request`;
}

/** Submit (or save-as-draft) a reservation request from an intake form. */
export async function createRequestAction(serviceType: string, formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/concierge");
  const svc = getServiceCategory(serviceType);
  if (!svc) redirect("/dashboard/concierge");

  const fields = intakeFor(serviceType);
  const details: Record<string, string> = {};
  for (const f of fields) {
    const v = formData.get(f.key);
    if (typeof v === "string" && v.trim()) details[f.key] = v.trim();
  }
  const asDraft = formData.get("_action") === "draft";

  const guests = details.guests ? parseInt(details.guests, 10) : NaN;
  const rec = await createReservationRequest({
    accountId: account.id,
    serviceType,
    title: titleFor(serviceType, details),
    location: details.city || null,
    date: details.date || null,
    time: details.time || null,
    guestCount: Number.isFinite(guests) ? guests : null,
    clientNotes: details.notes || null,
    details,
    asDraft,
  });

  revalidatePath("/dashboard/concierge");
  revalidatePath("/dashboard/concierge/reservations");
  redirect(`/dashboard/concierge/reservations/${rec.id}`);
}

export async function cancelReservationAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/concierge");
  const id = String(formData.get("id") || "");
  if (id) {
    await cancelReservation(account.id, id);
    revalidatePath(`/dashboard/concierge/reservations/${id}`);
    revalidatePath("/dashboard/concierge/reservations");
  }
}

export async function submitDraftAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/concierge");
  const id = String(formData.get("id") || "");
  if (id) {
    await submitDraft(account.id, id);
    revalidatePath(`/dashboard/concierge/reservations/${id}`);
    revalidatePath("/dashboard/concierge/reservations");
  }
}
