"use client";

import { useFormStatus } from "react-dom";

// ── Shared submit control (Phase 0A — Tap and It Moves) ────────────────
// A drop-in replacement for a plain <button type="submit"> inside a
// server-action <form>. Uses React's real useFormStatus() — the pending
// state IS the form's actual pending state, never a client-side guess —
// so it can never show "done" before the server action has actually
// resolved, and never lie about success. On failure, the form's own
// pending state clears automatically (useFormStatus reflects that), which
// re-enables this button with no extra bookkeeping.
//
// Reusable across all of Magical Moments — not Sports/Fantasy/Picks
// specific. Preserves whatever className/style the caller passes so it
// drops into existing button styling unchanged.
export default function SubmitButton({
  children,
  pendingLabel,
  className,
  style,
  disabled,
  onClick,
  name,
  value,
  dataPicked,
}: {
  /** The button's normal (idle) label/content. */
  children: React.ReactNode;
  /** Shown in place of `children` while the form is submitting — should
   *  read as "in progress," never as a completed result (e.g. "Saving…",
   *  not "Saved"). */
  pendingLabel: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** An additional caller-supplied disable condition (e.g. a real
   *  precondition like "not enough teams to draft") — combined with the
   *  real pending state, never overridden by it. */
  disabled?: boolean;
  /** Runs before submit — e.g. a confirm() gate. Returning false (or
   *  calling event.preventDefault()) stops the submission, and — because
   *  nothing was submitted — useFormStatus never enters a pending state,
   *  so there's no stuck spinner from a cancelled confirmation. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  name?: string;
  value?: string;
  /** Passed through as the data-picked attribute some Sports button styles
   *  key off of (e.g. .mp-row__actions button[data-picked="true"]). */
  dataPicked?: boolean;
}) {
  const { pending } = useFormStatus();
  const isPending = pending;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      data-picked={dataPicked}
      className={className}
      style={style}
      disabled={isPending || disabled}
      aria-busy={isPending}
      aria-disabled={isPending || disabled}
      onClick={onClick}
    >
      {isPending ? pendingLabel : children}
    </button>
  );
}
