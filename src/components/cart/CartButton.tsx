"use client";

import { useCart } from "@/components/cart/CartProvider";

export default function CartButton() {
  const { itemCount, openCart, ready } = useCart();
  return (
    <button type="button" className="cart-button" onClick={openCart} aria-label={`Open cart (${itemCount} items)`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3h2l.6 3M6 6h15l-1.6 8.4a2 2 0 0 1-2 1.6H8.5a2 2 0 0 1-2-1.6L5 3" />
        <circle cx="9" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      {ready && itemCount > 0 && <span className="cart-button__count">{itemCount}</span>}
    </button>
  );
}
