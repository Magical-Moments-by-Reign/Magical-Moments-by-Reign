import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import MembershipBuilder from "@/components/pricing/MembershipBuilder";
import MembershipStart from "@/components/pricing/MembershipStart";
import "./membership.css";

export const metadata: Metadata = {
  title: "Build Your Membership",
  description:
    "Build the membership your family needs — choose your Occasions and your term, and watch the value add up. Flexible, transparent pricing from Magical Moments by Reign.",
};

export default async function MembershipPage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <>
      <PublicNav active="get-started" signedIn={signedIn} />
      <main className="mb-page">
        <header className="mb-hero">
          <p className="mb-hero__eyebrow">Pricing, your way</p>
          <h1 className="mb-hero__title">Build the membership your family needs</h1>
          <p className="mb-hero__lead">
            No fixed packages. Choose the Occasions you want and the term that fits your
            life — the price adjusts as you build, and you only ever grow from here.
            Every membership includes <strong>Free Forever</strong>, and you can upgrade
            anytime without losing a dollar you've invested.
          </p>
        </header>

        <MembershipStart />

        <MembershipBuilder />

        <section className="mb-closing">
          <p>
            Prefer a guided recommendation, or exploring the classic plans and add-ons?{" "}
            <Link href="/pricing">See plans &amp; add-ons</Link>. Questions about building
            your membership? <Link href="/contact">Talk with us</Link>.
          </p>
        </section>
      </main>
      <PublicFooter year={new Date().getFullYear()} />
    </>
  );
}
