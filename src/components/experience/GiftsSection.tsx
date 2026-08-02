import type { GiftData } from "@/lib/gifts";
import { cashLink, cashLabel } from "@/lib/gifts";

/** Guest-facing Gifts & Registry block. Rendered inside the themed
 *  experience wrapper so it inherits the experience palette/fonts. */
export default function GiftsSection({ gifts }: { gifts: GiftData }) {
  const hasRegistries = gifts.registries.length > 0;
  const hasCash = gifts.cashMethods.length > 0;
  if (!hasRegistries && !hasCash) return null;

  return (
    <section className="mbr-section mbr-gifts" id="gifts">
      <div className="mbr-container mbr-center">
        <span className="mbr-eyebrow mbr-gifts__eyebrow">With love &amp; gratitude</span>
        <h2 className="mbr-h2">Gifts &amp; Registry</h2>
        {gifts.message && <p className="mbr-prose mbr-gifts__msg">{gifts.message}</p>}

        {hasRegistries && (
          <div className="mbr-gifts__group">
            <h3 className="mbr-gifts__label">Our registries</h3>
            <div className="mbr-gifts__buttons">
              {gifts.registries.map((r, i) => (
                <a key={i} className="mbr-btn mbr-btn--accent mbr-gifts__btn" href={normalize(r.url)} target="_blank" rel="noreferrer">
                  {r.label || "View registry"} →
                </a>
              ))}
            </div>
          </div>
        )}

        {hasCash && (
          <div className="mbr-gifts__group">
            <h3 className="mbr-gifts__label">Send a cash gift</h3>
            <div className="mbr-gifts__buttons">
              {gifts.cashMethods.map((m, i) => {
                const link = cashLink(m);
                return link.href ? (
                  <a key={i} className="mbr-btn mbr-btn--primary mbr-gifts__btn" href={link.href} target="_blank" rel="noreferrer">
                    {cashLabel(m.platform)} · {link.display}
                  </a>
                ) : (
                  <span key={i} className="mbr-gifts__zelle">
                    <b>{cashLabel(m.platform)}</b> — send to <span>{link.display}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <p className="mbr-note mbr-gifts__fine">
          Gifts go directly to the family through their own accounts — Magical Moments by Reign never holds or processes funds.
        </p>
      </div>
    </section>
  );
}

function normalize(url: string): string {
  const u = url.trim();
  if (!u) return "#";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
