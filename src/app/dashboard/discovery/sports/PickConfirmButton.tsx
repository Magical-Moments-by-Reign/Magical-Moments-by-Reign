"use client";

/** A Magical Picks team-pick button that confirms before it submits — "is
 *  this your pick?" — since a pick can't be changed once the game locks.
 *  Still a real <button type="submit"> inside the existing server-action
 *  form; this only adds a client-side confirm() gate in front of it. */
export default function PickConfirmButton({
  name,
  value,
  label,
  picked,
  confirmLabel,
}: {
  name: string;
  value: string;
  label: string;
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
      {label}
    </button>
  );
}
