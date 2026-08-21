// API-Sports doesn't return player headshots for American football, so
// every roster card would otherwise be a blank circle. This draws a plain,
// original jersey silhouette (V-neck, cap sleeves, shoulder stripe accents
// in the site's own gold/charcoal palette — never a specific team's real
// licensed colorway, wordmark, or swoosh) with the player's real jersey
// number in blue — never a fabricated photo, just the real number we do
// have, presented better than an empty placeholder.
export default function JerseyAvatar({ number }: { number?: number }) {
  return (
    <svg viewBox="0 0 64 64" className="spx-roster__jersey" aria-hidden="true">
      {/* Body + cap sleeves */}
      <path
        d="M22 4 L10 12 L15 22 L21 19 L21 58 L43 58 L43 19 L49 22 L54 12 L42 4 L34 9 L30 9 Z"
        fill="rgba(244,241,234,.92)"
        stroke="rgba(224,182,81,.5)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* V-neck collar */}
      <path d="M27 4.5 L32 12 L37 4.5" fill="none" stroke="rgba(224,182,81,.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* Shoulder stripe accents */}
      <path d="M13 13.5 L20 9.5 L21.5 13.5 L15 18 Z" fill="rgba(224,182,81,.55)" />
      <path d="M51 13.5 L44 9.5 L42.5 13.5 L49 18 Z" fill="rgba(224,182,81,.55)" />
      {number != null && (
        <text x="32" y="42" textAnchor="middle" fontSize="19" fontWeight="900" fill="#2f6fed">
          {number}
        </text>
      )}
    </svg>
  );
}
