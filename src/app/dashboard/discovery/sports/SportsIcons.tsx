// Sophisticated line icons for the Sports landing — no emoji, matching the
// approved cinematic black/gold reference. Same stroke-icon convention as
// components/dashboard/nav-config.tsx's shared Icon set.
const PATHS: Record<string, React.ReactNode> = {
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  trophy: <><path d="M7 4h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Z" /><path d="M7 5H4v1a4 4 0 0 0 4 4M17 5h3v1a4 4 0 0 1-4 4" /><path d="M12 12v4M9 20h6M10 16h4v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 9 5 3-5 3z" /></>,
  people: <><circle cx="8.5" cy="8" r="2.6" /><circle cx="16" cy="9.5" r="2.2" /><path d="M3.5 20a5 5 0 0 1 10 0" /><path d="M13 20a4.5 4.5 0 0 1 8-2.4" /></>,
  star: <path d="M12 4 14.3 9 20 9.5 15.7 13.4 17 19 12 16 7 19 8.3 13.4 4 9.5 9.7 9z" />,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
};

export default function SportsIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{PATHS[name] ?? PATHS.star}</svg>;
}
