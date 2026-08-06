"use client";

// ── Cart context ────────────────────────────────────────────────
// Holds the selected plan + add-ons, persists to localStorage so the
// cart survives page changes and refreshes for guests. (Signed-in
// persistence to the database is a later enhancement — the checkout
// always revalidates prices server-side regardless.)

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { EMPTY_CART, computeTotals, type CartState, type CartMembership, type OrderTotals } from "@/lib/commerce";
import { getAddOn, type PlanId } from "@/lib/plans";

const STORAGE_KEY = "mmr_cart_v1";

interface CartContextValue {
  cart: CartState;
  totals: OrderTotals;
  itemCount: number;
  ready: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  setPlan: (planId: PlanId | null) => void;
  /** Set (or clear) the membership. Mutually exclusive with a legacy plan. */
  setMembership: (membership: CartMembership | null) => void;
  addAddon: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeAddon: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);

  // Hydrate from localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed && typeof parsed === "object") {
          setCart({ membership: parsed.membership ?? null, planId: parsed.planId ?? null, addons: parsed.addons ?? {} });
        }
      }
    } catch {
      /* ignore corrupt cart */
    }
    setReady(true);
  }, []);

  // Persist.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage full / unavailable */
    }
  }, [cart, ready]);

  const totals = useMemo(() => computeTotals(cart), [cart]);
  const itemCount = totals.itemCount;

  const value: CartContextValue = {
    cart,
    totals,
    itemCount,
    ready,
    isOpen,
    openCart: () => setOpen(true),
    closeCart: () => setOpen(false),
    // A legacy plan and a membership are mutually exclusive — one model at a time.
    setPlan: (planId) => setCart((c) => ({ ...c, planId, membership: planId ? null : c.membership })),
    setMembership: (membership) => setCart((c) => ({ ...c, membership, planId: membership ? null : c.planId })),
    addAddon: (id, qty = 1) =>
      setCart((c) => {
        const addon = getAddOn(id);
        if (!addon) return c;
        const next = Math.max(1, Math.min((c.addons[id] ?? 0) + qty, addon.maxQty));
        return { ...c, addons: { ...c.addons, [id]: next } };
      }),
    setQty: (id, qty) =>
      setCart((c) => {
        const addon = getAddOn(id);
        if (!addon) return c;
        if (qty <= 0) {
          const rest = { ...c.addons };
          delete rest[id];
          return { ...c, addons: rest };
        }
        return { ...c, addons: { ...c.addons, [id]: Math.min(qty, addon.maxQty) } };
      }),
    removeAddon: (id) =>
      setCart((c) => {
        const rest = { ...c.addons };
        delete rest[id];
        return { ...c, addons: rest };
      }),
    clear: () => setCart(EMPTY_CART),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
