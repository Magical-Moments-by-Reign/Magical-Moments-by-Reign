import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getServiceCategory } from "@/lib/reservations/catalog";
import { listSaved, type SavedServiceRecord } from "@/lib/reservations/saved";
import { removeSavedAction } from "../actions";
import "../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Saved Services", robots: { index: false } };

export default async function SavedPage() {
  const account = await requireAccount("/dashboard/luxury-services/saved");
  const saved = await listSaved(account.id).catch(() => []);

  // Group by collection (favorites). Uncollected items go under "Saved".
  const groups = new Map<string, SavedServiceRecord[]>();
  for (const s of saved) {
    const key = s.collection?.trim() || "Saved";
    const bucket = groups.get(key) ?? [];
    bucket.push(s);
    groups.set(key, bucket);
  }

  return (
    <>
      <div className="pg-head">
        <Link href="/dashboard/luxury-services" className="cx-back">← Luxury Services</Link>
        <span className="pg-eyebrow">❤️ Favorites</span>
        <h1 className="pg-title">My Saved Services</h1>
        <p className="pg-sub">Everything you&apos;ve saved for later, organized into collections.</p>
      </div>

      <p className="cx-honest" style={{ marginTop: 0 }}>
        Saved prices are estimates from our partners and may change — we can never promise a price will still be available. When you&apos;re ready, we&apos;ll check live pricing before anything is booked.
      </p>

      {saved.length === 0 ? (
        <div className="cx-empty">
          <p>You haven&apos;t saved anything yet. Save flights, hotels, restaurants, packages and more while you browse — no purchase required.</p>
          <Link href="/dashboard/luxury-services" className="btn btn--gold">Explore Luxury Services</Link>
        </div>
      ) : (
        [...groups.entries()].map(([collection, items]) => (
          <section key={collection} className="sec">
            <div className="sec__h"><h2 className="sec__t">{collection}</h2></div>
            <div className="ls-savedlist">
              {items.map((s) => {
                const svc = getServiceCategory(s.serviceType);
                return (
                  <article key={s.id} className="ls-savedcard">
                    <div className="ls-savedcard__top">
                      <span className="ls-savedcard__icon" aria-hidden="true">{svc?.icon ?? "✦"}</span>
                      <span className="ls-savedcard__t">{s.label}</span>
                    </div>
                    <div className="cx-detail">
                      <Row label="Service" value={svc?.brandedLabel} />
                      <Row label="Saved" value={s.createdAt.toLocaleDateString()} />
                      <Row label="Provider" value={s.provider} />
                      <Row label="Estimated price" value={s.estimatedPrice} />
                      <Row label="Journey notes" value={s.journeyNotes} />
                      <Row label="Hold expires" value={s.expiresAt ? s.expiresAt.toLocaleString() : null} />
                    </div>
                    <div className="cx-actionbar" style={{ marginTop: ".6rem" }}>
                      <Link href={`/dashboard/luxury-services/${s.serviceType}`} className="btn btn--sm btn--gold">Continue</Link>
                      <form action={removeSavedAction}><input type="hidden" name="id" value={s.id} /><button type="submit" className="btn btn--sm btn--ghost cx-danger">Remove</button></form>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="cx-drow">
      <span className="cx-drow__k">{label}</span>
      <span className="cx-drow__v">{value}</span>
    </div>
  );
}
