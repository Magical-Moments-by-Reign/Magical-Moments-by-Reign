// ── Playoff Bracket — sport-agnostic bracket data shaping (pure) ──────────
// Turns real seed/standings data (from postseason.ts's rule engine) and real
// postseason game data (from the sports provider) into ONE generic shape —
// BracketData below — that the shared <PlayoffBracket> UI component renders.
// NFL, NBA, WNBA, MLB, and NHL are wired end to end today (each with its own
// build*BracketData function here plus its own getXPlayoffBracket in
// service.ts) — every one of them plugs into the exact same
// BracketRound/BracketMatchup/BracketSlot types, the same "shared shape,
// per-league adapter" pattern postseason.ts already uses for seeding. A
// future sport follows the same recipe: its own seed input type, its own
// classify*PostseasonStage regex classifier, its own round builders, and
// its own build*BracketData/getXPlayoffBracket pair.
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

// ── Shared per-seed / per-real-game rendering helpers ──────────────────────
// The minimal shape every sport's own seed/real-game input needs to satisfy
// to reuse seedTeamView/findSeed/gameSideView/realGameToMatchup/
// sortedByKickoff below — the exact "shared shape, per-league adapter"
// pattern postseason.ts already uses for seeding (see this file's top
// comment). NFL's own NflBracketSeedInput/NflBracketRealGame types (below)
// were the original, sport-specific versions of these — kept as their own
// exported names (extending/aliasing these) so service.ts's existing NFL
// imports need no changes; every new sport below just declares its own
// small extension of BracketSeedInput and a BracketRealGame alias, the same
// way NFL does.

export interface BracketSeedInput {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  seed: number;
  wins: number;
  losses: number;
  ties?: number;
  clinched: boolean;
}

export interface BracketRealGame {
  externalId: string;
  /** The local SportsGame row id, once synced — null only if the sync
   *  itself failed (see service.ts's syncGamesToLocal), never fabricated. */
  gameId: string | null;
  /** The provider's own stage/round label verbatim — classified by this
   *  sport's own classify*PostseasonStage function, never assumed from game
   *  order. */
  stage: string;
  status: "scheduled" | "live" | "final";
  startsAt: string;
  homeTeam: { id: string; name: string; logoUrl?: string };
  awayTeam: { id: string; name: string; logoUrl?: string };
  homeScore?: number | null;
  awayScore?: number | null;
}

// ── NFL adapter ─────────────────────────────────────────────────────────

export interface NflBracketSeedInput extends BracketSeedInput {
  isDivisionWinner: boolean;
}

export type NflBracketRealGame = BracketRealGame;

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

