import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { getRoom } from "@/lib/live/rooms";
import { authorizeJoin, LIVE_STATUS } from "@/lib/live/core";
import { getInviteByToken, markInviteJoinedByToken } from "@/lib/live/invites";
import { agoraConfigured, issueTokens } from "@/lib/live/agora";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The ONLY way a browser obtains an Agora token. The app certificate is used
// server-side inside issueTokens and never leaves this process. Authorization:
//   • the host (signed-in account owns the room) → publisher token,
//   • otherwise a VALID invite code → subscriber token, only while joinable.
// No invite, wrong invite, or ended/replay room → 403, no token.
export async function POST(req: Request) {
  if (!agoraConfigured()) {
    return NextResponse.json({ error: "Live streaming isn't connected yet." }, { status: 503 });
  }

  let body: { roomId?: string; invite?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const roomId = (body.roomId || "").trim();
  if (!roomId) return NextResponse.json({ error: "Missing roomId." }, { status: 400 });

  const room = await getRoom(roomId);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const account = await currentAccount().catch(() => null);
  const isHost = !!account && account.id === room.accountId;
  const provided = body.invite ?? null;

  // Two valid audience paths: the room-level invite code, OR a secure
  // per-guest invite token (validated server-side against LiveInvite).
  // The per-guest token is what travels in emailed invitations.
  let decision = authorizeJoin({ isHost, status: room.status, expectedInvite: room.inviteCode, providedInvite: provided });
  let perGuestToken: string | null = null;
  if (!decision && !isHost && provided) {
    const invite = await getInviteByToken(roomId, provided);
    if (invite && LIVE_STATUS[room.status].joinable) {
      decision = { role: "audience", agoraRole: "subscriber" };
      perGuestToken = provided;
    }
  }
  if (!decision) {
    return NextResponse.json({ error: "You need a valid invite to join this room." }, { status: 403 });
  }

  // Unique uid per join → distinct RTC identity AND distinct RTM identity
  // (chat/reactions never collide across participants).
  const uid = randomInt(1, 2 ** 31 - 1);
  const tokens = issueTokens({ channel: room.channelName, uid, role: decision.agoraRole });
  if (!tokens) return NextResponse.json({ error: "Live streaming isn't connected yet." }, { status: 503 });

  // A tracked guest actually joined → advance their invite (never downgrades).
  if (perGuestToken) await markInviteJoinedByToken(roomId, perGuestToken).catch(() => {});

  return NextResponse.json({
    appId: tokens.appId, // public by design
    channel: tokens.channel,
    uid: tokens.uid,
    rtcToken: tokens.rtcToken,
    rtmToken: tokens.rtmToken,
    role: decision.role, // "host" | "audience"
    expiresInSeconds: tokens.expiresInSeconds,
    room: { id: room.id, title: room.title, status: room.status, scheduledStart: room.scheduledStart },
    // NOTE: inviteCode is never returned.
  });
}
