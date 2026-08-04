import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getEstate } from "@/lib/estates/registry";
import EstateIcon from "@/components/estate/EstateIcon";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ estate: string }>;
}): Promise<Metadata> {
  const { estate } = await params;
  const config = getEstate(estate);
  return { title: config ? config.name : "Estate", robots: { index: false } };
}

// The Estate lobby — an ARRIVAL, then elegant destination doors. No member name,
// no personal concierge branding here (that lives in Your Magical Space). Each
// door leads to what is genuinely live today; rooms open as their engines wire in.
export default async function EstateArrival({
  params,
}: {
  params: Promise<{ estate: string }>;
}) {
  const { estate } = await params;
  const config = getEstate(estate);
  if (!config) notFound();

  const account = await requireAccount(`/estate/${estate}`);
  const initial = (account.firstName?.[0] ?? "M").toUpperCase();

  return (
    <>
      {/* The living arrival hero — slow drift, moving sunlight, chandelier shimmer */}
      <section className="est-hero">
        <div className="est-hero__bg" aria-hidden="true" />
        <div className="est-hero__grad" aria-hidden="true" />
        <div className="est-hero__sun" aria-hidden="true" />
        <div className="est-hero__shimmer" aria-hidden="true" />
        <div className="est-hero__reflect" aria-hidden="true" />
        <div className="est-curtain est-curtain--l" aria-hidden="true" />
        <div className="est-curtain est-curtain--r" aria-hidden="true" />

        <div className="estate-top">
          <Link href="/home" className="estate-top__brand" aria-label="Magical Moments — your Magical Space">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-champagne.png" alt="" width={42} height={42} />
            <span className="estate-top__name">MAGICAL MOMENTS</span>
          </Link>
          <Link href="/account" className="estate-top__me" aria-label="Account &amp; settings">{initial}</Link>
        </div>

        <div className="est-hero__inner">
          <h1 className="est-hero__title">Welcome to Your Magical Space</h1>
          <p className="est-hero__sub">What beautiful chapter of life are we creating together today?</p>
        </div>

        <div className="est-hero__cue" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M6 9 L12 15 L18 9" /></svg>
          Enter your {config.name}
        </div>
      </section>

      {/* The lobby — refined destination doors */}
      <section className="lobby">
        <span className="lobby__eyebrow">{config.name}</span>
        <h2 className="lobby__line">Your home is more than an address.</h2>
        <p className="lobby__sub">How can Magical help today?</p>
        <div className="lobby__rule" aria-hidden="true" />

        <div className="dests">
          {config.destinations.map((d) => (
            <Link key={d.id} href={`/estate/${config.key}/learn`} className="dest">
              <span className="dest__ic"><EstateIcon name={d.icon} /></span>
              <span className="dest__t">{d.title}</span>
              <span className="dest__s">{d.tagline}</span>
            </Link>
          ))}
        </div>
      </section>

      <p className="lobby__foot">Your Magical Space · Magical Moments by Reign</p>
    </>
  );
}
