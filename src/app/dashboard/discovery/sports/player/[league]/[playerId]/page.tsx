import type { Metadata } from "next";
import SmartBackLink from "../../../SmartBackLink";
import { notFound } from "next/navigation";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { getPlayerProfile } from "@/lib/discovery/sports/player-profile";
import { generateJourneyNarrative, type JourneyFacts } from "@/lib/discovery/sports/journey-narrative";
import { sdioConfigured, sdioCommercialMode, type SdioLeague } from "@/lib/discovery/providers/sportsdata";
import PlayerHeroPhoto from "./PlayerHeroPhoto";
import "../../../../discovery.css";
import "../../../sports-home.css";

export const dynamic = "force-dynamic";

const LEAGUE_LABEL: Record<SdioLeague, string> = { nfl: "NFL", cfb: "College Football", nba: "NBA", wnba: "WNBA" };
// The player-profile route's own SdioLeague param vs. the site-wide sport
// slug used everywhere else — only "cfb" differs (site-wide: "ncaaf").
const SPORT_SLUG: Record<SdioLeague, string> = { nfl: "nfl", cfb: "ncaaf", nba: "nba", wnba: "wnba" };
const isSdioLeague = (v: string): v is SdioLeague => v === "nfl" || v === "cfb" || v === "nba" || v === "wnba";

// Every field below is a real, documented SportsDataIO PlayerSeasonStats
// field name (see STRUCTURED_STAT_FIELDS in sportsdata.ts) — a short label
// for display only, never a computed or invented stat.
const STAT_LABEL: Record<string, string> = {
  Games: "GP", Started: "GS",
  Completions: "Comp", PassingAttempts: "Att", PassingYards: "Pass Yds", PassingTouchdowns: "Pass TD", PassingInterceptions: "INT", PassingCompletionPercentage: "Comp %",
  RushingAttempts: "Carries", RushingYards: "Rush Yds", RushingYardsPerAttempt: "Yds/Att", RushingTouchdowns: "Rush TD",
  Receptions: "Rec", ReceivingYards: "Rec Yds", ReceivingYardsPerReception: "Yds/Rec", ReceivingTouchdowns: "Rec TD", ReceivingLong: "Long", RushingLong: "Long",
  Tackles: "Tackles", SoloTackles: "Solo", TacklesForLoss: "TFL", Sacks: "Sacks", Interceptions: "INT", PassesDefended: "PD", FumblesForced: "FF", InterceptionReturnTouchdowns: "Pick-6",
  Minutes: "MIN", Points: "PTS", Rebounds: "REB", Assists: "AST", Steals: "STL", BlockedShots: "BLK", Turnovers: "TO",
  FieldGoalsPercentage: "FG%", ThreePointersPercentage: "3P%", FreeThrowsPercentage: "FT%",
};

// Which stat fields to feature for a given position — the rest of a
// player's real numbers are still shown, just further down, so a mapped
// position never hides a real stat the provider actually returned.
const POSITION_FEATURED: Record<string, string[]> = {
  QB: ["Games", "Started", "Completions", "PassingAttempts", "PassingCompletionPercentage", "PassingYards", "PassingTouchdowns", "PassingInterceptions", "RushingYards", "RushingTouchdowns"],
  RB: ["Games", "Started", "RushingAttempts", "RushingYards", "RushingYardsPerAttempt", "RushingLong", "RushingTouchdowns", "Receptions", "ReceivingYards"],
  FB: ["Games", "Started", "RushingAttempts", "RushingYards", "RushingYardsPerAttempt", "RushingLong", "RushingTouchdowns", "Receptions", "ReceivingYards"],
  WR: ["Games", "Started", "Receptions", "ReceivingYards", "ReceivingYardsPerReception", "ReceivingLong", "ReceivingTouchdowns"],
  TE: ["Games", "Started", "Receptions", "ReceivingYards", "ReceivingYardsPerReception", "ReceivingLong", "ReceivingTouchdowns"],
};
const DEFENSE_FEATURED = ["Games", "Started", "Tackles", "SoloTackles", "TacklesForLoss", "Sacks", "Interceptions", "PassesDefended", "FumblesForced"];
const DEFENSE_POSITIONS = new Set(["DE", "DT", "NT", "DL", "LB", "ILB", "OLB", "MLB", "CB", "S", "SS", "FS", "DB"]);
const HOOPS_FEATURED = ["Games", "Minutes", "Points", "Rebounds", "Assists", "Steals", "BlockedShots", "Turnovers", "FieldGoalsPercentage", "ThreePointersPercentage", "FreeThrowsPercentage"];

function featuredFields(league: SdioLeague, position?: string): string[] {
  if (league === "nba" || league === "wnba") return HOOPS_FEATURED;
  const pos = position?.toUpperCase();
  if (pos && POSITION_FEATURED[pos]) return POSITION_FEATURED[pos];
  if (pos && DEFENSE_POSITIONS.has(pos)) return DEFENSE_FEATURED;
  return [];
}

