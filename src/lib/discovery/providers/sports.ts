// ── Sports — provider architecture (SERVER ONLY, no live adapter yet) ──
// No sports data provider has been selected/approved. This interface exists
// so a real adapter (scores, schedules, standings) can be added later without
// reshaping the Sports tab. Until then, isConfigured() is always false and
// the UI shows the honest "Live sports integration pending." state — never
// invented scores or standings. Ticket discovery for sporting events already
// works today through the Near You / Ticketmaster adapter (category "sports").

export interface SportsGame {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string; // ISO
  status: string; // "scheduled" | "final" | "live" | ...
  homeScore?: number;
  awayScore?: number;
}

export interface SportsProvider {
  readonly slug: string;
  readonly name: string;
  readonly attribution: string;
  isConfigured(): boolean;
  gamesToday(league?: string): Promise<SportsGame[] | null>;
}

export const PENDING_SPORTS_MESSAGE = "Live sports integration pending.";

/** Always unconfigured — a placeholder until a sports data provider is approved. */
export const SportsPendingProvider: SportsProvider = {
  slug: "pending",
  name: "Sports (pending)",
  attribution: "",
  isConfigured(): boolean {
    return false;
  },
  async gamesToday(): Promise<SportsGame[] | null> {
    return null;
  },
};
