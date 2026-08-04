import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-access";
import { hasCapability } from "@/lib/admin-roles";
import { prisma } from "@/lib/db";
import { adminLogoutAction } from "./actions";
import "../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Command Center", robots: { index: false } };

export default async function AdminHome() {
  const admin = await requireAdmin();
  const can = (c: Parameters<typeof hasCapability>[1]) => hasCapability(admin.roles, c);
  const num = async (p: Promise<number>) => { try { return await p; } catch { return 0; } };

  // Only query what this admin can see; each card is capability-gated + real.
  const [pendingApps, complianceHolds, openInquiries, reviewsPending, domainsExpiring, pastDue, securityEvents] = await Promise.all([
    can("vendors.view") ? num(prisma.vendorApplication.count({ where: { status: "NEW" } })) : Promise.resolve(-1),
    can("vendors.view") ? num(prisma.vendor.count({ where: { OR: [{ status: "SUSPENDED" }, { membershipStatus: "INACTIVE" }, { membershipStatus: "SUSPENDED" }] } })) : Promise.resolve(-1),
    can("customers.view") ? num(prisma.inquiry.count({ where: { status: { in: ["NEW", "IN_PROGRESS"] } } })) : Promise.resolve(-1),
    can("reviews.view") ? num(prisma.vendorReview.count({ where: { verification: "pending" } })) : Promise.resolve(-1),
    can("finance.view") ? num(prisma.domain.count({ where: { expirationDate: { lt: new Date(Date.now() + 60 * 864e5) } } })) : Promise.resolve(-1),
    can("finance.view") ? num(prisma.account.count({ where: { status: { in: ["PAST_DUE", "PAYMENT_METHOD_FAILED"] } } })) : Promise.resolve(-1),
    can("audit.view") ? num(prisma.customerAuditLog.count({ where: { action: { in: ["password_reset", "password_changed", "admin_login", "admin_login_denied"] } } })) : Promise.resolve(-1),
  ]);

  const cards = [
    { show: pendingApps >= 0, label: "Pending vendor applications", value: pendingApps, href: "/admin/vendors" },
    { show: complianceHolds >= 0, label: "Vendor compliance / holds", value: complianceHolds, href: "/admin/vendors" },
    { show: openInquiries >= 0, label: "Open customer inquiries", value: openInquiries, href: "/admin/custom-websites" },
    { show: reviewsPending >= 0, label: "Reviews awaiting verification", value: reviewsPending, href: "/admin/vendors" },
    { show: domainsExpiring >= 0, label: "Domain renewals (60d)", value: domainsExpiring, href: "/admin/domains" },
    { show: pastDue >= 0, label: "Membership alerts (past due)", value: pastDue, href: "/admin" },
    { show: securityEvents >= 0, label: "Security activity", value: securityEvents, href: "/admin" },
  ].filter((c) => c.show);

  const links: { label: string; href: string; show: boolean }[] = [
    { label: "Vendors", href: "/admin/vendors", show: can("vendors.view") },
    { label: "Custom websites", href: "/admin/custom-websites", show: can("content.manage") || can("customers.view") },
    { label: "Domains", href: "/admin/domains", show: can("finance.view") },
    { label: "Specials", href: "/admin/specials", show: can("content.manage") },
  ].filter((l) => l.show);

  return (
    <div className="acct">
      <header className="acct__bar">
        <Link href="/" className="acct__bar-brand" aria-label="Magical Moments by Reign — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" width={34} height={34} />
          <span>Admin · Command Center</span>
        </Link>
        <div className="acct__bar-right">
          <span style={{ opacity: 0.85, fontSize: "0.85rem" }}>{admin.roles.join(", ") || "admin"}{admin.via === "legacy_password" ? " · legacy" : ""}</span>
          <form action={adminLogoutAction}>
            <button type="submit" style={{ background: "none", border: "1px solid rgba(246,239,226,0.4)", color: "#f6efe2", borderRadius: 999, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: "0.85rem" }}>Sign out</button>
          </form>
        </div>
      </header>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "1.6rem 1.2rem 4rem" }}>
        <div className="acct__panel">
          <h1>Welcome{admin.account ? `, ${admin.account.firstName}` : ""}</h1>
          <p>Your role{admin.roles.length > 1 ? "s" : ""}: <b>{admin.roles.join(", ") || "administrator"}</b>. You see only the areas your role permits.</p>
          {admin.via === "legacy_password" && (
            <div className="auth-note auth-note--warn" style={{ marginTop: "0.6rem" }}>You're signed in via the temporary shared-password bridge. Set up an Owner account to retire it.</div>
          )}

          <h2>At a glance</h2>
          {cards.length === 0 ? <p style={{ color: "#a1917a" }}>No dashboards available for your role.</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "0.8rem", marginTop: "0.6rem" }}>
              {cards.map((c) => (
                <Link key={c.label} href={c.href} style={{ textDecoration: "none", border: "1px solid #ece5d8", borderRadius: 14, padding: "0.9rem 1rem", background: "#fffdfa", color: "#2a2018" }}>
                  <div className="acct__k">{c.label}</div>
                  <div style={{ fontSize: "1.7rem", fontFamily: "var(--font-display, serif)", marginTop: 4 }}>{c.value}</div>
                </Link>
              ))}
            </div>
          )}

          <h2>Manage</h2>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {links.map((l) => <Link key={l.href} href={l.href} className="auth-btn auth-btn--ghost" style={{ width: "auto", padding: "0.5rem 1rem", textDecoration: "none" }}>{l.label}</Link>)}
          </div>

          <h2>System</h2>
          <div className="acct__row"><span className="acct__k">Platform</span><span className="acct__v"><span className="chip chip--ok">operational</span></span></div>
          <div className="acct__row"><span className="acct__k">Sessions</span><span className="acct__v"><Link href="/account/security" className="auth-link">Manage your active sessions →</Link></span></div>
        </div>
      </div>
    </div>
  );
}
