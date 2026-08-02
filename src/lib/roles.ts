// ── Platform roles & unified permissions ────────────────────────
// The single canonical role model for the whole platform. It does NOT redefine
// the per-feature permissions that already live in the domain libraries — it
// maps each platform role onto those existing sets (family-command family
// permissions, family-connections guest permissions, collaborator scopes) so
// every completed ecosystem shares one role vocabulary and one source of truth.
//
// Handles adults vs. minors, family managers, child safeguards (parent-
// controlled access), staff/admin, and vendors.

import { defaultPermissions as familyDefaults, type PermissionSet } from "@/lib/family-command";
import { defaultGuestPermissions, type GuestPermissionSet } from "@/lib/family-connections";

export type PlatformRole =
  | "family_owner" | "parent" | "guardian" | "spouse" | "partner"
  | "teen" | "child" | "invited_member" | "guest" | "vendor" | "admin";

export interface RoleDef {
  id: PlatformRole;
  label: string;
  adult: boolean;         // 18+ (teen/child are minors)
  minor: boolean;
  managesFamily: boolean; // can configure the family & child permissions
  staff: boolean;         // Magical Moments staff
}

export const ROLES: RoleDef[] = [
  { id: "family_owner", label: "Family Owner", adult: true, minor: false, managesFamily: true, staff: false },
  { id: "parent", label: "Parent", adult: true, minor: false, managesFamily: true, staff: false },
  { id: "guardian", label: "Guardian", adult: true, minor: false, managesFamily: true, staff: false },
  { id: "spouse", label: "Spouse", adult: true, minor: false, managesFamily: false, staff: false },
  { id: "partner", label: "Partner", adult: true, minor: false, managesFamily: false, staff: false },
  { id: "invited_member", label: "Invited Family Member", adult: true, minor: false, managesFamily: false, staff: false },
  { id: "guest", label: "Guest", adult: true, minor: false, managesFamily: false, staff: false },
  { id: "vendor", label: "Vendor", adult: true, minor: false, managesFamily: false, staff: false },
  { id: "teen", label: "Teen", adult: false, minor: true, managesFamily: false, staff: false },
  { id: "child", label: "Child", adult: false, minor: true, managesFamily: false, staff: false },
  { id: "admin", label: "Administrator", adult: true, minor: false, managesFamily: false, staff: true },
];

export function roleDef(role: PlatformRole): RoleDef {
  return ROLES.find((r) => r.id === role)!;
}
export function isAdultRole(role: PlatformRole): boolean { return roleDef(role).adult; }
export function isChildRole(role: PlatformRole): boolean { return roleDef(role).minor; }
export function isFamilyManager(role: PlatformRole): boolean { return roleDef(role).managesFamily; }
export function isStaffRole(role: PlatformRole): boolean { return roleDef(role).staff; }

/** Minor accounts must be linked to a parent/guardian (child safeguard). */
export function requiresGuardian(role: PlatformRole): boolean {
  return isChildRole(role);
}

/** Only a parent/guardian/owner may set another member's (esp. a child's) permissions. */
export function canManagePermissionsFor(actor: PlatformRole, target: PlatformRole): boolean {
  if (isStaffRole(actor)) return true;
  if (!isFamilyManager(actor)) return false;
  // Managers configure minors and non-manager adults, not other managers by default.
  return isChildRole(target) || !isFamilyManager(target);
}

// ── Family permissions (delegates to family-command; no duplication) ──
// Map a platform role onto the family-command permission defaults.
export function familyPermissionsForRole(role: PlatformRole): PermissionSet {
  if (isStaffRole(role)) return familyDefaults("parent"); // staff view via manager defaults
  if (role === "child") return familyDefaults("child");
  if (role === "teen") return familyDefaults("teen");
  if (isAdultRole(role)) return familyDefaults("parent"); // adults get the adult set
  return familyDefaults("child");
}

// ── Guest permissions (delegates to family-connections) ─────────
export function guestPermissionsForRole(role: PlatformRole): GuestPermissionSet {
  // Guests and invited members start from the safe guest defaults; the Host
  // expands from there.
  return defaultGuestPermissions();
}

// ── Child safeguards ────────────────────────────────────────────
export interface ChildSafeguards {
  requiresGuardianLink: boolean;
  parentControlsPermissions: boolean;
  restrictedByDefault: boolean;
}
export function childSafeguards(role: PlatformRole): ChildSafeguards {
  const minor = isChildRole(role);
  return { requiresGuardianLink: minor, parentControlsPermissions: minor, restrictedByDefault: minor };
}
