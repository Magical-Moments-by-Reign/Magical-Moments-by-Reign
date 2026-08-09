import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentAccount } from "@/lib/auth-session";
import { getRoom } from "@/lib/live/rooms";
import { getInviteByToken } from "@/lib/live/invites";
import { inviteMatches, LIVE_STATUS } from "@/lib/live/core";
import { agoraConfigured } from "@/lib/live/agora";
import LiveRoom from "@/components/live/LiveRoom";
import "./live-room.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live", robots: { index: false } };

// Public, invite-aware room page. The host (signed-in owner) enters directly;
// audience must arrive with a valid ?invite=CODE. No Agora token is ever issued
// here — the client fetches one from /api/live/token, which re-checks host/
// invite server-side. This page only decides what UI to show.
export default async function LiveRoomPage({
  params, searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ invite?: string; pass?: string }>;
}) {
  const { roomId } = await params;
  const { invite, pass } = await searchParams;
  const room = await getRoom(roomId);
  if (!room) notFound();

  const account = await currentAccount().catch(() => null);
  const isHost = !!account && account.id === room.accountId;
  // Valid if room code matches OR a secure per-guest token resolves.
  const perGuest = !isHost && invite ? await getInviteByToken(room.id, invite) : null;
  const inviteOk = inviteMatches(room.inviteCode, invite ?? null) || !!perGuest;
  const meta = LIVE_STATUS[room.status];

  // Optional host passcode gate (stricter privacy).
  const gate = (room.settings?.gate ?? {}) as { passcode?: string | null };
  const needPass = !isHost && !!gate.passcode;
  const passOk = !needPass || (!!pass && pass === gate.passcode);

  // Not the host and no valid invite → don't reveal the room.
  if (!isHost && !inviteOk) {
    return (
      <div className="lr-shell lr-gate">
        <div className="lr-gatecard">
          <span className="lr-eyebrow">✦ Magical Moments Live</span>
          <h1>This is a private live room</h1>
          <p>You need a valid invite link to join. Please use the link the host shared with you.</p>
          <Link href="/" className="btn btn--gold">Return home</Link>
        </div>
      </div>
    );
  }

  // Passcode gate (host opted into stricter privacy).
  if (!isHost && inviteOk && needPass && !passOk) {
    return (
      <div className="lr-shell lr-gate">
        <div className="lr-gatecard">
          <span className="lr-eyebrow">✦ Magical Moments Live</span>
          <h1>{room.title}</h1>
          <p>This Live is passcode-protected. Please enter the passcode the host shared with you.</p>
          <form method="GET" className="lr-passform">
            <input type="hidden" name="invite" value={invite ?? ""} />
            <input name="pass" placeholder="Passcode" autoComplete="off" aria-label="Passcode" />
            <button type="submit" className="btn btn--gold">Enter</button>
          </form>
        </div>
      </div>
    );
  }

  // Ended without a replay → honest closed state (never a fabricated replay).
  if (room.status === "ENDED" && !room.recordingUrl) {
    return (
      <div className="lr-shell lr-gate">
        <div className="lr-gatecard">
          <span className="lr-eyebrow">✦ Magical Moments Live</span>
          <h1>{room.title}</h1>
          <p>This live event has ended. {room.recordingUrl ? "" : "A replay isn't available."}</p>
          {isHost && <Link href="/dashboard/live" className="btn btn--gold">Back to my live rooms</Link>}
        </div>
      </div>
    );
  }

  // Replay (only ever reached when a REAL recording URL exists).
  if (room.status === "REPLAY" && room.recordingUrl) {
    return (
      <div className="lr-shell">
        <header className="lr-top"><span className="lr-eyebrow">✦ Replay</span><h1 className="lr-title">{room.title}</h1></header>
        <div className="lr-stage">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video className="lr-replay" src={room.recordingUrl} controls playsInline />
        </div>
      </div>
    );
  }

  return (
    <LiveRoom
      roomId={room.id}
      title={room.title}
      isHost={isHost}
      invite={inviteOk ? (invite ?? "") : ""}
      initialStatus={room.status}
      scheduledStart={room.scheduledStart ? room.scheduledStart.toISOString() : null}
      inviteCode={isHost ? room.inviteCode : null}
      agoraReady={agoraConfigured()}
      statusLabel={meta.label}
    />
  );
}
