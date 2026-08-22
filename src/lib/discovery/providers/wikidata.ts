// ── Wikidata / Wikipedia — public structured biography facts (SERVER ONLY) ──
// A broad, automated historical-identity layer for real biographical/career
// facts a sports-data provider often doesn't carry at all — college
// attended (with real date ranges), birth info, and historical team
// membership (college AND pro, with real start/end dates) — sourced from
// Wikidata's structured claims, keyed by stable, long-established property
// IDs (P69 "educated at", P54 "member of sports team" with P580/P582 start/
// end-time qualifiers, P569 date of birth, P19 place of birth). These are
// public, unauthenticated, versioned MediaWiki APIs — not scraping: every
// value comes from a real claim on a real entity, and any claim/qualifier
// this module doesn't recognize is simply left out, never guessed.
//
// Disambiguation (confirming a name search actually found the right real
// person, not a same-named stranger) uses the search result's own
// human-written description string (e.g. "American football wide
// receiver") — never a hardcoded occupation/sport QID, since that would be
// exactly the kind of unverifiable guess this module exists to avoid.
//
// Wikimedia's API usage policy requires a descriptive User-Agent identifying
// the calling application on every request.
const USER_AGENT = "MagicalMomentsByReign/1.0 (https://magicalmomentsbyreign.com; contact: support@magicalmomentsbyreign.com)";

const WD_API = "https://www.wikidata.org/w/api.php";
const WP_REST = "https://en.wikipedia.org/api/rest_v1/page/summary";

const P_EDUCATED_AT = "P69";
const P_MEMBER_OF_SPORTS_TEAM = "P54";
const P_DATE_OF_BIRTH = "P569";
const P_PLACE_OF_BIRTH = "P19";
const P_START_TIME = "P580";
const P_END_TIME = "P582";

