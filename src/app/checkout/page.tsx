import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import { getPlan, COMPARISON_ROWS, type PlanId } from "@/lib/plans";
import "./checkout.css";

export const metadata: Metadata = {
  title: "Review your plan",
  description: "Confirm your Memory Preservation plan before checkout.",
};

function valueFor(label: string, planId: PlanId): string {
  const row = COMPARISON_ROWS.find((r) => r.label === label);
  return row ? row.values[planId] : "—";
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planId } = await searchParams;
  const plan = planId ? getPlan(planId) : undefined;
  if (!plan) notFound();

  const id = plan.id as PlanId;
  const storage = {
    photo: valueFor("Photo storage", id),
    video: valueFor("Video storage", id),
    ask: valueFor("Ask Magical usage", id),
    aiVideo: valueFor("AI video enhancements", id),
  };

  return (
    <div className="co">
      <SiteNav />
      <header className="co-header">
        <div className="container">
          <Link href="/pricing" className="co-back">
            ← Back to plans
          </Link>
          <span className="co-eyebrow">Review &amp; confirm</span>
          <h1>
            Preserve your moment with the <em>{plan.name}</em>
          </h1>
          <p>
            Here&apos;s everything included, so there are no surprises — review it,
            add anything you&apos;d like, and confirm to continue.
          </p>
        </div>
      </header>

      <main className="container co-main">
        <CheckoutForm plan={plan} storage={storage} />
      </main>

      <SiteFooter />
    </div>
  );
}
