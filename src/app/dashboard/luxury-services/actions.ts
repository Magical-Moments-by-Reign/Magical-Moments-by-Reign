"use server";

// ── Luxury Services — server actions ────────────────────────────
// Thin, ownership-checked shells. Members can request, save, submit drafts,
// and cancel — never confirm. No purchase happens here; anything bookable
// always goes through Purchase Review first (future provider integrations).

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import { intakeFor, getServiceCategory, type ServicePath } from "@/lib/reservations/catalog";
import { createReservationRequest, cancelReservation, submitDraft } from "@/lib/reservations/service";
import { saveService, removeSaved } from "@/lib/reservations/saved";

function titleFor(serviceType: string, d: Record<string, string>): string {
  const svc = getServiceCategory(serviceType);
  if (serviceType === "restaurants") {
    const bits = [d.cuisine?.trim(), d.city?.trim() ? `in ${d.city.trim()}` : "", d.guests?.trim() ? `for ${d.guests.trim()}` : ""].filter(Boolean);
    return bits.length ? `Dining ${bits.join(" ")}`.replace(/\s+/g, " ").trim() : "Restaurant request";
  }
  if (serviceType === "flights") {
    if (d.from && d.to) return `Flights ${d.from.toUpperCase()} → ${d.to.toUpperCase()}`;
    return "Flight request";
  }
  if (serviceType === "vacation-packages" && d.destination) return `Vacation package to ${d.destination}`;
  if (d.title?.trim()) return d.title.trim();
  return `${svc?.label ?? "Concierge"} request`;
}

/** Submit (or save-as-draft) a request from an intake form. */
export async function createRequestAction(serviceType: string, path: ServicePath, formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/luxury-services");
  const svc = getServiceCategory(serviceType);
  if (!svc) redirect("/dashboard/luxury-services");

  const fields = intakeFor(serviceType, path);
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
    location: details.city || details.destination || details.to || null,
    date: details.date || details.departDate || details.dates || null,
    time: details.time || null,
    guestCount: Number.isFinite(guests) ? guests : null,
    clientNotes: details.notes || null,
    details,
    asDraft,
  });

  revalidatePath("/dashboard/luxury-services");
  revalidatePath("/dashboard/luxury-services/reservations");
  redirect(`/dashboard/luxury-services/reservations/${rec.id}`);
}

/** Save a service/search for later (no purchase). */
export async function saveServiceAction(serviceType: string, formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/luxury-services");
  const svc = getServiceCategory(serviceType);
  if (!svc) redirect("/dashboard/luxury-services");

  const details: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && v.trim() && !k.startsWith("_")) details[k] = v.trim();
  }
  const label = (formData.get("_label") as string)?.trim() || titleFor(serviceType, details);

  await saveService({
    accountId: account.id,
    serviceType,
    label,
    collection: (formData.get("_collection") as string)?.trim() || null,
    journeyNotes: (formData.get("_notes") as string)?.trim() || null,
    details,
  });
  revalidatePath("/dashboard/luxury-services/saved");
  redirect("/dashboard/luxury-services/saved");
}

export async function removeSavedAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/luxury-services");
  const id = String(formData.get("id") || "");
  if (id) { await removeSaved(account.id, id); revalidatePath("/dashboard/luxury-services/saved"); }
}

export async function cancelReservationAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/luxury-services");
  const id = String(formData.get("id") || "");
  if (id) {
    await cancelReservation(account.id, id);
    revalidatePath(`/dashboard/luxury-services/reservations/${id}`);
    revalidatePath("/dashboard/luxury-services/reservations");
  }
}

export async function submitDraftAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/luxury-services");
  const id = String(formData.get("id") || "");
  if (id) {
    await submitDraft(account.id, id);
    revalidatePath(`/dashboard/luxury-services/reservations/${id}`);
    revalidatePath("/dashboard/luxury-services/reservations");
  }
}
