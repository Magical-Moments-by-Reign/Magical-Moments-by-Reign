import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Production health probe. Reports only safe status — never keys, URLs, or
// credentials — and never throws: every check degrades to a boolean/string so
// the probe itself can't take the site down. Use it to confirm what's wired.
export async function GET() {
  const commit = process.env.COMMIT_REF || process.env.COMMIT_SHA || null; // Netlify sets COMMIT_REF

  let database: "reachable" | "unreachable" = "unreachable";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "reachable";
  } catch { database = "unreachable"; }

  const configured = (v: unknown) => (v ? "configured" : "not_configured");

  return NextResponse.json(
    {
      app: "online",
      commit: commit ? commit.slice(0, 7) : "unknown",
      database,
      qwen: configured(process.env.QWEN_API_KEY),
      journeyStudio: configured(process.env.OPENAI_API_KEY),
      duffel: configured(process.env.DUFFEL_ACCESS_TOKEN),
      premiumVoice: configured(process.env.ELEVENLABS_API_KEY || process.env.OPENAI_API_KEY),
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
