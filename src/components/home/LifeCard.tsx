import Link from "next/link";

// One warm "room" on the Home experience. A card is either LIVE (links
// somewhere real) or a gentle "coming soon" placeholder — never a fake action.
export interface LifeCardProps {
  icon: string;            // emoji / glyph
  title: string;
  description: string;
  href?: string;           // when live
  cta?: string;            // link label (live cards)
  comingSoon?: boolean;
  accent?: boolean;        // slightly elevated treatment for the hero card
  children?: React.ReactNode; // optional live content (counts, list, etc.)
}

export default function LifeCard({
  icon, title, description, href, cta, comingSoon, accent, children,
}: LifeCardProps) {
  const body = (
    <>
      <div className="lifecard__top">
        <span className="lifecard__icon" aria-hidden="true">{icon}</span>
        {comingSoon && <span className="lifecard__soon">Coming soon</span>}
      </div>
      <h3 className="lifecard__title">{title}</h3>
      <p className="lifecard__desc">{description}</p>
      {children && <div className="lifecard__content">{children}</div>}
      {href && !comingSoon && (
        <span className="lifecard__cta">{cta ?? "Open"} <span aria-hidden="true">→</span></span>
      )}
    </>
  );

  const className = `lifecard${accent ? " lifecard--accent" : ""}${comingSoon ? " lifecard--soon" : ""}`;

  if (href && !comingSoon) {
    return <Link href={href} className={className}>{body}</Link>;
  }
  return <div className={className} aria-disabled={comingSoon || undefined}>{body}</div>;
}