function seedTeamView<S extends BracketSeedInput>(seed: S, mode: BracketMode): BracketTeamView {
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

function findSeed<S extends BracketSeedInput>(seeds: S[], teamId: string): S | undefined {
  return seeds.find((s) => s.teamId === teamId);
}

function gameSideView<S extends BracketSeedInput>(side: { id: string; name: string; logoUrl?: string }, seeds: S[], mode: BracketMode): BracketTeamView {
  const seed = findSeed(seeds, side.id);
  return seed ? seedTeamView(seed, mode) : { teamId: side.id, teamName: side.name, teamLogoUrl: side.logoUrl, badge: null };
}

function realGameToMatchup<S extends BracketSeedInput, G extends BracketRealGame>(id: string, game: G, seeds: S[], mode: BracketMode, confLabel?: string): BracketMatchup {
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

function sortedByKickoff<G extends BracketRealGame>(games: G[]): G[] {
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

// ── NBA adapter ─────────────────────────────────────────────────────────
// Real NBA rule: seeds 1-6 in a conference go directly to the First Round;
// seeds 7-10 play a real Play-In Tournament (7v8 and 9v10, then the loser of
// 7v8 vs the winner of 9v10) for the conference's final #7/#8 seeds. 5 real
// rounds: Play-In, First Round, Conference Semifinals, Conference Finals,
// NBA Finals.

export type NbaBracketSeedInput = BracketSeedInput;
export type NbaBracketRealGame = BracketRealGame;

export type NbaBracketRoundId = "playin" | "firstround" | "semis" | "confFinal" | "finals";

/** NBA's own real-round classifier — same regex-based, priority-ordered
 *  discipline as classifyNflPostseasonStage above (most specific first, so
 *  a stage string like "Eastern Conference Finals" — which also contains
 *  the substring "Final" — lands as "confFinal", never the bare "finals"
 *  catch-all). */
export function classifyNbaPostseasonStage(stage: string): NbaBracketRoundId | "unknown" {
  if (/play.?in/i.test(stage)) return "playin";
  if (/conf(erence)?.?semi/i.test(stage)) return "semis";
  if (/conf(erence)?.?final/i.test(stage)) return "confFinal";
  if (/first.?round|1st.?round|round.?1\b/i.test(stage)) return "firstround";
  if (/finals?/i.test(stage)) return "finals";
  return "unknown";
}

const NBA_FIRST_ROUND_HOST_PAIRS: [number, number][] = [[1, 8], [2, 7], [3, 6], [4, 5]]; // [home seed, away seed] — real NBA rule: the higher seed always hosts

function buildNbaPlayInRound(seeds: NbaBracketSeedInput[], realGames: NbaBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  // Once the real Play-In schedule is posted, it's authoritative — use it
  // verbatim, same discipline as every other real-games-first round below.
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-pi-${i}`, g, seeds, mode, confLabel));
  }
  const bySeed = new Map(seeds.map((s) => [s.seed, s]));
  const seven = bySeed.get(7);
  const eight = bySeed.get(8);
  const nine = bySeed.get(9);
  const ten = bySeed.get(10);
  // 7-vs-8 and 9-vs-10 are both real, known matchups from today's seeding —
  // projected, never fabricated, same as NFL's Wild Card projections. The
  // decisive third game (loser of 7/8 vs winner of 9/10) depends on BOTH of
  // those results, so both of its slots stay full placeholders until real
  // Play-In results exist.
  return [
    { id: `${idPrefix}-pi-7v8`, confLabel, top: seven ? teamSlot(seedTeamView(seven, mode)) : placeholderSlot("TBD"), bottom: eight ? teamSlot(seedTeamView(eight, mode)) : placeholderSlot("TBD"), status: "upcoming" },
    { id: `${idPrefix}-pi-9v10`, confLabel, top: nine ? teamSlot(seedTeamView(nine, mode)) : placeholderSlot("TBD"), bottom: ten ? teamSlot(seedTeamView(ten, mode)) : placeholderSlot("TBD"), status: "upcoming" },
    { id: `${idPrefix}-pi-decider`, confLabel, top: placeholderSlot("Winner of 9/10"), bottom: placeholderSlot("Loser of 7/8"), status: "upcoming" },
  ];
}

function buildNbaFirstRound(seeds: NbaBracketSeedInput[], realGames: NbaBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-r1-${i}`, g, seeds, mode, confLabel));
  }
  const bySeed = new Map(seeds.map((s) => [s.seed, s]));
  return NBA_FIRST_ROUND_HOST_PAIRS.map(([homeSeed, awaySeed], i): BracketMatchup => {
    // Seeds 1-6 are real and known today; seeds 7/8 are only known once the
    // real Play-In is decided (via a real game) — placeholder until then.
    const home = homeSeed <= 6 ? bySeed.get(homeSeed) : undefined;
    const away = awaySeed <= 6 ? bySeed.get(awaySeed) : undefined;
    return {
      id: `${idPrefix}-r1-${i}`,
      confLabel,
      top: away ? teamSlot(seedTeamView(away, mode)) : placeholderSlot("Play-In Winner"),
      bottom: home ? teamSlot(seedTeamView(home, mode)) : placeholderSlot("Play-In Winner"),
      status: "upcoming",
    };
  });
}

function buildNbaConfSemisRound(seeds: NbaBracketSeedInput[], realGames: NbaBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-semis-${i}`, g, seeds, mode, confLabel));
  }
  return [
    { id: `${idPrefix}-semis-0`, confLabel, top: placeholderSlot("Winner of First Round"), bottom: placeholderSlot("Winner of First Round"), status: "upcoming" },
    { id: `${idPrefix}-semis-1`, confLabel, top: placeholderSlot("Winner of First Round"), bottom: placeholderSlot("Winner of First Round"), status: "upcoming" },
  ];
}

function buildNbaConfFinalRound(seeds: NbaBracketSeedInput[], realGames: NbaBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-cf-${i}`, g, seeds, mode, confLabel));
  }
  return [{ id: `${idPrefix}-cf-0`, confLabel, top: placeholderSlot("Winner of Conference Semifinals"), bottom: placeholderSlot("Winner of Conference Semifinals"), status: "upcoming" }];
}

function buildNbaFinalsRound(realGame: NbaBracketRealGame | null, seeds: NbaBracketSeedInput[], mode: BracketMode, eastLabel: string, westLabel: string): BracketRound {
  const matchups: BracketMatchup[] = realGame
    ? [realGameToMatchup("nba-finals", realGame, seeds, mode)]
    : [{ id: "nba-finals", top: placeholderSlot(`${eastLabel} Champion`), bottom: placeholderSlot(`${westLabel} Champion`), status: "upcoming" }];
  return { id: "finals", label: "NBA Finals", matchups };
}

