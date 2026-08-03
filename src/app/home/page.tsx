import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { unreadCount } from "@/lib/notify";
import {
  getConcierge, conciergeDisplayName, needsWelcome, hasNamedConcierge, shouldNudgeForName,
} from "@/lib/concierge";
import Greeting from "@/components/home/Greeting";
import AskMagicalPanel from "@/components/home/AskMagicalPanel";
import ConciergeWelcome from "@/components/home/ConciergeWelcome";
import LifeCard from "@/components/home/LifeCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Home", robots: { index: false } };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; error?: string }>;
}) {
  const account = await requireAccount("/home");
  const sp = await searchParams;
  const concierge = await getConcierge(account.id);

  // First meeting — or re-invoked via the gentle "give me a name" nudge.
  if (needsWelcome(concierge) || sp.welcome === "1") {
    return <ConciergeWelcome firstName={account.firstName} error={sp.error} />;
  }

  const conciergeName = conciergeDisplayName(concierge);
  const named = hasNamedConcierge(concierge);
  const nudge = shouldNudgeForName(concierge);

  // Live, per-account data. Everything else is an honest "coming soon" — never
  // a fabricated number or action.
  const [unread, journeys] = await Promise.all([
    unreadCount(account.id),
    prisma.libraryEntry.findMany({
      where: { accountId: account.id, archived: false },
      orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
      take: 4,
      select: { id: true, title: true, subtitle: true },
    }),
  ]);

  return (
    <div className="home-space">
      <Greeting firstName={account.firstName} conciergeName={conciergeName} named={named} />

      <AskMagicalPanel conciergeName={conciergeName} nudgeForName={nudge} />

      <section className="home-grid" aria-label="What matters today">
        {/* ✨ My Journeys — LIVE (Magical Moments Library) */}
        <LifeCard
          icon="✨"
          title="My Journeys"
          description="Everything you create and celebrate lives here, in your Magical Moments Library."
          href="/journeys"
          cta={journeys.length ? "Open my Library" : "Begin a journey"}
          accent
        >
          {journeys.length ? (
            <ul className="home-list">
              {journeys.map((j) => (
                <li key={j.id}>
                  <span className="home-list__title">{j.title}</span>
                  {j.subtitle && <span className="home-list__sub">{j.subtitle}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="home-empty">Your story starts with a single moment. Let&apos;s begin one together.</p>
          )}
        </LifeCard>

        {/* 🔔 Updates — LIVE (unread notifications) */}
        <LifeCard
          icon="🔔"
          title="Updates"
          description="Gentle nudges and news across your family's journeys."
          href="/notifications"
          cta="View updates"
        >
          <p className="home-stat">
            {unread > 0
              ? <><span className="home-stat__num">{unread}</span> new {unread === 1 ? "update" : "updates"} waiting</>
              : <>You&apos;re all caught up. ✨</>}
          </p>
        </LifeCard>

        {/* The rooms we're preparing next — honest placeholders, no fake actions. */}
        <LifeCard
          icon="🎉"
          title="Upcoming Celebrations"
          description="Birthdays, anniversaries, and milestones your concierge will help you prepare for."
          comingSoon
        />
        <LifeCard
          icon="✉️"
          title="Invitations"
          description="Invite family into your journeys and keep everyone close."
          comingSoon
        />
        <LifeCard
          icon="🗓️"
          title="Planning Center"
          description="Checklists, timelines, and next steps — organized for you, not by you."
          comingSoon
        />
        <LifeCard
          icon="📖"
          title="Family Timeline"
          description="Every meaningful moment, gathered into one story you can revisit forever."
          comingSoon
        />
      </section>

      <p className="home-foot">
        Your account &amp; settings &mdash; profile, family, security, billing &mdash; live under{" "}
        <a href="/account" className="home-foot__link">Account &amp; settings</a>.
      </p>
    </div>
  );
}
