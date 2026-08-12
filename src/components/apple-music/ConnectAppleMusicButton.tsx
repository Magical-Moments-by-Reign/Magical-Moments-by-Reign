"use client";

import { useAppleMusicKit } from "./AppleMusicKitProvider";

export default function ConnectAppleMusicButton() {
  const { ready, authorized, connecting, statusMessage, connect, disconnect } = useAppleMusicKit();

  if (!ready) return null;

  return (
    <div className="amk-connect">
      {authorized ? (
        <>
          <span className="amk-connect__status">Apple Music connected — full playback is on for this session.</span>
          <button type="button" className="btn btn--sm btn--warn" onClick={disconnect}>Disconnect Apple Music</button>
        </>
      ) : (
        <>
          <span className="amk-connect__status">Connect Apple Music for full-length playback (requires an active Apple Music subscription). Previews work either way.</span>
          <button type="button" className="btn btn--sm btn--gold" onClick={connect} disabled={connecting}>{connecting ? "Connecting…" : "Connect Apple Music"}</button>
        </>
      )}
      {statusMessage && <p className="amk-connect__message">{statusMessage}</p>}
    </div>
  );
}
