"use server";

// ── Fantasy Football — server actions ────────────────────────────
// Every action re-checks requireAccount() itself, and every write in the
// service layer beneath these re-validates ownership/turn order server-
// side — never trusts that the page that rendered the form already gated
// it. Same discipline as the Sports actions this feature sits next to.

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/guard";
import {
  createFantasyLeague,
  joinFantasyLeagueByCode,
  startFantasyDraft,
  draftPlayer,
  setLineupSlot,
  syncFantasyWeekScores,
  dropPlayer,
  submitWaiverClaim,
  processWaivers,
  proposeTrade,
  respondToTrade,
  vetoTrade,
  seedFantasyPlayoffs,
  syncFantasyPlayoffRound,
} from "@/lib/discovery/sports/fantasy-service";

export async function createFantasyLeagueAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const name = String(formData.get("name") || "").trim();
  const teamName = String(formData.get("teamName") || "").trim();
  const season = new Date().getFullYear();
  const playoffTeams = Number(formData.get("playoffTeams")) || 4;
  const regularSeasonWeeks = Number(formData.get("regularSeasonWeeks")) || 14;
  if (!name || !teamName) return;
  await createFantasyLeague(account.id, name.slice(0, 60), season, teamName.slice(0, 40), playoffTeams, regularSeasonWeeks);
  revalidatePath("/dashboard/discovery/sports/fantasy");
}

export async function joinFantasyLeagueAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const code = String(formData.get("code") || "");
  const teamName = String(formData.get("teamName") || "").trim();
  if (!code || !teamName) return;
  await joinFantasyLeagueByCode(account.id, code, teamName.slice(0, 40));
  revalidatePath("/dashboard/discovery/sports/fantasy");
}

export async function startFantasyDraftAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  if (!leagueId) return;
  await startFantasyDraft(account.id, leagueId);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function draftPlayerAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  const playerId = String(formData.get("playerId") || "");
  if (!leagueId || !playerId) return;
  await draftPlayer(account.id, leagueId, playerId);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function setLineupSlotAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  const teamId = String(formData.get("teamId") || "");
  const playerId = String(formData.get("playerId") || "");
  const slot = String(formData.get("slot") || "");
  if (!leagueId || !teamId || !playerId || !slot) return;
  await setLineupSlot(account.id, teamId, playerId, slot);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function syncFantasyWeekScoresAction(formData: FormData): Promise<void> {
  await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  const week = Number(formData.get("week"));
  if (!leagueId || !Number.isFinite(week)) return;
  await syncFantasyWeekScores(leagueId, week);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function dropPlayerAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  const teamId = String(formData.get("teamId") || "");
  const playerId = String(formData.get("playerId") || "");
  if (!leagueId || !teamId || !playerId) return;
  await dropPlayer(account.id, teamId, playerId);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function submitWaiverClaimAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  const teamId = String(formData.get("teamId") || "");
  const addPlayerId = String(formData.get("addPlayerId") || "");
  const dropPlayerId = String(formData.get("dropPlayerId") || "") || undefined;
  if (!leagueId || !teamId || !addPlayerId) return;
  await submitWaiverClaim(account.id, teamId, addPlayerId, dropPlayerId);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function processWaiversAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  if (!leagueId) return;
  await processWaivers(account.id, leagueId);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function proposeTradeAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  const proposerTeamId = String(formData.get("proposerTeamId") || "");
  const recipientTeamId = String(formData.get("recipientTeamId") || "");
  const proposerPlayerIds = formData.getAll("proposerPlayerIds").map(String).filter(Boolean);
  const recipientPlayerIds = formData.getAll("recipientPlayerIds").map(String).filter(Boolean);
  if (!leagueId || !proposerTeamId || !recipientTeamId) return;
  await proposeTrade(account.id, leagueId, proposerTeamId, recipientTeamId, proposerPlayerIds, recipientPlayerIds);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function respondToTradeAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  const tradeId = String(formData.get("tradeId") || "");
  const accept = formData.get("accept") === "true";
  if (!leagueId || !tradeId) return;
  await respondToTrade(account.id, tradeId, accept);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function vetoTradeAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  const tradeId = String(formData.get("tradeId") || "");
  if (!leagueId || !tradeId) return;
  await vetoTrade(account.id, tradeId);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function seedFantasyPlayoffsAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  if (!leagueId) return;
  await seedFantasyPlayoffs(account.id, leagueId);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}

export async function syncFantasyPlayoffRoundAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const leagueId = String(formData.get("leagueId") || "");
  const round = Number(formData.get("round"));
  if (!leagueId || !Number.isFinite(round)) return;
  await syncFantasyPlayoffRound(account.id, leagueId, round);
  revalidatePath(`/dashboard/discovery/sports/fantasy/${leagueId}`);
}
