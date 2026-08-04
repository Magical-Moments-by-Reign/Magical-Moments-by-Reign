import type { Metadata } from "next";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import MembershipBuilder from "@/components/site/MembershipBuilder";
import ScrollCue from "@/components/site/ScrollCue";
import { LIFETIME_COLLECTIONS, formatUSD } from "@/lib/pricing-engine";
import "./membership-builder.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Membership — Magical Moments by Reign",
  description:
    "Your personal invitation to preserve life's most important moments. Choose your occasions and your term — the price updates as you build.",
};

// The official Membership Builder: pricing and membership in one warm, elegant
// place. Occasions + term drive a live price from the real pricing engine.
export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>;
}) {
  const signedIn = Boolean(await currentAccount());
  const locked = (await searchParams).locked === "occasions";
  return (
    <div className="mb2">
      <PublicNav active="get-started" signedIn={signedIn} />

      <header className="mb2-hero">
        <span className="mb2-eyebrow">By Invitation</span>
        <h1 className="mb2-h1">Design how your <i>story is kept.</i></h1>
        <p className="mb2-invite">Your personal invitation to preserve the most important moments of your life — beautifully, and for as long as your heart desires.</p>
        {locked && (
          <p className="mb2-locked">
            Creating an occasion is included with a Magical Moments Membership. Choose one below to
            begin creating unforgettable experiences — your Free Forever account stays yours either way.
          </p>
        )}
        <ScrollCue />
      </header>

      <div className="mb2-wrap">
        <MembershipBuilder />
      </div>

      <div className="mb2-wrap">
        <section className="mb2-tiers">
          <h2 className="mb2-tiers__h">The Lifetime <i>Collections</i></h2>
          <p className="mb2-tiers__s">Kept forever — choose the breadth that fits your family.</p>
          <div className="mb2-tiergrid">
            {LIFETIME_COLLECTIONS.map((c) => (
              <article key={c.id} className="mb2-tier">
                <div className="mb2-tier__n">{c.name}</div>
                <div className="mb2-tier__rule" aria-hidden="true" />
                <div className="mb2-tier__p">{formatUSD(c.price)}</div>
                <div className="mb2-tier__s">{c.blurb} · one-time · for life</div>
              </article>
            ))}
          </div>
          <p className="mb2-note">Every membership holds the full experience — you are choosing only how many occasions to include and how long the story is preserved. Prefer we create it all for you? The White Glove Lifetime is our team, at your service.</p>
        </section>
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
