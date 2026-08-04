import type { Metadata } from "next";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import MembershipBuilder from "@/components/site/MembershipBuilder";
import "./membership-builder.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Membership — Magical Moments by Reign",
  description:
    "Choose the Occasions you want and the term that fits your life, and build a membership that grows with you. Every membership includes Free Forever.",
};

// The official Membership Builder page — "Build the membership your family needs."
// Occasions + term drive a live price from the real pricing engine.
export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>;
}) {
  const signedIn = Boolean(await currentAccount());
  const locked = (await searchParams).locked === "occasions";

  return (
    <div className="mbx-page">
      <PublicNav active="get-started" signedIn={signedIn} />

      <header className="mbx-hero">
        <div className="mbx-hero__l">
          <h1 className="mbx-hero__t">Build the membership <i>your family needs</i></h1>
          <div className="mbx-hero__div" aria-hidden="true"><span>✦</span></div>
          <p className="mbx-hero__s">
            Choose the Occasions you want, the term that fits your life, and build a membership that
            grows with you. Every membership includes <strong>Free Forever</strong>, and you can
            upgrade anytime without losing a dollar.
          </p>
          {locked && (
            <p className="mbx-hero__locked">
              Creating an occasion is included with a Membership — choose one below to begin. Your Free
              Forever account stays yours either way.
            </p>
          )}
        </div>
        <div className="mbx-hero__r" aria-hidden="true" />
      </header>

      <div className="mbx-wrap">
        <MembershipBuilder />
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
