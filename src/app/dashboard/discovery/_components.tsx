import type { ReactNode } from "react";

export function DiscoveryPageHeader({ title, description }: { title: string; description: ReactNode }) {
  return (
    <header className="disc-page-head">
      <span className="disc-page-head__eyebrow">Magical Discovery</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function DiscoveryEmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="disc-pending" role="status">
      <span className="disc-pending__mark" aria-hidden="true">✦</span>
      <div><b>{title}</b><p>{children}</p></div>
    </div>
  );
}
