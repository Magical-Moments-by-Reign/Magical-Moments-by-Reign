"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { createInvitation } from "@/lib/auth-service";
import { isFamilyManager, isStaffRole, type PlatformRole } from "@/lib/roles";

const INVITABLE: PlatformRole[] = ["parent", "guardian", "spouse", "partner", "teen", "child", "invited_member", "guest"];

export async function sendInviteAction(formData: FormData): Promise<void> {
  const account = await requireAccount();
  // Server-side authorization: only family managers may invite.
  if (!isFamilyManager(account.role) && !isStaffRole(account.role)) {
    redirect("/account/family?invite=forbidden");
  }

  const role = String(formData.get("role") || "") as PlatformRole;
  const email = String(formData.get("email") || "").trim();
  if (!INVITABLE.includes(role) || !email) redirect("/account/family?invite=invalid");

  await createInvitation({
    kind: role === "guest" ? "guest" : "family_member",
    role,
    inviterAccountId: account.id,
    inviterName: `${account.firstName} ${account.lastName}`.trim(),
    channel: "email",
    target: email,
    spaceName: `${account.firstName}'s family`,
    nowISO: new Date().toISOString(),
  });
  redirect("/account/family?invite=sent#invitations");
}
