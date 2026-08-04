import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getEstate } from "@/lib/estates/registry";
import { logoutAction } from "../../account/actions";

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

// Poetic one-liners for each journey group — the "menu at a grand estate".
const GROUP: Record<string, { verb: string; desc: string }> = {
  Buying: { verb: "Buy", desc: "Find the place that's yours." },
  Building: { verb: "Build", desc: "Create it from the ground up." },
  Finding: { verb: "Find", desc: "Discover where you belong." },
  Renting: { verb: "Rent", desc: "A home for right now." },
  Selling: { verb: "Sell", desc: "Turn the page, beautifully." },
  Owning: { verb: "Own", desc: "Care for what you've built." },
  Investing: { verb: "Invest", desc: "Build something lasting." },
};

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

  // Unique journey groups, in config order.
  const groups: string[] = [];
  for (const g of config.goals) if (!groups.includes(g.group)) groups.push(g.group);

  return (
    <>
      {/* The arrival — full-bleed estate, elegant welcome */}
      <section className="arr-hero">
        <div className="estate-top">
          <Link href="/home" className="estate-top__brand" aria-label="Magical Moments — your Magical Space">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-champagne.png" alt="" width={40} height={40} />
            <span className="estate-top__name">MAGICAL MOMENTS</span>
          </Link>
          <div className="estate-top__right">
            <Link href="/account" className="estate-top__me" aria-label="Account &amp; settings">{initial}</Link>
            <form action={logoutAction}>
              <button type="submit" className="estate-top__out">Sign out</button>
            </form>
          </div>
        </div>

        <div className="arr-hero__inner">
          <span className="arr-hero__spark" aria-hidden="true">✨</span>
          <h1 className="arr-hero__title">Welcome to Your Magical Space, {account.firstName}</h1>
          <p className="arr-hero__sub">What beautiful chapter of life are we creating together today?</p>
        </div>

        <div className="arr-hero__cue" aria-hidden="true"><span>⌄</span>Enter your Home</div>
      </section>

      {/* The Home wing — editorial */}
      <section className="arr-wing">
        <h2 className="arr-wing__title"><span aria-hidden="true">{config.icon}</span>&nbsp; {config.name}</h2>
        <div className="arr-rule" aria-hidden="true"></div>
        <p className="arr-wing__line">{config.intro}</p>
        <p className="arr-wing__sub">{config.welcomeBody}</p>
      </section>

      {/* The directory of journeys — no cards, an estate menu */}
      <nav className="arr-dir" aria-label="Where would you like to begin?">
        {groups.map((group) => {
          const g = GROUP[group] ?? { verb: group, desc: "" };
          return (
            <Link key={group} href={`/estate/${config.key}/learn`} className="arr-row">
              <span className="arr-word">{g.verb}</span>
              <span className="arr-desc">{g.desc}</span>
            </Link>
          );
        })}
      </nav>

      {/* A single quiet line of guidance — Magical brand only */}
      <section className="arr-guide">
        <Link href={`/estate/${config.key}/learn`} className="arr-guide__line">Magical is here whenever you&rsquo;re ready.</Link>
        <span className="arr-guide__brand">Powered by Magical</span>
      </section>

      <p className="arr-foot"><Link href="/home">Your Magical Space</Link> · Magical Moments by Reign</p>
    </>
  );
}
