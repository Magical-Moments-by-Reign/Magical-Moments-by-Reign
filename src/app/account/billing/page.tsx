import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";

export const metadata: Metadata = { title: "Membership & billing", robots: { index: false } };

export default async function BillingPage() {
  await requireAccount();
  return (
    <>
      <h1>Membership & Billing</h1>
      <p>Everything you need to celebrate is included with every paid membership. Tiers differ by preservation, storage, AI limits, active Moments, and concierge — never core celebration features.</p>

      <h2>Your membership</h2>
      <div className="auth-note auth-note--info" style={{ marginTop: "0.6rem" }}>
        Secure checkout and recurring billing go live once payment processing and end-to-end security testing are
        complete. Until then, nothing is charged. You can explore plans and start a preview anytime.
      </div>

      <h2>Explore</h2>
      <div className="acct__row"><span className="acct__v"><Link href="/pricing" className="auth-link">Compare memberships →</Link></span></div>
      <div className="acct__row"><span className="acct__v"><Link href="/membership" className="auth-link">Build your membership →</Link></span></div>
      <div className="acct__row"><span className="acct__v"><Link href="/trial" className="auth-link">Start a Magical Preview Pass →</Link></span></div>
      <div className="acct__row"><span className="acct__v"><Link href="/concierge" className="auth-link">White-Glove Concierge →</Link></span></div>
    </>
  );
}
