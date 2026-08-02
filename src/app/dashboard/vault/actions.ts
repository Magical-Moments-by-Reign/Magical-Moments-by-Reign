"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  saveMember, deleteMember, addDocument, deleteDocument,
  addContact, deleteContact, renameFamily,
} from "@/lib/family";

const s = (fd: FormData, k: string) => String(fd.get(k) || "").trim();
const VAULT = "/dashboard/vault";

export async function renameFamilyAction(fd: FormData): Promise<void> {
  await renameFamily(s(fd, "name"));
  revalidatePath(VAULT);
}

export async function saveMemberAction(fd: FormData): Promise<void> {
  const name = s(fd, "name");
  if (!name) redirect(`${VAULT}?error=name`);
  await saveMember({
    kind: s(fd, "kind"), name,
    preferredName: s(fd, "preferredName"), birthday: s(fd, "birthday"),
    bloodType: s(fd, "bloodType"), allergies: s(fd, "allergies"),
    medications: s(fd, "medications"), conditions: s(fd, "conditions"),
    doctor: s(fd, "doctor"), hospital: s(fd, "hospital"),
    insuranceProvider: s(fd, "insuranceProvider"), insurancePolicy: s(fd, "insurancePolicy"),
    emergencyName: s(fd, "emergencyName"), emergencyPhone: s(fd, "emergencyPhone"),
    notes: s(fd, "notes"),
  }, s(fd, "id") || undefined);
  revalidatePath(VAULT);
  redirect(VAULT);
}

export async function deleteMemberAction(fd: FormData): Promise<void> {
  await deleteMember(s(fd, "id"));
  revalidatePath(VAULT);
}

export async function addDocumentAction(fd: FormData): Promise<void> {
  if (!s(fd, "title")) redirect(`${VAULT}?error=doc`);
  await addDocument({
    category: s(fd, "category"), title: s(fd, "title"),
    url: s(fd, "url"), notes: s(fd, "notes"), expiresAt: s(fd, "expiresAt"),
  });
  revalidatePath(VAULT);
}

export async function deleteDocumentAction(fd: FormData): Promise<void> {
  await deleteDocument(s(fd, "id"));
  revalidatePath(VAULT);
}

export async function addContactAction(fd: FormData): Promise<void> {
  if (!s(fd, "name")) redirect(`${VAULT}?error=contact`);
  await addContact({
    name: s(fd, "name"), relationship: s(fd, "relationship"),
    phone: s(fd, "phone"), email: s(fd, "email"), accessLevel: s(fd, "accessLevel"),
  });
  revalidatePath(VAULT);
}

export async function deleteContactAction(fd: FormData): Promise<void> {
  await deleteContact(s(fd, "id"));
  revalidatePath(VAULT);
}
