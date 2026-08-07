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

/**
 * Request Concierge Assistance for a discovered restaurant. HONEST: Yelp is a
 * DISCOVERY provider, not a reservation provider — so this creates a real
 * concierge REQUEST only (status "Request Submitted"). It never fabricates a
 * reservation time, table, confirmation number, or "booked" status. The
 * concierge secures any actual table and records a real confirmation later,
 * and when a reservation provider (e.g. OpenTable) is connected this same flow
 * gains a Reservation Review + real confirmation — no redesign needed.
 */
export async function reserveRestaurantAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/luxury-services/restaurants");
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/dashboard/luxury-services/restaurants");

  const details: Record<string, string> = {};
  for (const k of ["businessId", "provider", "address", "phone", "providerUrl", "date", "time", "guests"]) {
    const v = formData.get(k);
    if (typeof v === "string" && v.trim()) details[k] = v.trim();
  }
  const guests = details.guests ? parseInt(details.guests, 10) : NaN;

  const rec = await createReservationRequest({
    accountId: account.id,
    serviceType: "restaurants",
    title: `Concierge request — ${name}`,
    business: name,
    location: details.address || null,
    date: details.date || null,
    time: details.time || null,
    guestCount: Number.isFinite(guests) ? guests : null,
    details: { ...details, discoveredVia: details.provider || "provider" },
  });

  revalidatePath("/dashboard/luxury-services/reservations");
  redirect(`/dashboard/luxury-services/reservations/${rec.id}`);
}

/**
 * Save a provider-discovered restaurant. Per the architecture, we store only
 * the STABLE reference — the provider business id — plus the member's own
 * collection + notes, and never duplicate Yelp's business record. Full details
 * are refreshed live from the provider by id on the detail page.
 */
export async function saveRestaurantAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/luxury-services/restaurants");
  const name = String(formData.get("name") || "").trim();
  const businessId = String(formData.get("businessId") || "").trim();
  if (!name) redirect("/dashboard/luxury-services/restaurants");

  await saveService({
    accountId: account.id,
    serviceType: "restaurants",
    label: name,
    provider: (formData.get("provider") as string)?.trim() || null,
    collection: (formData.get("_collection") as string)?.trim() || null,
    journeyNotes: (formData.get("_notes") as string)?.trim() || null,
    // Store only the stable provider reference — refresh details from it later.
    details: businessId ? { businessId } : {},
  });
  revalidatePath("/dashboard/luxury-services/saved");
  redirect("/dashboard/luxury-services/saved");
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
