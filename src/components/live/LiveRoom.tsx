"use client";

// ── Magical Moments Live — room client (Agora RTC + RTM) ────────
//
// Obtains a channel-scoped token from /api/live/token (the server holds the
// certificate) and joins Agora. Host publishes camera/mic (+ optional screen
// share) and controls the broadcast; audience subscribes. Waiting room shows a
// countdown until the host starts. Chat + reactions run over Agora RTM and
// degrade gracefully if signaling is unavailable — video never depends on them.
//
// The Agora SDKs are imported dynamically inside effects (browser-only).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { startLiveAction, endLiveAction } from "@/app/dashboard/live/actions";
import type { LiveStatus } from "@/lib/live/core";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ChatMsg { id: string; name: string; text: string; me?: boolean }
interface Floater { id: string; emoji: string }

const REACTIONS = ["❤️", "👏", "🎉", "😂", "🔥", "🥂"];

export default function LiveRoom(props: {
  roomId: string;
  title: string;
  isHost: boolean;
  invite: string;
  initialStatus: LiveStatus;
  scheduledStart: string | null;
  inviteCode: string | null;
  agoraReady: boolean;
  statusLabel: string;
}) {
  const [status, setStatus] = useState<LiveStatus>(props.initialStatus);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [remoteIds, setRemoteIds] = useState<(string | number)[]>([]);
  const [sharing, setSharing] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatText, setChatText] = useState("");
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [now, setNow] = useState(() => 0);

  const clientRef = useRef<any>(null);
  const localTracks = useRef<{ mic?: any; cam?: any }>({});
  const screenTrack = useRef<any>(null);
  const rtmRef = useRef<any>(null);
  const rtmChannel = useRef<string>("");
  const remoteUsers = useRef<Map<string | number, any>>(new Map());
  const localVideoRef = useRef<HTMLDivElement>(null);
  const uidRef = useRef<number>(0);

  // Countdown to scheduled start (audience waiting room).
  const startsAt = useMemo(() => (props.scheduledStart ? new Date(props.scheduledStart).getTime() : 0), [props.scheduledStart]);
  useEffect(() => {
    if (!startsAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => clearInterval(t);
  }, [startsAt]);
  const countdown = startsAt && now && startsAt > now ? formatCountdown(startsAt - now) : null;

  const pushFloater = useCallback((emoji: string) => {
    const id = `${emoji}-${Math.round(performance.now())}-${Math.random().toString(36).slice(2, 6)}`;
    setFloaters((f) => [...f, { id, emoji }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 2600);
  }, []);

  // ── RTM (chat + reactions) — best-effort ──
  const connectRtm = useCallback(async (appId: string, uid: number, rtmToken: string, channel: string) => {
    try {
      const mod: any = await import("agora-rtm");
      const RTM = mod.default?.RTM || mod.RTM;
      if (!RTM) return;
      const rtm = new RTM(appId, String(uid), { token: rtmToken });
      await rtm.login();
      await rtm.subscribe(channel, { withMessage: true, withPresence: true });
      rtm.addEventListener?.("message", (ev: any) => {
        try {
          const payload = JSON.parse(ev.message);
          if (payload.type === "reaction") pushFloater(payload.emoji);
          else if (payload.type === "chat") setMessages((m) => [...m.slice(-99), { id: `${ev.publisher}-${Date.now()}`, name: payload.name || "Guest", text: payload.text }]);
        } catch { /* ignore malformed */ }
      });
      rtmRef.current = rtm;
      rtmChannel.current = channel;
    } catch {
      /* signaling unavailable → chat/reactions off, video unaffected */
    }
  }, [pushFloater]);

  const sendChat = useCallback(async () => {
    const text = chatText.trim();
    if (!text) return;
    setChatText("");
    setMessages((m) => [...m.slice(-99), { id: `me-${Date.now()}`, name: props.isHost ? "Host" : "You", text, me: true }]);
    try { await rtmRef.current?.publish(rtmChannel.current, JSON.stringify({ type: "chat", name: props.isHost ? "Host" : "Guest", text })); } catch { /* offline */ }
  }, [chatText, props.isHost]);

  const sendReaction = useCallback(async (emoji: string) => {
    pushFloater(emoji);
    try { await rtmRef.current?.publish(rtmChannel.current, JSON.stringify({ type: "reaction", emoji })); } catch { /* offline */ }
  }, [pushFloater]);

  // ── Join RTC ──
  const join = useCallback(async () => {
    if (joined || joining) return;
    setJoining(true); setError("");
    try {
      const res = await fetch("/api/live/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId: props.roomId, invite: props.invite }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Couldn't join this room.");
        return;
      }
      const t = await res.json();
      uidRef.current = t.uid;

      const AgoraRTC: any = (await import("agora-rtc-sdk-ng")).default;
      const client: any = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;
      await client.setClientRole(t.role === "host" ? "host" : "audience");

      client.on("user-published", async (user: any, mediaType: string) => {
        await client.subscribe(user, mediaType);
        remoteUsers.current.set(user.uid, user);
        if (mediaType === "audio") user.audioTrack?.play();
        setRemoteIds(Array.from(remoteUsers.current.keys()));
      });
      client.on("user-unpublished", (user: any) => {
        remoteUsers.current.set(user.uid, user);
        setRemoteIds(Array.from(remoteUsers.current.keys()));
      });
      client.on("user-left", (user: any) => {
        remoteUsers.current.delete(user.uid);
        setRemoteIds(Array.from(remoteUsers.current.keys()));
      });

      await client.join(t.appId, t.channel, t.rtcToken, t.uid);

      if (t.role === "host") {
        const [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracks.current = { mic, cam };
        if (localVideoRef.current) cam.play(localVideoRef.current);
        await client.publish([mic, cam]);
      }

      await connectRtm(t.appId, t.uid, t.rtmToken, t.channel);
      setJoined(true);
    } catch (e) {
      setError(`Live connection failed: ${(e as Error).message}`);
    } finally {
      setJoining(false);
    }
  }, [joined, joining, props.roomId, props.invite, connectRtm]);

  // Play remote videos when their containers are present.
  useEffect(() => {
    for (const uid of remoteIds) {
      const user = remoteUsers.current.get(uid);
      if (user?.videoTrack) { try { user.videoTrack.play(`rtc-remote-${uid}`); } catch { /* not mounted yet */ } }
    }
  }, [remoteIds]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      try { localTracks.current.mic?.close(); localTracks.current.cam?.close(); screenTrack.current?.close(); } catch { /* noop */ }
      try { clientRef.current?.leave(); } catch { /* noop */ }
      try { rtmRef.current?.logout?.(); } catch { /* noop */ }
    };
  }, []);

  // ── Host controls ──
  async function startBroadcast() {
    const fd = new FormData(); fd.set("roomId", props.roomId);
    await startLiveAction(fd); setStatus("LIVE");
  }
  async function endBroadcast() {
    const fd = new FormData(); fd.set("roomId", props.roomId);
    await endLiveAction(fd);
  }
  async function toggleScreenShare() {
    const client = clientRef.current;
    if (!client) return;
    try {
      const AgoraRTC: any = (await import("agora-rtc-sdk-ng")).default;
      if (!sharing) {
        const screen = await AgoraRTC.createScreenVideoTrack({}, "disable");
        screenTrack.current = screen;
        if (localTracks.current.cam) await client.unpublish(localTracks.current.cam);
        await client.publish(screen);
        if (localVideoRef.current) (screen as any).play(localVideoRef.current);
        setSharing(true);
        (screen as any).on?.("track-ended", () => { void toggleScreenShare(); });
      } else {
        if (screenTrack.current) { await client.unpublish(screenTrack.current); screenTrack.current.close(); screenTrack.current = null; }
        if (localTracks.current.cam) { await client.publish(localTracks.current.cam); if (localVideoRef.current) localTracks.current.cam.play(localVideoRef.current); }
        setSharing(false);
      }
    } catch (e) { setError(`Screen share failed: ${(e as Error).message}`); }
  }

  const inviteUrl = typeof window !== "undefined" && props.inviteCode
    ? `${window.location.origin}/live/${props.roomId}?invite=${props.inviteCode}`
    : "";

  // ── Render ──
  const waiting = !props.isHost && status !== "LIVE" && remoteIds.length === 0;

  return (
    <div className="lr-shell">
      <header className="lr-top">
        <div>
          <span className="lr-eyebrow">✦ Magical Moments Live</span>
          <h1 className="lr-title">{props.title}</h1>
        </div>
        <span className={`lr-badge ${status === "LIVE" ? "is-live" : ""}`}>{status === "LIVE" ? "● LIVE" : props.statusLabel}</span>
      </header>

      {!props.agoraReady && <div className="lr-warn">Live streaming isn&apos;t connected on the server yet (Agora keys). The room is ready; joining will work once keys are set.</div>}
      {error && <div className="lr-error">{error}</div>}

      <div className="lr-body">
        <div className="lr-stagewrap">
          <div className="lr-stage">
            {/* Host self-view / screen share */}
            <div ref={localVideoRef} className={`lr-video lr-video--local ${props.isHost && joined ? "" : "is-hidden"}`} />
            {/* Remote publishers (host video for audience; co-hosts for host) */}
            {remoteIds.map((uid) => <div key={uid} id={`rtc-remote-${uid}`} className="lr-video" />)}

            {!joined && (
              <div className="lr-cta">
                {waiting && countdown ? (
                  <><div className="lr-count">{countdown}</div><p>The host hasn&apos;t started yet. You&apos;re in the waiting room.</p></>
                ) : (
                  <p>{props.isHost ? "Set up your camera and go live." : "Join to watch this Magical Moment live."}</p>
                )}
                <button className="btn btn--gold" onClick={join} disabled={joining || !props.agoraReady}>
                  {joining ? "Connecting…" : props.isHost ? "Enter host studio" : "Join the live"}
                </button>
              </div>
            )}

            {joined && waiting && (
              <div className="lr-cta lr-cta--overlay">
                {countdown ? <div className="lr-count">{countdown}</div> : null}
                <p>Waiting for the host to start…</p>
              </div>
            )}

            {/* Floating reactions */}
            <div className="lr-floaters">
              {floaters.map((f) => <span key={f.id} className="lr-floater">{f.emoji}</span>)}
            </div>
          </div>

          {/* Controls */}
          {joined && (
            <div className="lr-controls">
              {props.isHost && status !== "LIVE" && <button className="btn btn--gold" onClick={startBroadcast}>Start broadcast</button>}
              {props.isHost && <button className="btn btn--ghost" onClick={toggleScreenShare}>{sharing ? "Stop sharing" : "Share screen"}</button>}
              {props.isHost && <button className="btn btn--ghost lr-danger" onClick={endBroadcast}>End</button>}
              <div className="lr-reactions">
                {REACTIONS.map((e) => <button key={e} className="lr-react" onClick={() => sendReaction(e)} aria-label={`React ${e}`}>{e}</button>)}
              </div>
            </div>
          )}

          {props.isHost && inviteUrl && (
            <div className="lr-invite">
              <span className="lr-invite__label">Invite link</span>
              <input readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
              <span className="lr-invite__hint">Anyone with this link can join as audience.</span>
            </div>
          )}

          <p className="lr-note">Recording &amp; replay aren&apos;t enabled yet — this session isn&apos;t being recorded. When cloud recording is connected, ended events become replays automatically.</p>
        </div>

        {/* Chat */}
        <aside className="lr-chat">
          <div className="lr-chat__head">Live chat</div>
          <div className="lr-chat__log">
            {messages.length === 0 ? <p className="lr-chat__empty">Say hello 👋</p> : messages.map((m) => (
              <div key={m.id} className={`lr-msg ${m.me ? "is-me" : ""}`}><b>{m.name}</b> {m.text}</div>
            ))}
          </div>
          <form className="lr-chat__form" onSubmit={(e) => { e.preventDefault(); void sendChat(); }}>
            <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder={joined ? "Message…" : "Join to chat"} disabled={!joined} />
            <button type="submit" className="btn btn--sm btn--gold" disabled={!joined || !chatText.trim()}>Send</button>
          </form>
        </aside>
      </div>

      <div className="lr-foot">
        {props.isHost ? <Link href="/dashboard/live" className="lr-link">← My live rooms</Link> : <Link href="/" className="lr-link">← Home</Link>}
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}
