"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import {
  endCurrentSession, revokeOtherSessions, revokeSessionById,
} from "@/lib/auth-session";
import { changePassword } from "@/lib/auth-service";

export async function logoutAction(): Promise<void> {
  await endCurrentSession();
  // Sign-out returns to the public homepage (a clear signed-out public state),
  // never the login page — so members never land in a protected-route loop.
  redirect("/");
}

export async function logoutOthersAction(): Promise<void> {
  const account = await requireAccount();
  await revokeOtherSessions(account.id, account.sessionTokenHash);
  redirect("/account/security?signedout=others");
}

export async function revokeSessionAction(formData: FormData): Promise<void> {
  const account = await requireAccount();
  const sessionId = String(formData.get("sessionId") || "");
  if (sessionId && sessionId !== account.sessionId) {
    await revokeSessionById(account.id, sessionId);
  }
  redirect("/account/security?signedout=one");
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const account = await requireAccount();
  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (next !== confirm) redirect("/account/security?pw=mismatch");
  const result = await changePassword(account.id, current, next);
  if (result.ok) {
    // Sign out other sessions after a password change, then keep this one.
    await revokeOtherSessions(account.id, account.sessionTokenHash);
    redirect("/account/security?pw=ok");
  }
  redirect(`/account/security?pw=${result.reason}`);
}
