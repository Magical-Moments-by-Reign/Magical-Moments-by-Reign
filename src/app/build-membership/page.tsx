import type { Metadata } from "next";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import MembershipBuilder from "@/components/site/MembershipBuilder";
import "../get-started/get-started.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Build Your Membership — Magical Moments by Reign",
  description: "Choose the occasion you're celebrating and the membership term that fits your life — with clear, honest pricing.",
};

// Build Your Membership — the occasion + membership builder. Pricing is the
// real, approved PLANS config (Silver / Gold / Diamond / Lifetime); nothing is
// invented, and tax is stated as calculated at checkout.
export default async function BuildMembershipPage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <div className="gs">
      <PublicNav active="get-started" signedIn={signedIn} />
      <header className="gs-phead">
        <span className="gs-phead__eye">Build Your Membership</span>
        <h1 className="gs-phead__t">Build the membership <i>your family needs</i></h1>
        <p className="gs-phead__s">Choose the occasion you want to celebrate and the term that fits your life. Every membership can be upgraded anytime — without losing a dollar.</p>
      </header>
      <MembershipBuilder />
      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
