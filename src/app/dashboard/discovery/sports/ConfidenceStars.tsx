// ── Magical Picks confidence rating — shared between the Make Picks list
// and the small per-sport preview panel, so a pick's confidence reads
// identically everywhere a member sets or sees it.

/** Interactive 1-5 star confidence picker — a real form field (radios,
 *  reverse DOM order + row-reverse so hover/checked fills stars 1..N left
 *  to right, no client JS) meant to live inside the same pick <form> as
 *  the team buttons, so a submitted pick always carries whatever
 *  confidence is currently selected. Pre-checks the member's existing
 *  confidence on this matchup, if any; otherwise nothing is pre-selected
 *  — never a fabricated default. */
export function ConfidencePicker({ gameId, myConfidence }: { gameId: string; myConfidence: number | null }) {
  return (
    <div className="mp-confidence" role="radiogroup" aria-label="Confidence">
      {[5, 4, 3, 2, 1].flatMap((n) => [
        <input key={`i${n}`} type="radio" id={`conf-${gameId}-${n}`} name="confidence" value={n} defaultChecked={myConfidence === n} />,
        <label key={`l${n}`} htmlFor={`conf-${gameId}-${n}`} title={`${n} of 5`}>★</label>,
      ])}
    </div>
  );
}

/** Read-only confidence display — My Picks / Pick History rows, and any
 *  locked matchup where the picker no longer applies. Renders nothing
 *  when no confidence was ever set, rather than a fabricated value. */
export function ConfidenceStars({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <span className="mp-confidence-display" title={`Confidence: ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden="true" className={n <= value ? "is-filled" : ""}>★</span>
      ))}
    </span>
  );
}
