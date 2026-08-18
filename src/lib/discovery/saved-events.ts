// ── Near You — saved events (SERVER ONLY) ──────────────────────────
// A personal watchlist of Ticketmaster events a member bookmarked — never
// proof of purchase. Magical Moments has no connection to Ticketmaster's
// order/checkout data (that would require a Ticketmaster Partner/Order API
// relationship we don't have), so this can never know what a member
// actually bought. Every saved row still links out to Ticketmaster's own
// real event page — the only place an actual purchase happens.

import { prisma } from "@/lib/db";
import type { DiscoveredEvent } from "./providers/events";

export interface SavedEventEntry {
  id: string; // SavedEvent row id
  ticketmasterId: string;
  name: string;
  imageUrl?: string;
  category?: string;
  localDate?: string;
  localTime?: string;
  venueName?: string;
  city?: string;
  state?: string;
  ticketUrl: string;
  addedAt: Date;
}

/** Reads degrade to an empty list (never crash the page) when the
 *  SavedEvent table hasn't been pushed to this environment's database yet —
 *  schema deploys are a deliberate manual step here, so a brand-new model
 *  can legitimately be missing for a while. */
export async function getSavedEvents(accountId: string): Promise<SavedEventEntry[]> {
  const rows = await prisma.savedEvent.findMany({ where: { accountId }, orderBy: { addedAt: "desc" } }).catch(() => []);
  return rows.map((r) => ({
    id: r.id,
    ticketmasterId: r.ticketmasterId,
    name: r.name,
    imageUrl: r.imageUrl ?? undefined,
    category: r.category ?? undefined,
    localDate: r.localDate ?? undefined,
    localTime: r.localTime ?? undefined,
    venueName: r.venueName ?? undefined,
    city: r.city ?? undefined,
    state: r.state ?? undefined,
    ticketUrl: r.ticketUrl,
    addedAt: r.addedAt,
  }));
}

export async function getSavedEventIds(accountId: string): Promise<Set<string>> {
  const rows = await prisma.savedEvent.findMany({ where: { accountId }, select: { ticketmasterId: true } }).catch(() => []);
  return new Set(rows.map((r) => r.ticketmasterId));
}

export async function saveEvent(accountId: string, event: DiscoveredEvent): Promise<void> {
  await prisma.savedEvent.upsert({
    where: { accountId_ticketmasterId: { accountId, ticketmasterId: event.id } },
    update: {},
    create: {
      accountId,
      ticketmasterId: event.id,
      name: event.name,
      imageUrl: event.imageUrl,
      category: event.category,
      localDate: event.localDate,
      localTime: event.localTime,
      venueName: event.venueName,
      city: event.city,
      state: event.state,
      ticketUrl: event.ticketUrl,
    },
  }).catch(() => undefined);
}

export async function unsaveEvent(accountId: string, ticketmasterId: string): Promise<void> {
  await prisma.savedEvent.deleteMany({ where: { accountId, ticketmasterId } }).catch(() => undefined);
}
