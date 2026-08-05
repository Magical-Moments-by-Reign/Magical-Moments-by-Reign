import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { isPaidMember } from "@/lib/membership-access";
import { getVoice } from "@/lib/voice/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Premium cloud voice synthesis. Keys stay server-side (never NEXT_PUBLIC).
// ElevenLabs is PRIMARY; if it fails at request time, OpenAI TTS is the fallback.
// Audio streams back as MP3. If both providers fail, we return a signal so the
// client falls back to the browser voice — the app never crashes.

async function elevenLabs(text: string, voiceId: string): Promise<Response | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  const id = voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  try {
    // Streaming endpoint + low-latency optimisation for a responsive feel.
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok && res.body) {
      return new NextResponse(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice-Provider": "elevenlabs" } });
    }
  } catch { /* fall through to OpenAI */ }
  return null;
}

async function openAI(text: string, gender: "female" | "male"): Promise<Response | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice: gender === "male" ? "onyx" : "nova", input: text, response_format: "mp3" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok && res.body) {
      return new NextResponse(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice-Provider": "openai" } });
    }
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
  const voice = getVoice(String(body.voiceId || ""));
  const gender: "female" | "male" = voice?.gender === "male" ? "male" : "female";

  // ElevenLabs primary → OpenAI fallback.
  const primary = await elevenLabs(text, voice?.providerVoiceId || "");
  if (primary) return primary;
  const fallback = await openAI(text, gender);
  if (fallback) return fallback;

  // Both cloud providers failed — tell the client to use the browser voice.
  return NextResponse.json({ error: "Voice service unavailable.", fallbackToBrowser: true }, { status: 502 });
}
