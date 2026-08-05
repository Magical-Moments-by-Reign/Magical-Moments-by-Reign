"use client";

// ── Purchase Review screen ──────────────────────────────────────
// Journey's mandatory stop before any payment. It shows the full order, every
// protective advisory, and the Protection Promise checklist. NO payment is
// processed until the member explicitly taps Confirm. Reusable for memberships,
// gifts, flights, and any future purchase — it renders whatever order it's given
// and never fabricates prices, tracking, or merchant facts.

import { money, type Order, type PurchaseReview as Review } from "@/lib/commerce/protection";
import { CAPABILITY_LABELS, type MerchantProfile } from "@/lib/commerce/merchants";
import "./purchase-review.css";

const LEVEL_ICON = { info: "ℹ︎", suggest: "✦", warn: "⚠" } as const;
const PROMISE_ICON = { ok: "✓", warn: "⚠", pending: "…" } as const;

export default function PurchaseReview({
  order, review, merchant, demo = false, onConfirm, onEdit, onCancel,
}: {
  order: Order; review: Review; merchant: MerchantProfile; demo?: boolean;
  onConfirm: () => void; onEdit: () => void; onCancel: () => void;
}) {
  const supported = CAPABILITY_LABELS.filter((c) => merchant.capabilities[c.key]).map((c) => c.label);

  return (
    <div className="pr">
      <div className="pr__head">
        <span className="pr__eyebrow">Journey Purchase Protection™</span>
        <h2 className="pr__title">Review before you buy</h2>
        <p className="pr__reason">{review.reason}</p>
        {demo && <p className="pr__demo">Preview only — no payment is processed.</p>}
      </div>

      {/* Advisories */}
      {review.advisories.length > 0 && (
        <div className="pr-advs">
          {review.advisories.map((a) => (
            <div key={a.id} className={`pr-adv pr-adv--${a.level}`}>
              <span className="pr-adv__ic" aria-hidden="true">{LEVEL_ICON[a.level]}</span>
              <div className="pr-adv__body">
                <div className="pr-adv__t">{a.title}{a.comingSoon && <span className="pr-adv__soon">Coming Soon</span>}</div>
                <div className="pr-adv__d">{a.detail}</div>
                {a.options && !a.comingSoon && (
                  <div className="pr-adv__opts">{a.options.map((o) => <span key={o} className="pr-adv__opt">{o}</span>)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pr-grid">
        {/* Order */}
        <div className="pr-card">
          <div className="pr-merchant">
            {merchant.logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={merchant.logo} alt="" width={30} height={30} />
              : <span className="pr-merchant__mark" aria-hidden="true">✦</span>}
            <span className="pr-merchant__name">{merchant.name}{!merchant.verified && <span className="pr-merchant__unv">unverified merchant</span>}</span>
          </div>

          <div className="pr-items">
            {order.items.map((it, i) => (
              <div key={i} className="pr-item">
                <span className="pr-item__img" style={it.image ? { backgroundImage: `url(${it.image})` } : undefined} aria-hidden="true" />
                <div className="pr-item__main">
                  <div className="pr-item__name">{it.name}</div>
                  {it.description && <div className="pr-item__desc">{it.description}</div>}
                  <div className="pr-item__qty">Qty {it.quantity} · {money(it.unitPrice, order.currency)} each</div>
                </div>
                <div className="pr-item__line">{money(it.unitPrice * it.quantity, order.currency)}</div>
              </div>
            ))}
          </div>

          <dl className="pr-tot">
            <div><dt>Subtotal</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
            <div><dt>Taxes</dt><dd>{money(order.tax, order.currency)}</dd></div>
            <div><dt>Shipping</dt><dd>{order.shipping ? money(order.shipping, order.currency) : "—"}</dd></div>
            {order.discount > 0 && <div className="pr-tot__save"><dt>Discounts{order.couponsApplied?.length ? ` (${order.couponsApplied.join(", ")})` : ""}</dt><dd>−{money(order.discount, order.currency)}</dd></div>}
            <div className="pr-tot__grand"><dt>Grand total</dt><dd>{money(order.total, order.currency)}</dd></div>
          </dl>
        </div>

        {/* Delivery + promise */}
        <div className="pr-card">
          {(order.deliveryAddress || order.recipient || order.estimatedDelivery || order.giftMessage) && (
            <div className="pr-delivery">
              <h4>Delivery</h4>
              {order.recipient && <p><span>Recipient</span>{order.recipient}</p>}
              {order.deliveryAddress && <p><span>Address</span>{order.deliveryAddress}</p>}
              {order.estimatedDelivery && <p><span>Estimated</span>{order.estimatedDelivery}</p>}
              {order.giftMessage && <p><span>Gift message</span><i>&ldquo;{order.giftMessage}&rdquo;</i></p>}
            </div>
          )}

          <h4 className="pr-promise__h">Journey Protection Promise™</h4>
          <ul className="pr-promise">
            {review.promise.map((p) => (
              <li key={p.label} className={`pr-promise__i pr-promise__i--${p.state}`}>
                <span aria-hidden="true">{PROMISE_ICON[p.state]}</span>{p.label}
              </li>
            ))}
          </ul>

          {supported.length > 0 && (
            <p className="pr-caps"><b>This merchant supports:</b> {supported.join(" · ")}</p>
          )}
        </div>
      </div>

      {/* Actions — no payment until Confirm */}
      <div className="pr-actions">
        <button type="button" className="pr-btn pr-btn--confirm" onClick={onConfirm}>🟢 Confirm Purchase</button>
        <button type="button" className="pr-btn pr-btn--edit" onClick={onEdit}>Edit Order</button>
        <button type="button" className="pr-btn pr-btn--cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
