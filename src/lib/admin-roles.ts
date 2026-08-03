// ── Admin roles & permissions (pure) ────────────────────────────
// Account-based, permission-scoped admin authorization for the unified Admin
// Command Center. Roles are stored on the Account (staffRoles JSON) and ALWAYS
// enforced server-side. Unknown/garbage values are dropped on parse so a
// tampered value can never grant a capability (no client-controlled escalation).
//
// PURE — no I/O; fully unit-tested (admin-roles.test.ts). The session/bridge
// wiring lives in src/lib/admin-access.ts.

export type AdminRole =
  | "owner" | "support" | "compliance" | "marketplace"
  | "finance" | "content" | "trust" | "auditor";

export const ADMIN_ROLES: { id: AdminRole; label: string; description: string }[] = [
  { id: "owner", label: "Owner / Super Admin", description: "Full control of the platform." },
  { id: "support", label: "Customer Support Admin", description: "Customer accounts and support." },
  { id: "compliance", label: "Vendor Compliance Admin", description: "Vendor documents and verification." },
  { id: "marketplace", label: "Vendor Marketplace Admin", description: "Applications, listings, categories." },
  { id: "finance", label: "Finance Admin", description: "Orders, payments, deductions, payouts." },
  { id: "content", label: "Content Admin", description: "Site content, templates, policies." },
  { id: "trust", label: "Review / Trust Admin", description: "Reviews, strikes, badge decisions." },
  { id: "auditor", label: "Read-Only Auditor", description: "Read-only access to records and audit logs." },
];

export type AdminCapability =
  | "customers.view" | "customers.manage"
  | "vendors.view" | "vendors.manage" | "vendors.compliance"
  | "finance.view" | "finance.manage"
  | "content.manage"
  | "reviews.view" | "reviews.manage"
  | "security.manage"
  | "audit.view";

export const ALL_CAPABILITIES: AdminCapability[] = [
  "customers.view", "customers.manage", "vendors.view", "vendors.manage", "vendors.compliance",
  "finance.view", "finance.manage", "content.manage", "reviews.view", "reviews.manage",
  "security.manage", "audit.view",
];

// Per-role capability grants. Owner is handled specially (all capabilities).
const ROLE_CAPS: Record<AdminRole, AdminCapability[]> = {
  owner: [...ALL_CAPABILITIES],
  support: ["customers.view", "customers.manage", "audit.view"],
  compliance: ["vendors.view", "vendors.compliance", "audit.view"],
  marketplace: ["vendors.view", "vendors.manage", "audit.view"],
  finance: ["finance.view", "finance.manage", "audit.view"],
  content: ["content.manage", "audit.view"],
  trust: ["reviews.view", "reviews.manage", "vendors.view", "audit.view"],
  auditor: ["customers.view", "vendors.view", "finance.view", "reviews.view", "audit.view"],
};

export function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.some((r) => r.id === value);
}

/**
 * Parse the Account.staffRoles JSON into a validated role list. Anything that
 * isn't a known role is dropped — a corrupted/tampered value cannot escalate.
 */
export function parseStaffRoles(json: string | null | undefined): AdminRole[] {
  if (!json) return [];
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  const seen = new Set<AdminRole>();
  for (const v of raw) if (typeof v === "string" && isAdminRole(v)) seen.add(v);
  return [...seen];
}

/** The full capability set for a role list (owner ⇒ everything). */
export function capabilitiesFor(roles: AdminRole[]): Set<AdminCapability> {
  if (roles.includes("owner")) return new Set(ALL_CAPABILITIES);
  const caps = new Set<AdminCapability>();
  for (const r of roles) for (const c of ROLE_CAPS[r] ?? []) caps.add(c);
  return caps;
}

export function hasCapability(roles: AdminRole[], cap: AdminCapability): boolean {
  if (roles.includes("owner")) return true;
  return capabilitiesFor(roles).has(cap);
}

export function isStaff(roles: AdminRole[]): boolean {
  return roles.length > 0;
}

export const OWNER_ROLE: AdminRole = "owner";
