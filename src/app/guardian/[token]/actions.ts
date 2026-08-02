"use server";

import { redirect } from "next/navigation";
import { decideGuardianApproval } from "@/lib/auth-service";
import { GUARDIAN_CONTROLLED_PERMISSIONS } from "@/lib/guardian";
import { checkRateLimit, recordAttempt, clientIp } from "@/lib/rate-limit";

export async function guardianDecisionAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") || "");
  const choice = String(formData.get("choice") || "") === "approve" ? "approve" : "decline";

  // Throttle guardian-token guessing per IP.
  const ip = await clientIp();
  const rl = await checkRateLimit("guardian_attempt", { ip });
  if (rl.limited) redirect(`/guardian/${token}?error=rate_limited`);
  await recordAttempt("guardian_attempt", { ip });

  // Collect the permissions the guardian granted (only meaningful on approve).
  const permissions: Record<string, boolean> = {};
  for (const p of GUARDIAN_CONTROLLED_PERMISSIONS) {
    permissions[p.key] = formData.get(`perm_${p.key}`) === "on";
  }

  const result = await decideGuardianApproval(token, choice, choice === "approve" ? permissions : undefined);
  if (result.ok) redirect(`/guardian/${token}?done=${result.decision}`);
  redirect(`/guardian/${token}?error=${result.reason}`);
}
