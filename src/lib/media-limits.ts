// ── Per-package media allowances ────────────────────────────────
// Every plan includes photos AND videos. Counts are unlimited within
// the plan's storage allowance; what scales by tier is the per-file
// size cap and the total storage. When an upload is too large for the
// customer's package, we recommend the smallest package that fits.

import { PLANS, type PlanId } from "@/lib/plans";

export type MediaKind = "IMAGE" | "VIDEO";

export interface PlanMedia {
  planId: PlanId;
  maxPhotoMB: number; // per-file cap for a photo
  maxVideoMB: number; // per-file cap for a video
  photoStorageGB: number; // total photo storage
  videoStorageGB: number; // total video storage
}

// Storage totals mirror the pricing comparison matrix. Per-file caps
// scale with the tier so bigger films need a bigger package.
export const PLAN_MEDIA: Record<PlanId, PlanMedia> = {
  silver: { planId: "silver", maxPhotoMB: 25, maxVideoMB: 150, photoStorageGB: 2, videoStorageGB: 1 },
  gold: { planId: "gold", maxPhotoMB: 50, maxVideoMB: 750, photoStorageGB: 15, videoStorageGB: 10 },
  diamond: { planId: "diamond", maxPhotoMB: 100, maxVideoMB: 2048, photoStorageGB: 75, videoStorageGB: 50 },
  lifetime: { planId: "lifetime", maxPhotoMB: 200, maxVideoMB: 5120, photoStorageGB: 250, videoStorageGB: 200 },
};

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;
const ORDER: PlanId[] = ["silver", "gold", "diamond", "lifetime"];

export function planMedia(planId: PlanId): PlanMedia {
  return PLAN_MEDIA[planId] ?? PLAN_MEDIA.silver;
}

export function kindOf(mime: string): MediaKind {
  return mime.startsWith("video/") ? "VIDEO" : "IMAGE";
}

export function perFileCapMB(planId: PlanId, kind: MediaKind): number {
  const m = planMedia(planId);
  return kind === "VIDEO" ? m.maxVideoMB : m.maxPhotoMB;
}

export function storageCapGB(planId: PlanId, kind: MediaKind): number {
  const m = planMedia(planId);
  return kind === "VIDEO" ? m.videoStorageGB : m.photoStorageGB;
}

export interface UploadCheck {
  ok: boolean;
  reason?: "file-too-large" | "file-too-large-max" | "storage-full" | "storage-full-max" | "bad-type";
  message?: string;
  suggestedPlan?: PlanId; // the smallest plan that would accept it
}

/** Smallest plan whose per-file cap for `kind` fits `sizeBytes`. */
function smallestPlanForFile(kind: MediaKind, sizeBytes: number): PlanId | undefined {
  return ORDER.find((p) => sizeBytes <= perFileCapMB(p, kind) * MB);
}

/** Smallest plan whose storage for `kind` fits `neededBytes` total. */
function smallestPlanForStorage(kind: MediaKind, neededBytes: number): PlanId | undefined {
  return ORDER.find((p) => neededBytes <= storageCapGB(p, kind) * GB);
}

function planName(id: PlanId): string {
  return PLANS.find((p) => p.id === id)?.name ?? id;
}

export function humanSize(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Server-authoritative check. `usedBytes` is the customer's current
 * usage for this kind (photos or videos).
 */
export function checkUpload(params: {
  planId: PlanId;
  mime: string;
  sizeBytes: number;
  usedBytes: number;
}): UploadCheck {
  const kind = kindOf(params.mime);
  if (!params.mime.startsWith("image/") && !params.mime.startsWith("video/")) {
    return { ok: false, reason: "bad-type", message: "Only photo and video files can be uploaded." };
  }

  const capBytes = perFileCapMB(params.planId, kind) * MB;
  if (params.sizeBytes > capBytes) {
    const suggested = smallestPlanForFile(kind, params.sizeBytes);
    const noun = kind === "VIDEO" ? "video" : "photo";
    if (!suggested) {
      return {
        ok: false,
        reason: "file-too-large-max",
        message: `This ${noun} is ${humanSize(params.sizeBytes)} — larger than we can accept even on our top package. Please contact us and we'll help with files of this size.`,
      };
    }
    return {
      ok: false,
      reason: "file-too-large",
      suggestedPlan: suggested,
      message: `This ${noun} is ${humanSize(params.sizeBytes)}. Your package allows ${noun}s up to ${perFileCapMB(params.planId, kind)} MB. Upgrade to ${planName(suggested)} to upload ${noun}s of this size.`,
    };
  }

  const needed = params.usedBytes + params.sizeBytes;
  const storeBytes = storageCapGB(params.planId, kind) * GB;
  if (needed > storeBytes) {
    const suggested = smallestPlanForStorage(kind, needed);
    const noun = kind === "VIDEO" ? "video" : "photo";
    if (!suggested) {
      return {
        ok: false,
        reason: "storage-full-max",
        message: `This would exceed even our largest ${noun} storage. You can add more storage from the pricing page, or contact us.`,
      };
    }
    return {
      ok: false,
      reason: "storage-full",
      suggestedPlan: suggested,
      message: `You've reached your ${noun} storage limit. Upgrade to ${planName(suggested)} for more room, or add storage from the pricing page.`,
    };
  }

  return { ok: true };
}
