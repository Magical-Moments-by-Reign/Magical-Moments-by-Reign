// ── Personal Concierge ─────────────────────────────────────────
// Every account has its OWN concierge — a named companion, not a shared
// household assistant. "Magical" is always the platform/technology; the
// concierge's NAME belongs to the customer ("Powered by Magical, and its
// name is Journey"). Each family member is a separate Account, so each
// person names and grows their own concierge.
//
// Lifecycle signals (see model Concierge in prisma/schema.prisma):
//   • no row              → hasn't met their concierge yet  → show the welcome
//   • row, welcomedAt set, name null → met it and skipped   → call it "Magical",
//                                                              offer gentle reminders
//   • row with a name     → use the name everywhere
//
// The pure helpers (validation, display name, lifecycle predicates) hold no
// database state and are unit-tested in concierge.test.ts. The async functions
// persist to the one-per-account Concierge row.

import { prisma } from "@/lib/db";

/** The default name the concierge answers to until the customer chooses one. */
export const DEFAULT_CONCIERGE_NAME = "Magical";

/** Max length for a customer-chosen concierge name. */
export const CONCIERGE_NAME_MAX = 40;

/**
 * Warm, on-brand suggestions for the naming welcome. The customer can always
 * create their own — these are gentle starting points, not a fixed list.
 */
export const CONCIERGE_SUGGESTIONS = [
  "Journey", "Grace", "Nova", "Sage", "Atlas", "Hope", "Harmony", "Aurora", "Legacy",
] as const;

/** The shape we read/return for concierge state (subset of the Prisma row). */
export interface ConciergeState {
  name: string | null;
  welcomedAt: Date | null;
}

export type NameValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

// Control characters (Unicode category Cc) and angle brackets are stripped from
// names so a name can never carry markup or invisible characters. Using the
// \p{Cc} property (with the u flag) keeps the source pure ASCII and reviewable.
const UNSAFE_NAME_CHARS = /[\p{Cc}<>]/gu;

/**
 * Clean and validate a customer-chosen concierge name. Pure — no I/O.
 * Trims, collapses internal whitespace, and strips control characters and
 * angle brackets. Rejects empty names and caps the length. Intentionally
 * permissive about letters/emoji/punctuation: this is a term of endearment,
 * not an identifier.
 */
export function validateConciergeName(raw: string): NameValidation {
  const cleaned = String(raw ?? "")
    .replace(UNSAFE_NAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return { ok: false, error: "Please enter a name, or skip for now." };
  if (cleaned.length > CONCIERGE_NAME_MAX) {
    return { ok: false, error: `That name is a little long — ${CONCIERGE_NAME_MAX} characters or fewer, please.` };
  }
  return { ok: true, value: cleaned };
}

/** The name to address the concierge by — the chosen name, else "Magical". Pure. */
export function conciergeDisplayName(c: ConciergeState | null | undefined): string {
  const n = c?.name?.trim();
  return n && n.length > 0 ? n : DEFAULT_CONCIERGE_NAME;
}

/** True before the person has been introduced to their concierge. Pure. */
export function needsWelcome(c: ConciergeState | null | undefined): boolean {
  return !c || !c.welcomedAt;
}

/** True once the customer has actually chosen a name (not just skipped). Pure. */
export function hasNamedConcierge(c: ConciergeState | null | undefined): boolean {
  return !!c?.name?.trim();
}

/**
 * True when we should show a gentle, no-pressure "I'd love a name whenever
 * you're ready" reminder: they've met the concierge but haven't named it. Pure.
 */
export function shouldNudgeForName(c: ConciergeState | null | undefined): boolean {
  return !needsWelcome(c) && !hasNamedConcierge(c);
}

// ── Persistence ────────────────────────────────────────────────

/** Load the account's concierge row, or null if they haven't met it yet. */
export async function getConcierge(accountId: string): Promise<ConciergeState | null> {
  return prisma.concierge.findUnique({
    where: { accountId },
    select: { name: true, welcomedAt: true },
  });
}

/**
 * Record the customer's chosen name (and mark them welcomed). Validates first;
 * returns the validation result so callers can surface a friendly message.
 */
export async function nameConcierge(accountId: string, rawName: string): Promise<NameValidation> {
  const v = validateConciergeName(rawName);
  if (!v.ok) return v;

  const now = new Date();
  await prisma.concierge.upsert({
    where: { accountId },
    create: { accountId, name: v.value, welcomedAt: now },
    update: { name: v.value, welcomedAt: now },
  });
  return v;
}

/**
 * Mark the person welcomed without a name ("Skip for now"). The concierge
 * stays "Magical" and we'll gently offer naming again later — never pressure.
 */
export async function skipConciergeNaming(accountId: string): Promise<void> {
  const now = new Date();
  await prisma.concierge.upsert({
    where: { accountId },
    create: { accountId, welcomedAt: now },
    update: { welcomedAt: now },
  });
}
