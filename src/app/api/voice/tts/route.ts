import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { isPaidMember } from "@/lib/membership-access";
import { getVoice, cloudPrimary } from "@/lib/voice/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Premium cloud voice synthesis. Keys stay server-side (never NEXT_PUBLIC).
// ElevenLabs is primary; OpenAI TTS is the fallback. Returns streamed MP3, or an
// honest status when premium isn't connected / the member isn't eligible.
export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const provider = cloudPrimary();
  if (!provider) return NextResponse.json({ error: "Premium voices aren't connected yet.", comingSoon: true }, { status: 503 });
  if (!isPaidMember(account.membershipTier)) {
    return NextResponse.json({ error: "Premium voices are a membership feature.", needsMembership: true }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const text = String(body.text || "").slice(0, 800).trim();
  const voice = getVoice(String(body.voiceId || ""));
  if (!text) return NextResponse.json({ error: "Nothing to speak." }, { status: 400 });

  try {
    if (provider === "elevenlabs") {
      // Owner-provided voice id wins; otherwise ElevenLabs default.
      const voiceId = voice?.providerVoiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 } }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return NextResponse.json({ error: `Voice service error (${res.status}).` }, { status: 502 });
      return new NextResponse(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
    }
    // OpenAI TTS fallback
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice: voice?.gender === "male" ? "onyx" : "shimmer", input: text }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return NextResponse.json({ error: `Voice service error (${res.status}).` }, { status: 502 });
    return new NextResponse(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Voice service timed out." }, { status: 504 });
  }
}
