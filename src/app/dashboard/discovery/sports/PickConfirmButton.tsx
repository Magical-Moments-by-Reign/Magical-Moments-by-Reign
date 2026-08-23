"use client";

import DiscoveryImage from "@/components/discovery/DiscoveryImage";

/** A Magical Picks team-pick button that confirms before it submits — "is
 *  this your pick?" — since a pick can't be changed once the game locks.
 *  Still a real <button type="submit"> inside the existing server-action
 *  form; this only adds a client-side confirm() gate in front of it.
 *  Shows the real team logo inline (or a quiet initials fallback) next to
 *  the team name, same as everywhere else a team is picked from. */
export default function PickConfirmButton({
  name,
  value,
  label,
  logoUrl,
  picked,
  confirmLabel,
}: {
  name: string;
  value: string;
  label: string;
  logoUrl?: string | null;
  picked: boolean;
  confirmLabel: string;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      data-picked={picked}
      onClick={(e) => {
        if (!window.confirm(`Confirm your pick: ${confirmLabel}?\n\nPicks can't be changed once the game locks.`)) {
          e.preventDefault();
        }
      }}
    >
      <DiscoveryImage src={logoUrl} alt="" fallback={label.slice(0, 1)} className="pick-btn__logo" />
      {label}
    </button>
  );
}
