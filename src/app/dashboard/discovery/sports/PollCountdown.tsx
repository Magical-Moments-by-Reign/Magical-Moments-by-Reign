"use client";
// Live "Poll closes in HH:MM:SS" ticker (CLIENT ONLY) — the lock time
// itself (`lockAtISO`) is real, computed server-side from the game's own
// locksAt/startsAt (see isPickLocked in sports/picks.ts); this component
// only re-renders the countdown against that real timestamp every second.

import { useEffect, useState } from "react";

function format(msRemaining: number): string {
  if (msRemaining <= 0) return "Closed";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PollCountdown({ lockAtISO }: { lockAtISO: string }) {
  const lockAt = new Date(lockAtISO).getTime();
  const [label, setLabel] = useState(() => format(lockAt - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setLabel(format(lockAt - Date.now())), 1000);
    return () => clearInterval(id);
  }, [lockAt]);

  return <span>{label}</span>;
}
