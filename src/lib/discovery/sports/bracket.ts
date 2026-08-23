// ── Playoff Bracket — sport-agnostic bracket data shaping (pure) ──────────
// Turns real seed/standings data (from postseason.ts's rule engine) and real
// postseason game data (from the sports provider) into ONE generic shape —
// BracketData below — that the shared <PlayoffBracket> UI component renders.
// NFL is the only sport wired end to end today (buildNflBracketData +
// service.ts's getNflPlayoffBracket); a second sport (NBA/WNBA/MLB/NHL) is
// meant to plug into the exact same BracketRound/BracketMatchup/BracketSlot
// types with its own build*BracketData function here — the same "shared
// shape, per-league adapter" pattern postseason.ts already uses for seeding.
//
// HARD RULE enforced everywhere in this file: a BracketSlot only ever holds
// a REAL team (from real standings/seeding, or a real scheduled/live/final
// game) or a placeholder label ("TBD", "Winner of Wild Card Round", ...).
// Nothing here ever fabricates who wins a matchup, or invents which two
// teams meet in a round before the real bracket says so.
//
// LAYOUT CONTRACT for the renderer: BracketData.rounds is one flat, ordered
// list of round columns (e.g. Wild Card -> Divisional -> Conference
// Championship -> Super Bowl for NFL) — NOT nested per conference. Within
// one round's `matchups` array, one conference/group's rows come first, then
// the next group's (see confLabel on each matchup for the visual
// sub-heading). This is deliberate: the renderer draws connector lines by
// pairing CONSECUTIVE matchups two at a time between one round and the
// next, and that only lines up correctly when each round's matchup count is
// exactly half of the previous round's (a "bye" is its own one-slot
// matchup, so it counts toward that halving) AND the ordering is stable
// across rounds. NFL's real shape (per conference: bye + 3 Wild Card
// matchups = 4 rows -> 2 Divisional rows -> 1 Conference Championship row)
// satisfies this exactly, and so does every other big-4 US sport's real
// 4-round conference structure (NBA/WNBA: 4 first-round series -> 2 -> 1;
// NHL: same as NBA; MLB: 2 byes + 1 Wild Card row = mirrors NFL's shape) —
// which is why this same flat/paired shape is expected to generalize.

export type BracketMode = "projected" | "official";
export type BracketBadge = "clinched" | "projected" | "eliminated" | null;

export interface BracketTeamView {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  /** Undefined only for a real game side that couldn't be matched back to a
   *  seed (should be rare — same provider, same team id space). */
  seed?: number;
  /** Display-only "W-L" or "W-L-T" string, from real wins/losses/ties —
   *  never computed from anything but those three real numbers. */
  record?: string;
  badge: BracketBadge;
}

export interface BracketSlot {
  /** null = not decided yet — render `placeholderLabel` instead. Never a
   *  guessed team. */
  team: BracketTeamView | null;
  /** "TBD", "Winner of Wild Card Round", "AFC Champion", ... — only
   *  meaningful when `team` is null. */
  placeholderLabel?: string;
}

export interface BracketMatchup {
  id: string;
  /** Which conference/group this row belongs to, for the renderer's visual
   *  sub-heading within a round column — e.g. "AFC" / "NFC". Undefined for
   *  a round with no group split (the Super Bowl / a single merged final). */
  confLabel?: string;
  /** True for a #1-seed's Wild Card bye — rendered as a single team with no
   *  opponent yet, not a real 2-team matchup. */
  isBye?: boolean;
  top: BracketSlot;
  bottom: BracketSlot;
  status: "upcoming" | "live" | "final";
  topScore?: number | null;
  bottomScore?: number | null;
  /** The local SportsGame id for this matchup's real game, once one exists
   *  — links the card to the real Game Center. Null/undefined until then. */
  gameId?: string | null;
  startsAt?: string;
}

export interface BracketRound {
  id: string;
  label: string;
  matchups: BracketMatchup[];
}

export interface BracketData {
  sportLabel: string;
  seasonLabel: string;
  mode: BracketMode;
  /** "If the Playoffs Started Today" during the projected phase; the real
   *  season's own bracket name ("2026 NFL Playoffs") once official. Exact
   *  copy is the caller's call, not this module's — see service.ts. */
  headline: string;
  subhead: string;
  rounds: BracketRound[];
}

