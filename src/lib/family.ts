// ── The Family Vault ────────────────────────────────────────────
// The family account + its members, documents, and trusted contacts.
// Every Journey attaches to a Family. Auth is a stand-in for now
// (single demo owner); everything is written against a familyId so
// real multi-user permissions slot in later.

import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

export const MEMBER_KINDS = [
  { id: "parent", label: "Parent" },
  { id: "child", label: "Child" },
  { id: "grandparent", label: "Grandparent" },
  { id: "guardian", label: "Guardian" },
  { id: "pet", label: "Pet" },
] as const;

export const DOC_CATEGORIES = [
  "Birth Certificate", "Social Security Card", "Passport", "Driver's License",
  "Marriage Certificate", "Insurance Policy", "Medical Record", "Immunization Record",
  "School Record", "Tax Document", "Will", "Trust", "Home / Mortgage", "Vehicle Title",
  "Pet Record", "Military Record", "Other",
];

export const ACCESS_LEVELS = [
  { id: "full", label: "Full access" },
  { id: "medical", label: "Medical emergency only" },
  { id: "emergency", label: "Emergency contacts only" },
  { id: "documents", label: "Documents only" },
  { id: "legal", label: "Legal folder only" },
] as const;

// Legacy Transfer™ — Legacy Guardian designation (Lifetime benefit).
// Being listed grants NO access by itself; ownership transfers only after
// a verified continuity process (later phase).
export const GUARDIAN_ROLES = [
  { id: "none", label: "Not a Legacy Guardian" },
  { id: "primary", label: "Primary Legacy Guardian" },
  { id: "secondary", label: "Secondary Legacy Guardian" },
] as const;

export const GUARDIAN_LABEL: Record<string, string> = {
  primary: "Primary Legacy Guardian",
  secondary: "Secondary Legacy Guardian",
};

/** The current user's family vault, created on first use. */
export async function getCurrentFamily() {
  const ownerId = await getCurrentUserId();
  const existing = await prisma.family.findFirst({ where: { ownerId } });
  if (existing) return existing;
  return prisma.family.create({ data: { ownerId, name: "Our Family" } });
}

export async function getFamilyBundle() {
  const family = await getCurrentFamily();
  const [members, documents, contacts, journeys] = await Promise.all([
    prisma.familyMember.findMany({ where: { familyId: family.id }, orderBy: { createdAt: "asc" } }),
    prisma.familyDocument.findMany({ where: { familyId: family.id }, orderBy: { createdAt: "desc" } }),
    prisma.trustedContact.findMany({ where: { familyId: family.id }, orderBy: { createdAt: "asc" } }),
    prisma.experience.findMany({ where: { familyId: family.id }, orderBy: { createdAt: "desc" }, select: { slug: true, title: true, type: true } }),
  ]);
  return { family, members, documents, contacts, journeys };
}

export async function renameFamily(name: string) {
  const family = await getCurrentFamily();
  await prisma.family.update({ where: { id: family.id }, data: { name: name.trim() || "Our Family" } });
}

export interface MemberInput {
  kind: string; name: string; preferredName?: string; birthday?: string;
  bloodType?: string; allergies?: string; medications?: string; conditions?: string;
  doctor?: string; hospital?: string; insuranceProvider?: string; insurancePolicy?: string;
  emergencyName?: string; emergencyPhone?: string; notes?: string;
}

const clean = (v?: string) => (v && v.trim() ? v.trim() : null);

export async function saveMember(input: MemberInput, id?: string) {
  const family = await getCurrentFamily();
  const data = {
    kind: input.kind || "parent",
    name: input.name.trim(),
    preferredName: clean(input.preferredName),
    birthday: clean(input.birthday),
    bloodType: clean(input.bloodType),
    allergies: clean(input.allergies),
    medications: clean(input.medications),
    conditions: clean(input.conditions),
    doctor: clean(input.doctor),
    hospital: clean(input.hospital),
    insuranceProvider: clean(input.insuranceProvider),
    insurancePolicy: clean(input.insurancePolicy),
    emergencyName: clean(input.emergencyName),
    emergencyPhone: clean(input.emergencyPhone),
    notes: clean(input.notes),
  };
  if (id) {
    const existing = await prisma.familyMember.findFirst({ where: { id, familyId: family.id }, select: { id: true } });
    if (existing) return prisma.familyMember.update({ where: { id }, data });
  }
  return prisma.familyMember.create({ data: { ...data, familyId: family.id } });
}

export async function deleteMember(id: string) {
  const family = await getCurrentFamily();
  await prisma.familyMember.deleteMany({ where: { id, familyId: family.id } });
}

export async function addDocument(input: { category: string; title: string; url?: string; notes?: string; expiresAt?: string }) {
  const family = await getCurrentFamily();
  return prisma.familyDocument.create({
    data: {
      familyId: family.id,
      category: input.category || "Other",
      title: input.title.trim(),
      url: clean(input.url),
      notes: clean(input.notes),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });
}

export async function deleteDocument(id: string) {
  const family = await getCurrentFamily();
  await prisma.familyDocument.deleteMany({ where: { id, familyId: family.id } });
}

export async function addContact(input: { name: string; relationship?: string; phone?: string; email?: string; accessLevel?: string; guardianRole?: string }) {
  const family = await getCurrentFamily();
  return prisma.trustedContact.create({
    data: {
      familyId: family.id,
      name: input.name.trim(),
      relationship: clean(input.relationship),
      phone: clean(input.phone),
      email: clean(input.email),
      accessLevel: input.accessLevel || "emergency",
      guardianRole: input.guardianRole || "none",
    },
  });
}

/** Designated Legacy Guardians (primary first). */
export function legacyGuardians<T extends { guardianRole: string }>(contacts: T[]): T[] {
  const rank = (r: string) => (r === "primary" ? 0 : r === "secondary" ? 1 : 2);
  return contacts.filter((c) => c.guardianRole && c.guardianRole !== "none").sort((a, b) => rank(a.guardianRole) - rank(b.guardianRole));
}

export async function deleteContact(id: string) {
  const family = await getCurrentFamily();
  await prisma.trustedContact.deleteMany({ where: { id, familyId: family.id } });
}

/** Documents expiring within `days` — groundwork for AI reminders. */
export function expiringSoon(documents: { title: string; expiresAt: Date | null }[], now: Date, days = 90) {
  const horizon = now.getTime() + days * 24 * 60 * 60 * 1000;
  return documents.filter((d) => d.expiresAt && d.expiresAt.getTime() <= horizon && d.expiresAt.getTime() >= now.getTime());
}
