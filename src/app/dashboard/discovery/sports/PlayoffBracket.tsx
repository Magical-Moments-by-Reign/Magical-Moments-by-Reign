// ── Shared Playoff Bracket UI — SPORT-AGNOSTIC ─────────────────────────
// Renders any BracketData (src/lib/discovery/sports/bracket.ts) as a real
// bracket: round columns left-to-right, connector lines between a round's
// matchups and the next round's slot they feed, real team logos/records/
// seeds, and an honest "TBD" / "Winner of …" placeholder for anything not
// decided yet — NEVER a fabricated winner. NFL is the only sport that
// builds a real BracketData today (service.ts's getNflPlayoffBracket); a
// second sport plugs in by writing its own build*BracketData function in
// bracket.ts and passing the result to this same component — nothing here
// is NFL-specific.
//
// No client JS: mobile's round-by-round view is pure CSS (radio inputs +
// :checked sibling selectors), the same "no client component needed for a
// simple show/hide" instinct as this page's own <details> disclosures.
// Desktop shows every round side by side; narrow viewports show one round
// at a time via the pill tab strip.
//
// Connector lines: BracketData's own contract (see bracket.ts's top
// comment) keeps one round's matchup COUNT exactly double the next round's,
// in a stable order — so this component pairs consecutive matchups two at a
// time (see chunkPairs below) and draws one merging connector per pair. A
// round that doesn't satisfy that (an odd matchup out) just renders without
// a connector for that one row rather than drawing a wrong line.
import Link from "next/link";
import type { BracketData, BracketMatchup, BracketSlot as BracketSlotData } from "@/lib/discovery/sports/bracket";

export interface PlayoffBracketProps {
  data: BracketData;
  /** Only matters if more than one <PlayoffBracket> could render on the same
   *  page at once (radio `name` scoping) — safe to leave as the default for
   *  the normal one-bracket-per-page case. */
  id?: string;
}

function chunkPairs<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) pairs.push(items.slice(i, i + 2));
  return pairs;
}

function badgeOf(slot: BracketSlotData) {
  return slot.team?.badge ?? null;
}

const BADGE_LABEL: Record<NonNullable<ReturnType<typeof badgeOf>>, string> = {
  clinched: "Clinched",
  projected: "Projected",
  eliminated: "Eliminated",
};

function BracketSlotView({ slot }: { slot: BracketSlotData }) {
  if (!slot.team) {
    return (
      <div className="brk-slot brk-slot--tbd">
        <div className="brk-slot__ph" />
        <span className="brk-slot__tbd-label">{slot.placeholderLabel ?? "TBD"}</span>
      </div>
    );
  }
  const { team } = slot;
  const badge = badgeOf(slot);
  return (
    <div className="brk-slot">
      {team.seed != null && <span className="brk-slot__seed">{team.seed}</span>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {team.teamLogoUrl ? <img src={team.teamLogoUrl} alt="" className="brk-slot__logo" /> : <div className="brk-slot__ph" />}
      <span className="brk-slot__meta">
        <b className="brk-slot__name">{team.teamName}</b>
        {team.record && <span className="brk-slot__record">{team.record}</span>}
      </span>
      {badge && <span className={`brk-slot__badge brk-slot__badge--${badge}`}>{BADGE_LABEL[badge]}</span>}
    </div>
  );
}

function MatchupCard({ matchup }: { matchup: BracketMatchup }) {
  const inner = (
    <>
      <div className="brk-matchup__row">
        <BracketSlotView slot={matchup.top} />
        {matchup.topScore != null && <span className="brk-matchup__score">{matchup.topScore}</span>}
      </div>
      <div className="brk-matchup__divider">
        {matchup.status === "live" ? <span className="brk-matchup__live"><i />LIVE</span> : matchup.status === "final" ? <span className="brk-matchup__final">FINAL</span> : matchup.isBye ? <span className="brk-matchup__bye">BYE</span> : null}
      </div>
      <div className="brk-matchup__row">
        <BracketSlotView slot={matchup.bottom} />
        {matchup.bottomScore != null && <span className="brk-matchup__score">{matchup.bottomScore}</span>}
      </div>
    </>
  );
  const className = `brk-matchup${matchup.status === "live" ? " brk-matchup--live" : ""}${matchup.status === "final" ? " brk-matchup--final" : ""}`;
  return matchup.gameId ? (
    <Link href={`/dashboard/discovery/sports/game/${matchup.gameId}`} className={className}>{inner}</Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/** Groups a round's already-ordered matchups into contiguous confLabel runs
 *  for the visual sub-heading ("AFC" above its rows, "NFC" above its own) —
 *  purely presentational; the underlying flat order (and the pairing math
 *  above) is unaffected. */
function groupByConf(matchups: BracketMatchup[]): { label?: string; matchups: BracketMatchup[] }[] {
  const groups: { label?: string; matchups: BracketMatchup[] }[] = [];
  for (const m of matchups) {
    const last = groups[groups.length - 1];
    if (last && last.label === m.confLabel) last.matchups.push(m);
    else groups.push({ label: m.confLabel, matchups: [m] });
  }
  return groups;
}

export default function PlayoffBracket({ data, id = "brk" }: PlayoffBracketProps) {
  const { rounds } = data;
  return (
    <div className="brk">
      {rounds.map((_, i) => (
        <input
          key={i}
          type="radio"
          name={`${id}-round`}
          id={`${id}-r${i}`}
          className="brk-tab-input"
          defaultChecked={i === 0}
        />
      ))}

      <div className="brk-head">
        <h2>{data.headline}</h2>
        <p>{data.subhead}</p>
      </div>

      <div className="brk-tabs">
        {rounds.map((r, i) => (
          <label key={r.id} htmlFor={`${id}-r${i}`}>{r.label}</label>
        ))}
      </div>

      <div className="brk-board">
        {rounds.map((round, i) => {
          const isLast = i === rounds.length - 1;
          const confGroups = groupByConf(round.matchups);
          return (
            <div className="brk-round" key={round.id}>
              <h3 className="brk-round__title">{round.label}</h3>
              <div className="brk-round__body">
                {confGroups.map((g, gi) => (
                  <div className="brk-round__group" key={gi}>
                    {g.label && <span className="brk-round__group-label">{g.label}</span>}
                    <div className="brk-round__pairs">
                      {chunkPairs(g.matchups).map((pair, pi) => (
                        <div className={`brk-pair${isLast ? " brk-pair--single" : ""}`} key={pi}>
                          {pair.map((m) => <MatchupCard matchup={m} key={m.id} />)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
