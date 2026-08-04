import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-access";
import { hasCapability } from "@/lib/admin-roles";
import { prisma } from "@/lib/db";
import {
  approveApplicationAction, rejectApplicationAction, requestInfoAction,
  suspendVendorAction, reactivateVendorAction, approveProfileChangeAction,
} from "./actions";
import "../../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Vendors", robots: { index: false } };

export default async function AdminVendorsPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const admin = await requireAdmin("vendors.view");
  const sp = await searchParams;
  const canManage = hasCapability(admin.roles, "vendors.manage");

  const [applications, vendors] = await Promise.all([
    prisma.vendorApplication.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.vendor.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      select: {
        id: true, businessName: true, status: true, membershipStatus: true, badge: true,
        verifiedNegatives: true, pendingProfile: true, accountId: true,
        _count: { select: { strikes: true } },
      },
    }),
  ]);

  return (
    <div className="acct">
      <header className="acct__bar">
        <Link href="/admin" className="acct__bar-brand"><span>Admin · Command Center</span></Link>
        <div className="acct__bar-right"><span style={{ fontSize: "0.85rem", opacity: 0.85 }}>Roles: {admin.roles.join(", ")}</span></div>
      </header>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "1.6rem 1.2rem 4rem" }}>
        <div className="acct__panel">
          <h1>Vendor review</h1>
          {sp.done && <div className="auth-note auth-note--ok">Action completed.</div>}
          {sp.error && <div className="auth-note auth-note--error">Something went wrong ({sp.error}).</div>}
          {!canManage && <div className="auth-note auth-note--info">You have read-only access to vendors.</div>}

          <h2>Applications awaiting review ({applications.length})</h2>
          {applications.length === 0 ? <p style={{ color: "#a1917a" }}>No new applications.</p> : applications.map((a) => (
            <div key={a.id} className="acct__row" style={{ alignItems: "flex-start" }}>
              <span className="acct__v">
                {a.businessName} <span className="chip chip--muted">{a.number}</span>
                <span style={{ display: "block", fontSize: "0.8rem", color: "#8a7a63", fontWeight: 400 }}>{a.ownerName} · {a.city}, {a.state} · {a.email}</span>
              </span>
              {canManage && (
                <span className="ntf-actions" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <form action={approveApplicationAction}><input type="hidden" name="appId" value={a.id} /><button className="auth-btn" style={{ width: "auto", padding: "0.35rem 0.8rem", fontSize: "0.8rem" }}>Approve</button></form>
                  <form action={requestInfoAction}><input type="hidden" name="appId" value={a.id} /><button className="auth-btn auth-btn--ghost" style={{ width: "auto", padding: "0.35rem 0.8rem", fontSize: "0.8rem" }}>Request info</button></form>
                  <form action={rejectApplicationAction}><input type="hidden" name="appId" value={a.id} /><button className="auth-btn auth-btn--danger" style={{ width: "auto", padding: "0.35rem 0.8rem", fontSize: "0.8rem" }}>Reject</button></form>
                </span>
              )}
            </div>
          ))}

          <h2>Vendors ({vendors.length})</h2>
          {vendors.map((v) => (
            <div key={v.id} className="acct__row" style={{ alignItems: "flex-start" }}>
              <span className="acct__v">
                {v.businessName}
                <span style={{ display: "block", fontSize: "0.78rem", color: "#8a7a63", fontWeight: 400 }}>
                  <span className={`chip ${v.status === "APPROVED" ? "chip--ok" : v.status === "SUSPENDED" || v.status === "REMOVED" ? "chip--warn" : "chip--muted"}`}>{v.status.toLowerCase()}</span>{" "}
                  membership {v.membershipStatus.toLowerCase()} · badge {v.badge} · strikes {v._count.strikes} · neg {v.verifiedNegatives}
                  {v.pendingProfile && <span className="chip chip--warn" style={{ marginLeft: 6 }}>profile change pending</span>}
                  {!v.accountId && <span className="chip chip--muted" style={{ marginLeft: 6 }}>no login linked</span>}
                </span>
              </span>
              {canManage && (
                <span className="ntf-actions" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {v.pendingProfile && <form action={approveProfileChangeAction}><input type="hidden" name="vendorId" value={v.id} /><button className="auth-btn" style={{ width: "auto", padding: "0.35rem 0.8rem", fontSize: "0.8rem" }}>Approve profile</button></form>}
                  {v.status !== "SUSPENDED" ? (
                    <form action={suspendVendorAction}><input type="hidden" name="vendorId" value={v.id} /><button className="auth-btn auth-btn--danger" style={{ width: "auto", padding: "0.35rem 0.8rem", fontSize: "0.8rem" }}>Suspend</button></form>
                  ) : (
                    <form action={reactivateVendorAction}><input type="hidden" name="vendorId" value={v.id} /><button className="auth-btn" style={{ width: "auto", padding: "0.35rem 0.8rem", fontSize: "0.8rem" }}>Reactivate</button></form>
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
