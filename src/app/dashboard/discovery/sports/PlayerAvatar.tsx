"use client";
// Shared player avatar (CLIENT ONLY, for the onError degrade) — the one
// place every surface (Team Rosters, Fantasy Draft/Rosters/Waivers/Trades,
// Player Search, Tracked Players…) renders a player's photo, so the same
// player looks identical everywhere. Real photoUrl → real photo; no
// photoUrl, or a real URL that fails to load, → the JerseyAvatar fallback.
// Never fabricates, scrapes, or guesses an image — see JerseyAvatar's own
// doc comment for why the fallback is a drawn jersey, not a blank circle.

import { useEffect, useState } from "react";
import JerseyAvatar from "./JerseyAvatar";

const PRESET_PX = { sm: 32, md: 44, lg: 56 } as const;

export default function PlayerAvatar({
  photoUrl,
  number,
  size = "md",
}: {
  photoUrl?: string | null;
  number?: number;
  size?: keyof typeof PRESET_PX | number;
}) {
  const [broken, setBroken] = useState(false);
  // A row can be reused for a different player (same list position, new
  // data) without remounting — never keep showing a stale "broken" state
  // for the new player's own (untested) photoUrl.
  useEffect(() => { setBroken(false); }, [photoUrl]);

  const px = typeof size === "number" ? size : PRESET_PX[size];
  const showPhoto = Boolean(photoUrl) && !broken;

  return (
    <span className="spx-avatar" style={{ width: px, height: px }}>
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl!} alt="" onError={() => setBroken(true)} />
      ) : (
        <JerseyAvatar number={number} />
      )}
    </span>
  );
}
