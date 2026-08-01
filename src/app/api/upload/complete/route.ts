// POST /api/upload/complete
// Records a MediaAsset after the browser finished uploading directly to
// storage. Re-checks the allowance so a client can't over-fill storage.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAsset, getUsage, resolvePlanForExperience } from "@/lib/media";
import { checkUpload } from "@/lib/media-limits";

export async function POST(request: Request) {
  let body: {
    experienceId?: string;
    kind?: "IMAGE" | "VIDEO";
    url?: string;
    storagePath?: string;
    bytes?: number;
    mime?: string;
    caption?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { experienceId, kind, url, storagePath, bytes, mime } = body;
  if (!experienceId || !kind || !url || !bytes) {
    return NextResponse.json({ error: "experienceId, kind, url and bytes are required." }, { status: 400 });
  }

  const exp = await prisma.experience.findUnique({ where: { id: experienceId }, select: { id: true } });
  if (!exp) return NextResponse.json({ error: "Experience not found." }, { status: 404 });

  const planId = await resolvePlanForExperience(experienceId);
  const usage = await getUsage(experienceId);
  const usedBytes = kind === "VIDEO" ? usage.videoBytes : usage.photoBytes;
  const check = checkUpload({ planId, mime: mime || (kind === "VIDEO" ? "video/mp4" : "image/jpeg"), sizeBytes: bytes, usedBytes });
  if (!check.ok) {
    return NextResponse.json({ error: check.message, reason: check.reason, suggestedPlan: check.suggestedPlan }, { status: 413 });
  }

  const asset = await createAsset({
    experienceId,
    kind,
    url,
    storagePath,
    bytes,
    caption: body.caption,
  });
  return NextResponse.json({ id: asset.id, url: asset.url, kind: asset.kind, bytes: asset.bytes }, { status: 201 });
}