interface NbaGroupedGames {
  playin: { east: NbaBracketRealGame[]; west: NbaBracketRealGame[] };
  firstround: { east: NbaBracketRealGame[]; west: NbaBracketRealGame[] };
  semis: { east: NbaBracketRealGame[]; west: NbaBracketRealGame[] };
  confFinal: { east: NbaBracketRealGame[]; west: NbaBracketRealGame[] };
  finals: NbaBracketRealGame[];
}

function groupNbaByRound(games: NbaBracketRealGame[], eastTeamIds: Set<string>, westTeamIds: Set<string>): NbaGroupedGames {
  const grouped: NbaGroupedGames = {
    playin: { east: [], west: [] },
    firstround: { east: [], west: [] },
    semis: { east: [], west: [] },
    confFinal: { east: [], west: [] },
    finals: [],
  };
  for (const g of games) {
    const round = classifyNbaPostseasonStage(g.stage);
    if (round === "unknown") continue;
    if (round === "finals") { grouped.finals.push(g); continue; }
    const conf: "east" | "west" | null = eastTeamIds.has(g.homeTeam.id) || eastTeamIds.has(g.awayTeam.id) ? "east"
      : westTeamIds.has(g.homeTeam.id) || westTeamIds.has(g.awayTeam.id) ? "west" : null;
    if (!conf) continue;
    grouped[round][conf].push(g);
  }
  return grouped;
}

/** Builds the full, generic BracketData for one NBA season — same
 *  mode-decision contract as buildNflBracketData (see its own doc comment):
 *  `mode` is decided entirely by the caller from whether a real postseason
 *  game exists yet, and real games always win over a projection once they
 *  exist for a given round. */
export function buildNbaBracketData(params: {
  seasonLabel: string;
  mode: BracketMode;
  eastSeeds: NbaBracketSeedInput[];
  westSeeds: NbaBracketSeedInput[];
  postseasonGames: NbaBracketRealGame[];
  eastLabel?: string;
  westLabel?: string;
}): BracketData {
  const { seasonLabel, mode, eastSeeds, westSeeds, postseasonGames, eastLabel = "Eastern", westLabel = "Western" } = params;
  const eastTeamIds = new Set(eastSeeds.map((s) => s.teamId));
  const westTeamIds = new Set(westSeeds.map((s) => s.teamId));
  const grouped = groupNbaByRound(postseasonGames, eastTeamIds, westTeamIds);

  const playin = [
    ...buildNbaPlayInRound(eastSeeds, grouped.playin.east, mode, eastLabel, "east"),
    ...buildNbaPlayInRound(westSeeds, grouped.playin.west, mode, westLabel, "west"),
  ];
  const firstround = [
    ...buildNbaFirstRound(eastSeeds, grouped.firstround.east, mode, eastLabel, "east"),
    ...buildNbaFirstRound(westSeeds, grouped.firstround.west, mode, westLabel, "west"),
  ];
  const semis = [
    ...buildNbaConfSemisRound(eastSeeds, grouped.semis.east, mode, eastLabel, "east"),
    ...buildNbaConfSemisRound(westSeeds, grouped.semis.west, mode, westLabel, "west"),
  ];
  const confFinal = [
    ...buildNbaConfFinalRound(eastSeeds, grouped.confFinal.east, mode, eastLabel, "east"),
    ...buildNbaConfFinalRound(westSeeds, grouped.confFinal.west, mode, westLabel, "west"),
  ];
  const finalsRound = buildNbaFinalsRound(grouped.finals[0] ?? null, [...eastSeeds, ...westSeeds], mode, eastLabel, westLabel);

  return {
    sportLabel: "NBA",
    seasonLabel,
    mode,
    headline: mode === "projected" ? "If the Playoffs Started Today" : `${seasonLabel} NBA Playoffs`,
    subhead: mode === "projected"
      ? "Projected seeding from current standings, including the Play-In picture — only seeds 1-6 are ever projected straight into the First Round. Not an official bracket."
      : "The official NBA playoff bracket — advances automatically as real results come in.",
    rounds: [
      { id: "playin", label: "Play-In", matchups: playin },
      { id: "firstround", label: "First Round", matchups: firstround },
      { id: "semis", label: "Conference Semifinals", matchups: semis },
      { id: "confFinal", label: "Conference Finals", matchups: confFinal },
      finalsRound,
    ],
  };
}