/** "11-3" / "11-3-1" — display-only, straight from real wins/losses/ties. */
export function formatRecord(wins: number, losses: number, ties?: number): string {
  return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function teamSlot(view: BracketTeamView): BracketSlot {
  return { team: view };
}

function placeholderSlot(label: string): BracketSlot {
  return { team: null, placeholderLabel: label };
}

// ── NFL adapter ─────────────────────────────────────────────────────────

export interface NflBracketSeedInput {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  seed: number;
  wins: number;
  losses: number;
  ties?: number;
  isDivisionWinner: boolean;
  clinched: boolean;
}

export interface NflBracketRealGame {
  externalId: string;
  /** The local SportsGame row id, once synced — null only if the sync
   *  itself failed (see service.ts's syncGamesToLocal), never fabricated. */
  gameId: string | null;
  /** The provider's own stage/round label verbatim — classified by
   *  classifyNflPostseasonStage below, never assumed from game order. */
  stage: string;
  status: "scheduled" | "live" | "final";
  startsAt: string;
  homeTeam: { id: string; name: string; logoUrl?: string };
  awayTeam: { id: string; name: string; logoUrl?: string };
  homeScore?: number | null;
  awayScore?: number | null;
}

export type NflBracketRoundId = "wildcard" | "divisional" | "conference" | "superbowl";

/** Classifies one real postseason game's provider-reported `stage` string
 *  into one of the 4 real NFL playoff rounds. Regex-based, case/spacing-
 *  insensitive — the SAME discipline fetchFirstPostseasonGame already uses
 *  for detecting a postseason game at all (see providers/sports.ts), not a
 *  literal string match against one hardcoded provider wording, since this
 *  codebase has never enumerated API-Sports' exact per-round stage strings.
 *  Checked in this exact priority order (Super Bowl before Conference
 *  Championship before Divisional before Wild Card) so a stage string that
 *  happens to contain more than one keyword still lands in the most
 *  specific real round. Returns "unknown" for anything that matches none of
 *  them — callers must surface that rather than silently dropping a real
 *  game (see groupByRound below).
 *
 *  THIS is the exact per-round signal to replicate for NBA/WNBA/MLB/NHL:
 *  write that sport's own regex set against ITS real round names (e.g. NBA:
 *  "first round" / "conference semifinal" / "conference final" / "finals"),
 *  reusing this same classify-then-group shape. */
export function classifyNflPostseasonStage(stage: string): NflBracketRoundId | "unknown" {
  if (/super.?bowl/i.test(stage)) return "superbowl";
  if (/conf(erence)?.?championship|afc championship|nfc championship/i.test(stage)) return "conference";
  if (/divisional/i.test(stage)) return "divisional";
  if (/wild.?card/i.test(stage)) return "wildcard";
  return "unknown";
}

const WILDCARD_HOST_PAIRS: [number, number][] = [[2, 7], [3, 6], [4, 5]]; // [home seed, away seed] — real NFL rule: the higher seed always hosts

function seedTeamView(seed: NflBracketSeedInput, mode: BracketMode): BracketTeamView {
  return {
    teamId: seed.teamId,
    teamName: seed.teamName,
    teamLogoUrl: seed.teamLogoUrl,
    seed: seed.seed,
    record: formatRecord(seed.wins, seed.losses, seed.ties),
    // Official mode: the season's over, real final standings, no caveat
    // needed. Projected mode: postseason.ts's own seed engine discloses no
    // per-seed tiebreaker-confidence flag (ties fall back to array order —
    // see that module's comments), so every non-clinched projected seed is
    // conservatively labeled "projected", never presented as certain; only
    // a seed the engine itself marks mathematically clinched gets the
    // stronger "clinched" badge.
    badge: mode === "official" ? null : seed.clinched ? "clinched" : "projected",
  };
}

function findSeed(seeds: NflBracketSeedInput[], teamId: string): NflBracketSeedInput | undefined {
  return seeds.find((s) => s.teamId === teamId);
}

function gameSideView(side: { id: string; name: string; logoUrl?: string }, seeds: NflBracketSeedInput[], mode: BracketMode): BracketTeamView {
  const seed = findSeed(seeds, side.id);
  return seed ? seedTeamView(seed, mode) : { teamId: side.id, teamName: side.name, teamLogoUrl: side.logoUrl, badge: null };
}

function realGameToMatchup(id: string, game: NflBracketRealGame, seeds: NflBracketSeedInput[], mode: BracketMode, confLabel?: string): BracketMatchup {
  return {
    id,
    confLabel,
    top: teamSlot(gameSideView(game.awayTeam, seeds, mode)),
    bottom: teamSlot(gameSideView(game.homeTeam, seeds, mode)),
    status: game.status === "scheduled" ? "upcoming" : game.status,
    topScore: game.awayScore ?? null,
    bottomScore: game.homeScore ?? null,
    gameId: game.gameId,
    startsAt: game.startsAt,
  };
}

function sortedByKickoff(games: NflBracketRealGame[]): NflBracketRealGame[] {
  return [...games].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
}

function buildWildCardRound(seeds: NflBracketSeedInput[], realGames: NflBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  const bySeed = new Map(seeds.map((s) => [s.seed, s]));
  const one = bySeed.get(1);
  const bye: BracketMatchup = {
    id: `${idPrefix}-bye`,
    confLabel,
    isBye: true,
    top: one ? teamSlot(seedTeamView(one, mode)) : placeholderSlot("TBD"),
    bottom: placeholderSlot("BYE — Wild Card Round"),
    status: "upcoming",
  };

  // Once the real Wild Card schedule is posted, it's authoritative — use it
  // verbatim (real pairing/kickoff/status/score), never the projected 2v7/
  // 3v6/4v5 pairing below, even in "official" mode.
  if (realGames.length) {
    return [bye, ...sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-wc-${i}`, g, seeds, mode, confLabel))];
  }

  const projected = WILDCARD_HOST_PAIRS.map(([homeSeed, awaySeed], i): BracketMatchup => {
    const home = bySeed.get(homeSeed);
    const away = bySeed.get(awaySeed);
    return {
      id: `${idPrefix}-wc-${i}`,
      confLabel,
      top: away ? teamSlot(seedTeamView(away, mode)) : placeholderSlot("TBD"),
      bottom: home ? teamSlot(seedTeamView(home, mode)) : placeholderSlot("TBD"),
      status: "upcoming",
    };
  });
  return [bye, ...projected];
}

function buildDivisionalRound(seeds: NflBracketSeedInput[], realGames: NflBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-div-${i}`, g, seeds, mode, confLabel));
  }
  const one = seeds.find((s) => s.seed === 1);
  // Real, certain bracket structure (the #1 seed's bye guarantees it a
  // Divisional-round game against a Wild Card winner) shown without
  // asserting WHICH winner — that pairing depends on real Wild Card
  // results (and NFL's seed-based reseeding), never guessed here.
  return [
    { id: `${idPrefix}-div-0`, confLabel, top: one ? teamSlot(seedTeamView(one, mode)) : placeholderSlot("TBD"), bottom: placeholderSlot("Winner of Wild Card Round"), status: "upcoming" },
    { id: `${idPrefix}-div-1`, confLabel, top: placeholderSlot("Winner of Wild Card Round"), bottom: placeholderSlot("Winner of Wild Card Round"), status: "upcoming" },
  ];
}

