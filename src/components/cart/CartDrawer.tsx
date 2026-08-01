"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { getPlan, getAddOn, formatPrice } from "@/lib/plans";

export default function CartDrawer() {
  const { cart, totals, isOpen, closeCart, setQty, removeAddon, setPlan } = useCart();
  const plan = cart.planId ? getPlan(cart.planId) : undefined;
  const hasItems = Boolean(plan) || Object.keys(cart.addons).length > 0;

  return (
    <>
      <div className={`cart-scrim${isOpen ? " is-open" : ""}`} onClick={closeCart} aria-hidden={!isOpen} />
      <aside className={`cart-drawer${isOpen ? " is-open" : ""}`} role="dialog" aria-label="Your cart" aria-hidden={!isOpen}>
        <header className="cart-drawer__head">
          <h2>Your cart</h2>
          <button type="button" className="cart-drawer__close" onClick={closeCart} aria-label="Close cart">✕</button>
        </header>

        <div className="cart-drawer__body">
          {!hasItems ? (
            <div className="cart-empty">
              <p>Your cart is empty.</p>
              <Link href="/pricing" className="btn-gold" onClick={closeCart}>Choose a plan</Link>
            </div>
          ) : (
            <>
              {/* Plan */}
              <div className="cart-section">
                <p className="cart-section__label">Preservation plan</p>
                {plan ? (
                  <div className="cart-line">
                    <div>
                      <b>{plan.name}</b>
                      <span className="cart-line__sub">{plan.termShort} · {plan.priceKind}</span>
                    </div>
                    <div className="cart-line__right">
                      <span>{formatPrice(plan.price)}</span>
                      <button type="button" className="cart-line__remove" onClick={() => setPlan(null)}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <p className="cart-note">No plan selected. <Link href="/pricing" onClick={closeCart}>Choose one →</Link></p>
                )}
              </div>

              {/* Add-ons */}
              {Object.keys(cart.addons).length > 0 && (
                <div className="cart-section">
                  <p className="cart-section__label">Add-ons</p>
                  {Object.entries(cart.addons).map(([id, qty]) => {
                    const a = getAddOn(id);
                    if (!a) return null;
                    return (
                      <div className="cart-line" key={id}>
                        <div>
                          <b>{a.name}</b>
                          <span className="cart-line__sub">{formatPrice(a.price)} {a.unit}{a.recurring ? " · renews annually" : ""}</span>
                        </div>
                        <div className="cart-line__right">
                          {a.quantitySelectable ? (
                            <span className="cart-qty">
                              <button type="button" onClick={() => setQty(id, qty - 1)} aria-label="Decrease">−</button>
                              <span>{qty}</span>
                              <button type="button" onClick={() => setQty(id, qty + 1)} aria-label="Increase" disabled={qty >= a.maxQty}>+</button>
                            </span>
                          ) : (
                            <span>{formatPrice(a.price)}</span>
                          )}
                          <button type="button" className="cart-line__remove" onClick={() => removeAddon(id)}>Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {hasItems && (
          <footer className="cart-drawer__foot">
            <div className="cart-total-row"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
            {totals.tax > 0 && <div className="cart-total-row"><span>Tax</span><span>{formatPrice(totals.tax)}</span></div>}
            <div className="cart-total-row cart-total-row--grand"><span>Total due today</span><span>{formatPrice(totals.total)}</span></div>
            {totals.recurringAnnual > 0 && (
              <p className="cart-recurring">Then {formatPrice(totals.recurringAnnual)}/year for custom domain renewal (disclosed at checkout).</p>
            )}
            <p className="cart-fineprint">USD · taxes may apply · add-ons may be limited by plan</p>
            {!plan && <p className="cart-warn">Select a preservation plan to check out.</p>}
            <Link
              href="/checkout"
              className={`btn-gold cart-checkout${!plan ? " is-disabled" : ""}`}
              onClick={(e) => { if (!plan) e.preventDefault(); else closeCart(); }}
              aria-disabled={!plan}
            >
              Proceed to checkout
            </Link>
            <button type="button" className="cart-continue" onClick={closeCart}>Continue shopping</button>
          </footer>
        )}
      </aside>
    </>
  );
}
