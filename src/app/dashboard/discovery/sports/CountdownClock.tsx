"use client";
// Live ticking countdown to a real kickoff/tipoff (CLIENT ONLY). The target
// time itself is always real, either a real ISO timestamp from the
// schedule data or (when dateOnly) a bare "YYYY-MM-DD" calendar date — this
// only re-renders the countdown against it every second. Runs entirely in
// the viewer's own browser, so both the countdown and the displayed date/
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

// A bare "YYYY-MM-DD" has no time or offset — new Date() parses that as
// UTC midnight, which then displays as the *previous* calendar day for
// every US timezone (e.g. "2026-10-03" reading back as "October 2, 7:00 PM
// CDT"). Parsing the year/month/day directly into local-midnight avoids
// that entirely: the countdown targets the start of that calendar date in
// whatever timezone the viewer is actually in, and never rolls backward.
function localMidnight(dateOnly: string): number {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export default function CountdownClock({ targetISO, dateOnly = false }: { targetISO: string; dateOnly?: boolean }) {
  const target = dateOnly ? localMidnight(targetISO) : new Date(targetISO).getTime();
  const [parts, setParts] = useState(() => diffParts(target - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setParts(diffParts(target - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);

  // dateOnly never had a real time sourced for it — showing one (even a
  // midnight-derived one) would read as a fabricated tipoff time, so this
  // shows only the calendar date, no hour/minute/timezone.
  const localLine = dateOnly
    ? new Date(target).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : new Date(targetISO).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
      }).replace(" at ", " • ");

  if (target - Date.now() <= 0) return null;

  return (
    <div className="spx-clock">
      <div className="spx-clock__digits">
        <b>{String(parts.days).padStart(2, "0")}</b>
        <span className="spx-clock__colon">:</span>
        <b>{String(parts.hours).padStart(2, "0")}</b>
        <span className="spx-clock__colon">:</span>
        <b>{String(parts.minutes).padStart(2, "0")}</b>
        <span className="spx-clock__colon">:</span>
        <b>{String(parts.seconds).padStart(2, "0")}</b>
      </div>
      <div className="spx-clock__labels">
        <span>Days</span><span>Hrs</span><span>Min</span><span>Sec</span>
      </div>
      <p className="spx-clock__local">{localLine}</p>
    </div>
  );
}
