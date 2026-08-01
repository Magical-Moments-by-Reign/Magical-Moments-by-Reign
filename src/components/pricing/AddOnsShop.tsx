"use client";

import { useCart } from "@/components/cart/CartProvider";
import { ADD_ONS, getPlan, formatPrice } from "@/lib/plans";
import OccasionIcon from "@/components/OccasionIcon";

export default function AddOnsShop() {
  const { cart, addAddon, setQty, removeAddon, openCart } = useCart();

  return (
    <div className="shop">
      {ADD_ONS.map((a) => {
        const qty = cart.addons[a.id] ?? 0;
        const added = qty > 0;
        const bestWith = a.bestWith ? getPlan(a.bestWith) : undefined;
        return (
          <article key={a.id} className={`shop-card${added ? " is-added" : ""}`}>
            {added && <span className="shop-card__check" aria-hidden="true">✓</span>}
            <div className="shop-card__top">
              <span className="shop-card__icon"><OccasionIcon name={a.icon} size={22} /></span>
              <span className="shop-card__price">
                {formatPrice(a.price)} <small>{a.unit}</small>
              </span>
            </div>
            <h3 className="shop-card__name">{a.name}</h3>
            <p className="shop-card__desc">{a.description}</p>
            <ul className="shop-card__meta">
              <li>{a.recurring ? "Renews annually" : "One-time"}</li>
              {a.requiresShipping && <li>Ships to you</li>}
              {a.maxQty === 1 && <li>One per experience</li>}
              {a.requiresAck && <li>Availability confirmed at checkout</li>}
            </ul>
            {bestWith && <p className="shop-card__best">Best with {bestWith.name}</p>}

            {!added ? (
              <button type="button" className="shop-card__add" onClick={() => { addAddon(a.id, 1); openCart(); }}>
                Add to cart
              </button>
            ) : (
              <div className="shop-card__controls">
                {a.quantitySelectable ? (
                  <span className="shop-qty">
                    <button type="button" onClick={() => setQty(a.id, qty - 1)} aria-label={`Decrease ${a.name}`}>−</button>
                    <span aria-live="polite">{qty}</span>
                    <button type="button" onClick={() => setQty(a.id, qty + 1)} disabled={qty >= a.maxQty} aria-label={`Increase ${a.name}`}>+</button>
                  </span>
                ) : (
                  <span className="shop-added">Added ✓</span>
                )}
                <button type="button" className="shop-card__remove" onClick={() => removeAddon(a.id)}>Remove</button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
