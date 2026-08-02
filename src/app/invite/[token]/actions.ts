"use server";

import { redirect } from "next/navigation";
import { acceptInvitationByToken, declineInvitationByToken } from "@/lib/auth-service";
import { currentAccount } from "@/lib/auth-session";
import { checkRateLimit, recordAttempt, clientIp } from "@/lib/rate-limit";

export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") || "");
  const account = await currentAccount();
  if (!account) {
    // Must be signed in to attach the role to a real account.
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }
  // Throttle invitation-token guessing per IP + account.
  const ip = await clientIp();
  const rl = await checkRateLimit("invite_attempt", { ip, accountId: account.id });
  if (rl.limited) redirect(`/invite/${token}?error=rate_limited`);

  const result = await acceptInvitationByToken(token, account.id, account.guardianAccountId ?? undefined);
  if (result.ok) redirect("/account/family?joined=1");
  await recordAttempt("invite_attempt", { ip, accountId: account.id });
  redirect(`/invite/${token}?error=${result.reason}`);
}

export async function declineInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") || "");
  await declineInvitationByToken(token);
  redirect(`/invite/${token}?declined=1`);
}
