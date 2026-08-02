// ── Dashboard identity bridge — pure decision layer ─────────────
// Account is the canonical customer identity. The legacy dashboard is keyed on
// the older `User` model, so during the transition we bridge one Account ⇄ one
// User. These are the PURE decisions (no I/O), unit-tested in
// auth-activation.test.ts. The DB work lives in src/lib/dashboard-identity.ts.

import { isStaffRole, type PlatformRole } from "@/lib/roles";

/** Map a platform role onto the legacy User.role field. */
export function legacyRole(role: PlatformRole): "ADMIN" | "USER" {
  return isStaffRole(role) ? "ADMIN" : "USER";
}

export interface BridgeInput {
  legacyUserId?: string | null;  // already linked on the Account
  matchedUserId?: string | null; // a legacy User found by verified email match
}

export type BridgeResolution =
  | { mode: "existing_link"; userId: string } // already bridged — reuse
  | { mode: "email_match"; userId: string }   // link an existing User (verified email)
  | { mode: "create" };                        // no match — create a fresh User

/**
 * Decide how to bridge an Account to a legacy User. Order guarantees exactly one
 * User per Account (no duplicate identities):
 *   1. If the Account already links a User, reuse it.
 *   2. Else if a legacy User matches by verified email, link that one (backfill).
 *   3. Else create a new User for this Account.
 */
export function resolveBridge(input: BridgeInput): BridgeResolution {
  if (input.legacyUserId) return { mode: "existing_link", userId: input.legacyUserId };
  if (input.matchedUserId) return { mode: "email_match", userId: input.matchedUserId };
  return { mode: "create" };
}

/** Whether the resolution should trigger a one-time backfill of legacy records. */
export function shouldBackfill(res: BridgeResolution): boolean {
  // Only when we newly link an existing User's data to the Account.
  return res.mode === "email_match";
}