// ── WNBA adapter ────────────────────────────────────────────────────────
// Real WNBA rule: no conference split — one league-wide top-8 field, no
// Play-In. 3 real rounds: First Round, Semifinals, Finals (see
// getWnbaPlayoffPicture's own doc comment and computePostseasonPicture's
// real top-8 field in postseason.ts).

export type WnbaBracketSeedInput = BracketSeedInput;
export type WnbaBracketRealGame = BracketRealGame;

export type WnbaBracketRoundId = "firstround" | "semis" | "finals";

/** WNBA's own real-round classifier. "Semifinal" contains the substring
 *  "final", so it's checked before the bare "finals" catch-all — the same
 *  priority-ordering discipline as every other classify*PostseasonStage
 *  function in this file. */
export function classifyWnbaPostseasonStage(stage: string): WnbaBracketRoundId | "unknown" {
  if (/first.?round|1st.?round/i.test(stage)) return "firstround";
  if (/semi.?final/i.test(stage)) return "semis";
  if (/finals?/i.test(stage)) return "finals";
  return "unknown";
}

const WNBA_FIRST_ROUND_HOST_PAIRS: [number, number][] = [[1, 8], [2, 7], [3, 6], [4, 5]]; // [home seed, away seed] — higher seed hosts, same real rule as every other big-4 sport's opening round

function buildWnbaFirstRound(seeds: WnbaBracketSeedInput[], realGames: WnbaBracketRealGame[], mode: BracketMode): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`wnba-r1-${i}`, g, seeds, mode));
  }
  const bySeed = new Map(seeds.map((s) => [s.seed, s]));
  return WNBA_FIRST_ROUND_HOST_PAIRS.map(([homeSeed, awaySeed], i): BracketMatchup => {
    const home = bySeed.get(homeSeed);
    const away = bySeed.get(awaySeed);
    return {
      id: `wnba-r1-${i}`,
      top: away ? teamSlot(seedTeamView(away, mode)) : placeholderSlot("TBD"),
      bottom: home ? teamSlot(seedTeamView(home, mode)) : placeholderSlot("TBD"),
      status: "upcoming",
    };
  });
}

function buildWnbaSemisRound(seeds: WnbaBracketSeedInput[], realGames: WnbaBracketRealGame[], mode: BracketMode): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`wnba-semis-${i}`, g, seeds, mode));
  }
  return [
    { id: "wnba-semis-0", top: placeholderSlot("Winner of First Round"), bottom: placeholderSlot("Winner of First Round"), status: "upcoming" },
    { id: "wnba-semis-1", top: placeholderSlot("Winner of First Round"), bottom: placeholderSlot("Winner of First Round"), status: "upcoming" },
  ];
}

function buildWnbaFinalsRound(realGame: WnbaBracketRealGame | null, seeds: WnbaBracketSeedInput[], mode: BracketMode): BracketRound {
  const matchups: BracketMatchup[] = realGame
    ? [realGameToMatchup("wnba-finals", realGame, seeds, mode)]
    : [{ id: "wnba-finals", top: placeholderSlot("Winner of Semifinals"), bottom: placeholderSlot("Winner of Semifinals"), status: "upcoming" }];
  return { id: "finals", label: "WNBA Finals", matchups };
}

interface WnbaGroupedGames {
  firstround: WnbaBracketRealGame[];
  semis: WnbaBracketRealGame[];
  finals: WnbaBracketRealGame[];
}

function groupWnbaByRound(games: WnbaBracketRealGame[]): WnbaGroupedGames {
  const grouped: WnbaGroupedGames = { firstround: [], semis: [], finals: [] };
  for (const g of games) {
    const round = classifyWnbaPostseasonStage(g.stage);
    if (round === "unknown") continue;
    grouped[round].push(g);
  }
  return grouped;
}

/** Builds the full, generic BracketData for one WNBA season — no
 *  conference split, so every matchup's confLabel is left undefined (see
 *  BracketMatchup's own doc comment: undefined means "no group split", the
 *  same as NFL's Super Bowl round). Same mode-decision contract as
 *  buildNflBracketData. */
export function buildWnbaBracketData(params: {
  seasonLabel: string;
  mode: BracketMode;
  seeds: WnbaBracketSeedInput[];
  postseasonGames: WnbaBracketRealGame[];
}): BracketData {
  const { seasonLabel, mode, seeds, postseasonGames } = params;
  const grouped = groupWnbaByRound(postseasonGames);

  const firstround = buildWnbaFirstRound(seeds, grouped.firstround, mode);
  const semis = buildWnbaSemisRound(seeds, grouped.semis, mode);
  const finalsRound = buildWnbaFinalsRound(grouped.finals[0] ?? null, seeds, mode);

  return {
    sportLabel: "WNBA",
    seasonLabel,
    mode,
    headline: mode === "projected" ? "If the Playoffs Started Today" : `${seasonLabel} WNBA Playoffs`,
    subhead: mode === "projected"
      ? "Projected seeding from current standings — the real top-8 field, no conference split. Not an official bracket."
      : "The official WNBA playoff bracket — advances automatically as real results come in.",
    rounds: [
      { id: "firstround", label: "First Round", matchups: firstround },
      { id: "semis", label: "Semifinals", matchups: semis },
      finalsRound,
    ],
  };
}

