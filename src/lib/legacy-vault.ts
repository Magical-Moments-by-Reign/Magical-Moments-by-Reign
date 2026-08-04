// ── Legacy Vault — domain logic (pure, no I/O) ──────────────────
// The Legacy Vault is a Lifetime-exclusive, private place to preserve memories
// that aren't ready to be shared. This module holds the item taxonomy and the
// release rules; persistence lives in the server layer, and access is gated to
// Lifetime members. Everything here is pure so it can be unit-tested and reused
// on server and client. No fabricated data, no assumptions about tier — callers
// pass the member's Lifetime status in.

export type LegacyVaultKind =
  | "letter" | "video" | "audio" | "recipe" | "story"
  | "journal" | "timeCapsule" | "memorial" | "other";

export interface LegacyKindMeta {
  id: LegacyVaultKind;
  label: string;
  /** true when the item is primarily written (has a body) vs. media-based. */
  written: boolean;
  hint: string;
}

export const LEGACY_KINDS: LegacyKindMeta[] = [
  { id: "letter", label: "Letter", written: true, hint: "A letter to a child, partner, or loved one." },
  { id: "video", label: "Video message", written: false, hint: "A recorded message for a future moment." },
  { id: "audio", label: "Voice recording", written: false, hint: "Your voice, kept for generations." },
  { id: "recipe", label: "Family recipe", written: true, hint: "A recipe and the story behind it." },
  { id: "story", label: "Family story", written: true, hint: "A memory or tradition worth keeping." },
  { id: "journal", label: "Private journal", written: true, hint: "Thoughts kept just for you — or for later." },
  { id: "timeCapsule", label: "Time capsule", written: true, hint: "Sealed today, opened on a future date." },
  { id: "memorial", label: "Memorial message", written: true, hint: "Words to be shared in remembrance." },
  { id: "other", label: "Other", written: true, hint: "Anything you wish to preserve." },
];

export function kindMeta(kind: string): LegacyKindMeta | undefined {
  return LEGACY_KINDS.find((k) => k.id === kind);
}

/** How/when a Legacy Vault item becomes available. */
export type LegacyVaultVisibility = "private" | "scheduled" | "milestone" | "shared";

export const VISIBILITY_META: Record<LegacyVaultVisibility, { label: string; hint: string }> = {
  private: { label: "Private forever", hint: "Kept for you alone, until you decide otherwise." },
  scheduled: { label: "Release on a date", hint: "Opens automatically on the date you choose." },
  milestone: { label: "Release after a milestone", hint: "Opens after a life milestone — a birthday, a graduation." },
  shared: { label: "Share with family", hint: "Visible only to the family members you choose." },
};

export function isVaultVisibility(v: string): v is LegacyVaultVisibility {
  return v === "private" || v === "scheduled" || v === "milestone" || v === "shared";
}

// The state a member (or, later, a recipient) sees for an item.
export type ReleaseState = "sealed" | "scheduled" | "released" | "shared";

export interface VaultItemLike {
  visibility: string;
  releaseAt?: Date | string | null;
  releasedAt?: Date | string | null;
}

/**
 * Compute an item's current release state. Pure and deterministic — `now` is
 * passed in (never read from the clock) so it is testable and resume-safe.
 * - private   → always "sealed" (until the member changes it or shares it)
 * - scheduled → "released" once now ≥ releaseAt (or releasedAt set), else "scheduled"
 * - milestone → "released" only once releasedAt is set (a milestone is confirmed
 *               by the member/system), else "sealed"
 * - shared    → "shared"
 */
export function releaseState(item: VaultItemLike, now: Date): ReleaseState {
  const v = item.visibility;
  if (v === "shared") return "shared";
  if (v === "scheduled") {
    if (item.releasedAt) return "released";
    const at = item.releaseAt ? new Date(item.releaseAt) : null;
    if (at && now.getTime() >= at.getTime()) return "released";
    return "scheduled";
  }
  if (v === "milestone") {
    return item.releasedAt ? "released" : "sealed";
  }
  return "sealed"; // private
}

/** Whether a scheduled item is due for release at `now` (server sweep helper). */
export function isDueForRelease(item: VaultItemLike, now: Date): boolean {
  if (item.visibility !== "scheduled" || item.releasedAt) return false;
  const at = item.releaseAt ? new Date(item.releaseAt) : null;
  return Boolean(at && now.getTime() >= at.getTime());
}

// Access is a Lifetime-member benefit. The tier check lives in the server/guard
// layer; this pure helper keeps the rule in one honest place.
export function canAccessVault(isLifetimeMember: boolean): boolean {
  return isLifetimeMember === true;
}

/** Parse the stored recipients JSON safely (never throws). */
export function parseRecipients(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Validation for creating/updating an item. Returns an error message or null. */
export function validateItem(input: { kind: string; title: string; visibility: string; releaseAt?: string | null; releaseMilestone?: string | null }): string | null {
  if (!kindMeta(input.kind)) return "Please choose what kind of memory this is.";
  if (!input.title || input.title.trim().length === 0) return "Please give this memory a title.";
  if (!isVaultVisibility(input.visibility)) return "Please choose how this memory should be kept.";
  if (input.visibility === "scheduled" && !input.releaseAt) return "Please choose the date this should open.";
  if (input.visibility === "milestone" && !input.releaseMilestone?.trim()) return "Please name the milestone that will open this.";
  return null;
}
