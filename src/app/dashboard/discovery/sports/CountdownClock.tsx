"use client";
// Live ticking countdown to a real kickoff (CLIENT ONLY). The target time
// itself is always a real ISO timestamp from the schedule data — this only
// re-renders the countdown against it every second. Runs entirely in the
// viewer's own browser, so both the countdown and the displayed kickoff
// time automatically reflect whatever timezone the viewer is actually in —
// no manual timezone math or guessing.

import { useEffect, useState } from "react";

function diffParts(msRemaining: number) {
  const clamped = Math.max(0, msRemaining);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export default function CountdownClock({ targetISO }: { targetISO: string }) {
  const target = new Date(targetISO).getTime();
  const [parts, setParts] = useState(() => diffParts(target - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setParts(diffParts(target - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);

  const kickoffLocal = new Date(targetISO).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  if (target - Date.now() <= 0) return null;

  return (
    <div className="spx-clock">
      <div className="spx-clock__row">
        <div className="spx-clock__unit"><b>{parts.days}</b><span>Days</span></div>
        <div className="spx-clock__unit"><b>{String(parts.hours).padStart(2, "0")}</b><span>Hrs</span></div>
        <div className="spx-clock__unit"><b>{String(parts.minutes).padStart(2, "0")}</b><span>Min</span></div>
        <div className="spx-clock__unit"><b>{String(parts.seconds).padStart(2, "0")}</b><span>Sec</span></div>
      </div>
      <p className="spx-clock__local">Kickoff {kickoffLocal} — your local time</p>
    </div>
  );
}
