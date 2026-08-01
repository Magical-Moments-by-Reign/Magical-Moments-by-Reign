"use client";

import { useCart } from "@/components/cart/CartProvider";
import type { PlanId } from "@/lib/plans";

export default function AddPlanButton({ planId, label, className }: { planId: PlanId; label: string; className?: string }) {
  const { cart, setPlan, openCart } = useCart();
  const selected = cart.planId === planId;
  return (
    <button
      type="button"
      className={className}
      onClick={() => { setPlan(planId); openCart(); }}
      aria-pressed={selected}
    >
      {selected ? "In your cart ✓" : label}
    </button>
  );
}
