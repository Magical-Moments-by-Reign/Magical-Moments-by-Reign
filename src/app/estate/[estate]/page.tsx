import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getEstate } from "@/lib/estates/registry";
import AskMagicalPanel from "@/components/home/AskMagicalPanel";

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

export default async function EstateOverview({
  params,
}: {
  params: Promise<{ estate: string }>;
}) {
  const { estate } = await params;
  const config = getEstate(estate);
  if (!config) notFound();

  const account = await requireAccount(`/estate/${estate}`);

  // Group goals for display (Goal Discovery — framework §3.3).
  const groups = config.goals.reduce<Record<string, typeof config.goals>>((acc, g) => {
    (acc[g.group] ??= []).push(g);
    return acc;
  }, {});

  return (
    <div className="estate">
      {/* Lead with the MEMBER'S Magical Space — the platform speaks in the
          Magical Moments brand here, never a personal concierge name. */}
      <header className="estate-hero">
        <span className="estate-hero__icon" aria-hidden="true">✨</span>
        <div>
          <h1 className="estate-hero__title">Welcome to Your Magical Space, {account.firstName}</h1>
          <p className="estate-hero__body">What beautiful chapter of life are we creating together today?</p>
        </div>
      </header>

      {/* Introduce the Home Estate (a wing of the Magical Space). */}
      <section className="estate-section" aria-label="Home">
        <h2 className="estate-intro__title"><span aria-hidden="true">{config.icon}</span> {config.name}</h2>
        <p className="estate-intro__line">{config.intro}</p>
        <p className="estate-intro__sub">{config.welcomeBody}</p>
      </section>

      {/* The housing journeys — Buy · Build · Find · Rent · Sell · Own · Invest. */}
      <section className="estate-section" aria-label="Where would you like to begin">
        <h2 className="estate-section__title">Where would you like to begin?</h2>
        <p className="estate-section__sub">Choose where you feel you are — explore freely, nothing is committed.</p>
        {Object.entries(groups).map(([group, goals]) => (
          <div key={group} className="estate-goalgroup">
            <h3 className="estate-goalgroup__label">{group}</h3>
            <div className="estate-goals">
              {goals.map((g) => (
                <Link key={g.id} href={`/estate/${config.key}/learn`} className="estate-goal">
                  <span className="estate-goal__label">{g.label}</span>
                  <span className="estate-goal__desc">{g.description}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Module rail — honest live vs. coming-soon. */}
      <section className="estate-section" aria-label="Everything for your home">
        <h2 className="estate-section__title">Everything for your home, in one place</h2>
        <div className="estate-modules">
          {config.modules.map((m) => {
            const inner = (
              <>
                <span className="estate-module__icon" aria-hidden="true">{m.icon}</span>
                <span className="estate-module__label">
                  {m.label}
                  {m.status === "soon" && <span className="estate-module__soon">Soon</span>}
                </span>
                <span className="estate-module__desc">{m.description}</span>
              </>
            );
            return m.status === "live" ? (
              <Link key={m.key} href={`/estate/${config.key}/${m.key}`} className="estate-module estate-module--live">{inner}</Link>
            ) : (
              <div key={m.key} className="estate-module estate-module--soon" aria-disabled="true">{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Guidance — Magical brand only (the member's personally-named concierge
          lives elsewhere in the platform, not on this Estate overview). */}
      <section className="panel estate-guide" aria-label="Ask Magical">
        <AskMagicalPanel conciergeName="Magical" nudgeForName={false} />
      </section>

      {/* Cross-Estate continuity. */}
      <section className="estate-section" aria-label="Where this may lead">
        <h2 className="estate-section__title">Life connects</h2>
        <p className="estate-section__sub">When you&apos;re ready, your home connects naturally into the rest of your life.</p>
        <div className="estate-cross">
          {config.crossEstate.map((c) => (
            <span key={c.estate} className="estate-cross__item">
              <span className="estate-cross__name">{c.estate}</span>
              <span className="estate-cross__reason">{c.reason}</span>
              <span className="estate-cross__soon">Coming soon</span>
            </span>
          ))}
        </div>
      </section>

      <p className="estate-foot">
        <Link href="/home" className="estate-foot__link">← Back to your Magical Space</Link>
      </p>
    </div>
  );
}
