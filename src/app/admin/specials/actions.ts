"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import {
  createSpecial, publishSpecial, setSpecialStatus, removeSpecial,
} from "@/lib/specials";

const PATH = "/admin/specials";
const s = (fd: FormData, k: string) => String(fd.get(k) || "").trim();
const n = (fd: FormData, k: string) => {
  const v = String(fd.get(k) || "").replace(/[^0-9.]/g, "");
  return v ? parseFloat(v) : undefined;
};
async function guard() { if (!(await isAdmin())) redirect("/admin/login?next=/admin/specials"); }

export async function createSpecialAction(fd: FormData): Promise<void> {
  await guard();
  if (!s(fd, "name")) redirect(`${PATH}?error=name`);
  const res = await createSpecial({
    name: s(fd, "name"),
    internalNote: s(fd, "internalNote"),
    publicDesc: s(fd, "publicDesc"),
    code: s(fd, "code"),
    auto: fd.get("auto") === "on",
    offerType: s(fd, "offerType"),
    discountType: s(fd, "discountType"),
    discountValue: n(fd, "discountValue"),
    scope: s(fd, "scope"),
    scopeValue: s(fd, "scopeValue"),
    audience: s(fd, "audience"),
    startAt: s(fd, "startAt"),
    endAt: s(fd, "endAt"),
    maxRedemptions: n(fd, "maxRedemptions"),
    perCustomer: n(fd, "perCustomer"),
    minPurchase: n(fd, "minPurchase"),
    stackable: fd.get("stackable") === "on",
    isPublic: fd.get("isPublic") !== "off",
  });
  revalidatePath(PATH);
  if (res.error) {
    const floors = (res.conflicts ?? []).map((c) => `${c.collection}:${c.floor}`).join(",");
    redirect(`${PATH}?error=protection&floors=${encodeURIComponent(floors)}`);
  }
  redirect(PATH);
}

export async function publishSpecialAction(fd: FormData): Promise<void> {
  await guard();
  const res = await publishSpecial(s(fd, "id"));
  revalidatePath(PATH);
  if (res.error) redirect(`${PATH}?error=protection`);
}

export async function pauseSpecialAction(fd: FormData): Promise<void> {
  await guard();
  await setSpecialStatus(s(fd, "id"), "paused", "Paused by admin");
  revalidatePath(PATH);
}

export async function resumeSpecialAction(fd: FormData): Promise<void> {
  await guard();
  await setSpecialStatus(s(fd, "id"), "active", "Resumed by admin");
  revalidatePath(PATH);
}

export async function endSpecialAction(fd: FormData): Promise<void> {
  await guard();
  await setSpecialStatus(s(fd, "id"), "ended", "Ended early by admin");
  revalidatePath(PATH);
}

export async function deleteSpecialAction(fd: FormData): Promise<void> {
  await guard();
  await removeSpecial(s(fd, "id"));
  revalidatePath(PATH);
}
