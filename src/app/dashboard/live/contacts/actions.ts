"use server";

// ── My Magical Family — contact actions ─────────────────────────
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import { createContact, updateContact, deleteContact, toggleFavorite } from "@/lib/live/contacts";
import type { PreferredMethod } from "@/lib/live/invite-core";

function readForm(formData: FormData) {
  const groups = String(formData.get("groups") || "").split(",").map((g) => g.trim()).filter(Boolean);
  return {
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    relationship: String(formData.get("relationship") || "").trim() || null,
    groups,
    favorite: formData.get("favorite") != null,
    preferredMethod: (String(formData.get("preferredMethod") || "ask") as PreferredMethod),
  };
}

export async function createContactAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live/contacts");
  const input = readForm(formData);
  if (input.firstName) await createContact(account.id, input);
  revalidatePath("/dashboard/live/contacts");
}

export async function updateContactAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live/contacts");
  const id = String(formData.get("id") || "");
  if (id) await updateContact(account.id, id, readForm(formData));
  revalidatePath("/dashboard/live/contacts");
}

export async function deleteContactAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live/contacts");
  const id = String(formData.get("id") || "");
  if (id) await deleteContact(account.id, id);
  revalidatePath("/dashboard/live/contacts");
}

export async function toggleFavoriteAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/live/contacts");
  const id = String(formData.get("id") || "");
  if (id) await toggleFavorite(account.id, id);
  revalidatePath("/dashboard/live/contacts");
}
