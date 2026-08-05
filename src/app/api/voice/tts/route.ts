import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { isPaidMember } from "@/lib/membership-access";
import { getVoice } from "@/lib/voice/catalog";
import { readOwnerElevenVoices } from "@/lib/voice/owner-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Premium cloud voice synthesis. Keys stay server-side (never NEXT_PUBLIC).
// ElevenLabs is PRIMARY; if it fails at request time, OpenAI TTS is the fallback.
// Audio streams back as MP3. If both fail, we return the exact provider error so
// the client can show it (never a silent browser fallback pretending to work).

const ELEVEN_MODEL = "eleven_turbo_v2_5";

function elevenReason(status: number): string {
  if (status === 401 || status === 403) return "invalid key or permission (401/403)";
  if (status === 402) return "insufficient credits (402)";
  if (status === 404) return "voice id not found (404)";
  if (status === 429) return "rate/quota limit (429)";
  return `provider error (${status})`;
}

async function elevenLabs(text: string, voiceId: string): Promise<{ res?: Response; err?: { status: number; reason: string } }> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return {};
  const id = voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: ELEVEN_MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true } }),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok && r.body) {
      return { res: new NextResponse(r.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice-Provider": "elevenlabs", "X-Voice-Model": ELEVEN_MODEL, "X-Voice-Id": id } }) };
    }
    return { err: { status: r.status, reason: elevenReason(r.status) } };
  } catch {
    return { err: { status: 0, reason: "timeout or network error" } };
  }
}

async function openAI(text: string, gender: "female" | "male"): Promise<Response | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice: gender === "male" ? "onyx" : "nova", input: text, response_format: "mp3" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok && r.body) return new NextResponse(r.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice-Provider": "openai", "X-Voice-Model": "tts-1" } });
  } catch { /* both failed */ }
  return null;
}

export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const hasCloud = Boolean(process.env.ELEVENLABS_API_KEY || process.env.OPENAI_API_KEY);
  if (!hasCloud) return NextResponse.json({ error: "Premium voices aren't connected yet.", comingSoon: true }, { status: 503 });
  if (!isPaidMember(account.membershipTier)) {
    return NextResponse.json({ error: "Premium voices are a membership feature.", needsMembership: true }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const text = String(body.text || "").slice(0, 800).trim();
  if (!text) return NextResponse.json({ error: "Nothing to speak." }, { status: 400 });
  const persona: "journey" | "concierge" = body.persona === "concierge" ? "concierge" : "journey";
  const voice = getVoice(String(body.voiceId || ""));
  const gender: "female" | "male" = voice?.gender === "male" ? "male" : "female";

  // Resolve the ElevenLabs voice id: owner's assigned voice (from My Voices) wins,
  // then the catalog's built-in id, then env default.
  const owner = await readOwnerElevenVoices().catch(() => ({ journey: "", concierge: "" }));
  const elevenId = owner[persona] || voice?.providerVoiceId || "";

  // ElevenLabs primary → OpenAI fallback.
  const primary = await elevenLabs(text, elevenId);
  if (primary.res) return primary.res;
  const fallback = await openAI(text, gender);
  if (fallback) {
    if (primary.err) fallback.headers.set("X-Voice-Primary-Error", `elevenlabs ${primary.err.reason}`);
    return fallback;
  }

  // Both cloud providers failed — tell the client exactly why (no silent fallback).
  return NextResponse.json({
    error: "Voice service unavailable.",
    fallbackToBrowser: true,
    provider: "elevenlabs",
    elevenStatus: primary.err?.status ?? null,
    detail: primary.err?.reason ?? "no cloud provider succeeded",
  }, { status: 502 });
}