// ── MLB adapter ─────────────────────────────────────────────────────────
// Real MLB rule: the top 2 seeds (the two best division winners) get a bye
// through the Wild Card round — modeled the same way buildWildCardRound
// models NFL's single #1-seed bye, just with two bye rows instead of one.
// 4 real rounds: Wild Card Series, Division Series, League Championship
// Series, World Series.

export interface MlbBracketSeedInput extends BracketSeedInput {
  isDivisionWinner: boolean;
}

export type MlbBracketRealGame = BracketRealGame;

export type MlbBracketRoundId = "wildcard" | "divisionseries" | "lcs" | "worldseries";

/** MLB's own real-round classifier — same priority-ordered discipline as
 *  every other classify*PostseasonStage function here (most specific first,
 *  e.g. "World Series" checked before the more generic "Championship
 *  Series" so neither ever collides with the other). */
export function classifyMlbPostseasonStage(stage: string): MlbBracketRoundId | "unknown" {
  if (/world.?series/i.test(stage)) return "worldseries";
  if (/championship.?series|alcs|nlcs/i.test(stage)) return "lcs";
  if (/division.?series|alds|nlds/i.test(stage)) return "divisionseries";
  if (/wild.?card/i.test(stage)) return "wildcard";
  return "unknown";
}

const MLB_WILDCARD_HOST_PAIRS: [number, number][] = [[3, 6], [4, 5]]; // [home seed, away seed] — real MLB rule: seed 3 hosts seed 6, seed 4 hosts seed 5; seeds 1 & 2 are byes

function buildMlbWildCardRound(seeds: MlbBracketSeedInput[], realGames: MlbBracketRealGame[], mode: BracketMode, leagueLabel: string, idPrefix: string): BracketMatchup[] {
  const bySeed = new Map(seeds.map((s) => [s.seed, s]));
  const one = bySeed.get(1);
  const two = bySeed.get(2);
  const bye1: BracketMatchup = {
    id: `${idPrefix}-bye1`,
    confLabel: leagueLabel,
    isBye: true,
    top: one ? teamSlot(seedTeamView(one, mode)) : placeholderSlot("TBD"),
    bottom: placeholderSlot("BYE — Wild Card Series"),
    status: "upcoming",
  };
  const bye2: BracketMatchup = {
    id: `${idPrefix}-bye2`,
    confLabel: leagueLabel,
    isBye: true,
    top: two ? teamSlot(seedTeamView(two, mode)) : placeholderSlot("TBD"),
    bottom: placeholderSlot("BYE — Wild Card Series"),
    status: "upcoming",
  };

  if (realGames.length) {
    return [bye1, bye2, ...sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-wc-${i}`, g, seeds, mode, leagueLabel))];
  }

  const projected = MLB_WILDCARD_HOST_PAIRS.map(([homeSeed, awaySeed], i): BracketMatchup => {
    const home = bySeed.get(homeSeed);
    const away = bySeed.get(awaySeed);
    return {
      id: `${idPrefix}-wc-${i}`,
      confLabel: leagueLabel,
      top: away ? teamSlot(seedTeamView(away, mode)) : placeholderSlot("TBD"),
      bottom: home ? teamSlot(seedTeamView(home, mode)) : placeholderSlot("TBD"),
      status: "upcoming",
    };
  });
  return [bye1, bye2, ...projected];
}

function buildMlbDivisionSeriesRound(seeds: MlbBracketSeedInput[], realGames: MlbBracketRealGame[], mode: BracketMode, leagueLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-ds-${i}`, g, seeds, mode, leagueLabel));
  }
  const bySeed = new Map(seeds.map((s) => [s.seed, s]));
  const one = bySeed.get(1);
  const two = bySeed.get(2);
  // Both bye seeds are real and known; who they actually face depends on
  // real Wild Card Series results (and MLB's own reseeding), never guessed
  // here — same discipline as NFL's #1-seed Divisional-round placeholder.
  return [
    { id: `${idPrefix}-ds-0`, confLabel: leagueLabel, top: one ? teamSlot(seedTeamView(one, mode)) : placeholderSlot("TBD"), bottom: placeholderSlot("Winner of Wild Card Series"), status: "upcoming" },
    { id: `${idPrefix}-ds-1`, confLabel: leagueLabel, top: two ? teamSlot(seedTeamView(two, mode)) : placeholderSlot("TBD"), bottom: placeholderSlot("Winner of Wild Card Series"), status: "upcoming" },
  ];
}

