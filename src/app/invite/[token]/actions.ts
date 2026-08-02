"use server";

import { redirect } from "next/navigation";
import { acceptInvitationByToken, declineInvitationByToken } from "@/lib/auth-service";
import { currentAccount } from "@/lib/auth-session";

export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") || "");
  const account = await currentAccount();
  if (!account) {
    // Must be signed in to attach the role to a real account.
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }
  const result = await acceptInvitationByToken(token, account.id, account.guardianAccountId ?? undefined);
  if (result.ok) redirect("/account/family?joined=1");
  redirect(`/invite/${token}?error=${result.reason}`);
}

export async function declineInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") || "");
  await declineInvitationByToken(token);
  redirect(`/invite/${token}?declined=1`);
}
