import { submitPickAction } from "./actions";
import { MATCHUP_SPORTS, type SportSlug } from "@/lib/discovery/providers/sports";
import type { VoteTally } from "@/lib/discovery/sports/picks";

interface Game {
  id: string;
  sport: string;
  league: string;
  homeTeamName: string;
  homeTeamLogoUrl: string | null;
  awayTeamName: string;
  awayTeamLogoUrl: string | null;
  startsAt: Date;
  status: string;
  period: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

/** One matchup — the Magical Moments card for "who you got?" Community vote
 *  percentages come only from our own stored SportsPick rows, never
 *  gambling odds. F1/MMA (no two-side format) are shown without a vote UI. */
export function MatchupCard({
  game, tally, myPick, myPickCorrect, locked, sportLabel,
}: {
  game: Game;
  tally: VoteTally;
  myPick: "home" | "away" | null;
  myPickCorrect: boolean | null;
  locked: boolean;
  sportLabel: string;
}) {
  const isMatchupSport = MATCHUP_SPORTS.includes(game.sport as SportSlug);
  const when = new Date(game.startsAt);

  return (
    <div className="sports-matchup">
      <div className="sports-matchup__meta">
        <span>{sportLabel}</span>
        <span>{game.status === "live" ? "LIVE NOW" : game.status === "final" ? "FINAL" : when.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
      </div>

      <div className="sports-matchup__teams">
        <div className="sports-matchup__team">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {game.awayTeamLogoUrl ? <img src={game.awayTeamLogoUrl} alt="" /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: "#efe6d5" }} />}
          <span>{game.awayTeamName}</span>
          {(game.status === "live" || game.status === "final") && <em>{game.awayScore ?? "—"}</em>}
        </div>
        <span className="sports-matchup__vs">VS</span>
        <div className="sports-matchup__team">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {game.homeTeamLogoUrl ? <img src={game.homeTeamLogoUrl} alt="" /> : <div style={{ width: 44, height: 44, borderRadius: 8, background: "#efe6d5" }} />}
          <span>{game.homeTeamName}</span>
          {(game.status === "live" || game.status === "final") && <em>{game.homeScore ?? "—"}</em>}
        </div>
      </div>

      {game.status === "scheduled" && (
        <div className="sports-matchup__when">{when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
      )}
      {game.status === "live" && game.period && <div className="sports-matchup__when">{game.period}</div>}

      {isMatchupSport && (
        <div className="sports-matchup__vote">
          <div className="sports-matchup__vote-bar">
            <span style={{ width: `${tally.awayPct}%` }} />
            <span style={{ width: `${tally.homePct}%` }} />
          </div>
          <div className="sports-matchup__vote-labels">
            <span>{game.awayTeamName} {tally.awayPct}%</span>
            <span>{tally.total.toLocaleString()} Magical Picks</span>
            <span>{game.homeTeamName} {tally.homePct}%</span>
          </div>
        </div>
      )}

      {isMatchupSport && !locked && (
        <form action={submitPickAction}>
          <input type="hidden" name="gameId" value={game.id} />
          <div className="sports-matchup__pick">
            <button type="submit" name="teamPick" value="away" data-picked={myPick === "away"}>{game.awayTeamName}</button>
            <button type="submit" name="teamPick" value="home" data-picked={myPick === "home"}>{game.homeTeamName}</button>
          </div>
        </form>
      )}

      {isMatchupSport && locked && game.status === "final" && myPick && (
        <div className={`sports-matchup__result sports-matchup__result--${myPickCorrect ? "correct" : "incorrect"}`}>
          {myPickCorrect ? "✓ You called it!" : "Not this time — next matchup!"}
        </div>
      )}
      {isMatchupSport && locked && game.status !== "final" && (
        <div className="sports-matchup__locked">Picks locked</div>
      )}
    </div>
  );
}
