// API-Sports doesn't return player headshots for American football, so
// every roster card would otherwise be a blank circle. This draws a plain
// generic jersey (no team colors, no crest/logo) with the player's real
// jersey number on it — never a fabricated photo, just the real number we
// do have, presented better than an empty placeholder.
export default function JerseyAvatar({ number }: { number?: number }) {
  return (
    <svg viewBox="0 0 64 64" className="spx-roster__jersey" aria-hidden="true">
      <path
        d="M20 6 L8 16 L14 26 L20 22 L20 58 L44 58 L44 22 L50 26 L56 16 L44 6 L38 10 L26 10 Z"
        fill="rgba(224,182,81,.14)"
        stroke="rgba(224,182,81,.4)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {number != null && (
        <text x="32" y="42" textAnchor="middle" fontSize="20" fontWeight="900" fill="var(--gold, #e0b651)">
          {number}
        </text>
      )}
    </svg>
  );
}