function buildMlbLcsRound(seeds: MlbBracketSeedInput[], realGames: MlbBracketRealGame[], mode: BracketMode, leagueLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-lcs-${i}`, g, seeds, mode, leagueLabel));
  }
  return [{ id: `${idPrefix}-lcs-0`, confLabel: leagueLabel, top: placeholderSlot("Winner of Division Series"), bottom: placeholderSlot("Winner of Division Series"), status: "upcoming" }];
}

function buildMlbWorldSeriesRound(realGame: MlbBracketRealGame | null, seeds: MlbBracketSeedInput[], mode: BracketMode, alLabel: string, nlLabel: string): BracketRound {
  const matchups: BracketMatchup[] = realGame
    ? [realGameToMatchup("worldseries", realGame, seeds, mode)]
    : [{ id: "worldseries", top: placeholderSlot(`${alLabel} Champion`), bottom: placeholderSlot(`${nlLabel} Champion`), status: "upcoming" }];
  return { id: "worldseries", label: "World Series", matchups };
}

interface MlbGroupedGames {
  wildcard: { al: MlbBracketRealGame[]; nl: MlbBracketRealGame[] };
  divisionseries: { al: MlbBracketRealGame[]; nl: MlbBracketRealGame[] };
  lcs: { al: MlbBracketRealGame[]; nl: MlbBracketRealGame[] };
  worldseries: MlbBracketRealGame[];
}

function groupMlbByRound(games: MlbBracketRealGame[], alTeamIds: Set<string>, nlTeamIds: Set<string>): MlbGroupedGames {
  const grouped: MlbGroupedGames = {
    wildcard: { al: [], nl: [] },
    divisionseries: { al: [], nl: [] },
    lcs: { al: [], nl: [] },
    worldseries: [],
  };
  for (const g of games) {
    const round = classifyMlbPostseasonStage(g.stage);
    if (round === "unknown") continue;
    if (round === "worldseries") { grouped.worldseries.push(g); continue; }
    const league: "al" | "nl" | null = alTeamIds.has(g.homeTeam.id) || alTeamIds.has(g.awayTeam.id) ? "al"
      : nlTeamIds.has(g.homeTeam.id) || nlTeamIds.has(g.awayTeam.id) ? "nl" : null;
    if (!league) continue;
    grouped[round][league].push(g);
  }
  return grouped;
}

/** Builds the full, generic BracketData for one MLB season — same
 *  mode-decision contract as buildNflBracketData. */
export function buildMlbBracketData(params: {
  seasonLabel: string;
  mode: BracketMode;
  alSeeds: MlbBracketSeedInput[];
  nlSeeds: MlbBracketSeedInput[];
  postseasonGames: MlbBracketRealGame[];
  alLabel?: string;
  nlLabel?: string;
}): BracketData {
  const { seasonLabel, mode, alSeeds, nlSeeds, postseasonGames, alLabel = "AL", nlLabel = "NL" } = params;
  const alTeamIds = new Set(alSeeds.map((s) => s.teamId));
  const nlTeamIds = new Set(nlSeeds.map((s) => s.teamId));
  const grouped = groupMlbByRound(postseasonGames, alTeamIds, nlTeamIds);

  const wildcard = [
    ...buildMlbWildCardRound(alSeeds, grouped.wildcard.al, mode, alLabel, "al"),
    ...buildMlbWildCardRound(nlSeeds, grouped.wildcard.nl, mode, nlLabel, "nl"),
  ];
  const divisionseries = [
    ...buildMlbDivisionSeriesRound(alSeeds, grouped.divisionseries.al, mode, alLabel, "al"),
    ...buildMlbDivisionSeriesRound(nlSeeds, grouped.divisionseries.nl, mode, nlLabel, "nl"),
  ];
  const lcs = [
    ...buildMlbLcsRound(alSeeds, grouped.lcs.al, mode, alLabel, "al"),
    ...buildMlbLcsRound(nlSeeds, grouped.lcs.nl, mode, nlLabel, "nl"),
  ];
  const worldSeriesRound = buildMlbWorldSeriesRound(grouped.worldseries[0] ?? null, [...alSeeds, ...nlSeeds], mode, alLabel, nlLabel);

  return {
    sportLabel: "MLB",
    seasonLabel,
    mode,
    headline: mode === "projected" ? "If the Playoffs Started Today" : `${seasonLabel} MLB Playoffs`,
    subhead: mode === "projected"
      ? "Projected seeding from current standings — only the Wild Card Series is ever projected. Not an official bracket."
      : "The official MLB playoff bracket — advances automatically as real results come in.",
    rounds: [
      { id: "wildcard", label: "Wild Card Series", matchups: wildcard },
      { id: "divisionseries", label: "Division Series", matchups: divisionseries },
      { id: "lcs", label: "League Championship Series", matchups: lcs },
      worldSeriesRound,
    ],
  };
}

// ── NHL adapter ─────────────────────────────────────────────────────────
// Real NHL rule: no byes — all 8 seeds in each conference play in the First
// Round, and the real pairing is division-relative (a wild-card seed plays
// the OTHER division's weakest division winner), not a flat 1v8. That real
// crossover rule needs per-division membership at seeding time, which
// projectNhlConferenceSeeds (postseason.ts) does not currently expose past
// the seed number itself (isTopThreeInDivision only marks "top 3 in SOME
// division," not which one) — adding that would mean inventing per-division
// metadata this seed data doesn't have, which is exactly what this file's
// top comment forbids. So this adapter uses the same honest fallback every
// other sport's opening round already uses: pair by seed number (1v8, 2v7,
// 3v6, 4v5) within the conference. It's a real limitation, disclosed here
// and in this round's own subhead once posted — not a fabricated crossover
// rule. 4 real rounds: First Round, Second Round, Conference Final, Stanley
// Cup Final.

export interface NhlBracketSeedInput extends BracketSeedInput {
  isTopThreeInDivision: boolean;
}

export type NhlBracketRealGame = BracketRealGame;

export type NhlBracketRoundId = "firstround" | "secondround" | "confFinal" | "cupfinal";

/** NHL's own real-round classifier — same priority-ordered discipline as
 *  every other classify*PostseasonStage function here. */
export function classifyNhlPostseasonStage(stage: string): NhlBracketRoundId | "unknown" {
  if (/stanley.?cup/i.test(stage)) return "cupfinal";
  if (/conf(erence)?.?final/i.test(stage)) return "confFinal";
  if (/second.?round|2nd.?round|round.?2\b/i.test(stage)) return "secondround";
  if (/first.?round|1st.?round|round.?1\b/i.test(stage)) return "firstround";
  return "unknown";
}

const NHL_FIRST_ROUND_HOST_PAIRS: [number, number][] = [[1, 8], [2, 7], [3, 6], [4, 5]]; // [home seed, away seed] — honest seed-pair fallback (see this adapter's top comment); no byes in the real NHL format

function buildNhlFirstRound(seeds: NhlBracketSeedInput[], realGames: NhlBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-r1-${i}`, g, seeds, mode, confLabel));
  }
  const bySeed = new Map(seeds.map((s) => [s.seed, s]));
  return NHL_FIRST_ROUND_HOST_PAIRS.map(([homeSeed, awaySeed], i): BracketMatchup => {
    const home = bySeed.get(homeSeed);
    const away = bySeed.get(awaySeed);
    return {
      id: `${idPrefix}-r1-${i}`,
      confLabel,
      top: away ? teamSlot(seedTeamView(away, mode)) : placeholderSlot("TBD"),
      bottom: home ? teamSlot(seedTeamView(home, mode)) : placeholderSlot("TBD"),
      status: "upcoming",
    };
  });
}

