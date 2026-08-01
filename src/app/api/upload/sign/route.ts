// POST /api/upload/sign
// Validates a proposed upload against the experience's plan allowance,
// then (if storage is configured) returns a one-time signed URL the
// browser uses to upload the file DIRECTLY to storage. Large files
// never pass through this function.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUsage, resolvePlanForExperience } from "@/lib/media";
import { checkUpload, kindOf } from "@/lib/media-limits";
import { storageConfigured, createSignedUpload, buildPath } from "@/lib/storage";

export async function POST(request: Request) {
  let body: { experienceId?: string; name?: string; type?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { experienceId, name, type, size } = body;
  if (!experienceId || !name || !type || !size) {
    return NextResponse.json({ error: "experienceId, name, type and size are required." }, { status: 400 });
  }

  const exp = await prisma.experience.findUnique({ where: { id: experienceId }, select: { id: true } });
  if (!exp) return NextResponse.json({ error: "Experience not found." }, { status: 404 });

  const planId = await resolvePlanForExperience(experienceId);
  const kind = kindOf(type);
  const usage = await getUsage(experienceId);
  const usedBytes = kind === "VIDEO" ? usage.videoBytes : usage.photoBytes;

  // Server-authoritative allowance check.
  const check = checkUpload({ planId, mime: type, sizeBytes: size, usedBytes });
  if (!check.ok) {
    return NextResponse.json(
      { error: check.message, reason: check.reason, suggestedPlan: check.suggestedPlan, planId },
      { status: 413 },
    );
  }

  if (!storageConfigured()) {
    return NextResponse.json(
      {
        error: "Uploads aren't switched on yet. Add Supabase Storage credentials to enable them.",
        code: "STORAGE_NOT_CONFIGURED",
      },
      { status: 501 },
    );
  }

  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const path = buildPath(experienceId, name, unique);
  try {
    const signed = await createSignedUpload(path);
    return NextResponse.json({ ...signed, kind });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
