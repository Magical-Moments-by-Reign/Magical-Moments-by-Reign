"use client";
// Shared player avatar (CLIENT ONLY, for the onError degrade) — the one
// place every surface (Team Rosters, Fantasy Draft/Rosters/Free Agents/
// Waivers/Trades, Player Search, Tracked Players…) renders a player's
// photo, so the same player looks identical everywhere. Real photoUrl →
// real photo; no photoUrl, or a real URL that fails to load, → a fallback.
// Never fabricates, scrapes, or guesses an image.
//
// Two fallback variants:
//  - "compact" (default — matches how nearly every call site actually uses
//    this component: a player repeated down a list/grid row after row —
//    rosters, draft board, free agents, waivers, trades). Falls back to a
//    plain circle showing the player's initials, derived only from the
//    real `name` already passed in (never fabricated); if no name was
//    passed, falls back further to the real jersey `number`; with neither,
//    an unmarked circle. No repeating jersey artwork.
//  - "decorative" — the original hand-drawn JerseyAvatar silhouette
//    (see JerseyAvatar.tsx), kept available for a genuinely large, single,
//    one-off placement where the illustration reads as a nice touch rather
//    than clutter. Opt in per call site with variant="decorative".

import { useEffect, useState } from "react";
import JerseyAvatar from "./JerseyAvatar";

const PRESET_PX = { sm: 32, md: 44, lg: 56 } as const;

function initialsFromName(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export default function PlayerAvatar({
  photoUrl,
  number,
  name,
  size = "md",
  variant = "compact",
}: {
  photoUrl?: string | null;
  number?: number;
  /** Real player name, used only to derive the compact fallback's initials. */
  name?: string | null;
  size?: keyof typeof PRESET_PX | number;
  variant?: "compact" | "decorative";
}) {
  const [broken, setBroken] = useState(false);
  // A row can be reused for a different player (same list position, new
  // data) without remounting — never keep showing a stale "broken" state
  // for the new player's own (untested) photoUrl.
  useEffect(() => { setBroken(false); }, [photoUrl]);

  const px = typeof size === "number" ? size : PRESET_PX[size];
  const showPhoto = Boolean(photoUrl) && !broken;
  const initials = initialsFromName(name);

  return (
    <span className="spx-avatar" style={{ width: px, height: px }}>
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl!} alt="" onError={() => setBroken(true)} />
      ) : variant === "decorative" ? (
        <JerseyAvatar number={number} />
      ) : (
        <span className="spx-avatar__initials" style={{ fontSize: Math.max(10, Math.round(px * 0.4)) }}>
          {initials || (number != null ? String(number) : "")}
        </span>
      )}
    </span>
  );
}
