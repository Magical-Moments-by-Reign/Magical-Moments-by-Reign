// ── Family share links ──────────────────────────────────────────
// Curated, private links exposing only the experiences the owner
// selects — with optional password, expiry, view cap, and per-link
// permissions. Nothing outside the selection is ever revealed.

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export const SHARE_ROLES = [
  "guest", "friend", "family", "spouse", "parent", "grandparent", "child", "vendor", "public",
] as const;

function hashPassword(pw: string): string {
  return createHash("sha256").update(`mmr-share:${pw}`).digest("hex");
}

function newToken(): string {
  return randomBytes(9).toString("base64url"); // ~12 url-safe chars
}

export interface CreateShareInput {
  title?: string;
  ownerId?: string;
  includeAll?: boolean;
  experienceIds: string[];
  password?: string;
  expiresInDays?: number | null;
  maxViews?: number | null;
  allowDownload?: boolean;
  allowComments?: boolean;
  allowGuestbook?: boolean;
  role?: string;
  now?: Date; // caller supplies (Date.now is unavailable in some contexts)
}

export async function createShareLink(input: CreateShareInput) {
  const now = input.now ?? new Date();
  const expiresAt = input.expiresInDays
    ? new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = newToken();
    const exists = await prisma.shareLink.findUnique({ where: { token }, select: { id: true } });
    if (exists) continue;
    return prisma.shareLink.create({
      data: {
        token,
        title: input.title?.trim() || null,
        ownerId: input.ownerId ?? null,
        includeAll: Boolean(input.includeAll),
        experienceIds: JSON.stringify(input.includeAll ? [] : input.experienceIds),
        passwordHash: input.password ? hashPassword(input.password) : null,
        expiresAt,
        maxViews: input.maxViews ?? null,
        allowDownload: Boolean(input.allowDownload),
        allowComments: Boolean(input.allowComments),
        allowGuestbook: Boolean(input.allowGuestbook),
        role: input.role && (SHARE_ROLES as readonly string[]).includes(input.role) ? input.role : "guest",
      },
    });
  }
  throw new Error("Could not generate a unique share link. Please try again.");
}

export async function getShareByToken(token: string) {
  return prisma.shareLink.findUnique({ where: { token } });
}

export type ShareAccess =
  | { ok: true }
  | { ok: false; reason: "expired" | "maxviews" | "password"; };

export function checkShareAccess(
  link: { expiresAt: Date | null; maxViews: number | null; viewCount: number; passwordHash: string | null },
  password: string | undefined,
  now: Date,
): ShareAccess {
  if (link.expiresAt && now > link.expiresAt) return { ok: false, reason: "expired" };
  if (link.maxViews != null && link.viewCount >= link.maxViews) return { ok: false, reason: "maxviews" };
  if (link.passwordHash) {
    if (!password || hashPassword(password) !== link.passwordHash) return { ok: false, reason: "password" };
  }
  return { ok: true };
}

export async function recordShareView(id: string) {
  await prisma.shareLink.update({ where: { id }, data: { viewCount: { increment: 1 } } });
}

/** The experiences a link exposes (owner's selection, or all owner's). */
export async function resolveSharedExperiences(link: { includeAll: boolean; experienceIds: string; ownerId: string | null }) {
  if (link.includeAll) {
    return prisma.experience.findMany({
      where: link.ownerId ? { ownerId: link.ownerId } : {},
      orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
    });
  }
  let ids: string[] = [];
  try { ids = JSON.parse(link.experienceIds); } catch { ids = []; }
  if (!ids.length) return [];
  const rows = await prisma.experience.findMany({
    where: { id: { in: ids } },
    orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
  });
  return rows;
}
