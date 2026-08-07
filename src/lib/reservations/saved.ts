// ── Luxury Services — Saved for Later (SERVER ONLY) ─────────────
//
// Save-for-later + favorites/collections. Ownership-scoped throughout.
// HONESTY: estimatedPrice / expiresAt are only ever stored from REAL provider
// data (the caller passes them only when a provider returned them). We never
// promise a saved price will hold — the UI always reminds that supplier
// pricing may change.

import { prisma } from "@/lib/db";

export interface SavedServiceRecord {
  id: string;
  accountId: string;
  serviceType: string;
  label: string;
  provider: string | null;
  estimatedPrice: string | null;
  journeyNotes: string | null;
  expiresAt: Date | null;
  reminderAt: Date | null;
  collection: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function hydrate(row: any): SavedServiceRecord {
  let details: Record<string, unknown> = {};
  try { details = JSON.parse(row.details || "{}"); } catch { details = {}; }
  return { ...row, details };
}

export interface SaveServiceInput {
  accountId: string;
  serviceType: string;
  label: string;
  provider?: string | null;
  estimatedPrice?: string | null;
  journeyNotes?: string | null;
  collection?: string | null;
  details?: Record<string, unknown>;
}

export async function saveService(input: SaveServiceInput): Promise<SavedServiceRecord> {
  const row = await prisma.savedService.create({
    data: {
      accountId: input.accountId,
      serviceType: input.serviceType,
      label: input.label,
      provider: input.provider ?? null,
      estimatedPrice: input.estimatedPrice ?? null,
      journeyNotes: input.journeyNotes ?? null,
      collection: input.collection ?? null,
      details: JSON.stringify(input.details ?? {}),
    },
  });
  return hydrate(row);
}

export async function listSaved(accountId: string): Promise<SavedServiceRecord[]> {
  const rows = await prisma.savedService.findMany({ where: { accountId }, orderBy: { createdAt: "desc" } });
  return rows.map(hydrate);
}

/** Distinct collection names the member has used (for grouping favorites). */
export async function listCollections(accountId: string): Promise<string[]> {
  const rows = await prisma.savedService.findMany({
    where: { accountId, collection: { not: null } },
    select: { collection: true },
    distinct: ["collection"],
    orderBy: { collection: "asc" },
  });
  return rows.map((r) => r.collection!).filter(Boolean);
}

/** Remove a saved item the member OWNS. Returns true if something was removed. */
export async function removeSaved(accountId: string, id: string): Promise<boolean> {
  const res = await prisma.savedService.deleteMany({ where: { id, accountId } });
  return res.count > 0;
}

/** Update notes / collection on a saved item the member OWNS. */
export async function updateSaved(accountId: string, id: string, patch: { journeyNotes?: string | null; collection?: string | null }): Promise<boolean> {
  const res = await prisma.savedService.updateMany({ where: { id, accountId }, data: patch });
  return res.count > 0;
}
