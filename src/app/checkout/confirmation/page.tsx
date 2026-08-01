import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/plans";
import "../checkout.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order confirmation" };

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: number } = await searchParams;
  const order = number
    ? await prisma.order.findUnique({ where: { number }, include: { items: true } })
    : null;

  return (
    <div className="ck">
      <SiteNav />
      <main className="container ck-main">
        {!order ? (
          <div className="ck-confirm">
            <h1>We couldn&apos;t find that order</h1>
            <p>Please check your confirmation link, or contact us for help.</p>
            <Link href="/contact" className="btn-gold">Contact support</Link>
          </div>
        ) : (
          <div className="ck-confirm">
            <div className="ck-confirm__badge" aria-hidden="true">✦</div>
            <span className="eyebrow" style={{ color: "var(--gold-deep)" }}>
              {order.paymentStatus === "PAID" ? "Payment received" : "Order recorded"}
            </span>
            <h1>Thank you{order.experienceTitle ? `, for ${order.experienceTitle}` : ""}!</h1>
            <p className="ck-confirm__number">Order <strong>{order.number}</strong></p>
            {order.paymentStatus !== "PAID" && (
              <p className="ck-confirm__pending">
                Your order is recorded as <strong>pending payment</strong>. Secure card
                payment activates once Square is connected — we&apos;ll follow up to complete it.
              </p>
            )}

            <ul className="ck-confirm__items">
              {order.items.map((it) => (
                <li key={it.id}>
                  <span>{it.label}{it.quantity > 1 ? ` × ${it.quantity}` : ""}</span>
                  <span>{formatPrice(it.amount / 100)}</span>
                </li>
              ))}
              <li className="ck-confirm__total"><span>Total</span><span>{formatPrice(order.total / 100)}</span></li>
            </ul>

            {order.customDomain && (
              <p className="ck-confirm__note">Custom domain requested: <strong>{order.customDomain}</strong> — availability will be confirmed.</p>
            )}

            <p className="ck-confirm__hint">A receipt has been prepared for {order.number}. Next, set up your experience.</p>
            <div className="ck-confirm__actions">
              <Link href="/create" className="btn-gold">Continue setup ✦</Link>
              <Link href="/dashboard" className="btn btn-dark">View my dashboard</Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
