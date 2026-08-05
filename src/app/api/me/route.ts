import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight signed-in probe for client widgets (e.g. Ask Magical's handoff to
// the member-only Concierge). Returns no PII beyond first name + membership tier.
export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ signedIn: false });
  return NextResponse.json({
    signedIn: true,
    firstName: account.firstName,
    membershipTier: account.membershipTier,
  });
}
