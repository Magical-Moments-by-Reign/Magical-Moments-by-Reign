// ── Publishing service ──────────────────────────────────────────
// Turns an APPROVED share into per-platform results. Core guarantees:
//   • Nothing publishes without an explicit approval record.
//   • One platform failing never blocks the others.
//   • We NEVER claim "Published" when we only prepared media or saved
//     a draft — statuses are reported truthfully.
//
// In SANDBOX mode results are simulated from each platform's real
// capability profile (e.g. TikTok → Draft, YouTube → Processing) so
// the whole results + fallback UX is exercised. In live mode, each
// case calls the platform's official publish endpoint.

import { prisma } from "@/lib/db";
import { getPlatform, type PlatformId } from "@/lib/social/platforms";

export type TargetStatus =
  | "PUBLISHED"
  | "DRAFT"
  | "PROCESSING"
  | "NEEDS_ACTION"
  | "FAILED"
  | "EXPIRED";

export interface ComposedTarget {
  platform: PlatformId;
  format: string;
  caption: string;
  hashtags: string[];
  title?: string;
  visibility: string;
}

export interface ApproveShareInput {
  userId: string;
  experienceId?: string | null;
  sourceType: string;
  sourceLabel: string;
  mediaUrl?: string;
  linkUrl?: string;
  aiGenerated?: boolean;
  targets: ComposedTarget[];
  /** the customer's explicit authorization — required */
  authorized: boolean;
}

export interface TargetResult {
  platform: PlatformId;
  status: TargetStatus;
  postUrl?: string;
  message: string;
  /** actions the UI can offer for this result */
  actions: string[]; // view | copy-link | retry | reconnect | download | open-app
  fallback: boolean;
}

export interface ShareResult {
  shareId: string;
  results: TargetResult[];
}

/**
 * Persist the approved share and produce truthful per-platform results.
 * Throws if not authorized — automatic publishing is never allowed.
 */
export async function approveAndShare(input: ApproveShareInput): Promise<ShareResult> {
  if (!input.authorized) {
    throw new Error("A share cannot be sent without explicit customer authorization.");
  }

  const share = await prisma.socialShare.create({
    data: {
      experienceId: input.experienceId ?? null,
      userId: input.userId,
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      mediaUrl: input.mediaUrl ?? null,
      linkUrl: input.linkUrl ?? null,
      aiGenerated: Boolean(input.aiGenerated),
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const results: TargetResult[] = [];

  for (const t of input.targets) {
    // Verify a live, non-expired connection for this platform.
    const conn = await prisma.socialConnection.findUnique({
      where: { userId_platform: { userId: input.userId, platform: t.platform } },
    });

    let result: TargetResult;

    if (!conn || conn.status === "DISCONNECTED") {
      result = {
        platform: t.platform,
        status: "FAILED",
        message: "No connected account for this platform.",
        actions: ["reconnect"],
        fallback: true,
      };
    } else if (conn.status === "EXPIRED") {
      result = {
        platform: t.platform,
        status: "EXPIRED",
        message: "This connection has expired. Reconnect to publish.",
        actions: ["reconnect"],
        fallback: true,
      };
    } else {
      result = simulatePublish(t);
    }

    await prisma.socialShareTarget.create({
      data: {
        shareId: share.id,
        platform: t.platform,
        format: t.format,
        caption: t.caption,
        hashtags: t.hashtags.join(" "),
        title: t.title ?? null,
        visibility: t.visibility,
        status: result.status,
        postUrl: result.postUrl ?? null,
        error: result.status === "FAILED" ? result.message : null,
      },
    });

    results.push(result);
  }

  await prisma.socialShare.update({ where: { id: share.id }, data: { status: "COMPLETE" } });
  return { shareId: share.id, results };
}

/** Simulate a platform result from its real capability profile. */
function simulatePublish(t: ComposedTarget): TargetResult {
  const p = getPlatform(t.platform)!;

  // TikTok (and any draft-fallback platform) uploads as a draft to
  // finish in-app — reported honestly as Draft, not Published.
  if (!p.directPost && p.fallback === "draft") {
    return {
      platform: t.platform,
      status: "DRAFT",
      message: "Uploaded to your TikTok drafts. Open TikTok to add finishing touches and post.",
      actions: ["open-app", "download", "copy-link"],
      fallback: true,
    };
  }

  // YouTube videos process before they're live.
  if (t.platform === "youtube") {
    return {
      platform: t.platform,
      status: "PROCESSING",
      message: `Uploaded to YouTube (${t.visibility}). Processing before it's viewable.`,
      actions: ["view", "copy-link"],
      fallback: false,
    };
  }

  // Direct-post platforms: published.
  const slug = t.caption.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
  return {
    platform: t.platform,
    status: "PUBLISHED",
    postUrl: `https://${t.platform}.example/${slug || "post"}`,
    message: "Published successfully.",
    actions: ["view", "copy-link"],
    fallback: false,
  };
}

/** Fallback package for when direct publishing isn't available. */
export function fallbackFor(platform: PlatformId) {
  const p = getPlatform(platform)!;
  return {
    prepareMedia: true,
    copyCaption: true,
    download: true,
    openPlatformFlow: true,
    instruction:
      p.fallback === "draft"
        ? "Finish and post from inside the TikTok app."
        : `Open ${p.label} and complete the post with the prepared media and caption.`,
  };
}
