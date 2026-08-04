import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getConcierge, conciergeDisplayName, shouldNudgeForName } from "@/lib/concierge";
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
  const concierge = await getConcierge(account.id);
  const conciergeName = conciergeDisplayName(concierge);
  const nudge = shouldNudgeForName(concierge);

  // Group goals for display (Goal Discovery — framework §3.3).
  const groups = config.goals.reduce<Record<string, typeof config.goals>>((acc, g) => {
    (acc[g.group] ??= []).push(g);
    return acc;
  }, {});

  return (
    <div className="estate">
      {/* Welcome hero */}
      <header className="estate-hero">
        <span className="estate-hero__icon" aria-hidden="true">{config.icon}</span>
        <div>
          <h1 className="estate-hero__title">{config.welcomeTitle}, {account.firstName}</h1>
          <p className="estate-hero__body">{config.welcomeBody}</p>
        </div>
      </header>

      {/* Concierge entry point */}
      <section className="panel estate-concierge" id="concierge" aria-label={`Ask ${conciergeName}`}>
        <AskMagicalPanel conciergeName={conciergeName} nudgeForName={nudge} />
      </section>

      {/* Goal Discovery */}
      <section className="estate-section" aria-label="What brings you here">
        <h2 className="estate-section__title">What brings you to Home today?</h2>
        <p className="estate-section__sub">Choose where you are — {conciergeName} will guide the rest. You can explore freely; nothing is committed.</p>
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

      {/* Module rail — honest live vs. coming-soon */}
      <section className="estate-section" aria-label="Your Home journey tools">
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

      {/* Cross-Estate continuity */}
      <section className="estate-section" aria-label="Where this may lead">
        <h2 className="estate-section__title">Life connects</h2>
        <p className="estate-section__sub">When you&apos;re ready, your Home journey flows naturally into the rest of your life.</p>
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
