import type { Metadata } from "next";
import Link from "next/link";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { dashboardCards, whatNeedsAttention, statusMessage, type VendorDashboardData } from "@/lib/vendor-portal";

export const metadata: Metadata = { title: "Vendor overview", robots: { index: false } };

export default async function VendorOverview() {
  const ctx = await requireVendor();
  const status = ctx.status;
  const msg = statusMessage(status);

  const v = ctx.vendorId
    ? await prisma.vendor.findUnique({
        where: { id: ctx.vendorId },
        select: {
          businessName: true, completedEvents: true, ratingAvg: true, reviewCount: true,
          verifiedNegatives: true, badge: true, membershipRenewalDate: true, firstBookingFeeDeducted: true,
        },
      })
    : null;

  const data: VendorDashboardData = {
    completedBookings: v?.completedEvents ?? 0,
    ratingAvg: v?.ratingAvg ?? 0,
    reviewCount: v?.reviewCount ?? 0,
    verifiedNegatives: v?.verifiedNegatives ?? 0,
    badge: v?.badge ?? "new",
    membershipRenewalDate: v?.membershipRenewalDate ? v.membershipRenewalDate.toLocaleDateString() : null,
    membershipFeeDeducted: v?.firstBookingFeeDeducted ?? false,
    docsExpiringSoon: ctx.expiringDocuments.length,
    complianceAlerts: ctx.missingDocuments.length + (ctx.state.complianceOk ? 0 : 1),
  };
  const cards = dashboardCards(data);

  const attention = whatNeedsAttention({
    agreementAccepted: ctx.state.agreementAccepted,
    complianceOk: ctx.state.complianceOk,
    missingDocuments: ctx.missingDocuments,
    expiringDocuments: ctx.expiringDocuments,
    pendingBookingCount: 0, standbyAwaitingConfirm: 0, unreadInquiryCount: 0,
    upcomingEventsToReview: 0, annualVerificationDue: false,
    additionalInfoRequested: !!ctx.state.additionalInfoRequested,
  });

  return (
    <>
      <h1>{v?.businessName ? v.businessName : `Welcome, ${ctx.account.firstName}`}</h1>
      <div className={`auth-note auth-note--${msg.tone === "ok" ? "ok" : msg.tone === "warn" ? "warn" : "info"}`} style={{ marginTop: "0.6rem" }}>{msg.text}</div>

      {ctx.applicationNumber && (
        <div className="acct__row"><span className="acct__k">Application</span><span className="acct__v">{ctx.applicationNumber}</span></div>
      )}

      <h2>What Needs Your Attention</h2>
      {attention.length === 0 ? (
        <p style={{ color: "#a1917a" }}>You're all caught up — nothing needs your attention right now. ✦</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {attention.map((a) => (
            <li key={a.id} className="acct__row">
              <span className="acct__v">{a.urgency === "high" && <span className="chip chip--warn" style={{ marginRight: 8 }}>action</span>}{a.label}</span>
              <Link href={`/vendors/dashboard/${a.section === "compliance" ? "compliance" : a.section === "profile" ? "profile" : ""}`} className="auth-link">Open →</Link>
            </li>
          ))}
        </ul>
      )}

      <h2>At a glance</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.8rem", marginTop: "0.6rem" }}>
        {cards.map((c) => (
          <div key={c.id} style={{ border: "1px solid #ece5d8", borderRadius: 14, padding: "0.9rem 1rem", background: c.gated ? "#faf7f0" : "#fffdfa" }}>
            <div className="acct__k">{c.label}{c.gated && <span className="chip chip--muted" style={{ marginLeft: 6, fontSize: "0.6rem" }}>soon</span>}</div>
            <div style={{ fontSize: "1.4rem", fontFamily: "var(--font-display, serif)", color: "#2a2018", marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "0.8rem", color: "#a1917a", marginTop: "0.8rem" }}>
        Booking, message, and payout figures activate with Phase 2 (bookings &amp; messaging) and the payment provider.
      </p>

      <h2>Quick links</h2>
      <div className="acct__row"><span className="acct__v"><Link href="/vendors/dashboard/profile" className="auth-link">Manage your profile →</Link></span></div>
      <div className="acct__row"><span className="acct__v"><Link href="/vendors/dashboard/compliance" className="auth-link">Compliance &amp; documents →</Link></span></div>
    </>
  );
}
