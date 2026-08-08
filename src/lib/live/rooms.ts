// ── Magical Moments Live — room service (SERVER ONLY) ───────────
//
// Ownership-scoped lifecycle for live rooms. A room belongs to (accountId host
// + experienceId occasion). Every mutation is scoped by accountId so a member
// can only control their own rooms. Channel names are globally unique →
// hundreds of rooms run simultaneously in isolation.

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { channelNameFor, canTransition, type LiveStatus } from "./core";

export interface LiveRoomRecord {
  id: string;
  accountId: string;
  experienceId: string | null;
  channelName: string;
  title: string;
  status: LiveStatus;
  inviteCode: string;
  scheduledStart: Date | null;
  recordingUrl: string | null;
  settings: Record<string, unknown>;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function hydrate(row: any): LiveRoomRecord {
  let settings: Record<string, unknown> = {};
  try { settings = JSON.parse(row.settings || "{}"); } catch { settings = {}; }
  return { ...row, status: row.status as LiveStatus, settings };
}

/** Unguessable invite code, e.g. "K7Q2-9XVB". */
function newInviteCode(): string {
  const raw = randomBytes(6).toString("hex").toUpperCase(); // 12 hex chars
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export interface CreateRoomInput {
  accountId: string;
  experienceId?: string | null;
  title: string;
  scheduledStart?: Date | null;
  settings?: Record<string, unknown>;
}

/**
 * Create a live room the account owns. A globally-unique channel + invite code
 * are generated server-side. When experienceId is given it MUST belong to the
 * account (verified here) — you can't open a room on someone else's occasion.
 */
export async function createRoom(input: CreateRoomInput): Promise<LiveRoomRecord | null> {
  if (input.experienceId) {
    const owned = await prisma.experience.findFirst({ where: { id: input.experienceId, accountId: input.accountId }, select: { id: true } });
    if (!owned) return null; // not the account's occasion
  }
  const row = await prisma.liveRoom.create({
    data: {
      accountId: input.accountId,
      experienceId: input.experienceId ?? null,
      title: input.title,
      channelName: channelNameFor(randomBytes(16).toString("hex")),
      inviteCode: newInviteCode(),
      status: "SCHEDULED",
      scheduledStart: input.scheduledStart ?? null,
      settings: JSON.stringify(input.settings ?? { allowChat: true, allowReactions: true, allowScreenShare: true }),
    },
  });
  return hydrate(row);
}

/** A room by id (no ownership filter — used by the token route, which then
 *  applies the host/invite authorization from core.authorizeJoin). */
export async function getRoom(id: string): Promise<LiveRoomRecord | null> {
  const row = await prisma.liveRoom.findUnique({ where: { id } });
  return row ? hydrate(row) : null;
}

/** A room the account OWNS, or null. */
export async function getOwnedRoom(accountId: string, id: string): Promise<LiveRoomRecord | null> {
  const row = await prisma.liveRoom.findFirst({ where: { id, accountId } });
  return row ? hydrate(row) : null;
}

/** The account's rooms, newest first. */
export async function listRooms(accountId: string): Promise<LiveRoomRecord[]> {
  const rows = await prisma.liveRoom.findMany({ where: { accountId }, orderBy: { createdAt: "desc" } });
  return rows.map(hydrate);
}

/** An existing SCHEDULED/LIVE room for an occasion, if any (so Go Live reopens). */
export async function activeRoomForExperience(accountId: string, experienceId: string): Promise<LiveRoomRecord | null> {
  const row = await prisma.liveRoom.findFirst({
    where: { accountId, experienceId, status: { in: ["SCHEDULED", "LIVE"] } },
    orderBy: { createdAt: "desc" },
  });
  return row ? hydrate(row) : null;
}

/** Host transition, ownership-scoped + validated against legal transitions. */
export async function setStatus(accountId: string, id: string, to: LiveStatus): Promise<LiveRoomRecord | null> {
  const room = await getOwnedRoom(accountId, id);
  if (!room || !canTransition(room.status, to)) return null;
  const data: any = { status: to };
  if (to === "LIVE") data.startedAt = new Date();
  if (to === "ENDED") data.endedAt = new Date();
  const row = await prisma.liveRoom.update({ where: { id }, data });
  return hydrate(row);
}
