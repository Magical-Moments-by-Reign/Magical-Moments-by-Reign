import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { SERVICES, resolveStatus, STATUS_LABEL } from "@/lib/concierge/registry";
import type { ServiceGroup } from "@/lib/concierge/types";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import "../concierge-hub.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Browse Our Services", robots: { index: false } };

const GROUPS: { id: ServiceGroup; label: string }[] = [
  { id: "travel", label: "Travel" },
  { id: "celebrations", label: "Celebrations & Events" },
  { id: "food", label: "Food & Dining" },
  { id: "keepsakes", label: "Keepsakes & Gifts" },
  { id: "beauty", label: "Beauty" },
  { id: "family", label: "Family & Milestones" },
  { id: "home", label: "Home" },
  { id: "lifestyle", label: "Lifestyle & Errands" },
];

export default async function ConciergeHubPage() {
  await requireAccount("/dashboard/concierge/services");
  // Disabled services are turned off by the owner — hidden from members entirely.
  const withStatus = SERVICES
    .map((s) => ({ ...s, status: resolveStatus(s) }))
    .filter((s) => s.status !== "disabled");
  const liveCount = withStatus.filter((s) => s.status === "live" || s.status === "test").length;

  return (
    <>
      <div className="pg-head">
        <Link href="/dashboard/concierge" className="cx-back">← Concierge &amp; Reservations</Link>
        <span className="pg-eyebrow">Concierge</span>
        <h1 className="pg-title">Browse Our Services</h1>
        <p className="pg-sub">One concierge for every part of the experience. {liveCount > 0 ? "Connected services are ready now; " : ""}the rest are on the way — ask the Concierge anytime and it will help you plan while we connect direct booking.</p>
        <div className="pg-actions">
          <OpenConciergeButton className="btn btn--gold">Chat with Concierge</OpenConciergeButton>
        </div>
      </div>

      {GROUPS.map((g) => {
        const items = withStatus.filter((s) => s.group === g.id);
        if (items.length === 0) return null;
        return (
          <section key={g.id} className="sec">
            <div className="sec__h"><h2 className="sec__t">{g.label}</h2></div>
            <div className="cx-grid">
              {items.map((s) => (
                <article key={s.id} className={`cx-card cx-card--${s.status}`}>
                  <div className="cx-card__top">
                    <span className="cx-emoji" aria-hidden="true">{s.emoji}</span>
                    <span className={`cx-badge cx-badge--${s.status}`}>{STATUS_LABEL[s.status]}</span>
                  </div>
                  <h3 className="cx-card__t">{s.label}</h3>
                  <p className="cx-card__b">{s.blurb}</p>
                  {s.provider && <p className="cx-card__prov">Powered by {s.provider}{s.status === "test" ? " · test mode" : ""}</p>}
                  <div className="cx-card__act">
                    {s.status !== "coming_soon" && s.href ? (
                      <Link href={s.href} className="btn btn--sm btn--gold">Open {s.label}</Link>
                    ) : (
                      <OpenConciergeButton className="btn btn--sm btn--ghost" seed={`Help me with ${s.label.toLowerCase()}.`}>Ask Concierge</OpenConciergeButton>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <p className="note" style={{ marginTop: "1.6rem" }}>
        New services plug into this same Concierge — no rebuild. As each provider connects, its card turns from “Coming Soon” to “Test mode,” then “Live.”
      </p>
    </>
  );
}
