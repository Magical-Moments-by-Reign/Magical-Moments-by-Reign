import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Owner-only: list the ElevenLabs voices available to THIS account, straight from
// the provider. This both proves the key is valid at runtime and returns real
// voice ids to assign — no guessing. The key is never returned to the client.
async function isOwner(accountId: string): Promise<boolean> {
  try {
    const a = await prisma.account.findUnique({ where: { id: accountId }, select: { staffRoles: true } });
    return (JSON.parse(a?.staffRoles || "[]") as unknown[]).includes("owner");
  } catch { return false; }
}

// Map an ElevenLabs HTTP status to a clear, safe message (no key exposure).
function reason(status: number): string {
  if (status === 401 || status === 403) return "Invalid key or permission issue (401/403).";
  if (status === 402) return "Insufficient credits on the ElevenLabs plan (402).";
  if (status === 404) return "Not found (404).";
  if (status === 429) return "Rate or quota limit reached (429).";
  return `Provider error (${status}).`;
}

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!(await isOwner(account.id))) return NextResponse.json({ error: "Owner only." }, { status: 403 });

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ ok: false, configured: false, error: "ELEVENLABS_API_KEY is not set on this deployment." }, { status: 200 });

  try {
    const res = await fetch("https://api.elevenlabs.io/v2/voices?page_size=100", {
      headers: { "xi-api-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, configured: true, status: res.status, error: reason(res.status) }, { status: 200 });
    }
    const data: any = await res.json();
    const voices = (data?.voices || []).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category || "",
      gender: v?.labels?.gender || "",
      accent: v?.labels?.accent || "",
      description: v?.labels?.description || "",
    }));
    return NextResponse.json({ ok: true, configured: true, count: voices.length, voices }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, configured: true, error: "Could not reach ElevenLabs (timeout or network)." }, { status: 200 });
  }
}
