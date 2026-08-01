// ── Occasion icons ──────────────────────────────────────────────
// Elegant line-art icons for the "Choose Your Story" cards, so the
// occasion selector is illustrated — not a row of raw emojis.

interface Props {
  name: string;
  size?: number;
  className?: string;
}

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ICONS: Record<string, React.ReactNode> = {
  rings: (<><circle cx="9" cy="14" r="6" {...P} /><circle cx="16" cy="14" r="6" {...P} /><path d="M12 4l2 3h-4l2-3z" {...P} /></>),
  ring: (<><circle cx="12" cy="15" r="6" {...P} /><path d="M12 3l2.5 4h-5L12 3z" {...P} /></>),
  cake: (<><path d="M4 21h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7z" {...P} /><path d="M4 16c2 1 3-1 4 0s2 1 4 0 3-1 4 0 3 1 4 0" {...P} /><path d="M12 6v3M9 7v2M15 7v2" {...P} /><circle cx="12" cy="4.5" r="0.6" fill="currentColor" /></>),
  baby: (<><circle cx="12" cy="8" r="4" {...P} /><path d="M6 21c0-4 3-6 6-6s6 2 6 6" {...P} /><path d="M10 8h.01M14 8h.01" {...P} /><path d="M10.5 10c1 1 2 1 3 0" {...P} /></>),
  cap: (<><path d="M2 9l10-4 10 4-10 4L2 9z" {...P} /><path d="M6 11v4c0 1 3 2.5 6 2.5s6-1.5 6-2.5v-4" {...P} /><path d="M22 9v5" {...P} /></>),
  heart: (<path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3 1.2 4 2.5 1-1.3 2-2.5 4-2.5 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z" {...P} />),
  plane: (<path d="M10 3l1.5 7L20 6l-6 6 2 9-4-6-6 3 4-6-6-4 12 0" {...P} />),
  home: (<><path d="M4 11l8-6 8 6" {...P} /><path d="M6 10v9h12v-9" {...P} /><path d="M10 19v-5h4v5" {...P} /></>),
  flag: (<><path d="M5 21V4" {...P} /><path d="M5 4h11l-2 3 2 3H5" {...P} /></>),
  tree: (<><path d="M12 3l5 6h-3l4 5h-4l3 4H8l3-4H7l4-5H8l4-6z" {...P} /><path d="M12 22v-3" {...P} /></>),
  sun: (<><circle cx="12" cy="12" r="4" {...P} /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" {...P} /></>),
  dove: (<path d="M4 14c4 0 6-3 8-3s3 2 6 1c-1 3-4 5-7 5-4 0-7-1-7-3zM12 11c1-3 4-4 7-3" {...P} />),
  crown: (<><path d="M4 8l3 8h10l3-8-5 4-3-6-3 6-5-4z" {...P} /><path d="M6 19h12" {...P} /></>),
  balloon: (<><path d="M12 3c3 0 5 2.5 5 5.5S14.5 15 12 15 7 11.5 7 8.5 9 3 12 3z" {...P} /><path d="M12 15v3M12 21c-1 0-1-1 0-1.5" {...P} /></>),
  trophy: (<><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" {...P} /><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" {...P} /><path d="M12 13v4M9 20h6M10 17h4v3h-4z" {...P} /></>),
  star: (<path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 6.6 19.6l1.2-6L3.3 9.4l6.1-.8L12 3z" {...P} />),
  gift: (<><path d="M4 11h16v9H4z" {...P} /><path d="M2 8h20v3H2zM12 8v12" {...P} /><path d="M12 8S10 3 7.5 4.5 10 8 12 8zM12 8s2-5 4.5-3.5S14 8 12 8z" {...P} /></>),
  sparkle: (<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" {...P} /><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z" {...P} /></>),
};

export default function OccasionIcon({ name, size = 28, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" role="img">
      {ICONS[name] ?? ICONS.sparkle}
    </svg>
  );
}