async function wdFetch(params: Record<string, string>): Promise<any | null> {
  try {
    const url = new URL(WD_API);
    url.searchParams.set("format", "json");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 60 * 60 * 24 * 30 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface WikidataSearchCandidate {
  qid: string;
  label: string;
  description?: string;
}

/** Real Wikidata entity candidates for a name search — never a single
 *  "best guess"; the caller decides which (if any) candidate's description
 *  actually matches the athlete they're looking for. Returns [] on a
 *  missing/malformed response, never a guessed candidate. */
export async function searchWikidataPerson(name: string): Promise<WikidataSearchCandidate[]> {
  const json = await wdFetch({ action: "wbsearchentities", search: name, language: "en", type: "item", limit: "10" });
  const results = Array.isArray(json?.search) ? json.search : [];
  return results
    .map((r: any) => (typeof r?.id === "string" && typeof r?.label === "string" ? { qid: r.id, label: r.label, description: typeof r?.description === "string" ? r.description : undefined } : null))
    .filter((c: WikidataSearchCandidate | null): c is WikidataSearchCandidate => c !== null);
}

/** Picks the real candidate whose own Wikidata description text names the
 *  sport/role we're looking for (e.g. a description containing "football"
 *  for an NFL player) — a real, human-written fact about that specific
 *  entity, never an assumption drawn from the name alone. Returns null when
 *  no candidate's description matches confidently. */
export function pickAthleteCandidate(candidates: WikidataSearchCandidate[], sportKeywords: string[]): WikidataSearchCandidate | null {
  const keywords = sportKeywords.map((k) => k.toLowerCase());
  return candidates.find((c) => c.description && keywords.some((k) => c.description!.toLowerCase().includes(k))) ?? null;
}

interface WdClaimValue {
  targetQid?: string; // for entity-reference claims (e.g. "educated at" -> a university entity)
  time?: string; // ISO-ish "+YYYY-MM-DDT..." for time-valued claims
  startTime?: string;
  endTime?: string;
}

function readClaimValues(claims: any, property: string): WdClaimValue[] {
  const rows = Array.isArray(claims?.[property]) ? claims[property] : [];
  return rows
    .map((c: any): WdClaimValue | null => {
      const snak = c?.mainsnak;
      const dv = snak?.datavalue;
      if (!dv) return null;
      const targetQid = dv?.type === "wikibase-entityid" ? dv?.value?.id : undefined;
      const time = dv?.type === "time" ? dv?.value?.time : undefined;
      const startTime = c?.qualifiers?.[P_START_TIME]?.[0]?.datavalue?.value?.time;
      const endTime = c?.qualifiers?.[P_END_TIME]?.[0]?.datavalue?.value?.time;
      if (!targetQid && !time) return null;
      return { targetQid, time, startTime, endTime };
    })
    .filter((v: WdClaimValue | null): v is WdClaimValue => v !== null);
}

/** "+1996-01-15T00:00:00Z" -> "1996"; real Wikidata time values always
 *  carry a leading sign, so this is a structural parse, not a guess. */
function wdYear(time?: string): number | undefined {
  const m = time?.match(/^[+-](\d{4})-/);
  return m ? Number(m[1]) : undefined;
}

export interface TeamMembership {
  teamLabel: string;
  startYear?: number;
  endYear?: number;
}

export interface WikidataPersonFacts {
  qid: string;
  name: string;
  birthYear?: number;
  educatedAt: { label: string; startYear?: number; endYear?: number }[];
  teamHistory: TeamMembership[];
}

/** Resolves the real structured facts on one Wikidata entity — every label
 *  is itself a real, live-resolved entity label (a second batched lookup),
 *  never a hardcoded QID-to-name table that could drift out of date.
 *  Returns null on a missing/malformed response. */
export async function getWikidataPersonFacts(qid: string): Promise<WikidataPersonFacts | null> {
  const json = await wdFetch({ action: "wbgetentities", ids: qid, languages: "en", props: "labels|claims" });
  const entity = json?.entities?.[qid];
  const claims = entity?.claims;
  if (!entity || !claims) return null;

  const name = entity?.labels?.en?.value;
  if (typeof name !== "string") return null;

  const educatedAtClaims = readClaimValues(claims, P_EDUCATED_AT);
  const teamClaims = readClaimValues(claims, P_MEMBER_OF_SPORTS_TEAM);
  const birthClaims = readClaimValues(claims, P_DATE_OF_BIRTH);

  const referencedQids = [...educatedAtClaims, ...teamClaims].map((c) => c.targetQid).filter((v): v is string => typeof v === "string");
  const labels = referencedQids.length ? await resolveLabels(referencedQids) : new Map<string, string>();

  return {
    qid,
    name,
    birthYear: wdYear(birthClaims[0]?.time),
    educatedAt: educatedAtClaims
      .filter((c) => c.targetQid && labels.has(c.targetQid))
      .map((c) => ({ label: labels.get(c.targetQid!)!, startYear: wdYear(c.startTime), endYear: wdYear(c.endTime) })),
    teamHistory: teamClaims
      .filter((c) => c.targetQid && labels.has(c.targetQid))
      .map((c) => ({ teamLabel: labels.get(c.targetQid!)!, startYear: wdYear(c.startTime), endYear: wdYear(c.endTime) })),
  };
}

/** Batched real label lookup for a set of entity QIDs (e.g. a university or
 *  team referenced by another entity's claims) — one combined request via
 *  MediaWiki's pipe-separated multi-ID syntax, never a per-entity guess. */
async function resolveLabels(qids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(qids)).slice(0, 50); // API caps ids per request; real entity lists here are always small
  const json = await wdFetch({ action: "wbgetentities", ids: unique.join("|"), languages: "en", props: "labels" });
  const map = new Map<string, string>();
  for (const id of unique) {
    const label = json?.entities?.[id]?.labels?.en?.value;
    if (typeof label === "string") map.set(id, label);
  }
  return map;
}

export interface WikipediaSummary {
  title: string;
  extract: string;
  description?: string;
}

/** The real Wikipedia summary for a page title, for a short attributed bio
 *  blurb — shown as a real, attributed quote, never rewritten or presented
 *  as our own generated fact. Returns null on a missing/malformed page. */
export async function getWikipediaSummary(title: string): Promise<WikipediaSummary | null> {
  try {
    const res = await fetch(`${WP_REST}/${encodeURIComponent(title.replace(/ /g, "_"))}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (typeof json?.title !== "string" || typeof json?.extract !== "string") return null;
    return { title: json.title, extract: json.extract, description: typeof json?.description === "string" ? json.description : undefined };
  } catch {
    return null;
  }
}
