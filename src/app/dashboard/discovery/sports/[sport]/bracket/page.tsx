import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { SPORT_CATALOG, getNflPlayoffBracket, getNbaPlayoffBracket, getWnbaPlayoffBracket, getMlbPlayoffBracket, getNhlPlayoffBracket, getCfpPlayoffBracket, getMarchMadnessPlayoffBracket } from "@/lib/discovery/sports/service";
import SmartBackLink from "../../SmartBackLink";
import PlayoffBracket from "../../PlayoffBracket";
import "../../../discovery.css";
import "../../sports-home.css";

export const dynamic = "force-dynamic";

// Sports whose Playoff Bracket is actually built end to end today. A
// second sport plugs in by (1) writing its own build*BracketData adapter in
// bracket.ts, (2) its own getXPlayoffBracket resolver in service.ts (same
// "real postseason game exists" mode signal — see getNflPlayoffBracket's
// doc comment), and (3) adding its slug here (and to BRACKET_RESOLVERS
// below) — PlayoffBracket.tsx itself needs no changes, since it only ever
// renders the generic BracketData shape.
const BRACKET_READY_SPORTS = new Set(["nfl", "nba", "wnba", "mlb", "nhl", "ncaaf", "ncaab"]);

// Per-sport resolver dispatch — each sport's own getXPlayoffBracket, same
// shape (season?: string) => Promise<BracketData | null>, keyed by slug so
// this page never hardcodes a single sport's resolver.
const BRACKET_RESOLVERS: Partial<Record<string, (season?: string) => ReturnType<typeof getNflPlayoffBracket>>> = {
  nfl: getNflPlayoffBracket,
  nba: getNbaPlayoffBracket,
  wnba: getWnbaPlayoffBracket,
  mlb: getMlbPlayoffBracket,
  nhl: getNhlPlayoffBracket,
  ncaaf: getCfpPlayoffBracket,
  ncaab: getMarchMadnessPlayoffBracket,
};

// ncaaf/ncaab never have a "projected" phase (see their own resolvers'
// doc comments — a human Selection Committee choice, not standings math),
// so the generic "real standings haven't been posted yet" copy below would
// be actively misleading for them (there ARE real standings; the CFP/
// Tournament FIELD itself just hasn't been announced). Owner-specified
// wording, kept separate from the generic fallback rather than genericizing
// it further — these two are a real exception, not the new default.
const FIELD_NOT_ANNOUNCED_COPY: Partial<Record<string, string>> = {
  ncaaf: "College Football Playoff field has not been announced yet.",
  ncaab: "Tournament field has not been announced yet.",
};

export async function generateMetadata({ params }: { params: Promise<{ sport: string }> }): Promise<Metadata> {
  const { sport } = await params;
  const meta = SPORT_CATALOG.find((s) => s.slug === sport);
  return { title: meta ? `Playoff Bracket — ${meta.label} — Magical Moments Sports` : "Playoff Bracket", robots: { index: false } };
}

export default async function SportBracketPage({ params }: { params: Promise<{ sport: string }> }) {
  await requireAccount("/dashboard/discovery/sports");
  const { sport } = await params;
  const sportMeta = SPORT_CATALOG.find((s) => s.slug === sport);
  if (!sportMeta) notFound();

  const backLink = <SmartBackLink fallbackHref={`/dashboard/discovery/sports/${sport}`} label={`← Back to ${sportMeta.label}`} className="spx-profile__back" />;

  if (!BRACKET_READY_SPORTS.has(sport)) {
    return (
      <div className="spx spx-profile">
        {backLink}
        <div className="spx-coming-soon">
          <h2>Playoff Bracket</h2>
          <p className="spx-coming-soon__lede">{sportMeta.label}&rsquo;s Playoff Bracket isn&rsquo;t built yet.</p>
          <p className="spx-coming-soon__body">
            NFL, NBA, WNBA, MLB, NHL, the College Football Playoff, and the NCAA Tournament are wired up to this bracket today. {sportMeta.label} will use the exact same bracket component once its own
            real seed/postseason-game data is connected — nothing here is fabricated in the meantime.
          </p>
        </div>
      </div>
    );
  }

  const resolver = BRACKET_RESOLVERS[sport];
  const bracket = resolver ? await resolver() : null;

  return (
    <div className="spx spx-profile">
      {backLink}
      {!bracket ? (
        <div className="spx-coming-soon">
          <h2>Playoff Bracket</h2>
          <p className="spx-coming-soon__lede">
            {FIELD_NOT_ANNOUNCED_COPY[sport] ?? `The ${sportMeta.label} Playoff Bracket isn’t available yet.`}
          </p>
          <p className="spx-coming-soon__body">
            {FIELD_NOT_ANNOUNCED_COPY[sport]
              ? "Nothing is projected or guessed here — once the real field is announced and games are scheduled, this bracket fills in automatically."
              : "Real standings haven’t been posted for this season yet — check back once the season is underway."}
          </p>
        </div>
      ) : (
        <PlayoffBracket data={bracket} id={`${sport}-bracket`} />
      )}
    </div>
  );
}