function buildConferenceRound(seeds: NflBracketSeedInput[], realGames: NflBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-conf-${i}`, g, seeds, mode, confLabel));
  }
  return [{ id: `${idPrefix}-conf-0`, confLabel, top: placeholderSlot("Winner of Divisional Round"), bottom: placeholderSlot("Winner of Divisional Round"), status: "upcoming" }];
}

function buildFinalRound(realGame: NflBracketRealGame | null, seeds: NflBracketSeedInput[], mode: BracketMode, afcLabel: string, nfcLabel: string): BracketRound {
  const matchups: BracketMatchup[] = realGame
    ? [realGameToMatchup("superbowl", realGame, seeds, mode)]
    : [{ id: "superbowl", top: placeholderSlot(`${afcLabel} Champion`), bottom: placeholderSlot(`${nfcLabel} Champion`), status: "upcoming" }];
  return { id: "superbowl", label: "Super Bowl", matchups };
}

interface GroupedGames {
  wildcard: { afc: NflBracketRealGame[]; nfc: NflBracketRealGame[] };
  divisional: { afc: NflBracketRealGame[]; nfc: NflBracketRealGame[] };
  conference: { afc: NflBracketRealGame[]; nfc: NflBracketRealGame[] };
  superbowl: NflBracketRealGame[];
}

/** Buckets real postseason games by real round (via classifyNflPostseasonStage)
 *  and, for the 3 conference-scoped rounds, by which conference either side
 *  belongs to (real team-id membership in that conference's real seed list
 *  — never inferred from team name). A game whose stage classifies as
 *  "unknown", or whose teams match neither conference's seed list, is left
 *  out of the bucketed result rather than guessed into the wrong slot — it
 *  still exists as a real game elsewhere in the app (Today's Games, its own
 *  Game Center), it's just not placed on this bracket. */
function groupByRound(games: NflBracketRealGame[], afcTeamIds: Set<string>, nfcTeamIds: Set<string>): GroupedGames {
  const grouped: GroupedGames = {
    wildcard: { afc: [], nfc: [] },
    divisional: { afc: [], nfc: [] },
    conference: { afc: [], nfc: [] },
    superbowl: [],
  };
  for (const g of games) {
    const round = classifyNflPostseasonStage(g.stage);
    if (round === "unknown") continue;
    if (round === "superbowl") { grouped.superbowl.push(g); continue; }
    const conf: "afc" | "nfc" | null = afcTeamIds.has(g.homeTeam.id) || afcTeamIds.has(g.awayTeam.id) ? "afc"
      : nfcTeamIds.has(g.homeTeam.id) || nfcTeamIds.has(g.awayTeam.id) ? "nfc" : null;
    if (!conf) continue;
    grouped[round][conf].push(g);
  }
  return grouped;
}

/** Builds the full, generic BracketData for one NFL season from real seed
 *  data (postseason.ts's projectNflConferenceSeeds, via service.ts's
 *  getNflPlayoffPicture) plus, once they exist, real postseason games.
 *
 *  `mode` is decided entirely by the CALLER (service.ts) from the one
 *  documented signal: whether a real postseason game exists yet for this
 *  season (getFirstPostseasonGame(...) !== null) — see that function's own
 *  doc comment for why. This module never re-derives the mode itself; it
 *  only renders whichever mode it's told, real-games-first whenever they
 *  exist for a given round regardless of `mode`. */
export function buildNflBracketData(params: {
  seasonLabel: string;
  mode: BracketMode;
  afcSeeds: NflBracketSeedInput[];
  nfcSeeds: NflBracketSeedInput[];
  /** Every real game this season whose stage matched the shared postseason
   *  regex (see fetchFirstPostseasonGame) — empty in "projected" mode. */
  postseasonGames: NflBracketRealGame[];
  afcLabel?: string;
  nfcLabel?: string;
}): BracketData {
  const { seasonLabel, mode, afcSeeds, nfcSeeds, postseasonGames, afcLabel = "AFC", nfcLabel = "NFC" } = params;
  const afcTeamIds = new Set(afcSeeds.map((s) => s.teamId));
  const nfcTeamIds = new Set(nfcSeeds.map((s) => s.teamId));
  const grouped = groupByRound(postseasonGames, afcTeamIds, nfcTeamIds);

  const wildcard = [
    ...buildWildCardRound(afcSeeds, grouped.wildcard.afc, mode, afcLabel, "afc"),
    ...buildWildCardRound(nfcSeeds, grouped.wildcard.nfc, mode, nfcLabel, "nfc"),
  ];
  const divisional = [
    ...buildDivisionalRound(afcSeeds, grouped.divisional.afc, mode, afcLabel, "afc"),
    ...buildDivisionalRound(nfcSeeds, grouped.divisional.nfc, mode, nfcLabel, "nfc"),
  ];
  const conference = [
    ...buildConferenceRound(afcSeeds, grouped.conference.afc, mode, afcLabel, "afc"),
    ...buildConferenceRound(nfcSeeds, grouped.conference.nfc, mode, nfcLabel, "nfc"),
  ];
  const finalRound = buildFinalRound(grouped.superbowl[0] ?? null, [...afcSeeds, ...nfcSeeds], mode, afcLabel, nfcLabel);

  return {
    sportLabel: "NFL",
    seasonLabel,
    mode,
    headline: mode === "projected" ? "If the Playoffs Started Today" : `${seasonLabel} NFL Playoffs`,
    subhead: mode === "projected"
      ? "Projected seeding from current standings — only the Wild Card round is ever projected. Not an official bracket."
      : "The official NFL playoff bracket — advances automatically as real results come in.",
    rounds: [
      { id: "wildcard", label: "Wild Card", matchups: wildcard },
      { id: "divisional", label: "Divisional", matchups: divisional },
      { id: "conference", label: "Conference Championship", matchups: conference },
      finalRound,
    ],
  };
}
