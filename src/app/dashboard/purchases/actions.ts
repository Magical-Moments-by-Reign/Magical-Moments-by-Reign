"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  savePurchase, setPurchaseStatus, deletePurchase,
  addWishlistItem, deleteWishlistItem,
} from "@/lib/purchases";

const s = (fd: FormData, k: string) => String(fd.get(k) || "").trim();
const PATH = "/dashboard/purchases";

export async function savePurchaseAction(fd: FormData): Promise<void> {
  if (!s(fd, "product")) redirect(`${PATH}?error=product`);
  await savePurchase({
    product: s(fd, "product"), store: s(fd, "store"),
    orderDate: s(fd, "orderDate"), estDelivery: s(fd, "estDelivery"),
    tracking: s(fd, "tracking"), price: s(fd, "price"),
    warranty: s(fd, "warranty"), returnWindow: s(fd, "returnWindow"),
    status: s(fd, "status"), notes: s(fd, "notes"),
    experienceId: s(fd, "experienceId"),
  }, s(fd, "id") || undefined);
  revalidatePath(PATH);
  redirect(PATH);
}

export async function setStatusAction(fd: FormData): Promise<void> {
  await setPurchaseStatus(s(fd, "id"), s(fd, "status"));
  revalidatePath(PATH);
}

export async function deletePurchaseAction(fd: FormData): Promise<void> {
  await deletePurchase(s(fd, "id"));
  revalidatePath(PATH);
}

export async function addWishlistAction(fd: FormData): Promise<void> {
  if (!s(fd, "name")) redirect(`${PATH}?error=wish`);
  await addWishlistItem({
    name: s(fd, "name"), category: s(fd, "category"), store: s(fd, "store"),
    url: s(fd, "url"), price: s(fd, "price"), notes: s(fd, "notes"),
  });
  revalidatePath(PATH);
}

export async function deleteWishlistAction(fd: FormData): Promise<void> {
  await deleteWishlistItem(s(fd, "id"));
  revalidatePath(PATH);
}
