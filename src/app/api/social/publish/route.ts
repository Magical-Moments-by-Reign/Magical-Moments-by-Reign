// POST /api/social/publish
// Sends an APPROVED share to the selected platforms and returns
// truthful per-platform results. Requires explicit authorization.

import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { approveAndShare, type ComposedTarget } from "@/lib/social/publish";
import { getPlatform, type PlatformId } from "@/lib/social/platforms";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.authorized !== true) {
    return NextResponse.json(
      { error: "Explicit authorization is required before sending." },
      { status: 400 },
    );
  }

  const rawTargets = Array.isArray(body.targets) ? body.targets : [];
  const targets: ComposedTarget[] = rawTargets
    .filter((t: Record<string, unknown>) => getPlatform(String(t.platform)))
    .map((t: Record<string, unknown>) => ({
      platform: String(t.platform) as PlatformId,
      format: String(t.format || "feed"),
      caption: String(t.caption || ""),
      hashtags: Array.isArray(t.hashtags) ? t.hashtags.map(String) : [],
      title: t.title ? String(t.title) : undefined,
      visibility: String(t.visibility || "public"),
    }));

  if (!targets.length) {
    return NextResponse.json({ error: "No valid platforms to publish to." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  const result = await approveAndShare({
    userId,
    experienceId: body.experienceId ? String(body.experienceId) : null,
    sourceType: String(body.sourceType || "update"),
    sourceLabel: String(body.sourceLabel || "A new update"),
    mediaUrl: body.mediaUrl ? String(body.mediaUrl) : undefined,
    linkUrl: body.linkUrl ? String(body.linkUrl) : undefined,
    aiGenerated: Boolean(body.aiGenerated),
    targets,
    authorized: true,
  });

  return NextResponse.json(result);
}
