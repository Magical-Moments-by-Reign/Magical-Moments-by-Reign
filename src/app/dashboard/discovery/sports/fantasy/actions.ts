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
} from "@/lib/discovery/sports/fantasy-service";

export async function createFantasyLeagueAction(formData: FormData): Promise<void> {
  const account = await requireAccount("/dashboard/discovery/sports/fantasy");
  const name = String(formData.get("name") || "").trim();
  const teamName = String(formData.get("teamName") || "").trim();
  const season = new Date().getFullYear();
  if (!name || !teamName) return;
  await createFantasyLeague(account.id, name.slice(0, 60), season, teamName.slice(0, 40));
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
