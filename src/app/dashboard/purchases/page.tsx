import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { membershipDisplay, isPaidMember } from "@/lib/membership-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Purchases", robots: { index: false } };

const money = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);

export default async function PurchasesPage() {
  const account = await requireAccount("/dashboard/purchases");
  const [orders, roleRow] = await Promise.all([
    prisma.order.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, number: true, experienceTitle: true, total: true, currency: true, paymentStatus: true, createdAt: true },
    }).catch(() => []),
    prisma.account.findUnique({ where: { id: account.id }, select: { staffRoles: true } }),
  ]);
  let owner = false;
  try { owner = (JSON.parse(roleRow?.staffRoles || "[]") as unknown[]).includes("owner"); } catch { owner = false; }

  const tier = membershipDisplay(account.membershipTier, { owner });
  const paid = isPaidMember(account.membershipTier);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Billing</span>
        <h1 className="pg-title">Purchases</h1>
        <p className="pg-sub">Your membership and every Journey or add-on you&rsquo;ve purchased.</p>
      </div>

      {/* Membership status — real, from the account */}
      <div className="card" style={{ marginBottom: "1.4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div className="stat__k">Current membership</div>
            <div style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.6rem", color: "var(--espresso)" }}>{tier}</div>
            <p className="note">{owner ? "No expiration · no renewal · no payment required." : paid ? "Active membership." : "Free Forever — upgrade anytime to unlock creating Journeys."}</p>
          </div>
          <Link href="/membership" className="btn btn--gold">{paid ? "Manage membership" : "View Memberships"}</Link>
        </div>
      </div>

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Billing history</h2></div>
        {orders.length ? (
          <div className="list">
            {orders.map((o) => (
              <div key={o.id} className="row">
                <div className="row__main">
                  <div className="row__t">{o.experienceTitle || `Order ${o.number}`}</div>
                  <div className="row__s">{fmt(o.createdAt)} · {o.number} · {o.paymentStatus}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="row__t">{money(o.total, o.currency)}</div>
                  <span className="badge badge--soon" style={{ marginTop: ".2rem", display: "inline-block" }}>Receipt · Coming Soon</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__mark"><svg viewBox="0 0 24 24"><path d="M3 8h11v9H3z" /><path d="M14 11h4l3 3v3h-3" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></svg></div>
            <p className="empty__t">No purchases yet</p>
            <p className="empty__s">When you purchase a membership, Journey, or add-on, your receipts and billing history will appear here.</p>
            <Link href="/membership" className="btn btn--gold">Explore Memberships</Link>
          </div>
        )}
      </section>
    </>
  );
}
