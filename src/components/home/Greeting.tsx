"use client";

import { useEffect, useState } from "react";

// A warm, time-aware greeting. The time of day is resolved on the CLIENT so it
// reflects the customer's own local time (server time is UTC) — we render a
// calm, time-neutral line first, then gently settle into the right greeting on
// mount, so there's never a hydration mismatch.
function timeOfDayGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good evening";
}

export default function Greeting({
  firstName,
  conciergeName,
  named,
}: {
  firstName: string;
  conciergeName: string;
  named: boolean;
}) {
  const [greeting, setGreeting] = useState("Welcome home");

  useEffect(() => {
    setGreeting(timeOfDayGreeting(new Date().getHours()));
  }, []);

  return (
    <header className="home-greeting">
      <p className="home-greeting__hello" suppressHydrationWarning>
        {greeting}, <span className="home-greeting__name">{firstName}</span>.
      </p>
      <p className="home-greeting__sub">
        <span className="home-greeting__sparkle" aria-hidden="true">✨</span> Welcome home. We&apos;re so happy you&apos;re here.
      </p>
      <p className="home-greeting__line">
        {named
          ? <>{conciergeName} is here to help. What are we planning together today?</>
          : <>How may we help you through life&apos;s next chapter today?</>}
      </p>
    </header>
  );
}
