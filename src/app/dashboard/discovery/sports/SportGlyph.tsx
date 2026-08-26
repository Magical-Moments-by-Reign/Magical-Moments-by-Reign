// Original, polished sport-identity glyphs — a gold medallion with a
// recognizable ball/equipment silhouette for the sport itself. Used two
// ways: (1) the permanent visual for broad categories that span many
// competitions (Soccer, Rugby, Volleyball, MMA, Golf) so no single league's
// real crest ever stands in for the whole sport, and (2) the graceful
// fallback for single-league cards (NFL, NBA, etc.) on the rare card where
// the live provider hasn't returned a real logo yet — never three-letter
// abbreviation text.

export type SportGlyphKey =
  | "football" | "basketball" | "baseball" | "hockey" | "racing"
  | "soccer" | "rugby" | "volleyball" | "mma" | "golf" | "tennis" | "olympics";

const GOLD = "#e0b651";
const GOLD_SOFT = "rgba(224,182,81,.55)";

function Medallion({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 56 56" className="spx-glyph" aria-hidden="true">
      <circle cx="28" cy="28" r="26" fill="rgba(224,182,81,.08)" stroke={GOLD_SOFT} strokeWidth="1.5" />
      {children}
    </svg>
  );
}

function Football() {
  return (
    <Medallion>
      <ellipse cx="28" cy="28" rx="15" ry="9.5" fill="none" stroke={GOLD} strokeWidth="2" transform="rotate(-38 28 28)" />
      <g stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" transform="rotate(-38 28 28)">
        <line x1="18" y1="28" x2="38" y2="28" />
        <line x1="22" y1="24.5" x2="22" y2="31.5" />
        <line x1="26" y1="23.5" x2="26" y2="32.5" />
        <line x1="30" y1="23.5" x2="30" y2="32.5" />
        <line x1="34" y1="24.5" x2="34" y2="31.5" />
      </g>
    </Medallion>
  );
}

function Basketball() {
  return (
    <Medallion>
      <circle cx="28" cy="28" r="14" fill="none" stroke={GOLD} strokeWidth="2" />
      <path d="M14 28h28M28 14v28M17.5 17.5a19 19 0 0 1 21 0M17.5 38.5a19 19 0 0 0 21 0" fill="none" stroke={GOLD} strokeWidth="1.4" />
    </Medallion>
  );
}

function Baseball() {
  return (
    <Medallion>
      <circle cx="28" cy="28" r="14" fill="none" stroke={GOLD} strokeWidth="2" />
      <path d="M18 16a19 19 0 0 0 0 24M38 16a19 19 0 0 1 0 24" fill="none" stroke={GOLD} strokeWidth="1.3" />
      <path d="M19 18q3 2 3 4M19 38q3-2 3-4M37 18q-3 2-3 4M37 38q-3-2-3-4" fill="none" stroke={GOLD} strokeWidth="1" />
    </Medallion>
  );
}

function Hockey() {
  return (
    <Medallion>
      <ellipse cx="28" cy="34" rx="9" ry="3.4" fill={GOLD} opacity=".85" />
      <path d="M17 14 L23 30 L37 32" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
    </Medallion>
  );
}

function Racing() {
  return (
    <Medallion>
      <g stroke={GOLD} strokeWidth="1.6">
        {[0, 1, 2, 3, 4, 5].map((row) =>
          [0, 1, 2, 3, 4, 5].map((col) =>
            (row + col) % 2 === 0 ? (
              <rect key={`${row}-${col}`} x={16 + col * 4} y={16 + row * 4} width="4" height="4" fill={GOLD} stroke="none" />
            ) : null,
          ),
        )}
      </g>
    </Medallion>
  );
}

function Soccer() {
  return (
    <Medallion>
      <circle cx="28" cy="28" r="14" fill="none" stroke={GOLD} strokeWidth="2" />
      <polygon points="28,20 33,24 31,30 25,30 23,24" fill={GOLD} />
      <path d="M28 20V14M33 24l5-3M31 30l3 6M25 30l-3 6M23 24l-5-3" stroke={GOLD} strokeWidth="1.2" />
    </Medallion>
  );
}

function Rugby() {
  return (
    <Medallion>
      <ellipse cx="28" cy="28" rx="16" ry="9" fill="none" stroke={GOLD} strokeWidth="2" />
      <line x1="12" y1="28" x2="44" y2="28" stroke={GOLD} strokeWidth="1.3" />
      <line x1="20" y1="23.5" x2="20" y2="32.5" stroke={GOLD} strokeWidth="1" />
      <line x1="36" y1="23.5" x2="36" y2="32.5" stroke={GOLD} strokeWidth="1" />
    </Medallion>
  );
}

function Volleyball() {
  return (
    <Medallion>
      <circle cx="28" cy="28" r="14" fill="none" stroke={GOLD} strokeWidth="2" />
      <path d="M28 14a14 14 0 0 1 10 21M28 14a14 14 0 0 0-9 24M18 18a14 14 0 0 0 19 15" fill="none" stroke={GOLD} strokeWidth="1.2" />
    </Medallion>
  );
}

function Mma() {
  return (
    <Medallion>
      <polygon points="28,15 39,21 39,35 28,41 17,35 17,21" fill="none" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="28" cy="28" r="5" fill={GOLD} />
    </Medallion>
  );
}

function Golf() {
  return (
    <Medallion>
      <ellipse cx="28" cy="40" rx="12" ry="3" fill="none" stroke={GOLD} strokeWidth="1.2" />
      <line x1="28" y1="38" x2="28" y2="15" stroke={GOLD} strokeWidth="1.6" />
      <path d="M28 15 38 19 28 23Z" fill={GOLD} />
      <circle cx="17" cy="36" r="3.4" fill="none" stroke={GOLD} strokeWidth="1.4" />
    </Medallion>
  );
}

function Tennis() {
  return (
    <Medallion>
      <circle cx="24" cy="24" r="10" fill="none" stroke={GOLD} strokeWidth="2" transform="rotate(-30 24 24)" />
      <path d="M15 17c3 3 12 3 15-2M17 33c-3-4-3-14 2-18" fill="none" stroke={GOLD} strokeWidth="1.2" transform="rotate(-30 24 24)" />
      <line x1="31" y1="31" x2="41" y2="41" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
    </Medallion>
  );
}

function Olympics() {
  return (
    <Medallion>
      <g fill="none" stroke={GOLD} strokeWidth="1.8">
        <circle cx="20" cy="24" r="5.6" />
        <circle cx="30" cy="24" r="5.6" />
        <circle cx="40" cy="24" r="5.6" />
        <circle cx="25" cy="31" r="5.6" />
        <circle cx="35" cy="31" r="5.6" />
      </g>
    </Medallion>
  );
}

const GLYPHS: Record<SportGlyphKey, () => React.ReactElement> = {
  football: Football,
  basketball: Basketball,
  baseball: Baseball,
  hockey: Hockey,
  racing: Racing,
  soccer: Soccer,
  rugby: Rugby,
  volleyball: Volleyball,
  mma: Mma,
  golf: Golf,
  tennis: Tennis,
  olympics: Olympics,
};

export default function SportGlyph({ sport }: { sport: SportGlyphKey }) {
  const Glyph = GLYPHS[sport] ?? Soccer;
  return <Glyph />;
}
