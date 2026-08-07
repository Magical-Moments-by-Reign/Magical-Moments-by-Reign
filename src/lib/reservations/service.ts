// ── Concierge & Reservations — server lib (SERVER ONLY) ─────────
//
// The persistence + lifecycle layer. Every function is OWNERSHIP-SCOPED: a
// member only ever reads/writes their own reservations (where accountId).
//
// HONESTY, enforced here (not just in the UI):
//   • createReservationRequest ALWAYS starts REQUEST_SUBMITTED (or DRAFT) —
//     never CONFIRMED. There is no member path to CONFIRMED at all.
//   • confirmationNumber / provider terms are only ever set by an authorized
//     concierge (setConciergeUpdate, gated by the caller), from real data.
//   • No availability, times, or confirmations are invented anywhere.

import { prisma } from "@/lib/db";
import { dispatchNotification } from "@/lib/notify";
import { getServiceCategory } from "./catalog";
import {
  clientCanCancel,
  RESERVATION_STATUS,
  type ReservationStatus,
} from "./catalog";

export interface ReservationRecord {
  id: string;
  accountId: string;
  experienceId: string | null;
  serviceType: string;
  status: ReservationStatus;
  title: string;
  business: string | null;
  location: string | null;
  date: string | null;
  time: string | null;
  guestCount: number | null;
  confirmationNumber: string | null;
  providerContact: string | null;
  cancellationPolicy: string | null;
  depositRequirement: string | null;
  clientNotes: string | null;
  conciergeNotes: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function hydrate(row: any): ReservationRecord {
  let details: Record<string, unknown> = {};
  try { details = JSON.parse(row.details || "{}"); } catch { details = {}; }
  return { ...row, status: row.status as ReservationStatus, details };
}

const deepLink = (id: string) => `/dashboard/luxury-services/reservations/${id}`;

export interface CreateReservationInput {
  accountId: string;
  serviceType: string;
  title: string;
  location?: string | null;
  date?: string | null;
  time?: string | null;
  guestCount?: number | null;
  clientNotes?: string | null;
  experienceId?: string | null;
  /** The full intake payload — stored verbatim for the concierge. */
  details?: Record<string, unknown>;
  /** Save as DRAFT instead of submitting. */
  asDraft?: boolean;
}

/**
 * Create a reservation REQUEST. Never a booking. Starts REQUEST_SUBMITTED
 * (or DRAFT). On submit, notifies the member that the concierge has it.
 */
export async function createReservationRequest(input: CreateReservationInput): Promise<ReservationRecord> {
  const status: ReservationStatus = input.asDraft ? "DRAFT" : "REQUEST_SUBMITTED";
  const row = await prisma.reservation.create({
    data: {
      accountId: input.accountId,
      serviceType: input.serviceType,
      status,
      title: input.title,
      location: input.location ?? null,
      date: input.date ?? null,
      time: input.time ?? null,
      guestCount: input.guestCount ?? null,
      clientNotes: input.clientNotes ?? null,
      experienceId: input.experienceId ?? null,
      details: JSON.stringify(input.details ?? {}),
    },
  });

  if (status === "REQUEST_SUBMITTED") {
    const svc = getServiceCategory(input.serviceType);
    await dispatchNotification({
      accountId: input.accountId,
      type: "reservation_update",
      title: "Concierge request received",
      body: `We've received your ${svc?.label ?? "concierge"} request. ${RESERVATION_STATUS.REQUEST_SUBMITTED.description}`,
      actionUrl: deepLink(row.id),
      relatedLabel: input.title,
      data: { reservationId: row.id, status },
    }).catch(() => null); // notification failure must never break the request
  }
  return hydrate(row);
}

/** All of a member's reservations, newest first. Ownership-scoped. */
export async function listReservations(accountId: string): Promise<ReservationRecord[]> {
  const rows = await prisma.reservation.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(hydrate);
}

/** One reservation the member OWNS, or null. */
export async function getReservation(accountId: string, id: string): Promise<ReservationRecord | null> {
  const row = await prisma.reservation.findFirst({ where: { id, accountId } });
  return row ? hydrate(row) : null;
}

/** Submit a DRAFT. Ownership-scoped; only DRAFT → REQUEST_SUBMITTED. */
export async function submitDraft(accountId: string, id: string): Promise<ReservationRecord | null> {
  const current = await getReservation(accountId, id);
  if (!current || current.status !== "DRAFT") return null;
  const row = await prisma.reservation.update({ where: { id }, data: { status: "REQUEST_SUBMITTED" } });
  await dispatchNotification({
    accountId, type: "reservation_update",
    title: "Concierge request received",
    body: RESERVATION_STATUS.REQUEST_SUBMITTED.description,
    actionUrl: deepLink(id), relatedLabel: current.title,
    data: { reservationId: id, status: "REQUEST_SUBMITTED" },
  }).catch(() => null);
  return hydrate(row);
}

/**
 * Member-initiated cancellation (a request to cancel). Allowed only from
 * statuses the status core permits; after CONFIRMED this is a cancel-request
 * subject to the provider's policy — we never claim it's instantly cancelled
 * with a provider, only that the request is cancelled on our side.
 */
export async function cancelReservation(accountId: string, id: string): Promise<ReservationRecord | null> {
  const current = await getReservation(accountId, id);
  if (!current || !clientCanCancel(current.status)) return null;
  const row = await prisma.reservation.update({ where: { id }, data: { status: "CANCELLED" } });
  await dispatchNotification({
    accountId, type: "reservation_update",
    title: "Request cancelled",
    body: "Your reservation request has been cancelled.",
    actionUrl: deepLink(id), relatedLabel: current.title,
    data: { reservationId: id, status: "CANCELLED" },
  }).catch(() => null);
  return hydrate(row);
}

/**
 * Concierge/provider update — the ONLY path that can set CONFIRMED and record a
 * real confirmation number / terms. The CALLER must authorize the actor as
 * concierge staff (see requireRole/requireOwner). This lib does not expose it
 * to members.
 */
export interface ConciergeUpdateInput {
  status?: ReservationStatus;
  business?: string;
  confirmationNumber?: string;
  providerContact?: string;
  cancellationPolicy?: string;
  depositRequirement?: string;
  conciergeNotes?: string;
}
export async function applyConciergeUpdate(accountId: string, id: string, update: ConciergeUpdateInput): Promise<ReservationRecord | null> {
  const current = await prisma.reservation.findFirst({ where: { id, accountId }, select: { id: true, title: true } });
  if (!current) return null;
  const row = await prisma.reservation.update({ where: { id }, data: { ...update } });
  if (update.status) {
    const meta = RESERVATION_STATUS[update.status];
    await dispatchNotification({
      accountId, type: "reservation_update",
      title: `Reservation ${meta.label.toLowerCase()}`,
      body: meta.description,
      actionUrl: deepLink(id), relatedLabel: current.title,
      data: { reservationId: id, status: update.status },
    }).catch(() => null);
  }
  return hydrate(row);
}
