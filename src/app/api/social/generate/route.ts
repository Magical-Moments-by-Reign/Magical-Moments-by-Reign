// POST /api/social/generate
// Ask Magical prepares platform-optimized content (captions, hashtags,
// titles, CTA, link) for the selected platforms. Preparation only —
// nothing is published here.

import { NextResponse } from "next/server";
import { generateSocialContent, type ShareSource } from "@/lib/social/content-engine";
import { getPlatform, type PlatformId } from "@/lib/social/platforms";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const platforms = Array.isArray(body.platforms)
    ? (body.platforms.filter((p) => getPlatform(String(p))) as PlatformId[])
    : [];
  if (!platforms.length) {
    return NextResponse.json({ error: "Select at least one connected platform." }, { status: 400 });
  }

  const src: ShareSource = {
    experienceTitle: String(body.experienceTitle || "Your Magical Moment"),
    experienceType: String(body.experienceType || "wedding"),
    experienceUrl: String(body.experienceUrl || "https://magicalmomentsbyreign.com/"),
    sourceType: String(body.sourceType || "update"),
    sourceLabel: String(body.sourceLabel || "A new update"),
    aiGenerated: Boolean(body.aiGenerated),
  };

  const content = await generateSocialContent(src, platforms);
  return NextResponse.json({ content });
}
