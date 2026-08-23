import type { SportSlug } from "@/lib/discovery/providers/sports";

// A literal, sport-specific illustration (court/field/rink markings) drawn in
// inline SVG behind each sport's header — never a repeating bar/line pattern,
// which read as generic "scan lines" instead of a recognizable playing
// surface. Pure decoration; never a licensed photo or team artwork.

const LINE = "rgba(224,182,81,.4)";
const GLOW = "mm-sport-glow";

function Glow() {
  return (
    <radialGradient id={GLOW} cx="50%" cy="0%" r="85%">
      <stop offset="0%" stopColor="#ffe9b0" stopOpacity="0.35" />
      <stop offset="55%" stopColor="#e0b651" stopOpacity="0.12" />
      <stop offset="100%" stopColor="#e0b651" stopOpacity="0" />
    </radialGradient>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg className="stadium-backdrop" viewBox="0 0 1200 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><Glow /></defs>
      <rect x="0" y="0" width="1200" height="340" fill={`url(#${GLOW})`} />
      {children}
    </svg>
  );
}

function BasketballCourt() {
  return (
    <Frame>
      <g fill="none" stroke={LINE} strokeWidth="2.5">
        <rect x="60" y="40" width="1080" height="260" rx="4" />
        <line x1="600" y1="40" x2="600" y2="300" />
        <circle cx="600" cy="170" r="60" />
        <circle cx="600" cy="170" r="4" fill={LINE} />
        <path d="M 60 105 A 240 240 0 0 1 60 235" />
        <path d="M 1140 105 A 240 240 0 0 0 1140 235" />
        <rect x="60" y="120" width="150" height="100" />
        <rect x="990" y="120" width="150" height="100" />
        <path d="M 210 100 A 60 60 0 0 1 210 240" />
        <path d="M 990 100 A 60 60 0 0 0 990 240" />
      </g>
    </Frame>
  );
}

function BaseballField() {
  return (
    <Frame>
      <g fill="none" stroke={LINE} strokeWidth="2.5">
        <path d="M 600 300 A 460 460 0 0 1 1060 -20" />
        <path d="M 600 300 A 460 460 0 0 0 140 -20" />
        <path d="M 600 300 L 470 170 L 600 40 L 730 170 Z" />
        <circle cx="600" cy="230" r="22" />
      </g>
      <g fill={LINE}>
        <rect x="592" y="292" width="16" height="16" transform="rotate(45 600 300)" />
        <rect x="455" y="162" width="14" height="14" transform="rotate(45 462 169)" />
        <rect x="593" y="33" width="14" height="14" transform="rotate(45 600 40)" />
        <rect x="723" y="163" width="14" height="14" transform="rotate(45 730 170)" />
      </g>
    </Frame>
  );
}

function FootballField() {
  const yards = [150, 250, 350, 450, 550, 650, 750, 850, 950, 1050];
  return (
    <Frame>
      <g fill="none" stroke={LINE} strokeWidth="2">
        <rect x="60" y="40" width="1080" height="260" />
        <rect x="60" y="40" width="90" height="260" />
        <rect x="1050" y="40" width="90" height="260" />
        {yards.map((x) => <line key={x} x1={x} y1="40" x2={x} y2="300" />)}
        <line x1="600" y1="40" x2="600" y2="300" strokeWidth="3" />
      </g>
    </Frame>
  );
}

function HockeyRink() {
  return (
    <Frame>
      <g fill="none" stroke={LINE} strokeWidth="2.5">
        <rect x="60" y="40" width="1080" height="260" rx="60" />
        <line x1="600" y1="40" x2="600" y2="300" stroke="#c0392b" strokeOpacity="0.5" strokeWidth="3" />
        <line x1="380" y1="40" x2="380" y2="300" strokeOpacity="0.5" />
        <line x1="820" y1="40" x2="820" y2="300" strokeOpacity="0.5" />
        <circle cx="600" cy="170" r="50" />
        <circle cx="260" cy="110" r="40" />
        <circle cx="260" cy="230" r="40" />
        <circle cx="940" cy="110" r="40" />
        <circle cx="940" cy="230" r="40" />
      </g>
    </Frame>
  );
}

function SoccerPitch() {
  return (
    <Frame>
      <g fill="none" stroke={LINE} strokeWidth="2.5">
        <rect x="60" y="40" width="1080" height="260" />
        <line x1="600" y1="40" x2="600" y2="300" />
        <circle cx="600" cy="170" r="55" />
        <rect x="60" y="90" width="120" height="160" />
        <rect x="1020" y="90" width="120" height="160" />
        <rect x="60" y="130" width="50" height="80" />
        <rect x="1090" y="130" width="50" height="80" />
      </g>
    </Frame>
  );
}

function RugbyField() {
  const lines = [180, 340, 500, 700, 860, 1020];
  return (
    <Frame>
      <g fill="none" stroke={LINE} strokeWidth="2">
        <rect x="60" y="40" width="1080" height="260" />
        <rect x="60" y="40" width="80" height="260" />
        <rect x="1060" y="40" width="80" height="260" />
        {lines.map((x) => <line key={x} x1={x} y1="40" x2={x} y2="300" />)}
        <line x1="600" y1="40" x2="600" y2="300" strokeWidth="3" />
      </g>
    </Frame>
  );
}

function VolleyballCourt() {
  return (
    <Frame>
      <g fill="none" stroke={LINE} strokeWidth="2.5">
        <rect x="180" y="70" width="840" height="200" />
        <line x1="600" y1="70" x2="600" y2="270" strokeWidth="4" stroke="#c0392b" strokeOpacity="0.45" />
        <line x1="450" y1="70" x2="450" y2="270" />
        <line x1="750" y1="70" x2="750" y2="270" />
      </g>
    </Frame>
  );
}

function Octagon() {
  const pts = "600,50 830,120 900,320 300,320 370,120";
  return (
    <Frame>
      <g fill="none" stroke={LINE} strokeWidth="3">
        <polygon points={pts} />
        <circle cx="600" cy="200" r="70" />
      </g>
    </Frame>
  );
}

function RaceTrack() {
  return (
    <Frame>
      <g fill="none" stroke={LINE} strokeWidth="3">
        <path d="M 100 250 C 100 120, 300 60, 500 90 C 700 120, 700 220, 900 220 C 1050 220, 1100 150, 1100 260 C 1100 320, 950 320, 700 300 C 450 280, 300 320, 150 300 C 100 295, 100 280, 100 250 Z" />
      </g>
    </Frame>
  );
}

const BY_SPORT: Partial<Record<SportSlug, () => React.ReactElement>> = {
  nba: BasketballCourt,
  mlb: BaseballField,
  ncaabaseball: BaseballField,
  nfl: FootballField,
  ncaaf: FootballField,
  nhl: HockeyRink,
  soccer: SoccerPitch,
  rugby: RugbyField,
  volleyball: VolleyballCourt,
  mma: Octagon,
  f1: RaceTrack,
};

export default function SportBackdrop({ sport }: { sport: SportSlug }) {
  const Illustration = BY_SPORT[sport] ?? BasketballCourt;
  return <Illustration />;
}