function buildNhlSecondRound(seeds: NhlBracketSeedInput[], realGames: NhlBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-r2-${i}`, g, seeds, mode, confLabel));
  }
  return [
    { id: `${idPrefix}-r2-0`, confLabel, top: placeholderSlot("Winner of First Round"), bottom: placeholderSlot("Winner of First Round"), status: "upcoming" },
    { id: `${idPrefix}-r2-1`, confLabel, top: placeholderSlot("Winner of First Round"), bottom: placeholderSlot("Winner of First Round"), status: "upcoming" },
  ];
}

function buildNhlConfFinalRound(seeds: NhlBracketSeedInput[], realGames: NhlBracketRealGame[], mode: BracketMode, confLabel: string, idPrefix: string): BracketMatchup[] {
  if (realGames.length) {
    return sortedByKickoff(realGames).map((g, i) => realGameToMatchup(`${idPrefix}-cf-${i}`, g, seeds, mode, confLabel));
  }
  return [{ id: `${idPrefix}-cf-0`, confLabel, top: placeholderSlot("Winner of Second Round"), bottom: placeholderSlot("Winner of Second Round"), status: "upcoming" }];
}

function buildNhlStanleyCupRound(realGame: NhlBracketRealGame | null, seeds: NhlBracketSeedInput[], mode: BracketMode, eastLabel: string, westLabel: string): BracketRound {
  const matchups: BracketMatchup[] = realGame
    ? [realGameToMatchup("stanleycup", realGame, seeds, mode)]
    : [{ id: "stanleycup", top: placeholderSlot(`${eastLabel} Champion`), bottom: placeholderSlot(`${westLabel} Champion`), status: "upcoming" }];
  return { id: "cupfinal", label: "Stanley Cup Final", matchups };
}

interface NhlGroupedGames {
  firstround: { east: NhlBracketRealGame[]; west: NhlBracketRealGame[] };
  secondround: { east: NhlBracketRealGame[]; west: NhlBracketRealGame[] };
  confFinal: { east: NhlBracketRealGame[]; west: NhlBracketRealGame[] };
  cupfinal: NhlBracketRealGame[];
}

function groupNhlByRound(games: NhlBracketRealGame[], eastTeamIds: Set<string>, westTeamIds: Set<string>): NhlGroupedGames {
  const grouped: NhlGroupedGames = {
    firstround: { east: [], west: [] },
    secondround: { east: [], west: [] },
    confFinal: { east: [], west: [] },
    cupfinal: [],
  };
  for (const g of games) {
    const round = classifyNhlPostseasonStage(g.stage);
    if (round === "unknown") continue;
    if (round === "cupfinal") { grouped.cupfinal.push(g); continue; }
    const conf: "east" | "west" | null = eastTeamIds.has(g.homeTeam.id) || eastTeamIds.has(g.awayTeam.id) ? "east"
      : westTeamIds.has(g.homeTeam.id) || westTeamIds.has(g.awayTeam.id) ? "west" : null;
    if (!conf) continue;
    grouped[round][conf].push(g);
  }
  return grouped;
}

/** Builds the full, generic BracketData for one NHL season — same
 *  mode-decision contract as buildNflBracketData. */
export function buildNhlBracketData(params: {
  seasonLabel: string;
  mode: BracketMode;
  eastSeeds: NhlBracketSeedInput[];
  westSeeds: NhlBracketSeedInput[];
  postseasonGames: NhlBracketRealGame[];
  eastLabel?: string;
  westLabel?: string;
}): BracketData {
  const { seasonLabel, mode, eastSeeds, westSeeds, postseasonGames, eastLabel = "Eastern", westLabel = "Western" } = params;
  const eastTeamIds = new Set(eastSeeds.map((s) => s.teamId));
  const westTeamIds = new Set(westSeeds.map((s) => s.teamId));
  const grouped = groupNhlByRound(postseasonGames, eastTeamIds, westTeamIds);

  const firstround = [
    ...buildNhlFirstRound(eastSeeds, grouped.firstround.east, mode, eastLabel, "east"),
    ...buildNhlFirstRound(westSeeds, grouped.firstround.west, mode, westLabel, "west"),
  ];
  const secondround = [
    ...buildNhlSecondRound(eastSeeds, grouped.secondround.east, mode, eastLabel, "east"),
    ...buildNhlSecondRound(westSeeds, grouped.secondround.west, mode, westLabel, "west"),
  ];
  const confFinal = [
    ...buildNhlConfFinalRound(eastSeeds, grouped.confFinal.east, mode, eastLabel, "east"),
    ...buildNhlConfFinalRound(westSeeds, grouped.confFinal.west, mode, westLabel, "west"),
  ];
  const cupFinalRound = buildNhlStanleyCupRound(grouped.cupfinal[0] ?? null, [...eastSeeds, ...westSeeds], mode, eastLabel, westLabel);

  return {
    sportLabel: "NHL",
    seasonLabel,
    mode,
    headline: mode === "projected" ? "If the Playoffs Started Today" : `${seasonLabel} NHL Playoffs`,
    subhead: mode === "projected"
      ? "Projected seeding from current standings — the real top-3-per-division-plus-wild-cards field. First Round pairing here is an honest seed-based (1v8/2v7/3v6/4v5) approximation, not the real division-crossover rule, which needs per-division data this seeding doesn't expose. Not an official bracket."
      : "The official NHL playoff bracket — advances automatically as real results come in.",
    rounds: [
      { id: "firstround", label: "First Round", matchups: firstround },
      { id: "secondround", label: "Second Round", matchups: secondround },
      { id: "confFinal", label: "Conference Final", matchups: confFinal },
      cupFinalRound,
    ],
  };
}
