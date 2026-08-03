"use server";

// Server actions for the concierge welcome (naming). Enforcement is server-side:
// requireAccount re-validates the session before any write.

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { nameConcierge, skipConciergeNaming } from "@/lib/concierge";

/** Save the customer's chosen concierge name, then enter their Magical Space. */
export async function nameConciergeAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/home");
  const raw = String(formData.get("name") ?? "");
  const result = await nameConcierge(account.id, raw);
  if (!result.ok) {
    // Re-show the welcome with a gentle message (client also validates first).
    redirect(`/home?welcome=1&error=${encodeURIComponent(result.error)}`);
  }
  redirect("/home");
}

/** "Skip for now" — welcomed without a name; the concierge stays "Magical". */
export async function skipConciergeAction(): Promise<void> {
  const account = await requireAccount("/home");
  await skipConciergeNaming(account.id);
  redirect("/home");
}
