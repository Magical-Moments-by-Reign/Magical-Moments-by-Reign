import type { GiftData } from "@/lib/gifts";
import { cashLink, cashLabel, giftWording } from "@/lib/gifts";

/** Guest-facing Gifts & Registry block. Rendered inside the themed
 *  experience wrapper so it inherits the experience palette/fonts.
 *  Wording adapts to the occasion; it's a reusable module for every type. */
export default function GiftsSection({ gifts, type }: { gifts: GiftData; type?: string }) {
  const hasRegistries = gifts.registries.length > 0;
  const hasCash = gifts.cashMethods.length > 0;
  const hasItems = gifts.items.length > 0;
  const hasCharity = !!gifts.charity?.name;
  if (!hasRegistries && !hasCash && !hasItems && !hasCharity) return null;

  const w = giftWording(type);

  return (
    <section className="mbr-section mbr-gifts" id="gifts">
      <div className="mbr-container mbr-center">
        <span className="mbr-eyebrow mbr-gifts__eyebrow">{w.eyebrow}</span>
        <h2 className="mbr-h2">{w.heading}</h2>
        <p className="mbr-prose mbr-gifts__msg">{gifts.message || w.intro}</p>

        {hasItems && (
          <div className="mbr-gifts__group">
            <h3 className="mbr-gifts__label">Gift ideas</h3>
            <div className="mbr-gifts__items">
              {gifts.items.map((it) => (
                <article key={it.id} className={`mbr-giftcard${it.purchased ? " mbr-giftcard--got" : ""}`}>
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="mbr-giftcard__img" src={normalize(it.image)} alt={it.name} loading="lazy" />
                  )}
                  <div className="mbr-giftcard__body">
                    <div className="mbr-giftcard__name">{it.name}</div>
                    {(it.store || it.price) && (
                      <div className="mbr-giftcard__meta">{[it.store, it.price].filter(Boolean).join(" · ")}</div>
                    )}
                    {it.description && <p className="mbr-giftcard__desc">{it.description}</p>}
                    {it.purchased ? (
                      <span className="mbr-giftcard__got">✓ Purchased — thank you</span>
                    ) : it.url ? (
                      <a className="mbr-btn mbr-btn--accent mbr-giftcard__btn" href={normalize(it.url)} target="_blank" rel="noreferrer">View gift →</a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

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

        {hasCharity && gifts.charity && (
          <div className="mbr-gifts__group mbr-gifts__charity">
            <h3 className="mbr-gifts__label">In lieu of gifts</h3>
            <div className="mbr-charity">
              <div className="mbr-charity__name">{gifts.charity.name}</div>
              {gifts.charity.cause && <p className="mbr-charity__cause">{gifts.charity.cause}</p>}
              {(gifts.charity.goal || gifts.charity.raised) && (
                <p className="mbr-charity__meta">
                  {gifts.charity.raised ? `${gifts.charity.raised} raised` : ""}{gifts.charity.raised && gifts.charity.goal ? " · " : ""}{gifts.charity.goal ? `Goal ${gifts.charity.goal}` : ""}
                </p>
              )}
              {gifts.charity.url && (
                <a className="mbr-btn mbr-btn--primary mbr-gifts__btn" href={normalize(gifts.charity.url)} target="_blank" rel="noreferrer">Donate →</a>
              )}
            </div>
          </div>
        )}

        <p className="mbr-note mbr-gifts__fine">
          Registry and payment links open the family&apos;s own third-party accounts — Magical Moments by Reign never holds or processes funds.
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