function heightLabel(inches?: number): string | null {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatRow({ fields, stats }: { fields: string[]; stats: Record<string, number> }) {
  const shown = fields.filter((f) => f in stats);
  if (!shown.length) return null;
  return (
    <div className="spx-profile__stats-grid">
      {shown.map((f) => (
        <div key={f} className="spx-profile__stat">
          <span className="spx-profile__stat-value">{stats[f].toLocaleString("en-US")}</span>
          <span className="spx-profile__stat-label">{STAT_LABEL[f] ?? f}</span>
        </div>
      ))}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ league: string; playerId: string }> }): Promise<Metadata> {
  const { league } = await params;
  return { title: isSdioLeague(league) ? `Player Profile — ${LEAGUE_LABEL[league]}` : "Player Profile", robots: { index: false } };
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ league: string; playerId: string }> }) {
  const account = await requireAccount("/dashboard/discovery/sports");
  const { league: leagueParam, playerId } = await params;
  if (!isSdioLeague(leagueParam)) notFound();
  const league = leagueParam;

  const isOwner = await isOwnerAccount(account.id);
  const allowed = sdioConfigured() && (sdioCommercialMode() || isOwner);
  if (!allowed) {
    return (
      <div className="spx spx-profile">
        <div className="disc-pending">
          <b>Player Profiles are coming soon</b>
          Detailed player profiles aren&rsquo;t open to members yet.
        </div>
        <SmartBackLink fallbackHref="/dashboard/discovery/sports" label="← Back to Sports" />
      </div>
    );
  }

  const profile = await getPlayerProfile(league, playerId);
  if (!profile) notFound();

  const featured = featuredFields(league, profile.position);
  const currentStats = profile.currentSeasonStats;
  const otherFields = currentStats ? Object.keys(currentStats).filter((f) => !featured.includes(f)) : [];
  const seasonCount = new Set(profile.seasonsBySeason.map((s) => s.season)).size;

  const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const journeySteps: string[] = [];
  if (profile.highSchool) journeySteps.push(profile.highSchool);
  if (profile.college) journeySteps.push(profile.college);
  if (profile.draftYear) {
    journeySteps.push(
      `${profile.draftYear} ${LEAGUE_LABEL[league] === "College Football" ? "Draft" : "NFL Draft"}${profile.draftRound ? ` — Round ${profile.draftRound}` : ""}${profile.draftPick ? `, Pick ${profile.draftPick}` : ""}${profile.draftTeam ? ` (${profile.draftTeam})` : ""}`
    );
  }
  const sortedTransactions = [...profile.transactions].sort((a, b) => +new Date(a.date ?? 0) - +new Date(b.date ?? 0));

  // Real, dated career stops merged from two independent verified sources —
  // SportsDataIO's transaction feed (often thin on a trial plan's historical
  // depth) and Wikidata's real team-membership history — sorted together
  // chronologically so a real stop neither source alone had isn't silently
  // dropped from the timeline.
  const datedStops: { year: number; label: string }[] = [];
  const transactionTeamNames = new Set(sortedTransactions.map((t) => t.team && normalizeName(t.team)).filter(Boolean));
  for (const t of sortedTransactions) {
    const year = t.date ? new Date(t.date).getUTCFullYear() : null;
    const label = `${formatDate(t.date) ? `${formatDate(t.date)} — ` : ""}${t.type ?? "Roster move"}${t.team ? `: ${t.team}` : ""}`;
    if (year != null) datedStops.push({ year, label });
    else journeySteps.push(label); // no real date to sort by — keep in narrative order
  }
  for (const th of profile.teamHistory) {
    if (!th.startYear) continue; // only a real, dated stop is worth adding here
    const key = normalizeName(th.teamLabel);
    if (profile.college && key.includes(normalizeName(profile.college))) continue; // already the college line above
    if (transactionTeamNames.has(key)) continue; // already represented by a real transaction
    const range = th.endYear && th.endYear !== th.startYear ? `${th.startYear}–${th.endYear}` : String(th.startYear);
    datedStops.push({ year: th.startYear, label: `${range} — ${th.teamLabel}` });
    transactionTeamNames.add(key);
  }
  datedStops.sort((a, b) => a.year - b.year);
  journeySteps.push(...datedStops.map((s) => s.label));

  if (profile.team) journeySteps.push(`Current team: ${profile.team}`);

  // The AI narrative layer — rewrites/organizes ONLY the real facts above
  // into warm prose; never a source of new facts. The itemized timeline
  // below always renders too, so the verified record stays fully visible
  // regardless of whether a narrative could be generated.
  const journeyFacts: JourneyFacts = {
    name: profile.name,
    highSchool: profile.highSchool,
    college: profile.college,
    collegeSeasonsAttended: profile.collegeCareer?.seasonsAttended,
    collegeHonors: profile.collegeCareer?.seasons.flatMap((s) => s.honors ?? []),
    draftYear: profile.draftYear,
    draftRound: profile.draftRound,
    draftPick: profile.draftPick,
    draftTeam: profile.draftTeam,
    careerStops: journeySteps,
    currentTeam: profile.team,
  };
  const journeyNarrative = journeySteps.length > 0 ? await generateJourneyNarrative(journeyFacts) : null;

  return (
    <div className="spx spx-profile">
      <SmartBackLink fallbackHref={`/dashboard/discovery/sports/${SPORT_SLUG[league]}`} label={`← Back to ${LEAGUE_LABEL[league]}`} className="spx-profile__back" />

      <section className="spx-profile__hero">
        {profile.teamLogoUrl && (
          <div className="spx-profile__team-badge">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.teamLogoUrl} alt="" />
          </div>
        )}
        <div className="spx-profile__hero-main">
          <PlayerHeroPhoto photoUrl={profile.photoUrl} number={profile.number} />
          <div className="spx-profile__identity">
            <h1>{profile.name}</h1>
            <div className="spx-profile__chips">
              {profile.team && <span className="spx-profile__chip spx-profile__chip--team">{profile.team}</span>}
              {profile.position && <span className="spx-profile__chip">{profile.position}</span>}
              {profile.age && <span className="spx-profile__chip">Age {profile.age}</span>}
              {profile.status && <span className="spx-profile__chip">{profile.status}</span>}
            </div>
            <dl className="spx-profile__bio">
              {profile.number != null && <div><dt>Number</dt><dd>#{profile.number}</dd></div>}
              {heightLabel(profile.heightInches) && <div><dt>Height</dt><dd>{heightLabel(profile.heightInches)}</dd></div>}
              {profile.weightLbs && <div><dt>Weight</dt><dd>{profile.weightLbs} lbs</dd></div>}
              {formatDate(profile.birthDate) && <div><dt>Born</dt><dd>{formatDate(profile.birthDate)}</dd></div>}
              {(profile.birthCity || profile.birthState) && <div><dt>Hometown</dt><dd>{[profile.birthCity, profile.birthState].filter(Boolean).join(", ")}</dd></div>}
              {typeof profile.experienceYears === "number" && <div><dt>Experience</dt><dd>{profile.experienceYears} season{profile.experienceYears === 1 ? "" : "s"}</dd></div>}
            </dl>
          </div>
        </div>
      </section>

      {journeySteps.length > 0 && (
        <section className="spx-panel spx-profile__section">
          <div className="spx-panel__head"><h2>The Journey</h2></div>
          {journeyNarrative && <p className="spx-profile__narrative">{journeyNarrative}</p>}
          <ol className="spx-profile__timeline">
            {journeySteps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </section>
      )}

      <section className="spx-panel spx-profile__section">
        <div className="spx-panel__head"><h2>College Career</h2></div>
        {profile.college ? (
          <div className="spx-panel__body">
            <p><b>{profile.college}</b>{profile.collegeCareer?.seasonsAttended ? ` · ${profile.collegeCareer.seasonsAttended}` : ""}</p>
            {profile.collegeCareer ? (
              <>
                {profile.collegeCareer.careerTotals && (
                  <div style={{ marginTop: ".8rem" }}>
                    <h3 className="spx-standings__group-label">Career Totals</h3>
                    <StatRow fields={Object.keys(profile.collegeCareer.careerTotals)} stats={profile.collegeCareer.careerTotals} />
                  </div>
                )}
                {profile.collegeCareer.seasons.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <h3 className="spx-standings__group-label">By Season</h3>
                    {profile.collegeCareer.seasons.map((line) => (
                      <div key={line.season} style={{ marginBottom: ".6rem" }}>
                        <span className="spx-standings__division-label">
                          {line.season}{line.classYear ? ` — ${line.classYear}` : ""}
                          {line.games != null ? ` · ${line.games} GP` : ""}{line.starts != null ? ` · ${line.starts} GS` : ""}
                        </span>
                        <StatRow fields={Object.keys(line.stats)} stats={line.stats} />
                        {line.honors && line.honors.length > 0 && (
                          <p style={{ color: "var(--gold-soft)", fontSize: ".7rem", margin: ".3rem 0 0" }}>{line.honors.join(" · ")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="spx-panel__empty">Detailed college statistics aren&rsquo;t available for this player.</p>
            )}
          </div>
        ) : (
          <p className="spx-panel__empty">College information isn&rsquo;t available for this player.</p>
        )}
      </section>

      <section className="spx-panel spx-profile__section">
        <div className="spx-panel__head"><h2>Professional Career</h2></div>
        {profile.careerTotals && (
          <div className="spx-panel__body">
            <h3 className="spx-standings__group-label">Career Totals — {seasonCount} Season{seasonCount === 1 ? "" : "s"}</h3>
            <StatRow fields={featured.length ? featured.filter((f) => f in profile.careerTotals!) : Object.keys(profile.careerTotals)} stats={profile.careerTotals} />
          </div>
        )}

        <div className="spx-panel__body" style={{ marginTop: profile.careerTotals ? "1rem" : 0 }}>
          <h3 className="spx-standings__group-label">{profile.currentSeason} Season</h3>
          {currentStats ? (
            <>
              <StatRow fields={featured.length ? featured : Object.keys(currentStats)} stats={currentStats} />
              {featured.length > 0 && otherFields.length > 0 && (
                <details className="spx-standings">
                  <summary>More stats</summary>
                  <StatRow fields={otherFields} stats={currentStats} />
                </details>
              )}
            </>
          ) : (
            <p className="spx-panel__empty">No {profile.currentSeason} season statistics available yet.</p>
          )}
        </div>

        {profile.seasonsBySeason.length > 0 && (
          <div className="spx-panel__body" style={{ marginTop: "1rem" }}>
            <h3 className="spx-standings__group-label">By Season</h3>
            {profile.seasonsBySeason.map((line) => (
              <div key={`${line.season}-${line.team ?? ""}`} style={{ marginBottom: ".6rem" }}>
                <span className="spx-standings__division-label">{line.season}{line.team ? ` — ${line.team}` : ""}</span>
                <StatRow fields={featured.length ? featured : Object.keys(line.stats)} stats={line.stats} />
              </div>
            ))}
          </div>
        )}
        {profile.seasonsBySeason.length === 0 && !currentStats && profile.recentGameFallback.length === 0 && (
          <p className="spx-panel__empty">No professional statistics on record for this player yet.</p>
        )}

        {profile.recentGameFallback.length > 0 && (
          <div className="spx-panel__body" style={{ marginTop: "1rem" }}>
            <h3 className="spx-standings__group-label">Recent Games</h3>
            <p className="spx-profile__fallback-note">
              Season totals aren&rsquo;t available from our primary stats source yet — showing real, individual game stats instead.
            </p>
            {profile.recentGameFallback.map((g, i) => (
              <div key={i} style={{ marginBottom: ".6rem" }}>
                <span className="spx-standings__division-label">{formatDate(g.date) ?? "Date unknown"}{g.opponent ? ` — vs ${g.opponent}` : ""}</span>
                <div className="spx-profile__stats-grid">
                  {g.stats.map((s, j) => (
                    <div key={j} className="spx-profile__stat">
                      <span className="spx-profile__stat-value">{s.value}</span>
                      <span className="spx-profile__stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {profile.teamRecord && (
        <section className="spx-panel spx-profile__section">
          <div className="spx-panel__head"><h2>Current Season</h2></div>
          <div className="spx-panel__body">
            <p><b>{profile.team}</b> team record: {profile.teamRecord}</p>
          </div>
        </section>
      )}

      <section className="spx-panel spx-profile__section">
        <div className="spx-panel__head"><h2>Achievements</h2></div>
        {profile.awards.length > 0 ? (
          <ul className="spx-panel__body">
            {profile.awards.map((a, i) => (
              <li key={i}>{a.label}{a.currentRank ? ` — currently #${a.currentRank}` : ""}{a.futuresConsensus ? ` (${a.futuresConsensus})` : ""}</li>
            ))}
          </ul>
        ) : (
          <p className="spx-panel__empty">No awards, honors, or futures-market appearances on record for this player.</p>
        )}
      </section>

      <section className="spx-panel spx-profile__section">
        <div className="spx-panel__head"><h2>Recent Activity</h2></div>
        <div className="spx-panel__body">
          {profile.injuries.length > 0 && (
            <div>
              <span className="spx-search__label">Injury Report</span>
              {profile.injuries.map((inj, i) => (
                <p key={i}>{inj.status ?? "Status unknown"}{inj.bodyPart ? ` — ${inj.bodyPart}` : ""}</p>
              ))}
            </div>
          )}
          {sortedTransactions.length > 0 ? (
            <div>
              <span className="spx-search__label">Transactions</span>
              {[...sortedTransactions].reverse().slice(0, 8).map((t, i) => (
                <p key={i}>{formatDate(t.date) ? `${formatDate(t.date)}: ` : ""}{t.type ?? "Roster move"}{t.team ? ` — ${t.team}` : ""}{t.description ? `: ${t.description}` : ""}</p>
              ))}
            </div>
          ) : (
            profile.injuries.length === 0 && <p className="spx-panel__empty">No recent transactions or injuries on record.</p>
          )}
        </div>
      </section>
    </div>
  );
}
