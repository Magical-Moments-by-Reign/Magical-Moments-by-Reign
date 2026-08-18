"use server";

// ── Magical Discovery — Sports server actions ────────────────────
// Every action re-checks requireAccount() (or requireOwner() for the
// grading fallback) itself — never trusts that the page that rendered the
// form already gated it. No real-money wagering or cash betting is possible
// through any of these — a pick is a free-text choice, never a transaction.

import { revalidatePath } from "next/cache";
import { requireAccount, requireOwner } from "@/lib/guard";
import { followSport, followTeam, unfollow, submitPick, gradeGame, setFinalScore } from "@/lib/discovery/sports/service";
import { trackPlayer, untrackPlayer } from "@/lib/discovery/sports/tracked-players";
import type { SportSlug } from "@/lib/discovery/providers/sports";
import type { SdioLeague } from "@/lib/discovery/providers/sportsdata";

export async function followSportAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports");
  const sport = String(formData.get("sport") || "") as SportSlug;
  if (!sport) return;
  await followSport(account.id, sport);
  revalidatePath("/dashboard/discovery/sports");
}

export async function followTeamAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports");
  const sport = String(formData.get("sport") || "") as SportSlug;
  const league = String(formData.get("league") || "");
  const teamExternalId = String(formData.get("teamExternalId") || "");
  const teamName = String(formData.get("teamName") || "");
  const teamLogoUrl = String(formData.get("teamLogoUrl") || "") || undefined;
  if (!sport || !teamExternalId || !teamName) return;
  await followTeam(account.id, sport, league, teamExternalId, teamName, teamLogoUrl);
  revalidatePath("/dashboard/discovery/sports");
  revalidatePath("/dashboard/discovery/sports/my-teams");
}

export async function unfollowAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports");
  const followId = String(formData.get("followId") || "");
  if (!followId) return;
  await unfollow(account.id, followId);
  revalidatePath("/dashboard/discovery/sports");
  revalidatePath("/dashboard/discovery/sports/my-teams");
}

export async function submitPickAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports");
  const gameId = String(formData.get("gameId") || "");
  const teamPick = String(formData.get("teamPick") || "");
  if (!gameId || (teamPick !== "home" && teamPick !== "away")) return;
  await submitPick(account.id, gameId, teamPick);
  revalidatePath(`/dashboard/discovery/sports/game/${gameId}`);
  revalidatePath("/dashboard/discovery/sports/picks");
}

const SDIO_LEAGUES: SdioLeague[] = ["nfl", "cfb", "nba", "wnba"];

export async function trackPlayerAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports");
  const league = String(formData.get("league") || "");
  const playerId = String(formData.get("playerId") || "");
  const playerName = String(formData.get("playerName") || "");
  const team = formData.get("team") ? String(formData.get("team")) : undefined;
  const position = formData.get("position") ? String(formData.get("position")) : undefined;
  if (!SDIO_LEAGUES.includes(league as SdioLeague) || !playerId || !playerName) return;
  await trackPlayer(account.id, league as SdioLeague, playerId, playerName, team, position);
  revalidatePath("/dashboard/discovery/sports");
  revalidatePath("/dashboard/discovery");
}

export async function untrackPlayerAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports");
  const league = String(formData.get("league") || "");
  const playerId = String(formData.get("playerId") || "");
  if (!SDIO_LEAGUES.includes(league as SdioLeague) || !playerId) return;
  await untrackPlayer(account.id, league as SdioLeague, playerId);
  revalidatePath("/dashboard/discovery/sports");
  revalidatePath("/dashboard/discovery");
}

/** Manual grading fallback — Owner only. Automatic grading already runs
 *  whenever a live provider sync reports a game final; this covers an
 *  Owner-entered game or a provider outage where a score needs to be
 *  entered by hand so members' picks still resolve. */
export async function gradeGameAction(formData: FormData): Promise<void> {
  await requireOwner("/dashboard/discovery/admin");
  const gameId = String(formData.get("gameId") || "");
  if (!gameId) return;
  await gradeGame(gameId);
  revalidatePath(`/dashboard/discovery/sports/game/${gameId}`);
  revalidatePath("/dashboard/discovery/admin");
}

/** Owner enters a final score by hand — for an owner-curated matchup with
 *  no provider id, or when the live provider is unreachable. */
export async function enterFinalScoreAction(formData: FormData): Promise<void> {
  await requireOwner("/dashboard/discovery/admin");
  const gameId = String(formData.get("gameId") || "");
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  if (!gameId || !Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return;
  await setFinalScore(gameId, homeScore, awayScore);
  revalidatePath(`/dashboard/discovery/sports/game/${gameId}`);
  revalidatePath("/dashboard/discovery/admin");
}
