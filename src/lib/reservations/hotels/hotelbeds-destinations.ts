// ── Hotelbeds — destination resolution (SERVER ONLY) ────────────
//
// Turns a human destination ("Miami", "Birmingham, Alabama", "Paris") into a
// REAL Hotelbeds destination code before an availability request. The member
// never sees or enters a code.
//
// Source: Hotelbeds Content API /hotel-content-api/1.0/locations/destinations
// (real location records only). The catalog is large but stable, so it is
// cached server-side (24h) — repeated "Miami"/"Orlando" searches don't burn
// quota. All calls are server-side; credentials never reach the browser.
//
// HONESTY: we never invent a destination code. If nothing matches, the caller
// shows an honest "couldn't find that destination" message. If several real
// records match, the caller offers a choice — we never silently pick one.

import { hotelbedsBase, hotelbedsHeaders, verifyHotelbedsAuth, HotelbedsProvider } from "./hotelbeds";

export interface HotelbedsDestination {
  provider: "hotelbeds";
  code: string;
  name: string;
  country?: string;
  countryCode?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

let regionNames: Intl.DisplayNames | null = null;
function countryName(code?: string): string | undefined {
  if (!code) return undefined;
  try {
    regionNames = regionNames ?? new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Pure: map a raw Hotelbeds destination record → our shape. */
export function mapDestination(raw: any): HotelbedsDestination | null {
  const code = raw?.code;
  const name = raw?.name?.content ?? raw?.name;
  if (typeof code !== "string" || !code || typeof name !== "string" || !name) return null;
  // Some names embed the state, e.g. "Miami, FL". Keep the full name; surface a
  // region hint when a trailing token looks like a state/region.
  const parts = name.split(",").map((s: string) => s.trim());
  const region = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return {
    provider: "hotelbeds",
    code,
    name,
    countryCode: typeof raw?.countryCode === "string" ? raw.countryCode : undefined,
    country: countryName(typeof raw?.countryCode === "string" ? raw.countryCode : undefined),
    region,
    latitude: typeof raw?.coordinates?.latitude === "number" ? raw.coordinates.latitude : undefined,
    longitude: typeof raw?.coordinates?.longitude === "number" ? raw.coordinates.longitude : undefined,
  };
}

// US state abbreviation ↔ full name, so "Birmingham, Alabama" matches "…, AL".
const US_STATES: Record<string, string> = {
  al: "alabama", ak: "alaska", az: "arizona", ar: "arkansas", ca: "california", co: "colorado", ct: "connecticut", de: "delaware", fl: "florida", ga: "georgia", hi: "hawaii", id: "idaho", il: "illinois", in: "indiana", ia: "iowa", ks: "kansas", ky: "kentucky", la: "louisiana", me: "maine", md: "maryland", ma: "massachusetts", mi: "michigan", mn: "minnesota", ms: "mississippi", mo: "missouri", mt: "montana", ne: "nebraska", nv: "nevada", nh: "new hampshire", nj: "new jersey", nm: "new mexico", ny: "new york", nc: "north carolina", nd: "north dakota", oh: "ohio", ok: "oklahoma", or: "oregon", pa: "pennsylvania", ri: "rhode island", sc: "south carolina", sd: "south dakota", tn: "tennessee", tx: "texas", ut: "utah", vt: "vermont", va: "virginia", wa: "washington", wv: "west virginia", wi: "wisconsin", wy: "wyoming",
};
const STATE_NAME_TO_ABBR: Record<string, string> = Object.fromEntries(Object.entries(US_STATES).map(([a, n]) => [n, a]));

/** Append state aliases (both directions) so abbrev and full name both match. */
function withStateAliases(hay: string): string {
  let extra = "";
  for (const [abbr, name] of Object.entries(US_STATES)) {
    if (new RegExp(`(^|[\\s,])${abbr}([\\s,]|$)`).test(hay)) extra += ` ${name}`;
  }
  for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
    if (hay.includes(name)) extra += ` ${abbr}`;
  }
  return hay + extra;
}

/** Pure: rank real destinations against a human query. Never invents records. */
export function matchDestinations(all: HotelbedsDestination[], query: string, limit = 8): HotelbedsDestination[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/[\s,]+/).filter(Boolean);
  const primary = tokens[0];

  const scored = all.map((d) => {
    const name = d.name.toLowerCase();
    const cityPart = name.split(",")[0].trim();
    const hay = withStateAliases(`${name} ${(d.country ?? "").toLowerCase()} ${(d.region ?? "").toLowerCase()} ${(d.countryCode ?? "").toLowerCase()}`);
    let score = 0;
    if (cityPart === q || name === q) score = 100;
    else if (cityPart.startsWith(q) || name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (tokens.every((t) => hay.includes(t))) score = 45;
    else if (primary && cityPart.includes(primary)) score = 25;
    // Bonus when extra query tokens (state/country) also appear.
    if (score > 0 && tokens.length > 1 && tokens.slice(1).every((t) => hay.includes(t))) score += 10;
    return { d, score };
  }).filter((x) => x.score > 0);

  scored.sort((a, b) => b.score - a.score || a.d.name.length - b.d.name.length);
  return scored.slice(0, limit).map((x) => x.d);
}

// ── Cached catalog loader ───────────────────────────────────────

const PAGE = 1000;
const MAX_PAGES = 8; // bound the one-time load; cached afterwards
const TTL_MS = 24 * 60 * 60 * 1000; // destinations are stable → 24h cache

let cache: { at: number; data: HotelbedsDestination[] } | null = null;
let inflight: Promise<HotelbedsDestination[]> | null = null;

/** Load (and cache) the Hotelbeds destinations catalog. Server-side only. */
export async function loadAllDestinations(): Promise<HotelbedsDestination[]> {
  const nowMs = Date.now();
  if (cache && nowMs - cache.at < TTL_MS) return cache.data;
  if (inflight) return inflight;

  inflight = (async () => {
    const headers = hotelbedsHeaders();
    if (!headers) return [];
    const out: HotelbedsDestination[] = [];
    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE + 1;
        const to = from + PAGE - 1;
        const res = await fetch(`${hotelbedsBase()}/hotel-content-api/1.0/locations/destinations?fields=all&language=ENG&from=${from}&to=${to}`, { headers });
        if (!res.ok) break;
        const data = await res.json();
        const list = Array.isArray(data?.destinations) ? data.destinations : [];
        for (const raw of list) {
          const d = mapDestination(raw);
          if (d) out.push(d);
        }
        if (list.length < PAGE) break; // reached the end
      }
      if (out.length > 0) cache = { at: Date.now(), data: out };
      return out;
    } catch {
      return cache?.data ?? [];
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Resolve a human destination into real Hotelbeds records (0, 1, or many). */
export async function searchDestinations(query: string, limit = 8): Promise<HotelbedsDestination[]> {
  const all = await loadAllDestinations();
  return matchDestinations(all, query, limit);
}

/** Look up a single destination by its exact code (from the cached catalog). */
export async function destinationByCode(code: string): Promise<HotelbedsDestination | null> {
  const all = await loadAllDestinations();
  return all.find((d) => d.code.toLowerCase() === code.toLowerCase()) ?? null;
}

// ── End-to-end readiness (gates the LIVE label) ─────────────────

export interface ReadinessStep { name: string; ok: boolean; detail: string }
export interface HotelbedsReadiness {
  /** "LIVE" only when auth + destination + availability + content all pass. */
  label: "LIVE" | "TEST / CONNECTING" | "NOT CONFIGURED";
  steps: ReadinessStep[];
}

function isoPlusDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Verify the full live path end-to-end: authentication → destination lookup →
 * real availability → hotel content. Only when all four succeed do we call
 * Hotelbeds LIVE. Runs server-side; never throws.
 */
export async function verifyHotelbedsReadiness(probe = "Miami"): Promise<HotelbedsReadiness> {
  const steps: ReadinessStep[] = [];
  if (!hotelbedsHeaders()) {
    return { label: "NOT CONFIGURED", steps: [{ name: "Credentials", ok: false, detail: "HOTELBEDS_API_KEY / HOTELBEDS_SECRET are not set." }] };
  }

  const auth = await verifyHotelbedsAuth();
  steps.push({ name: "Authentication", ok: auth.ok, detail: auth.message });
  if (!auth.ok) return { label: "TEST / CONNECTING", steps };

  const dests = await searchDestinations(probe, 5).catch(() => []);
  const dest = dests[0];
  steps.push({ name: "Destination lookup", ok: !!dest, detail: dest ? `"${probe}" → ${dest.name} (${dest.code})` : `No Hotelbeds destination resolved for "${probe}".` });
  if (!dest) return { label: "TEST / CONNECTING", steps };

  const avail = await HotelbedsProvider.search({ location: probe, destinationCode: dest.code, checkIn: isoPlusDays(30), checkOut: isoPlusDays(32), guests: 2, rooms: 1 }).catch(() => null);
  const availOk = !!avail && !avail.sample;
  steps.push({ name: "Availability", ok: availOk, detail: avail ? `${avail.total} hotel(s) returned for ${dest.name}.` : "Availability request did not return a live response." });
  if (!availOk) return { label: "TEST / CONNECTING", steps };

  const firstId = avail!.hotels[0]?.id;
  const content = firstId ? await HotelbedsProvider.details(firstId).catch(() => null) : null;
  const contentOk = !!content;
  steps.push({ name: "Hotel content", ok: contentOk, detail: content ? `Content retrieved for ${content.name}.` : (firstId ? "Content request failed." : "No hotel available to fetch content for.") });

  return { label: contentOk ? "LIVE" : "TEST / CONNECTING", steps };
}
