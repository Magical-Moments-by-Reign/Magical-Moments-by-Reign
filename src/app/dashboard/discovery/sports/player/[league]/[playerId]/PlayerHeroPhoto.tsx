"use client";

import { useState } from "react";
import JerseyAvatar from "../../../JerseyAvatar";

/** Player Profile hero photo: a real headshot when the provider has one,
 *  falling back to JerseyAvatar — including when a real photoUrl 404s or
 *  otherwise fails to load client-side, so a stale/expired provider URL
 *  never leaves a broken image icon. */
export default function PlayerHeroPhoto({ photoUrl, number }: { photoUrl?: string; number?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="spx-profile__photo">
      {photoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        <JerseyAvatar number={number} />
      )}
    </div>
  );
}
