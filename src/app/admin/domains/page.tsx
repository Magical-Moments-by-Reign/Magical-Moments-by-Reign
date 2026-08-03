import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-access";
import { STATUS_LABEL } from "@/lib/domains";
import { formatPrice } from "@/lib/plans";
import { adminLogoutAction } from "../actions";
import "../admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Domain management", robots: { index: false } };

const FILTERS = [
  { id: "", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "RENEWAL_DUE", label: "Renewal Due" },
  { id: "PAYMENT_FAILED", label: "Payment Failed" },
  { id: "GRACE_PERIOD", label: "Grace Period" },
  { id: "EXPIRED", label: "Expired" },
  { id: "USING_FALLBACK", label: "Using Fallback" },
  { id: "RESTORED", label: "Restored" },
  { id: "MANUAL_REVIEW", label: "Manual Review" },
];

function fmt(d?: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

export default async function AdminDomainsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("finance.view", "/admin/domains");
  const { status } = await searchParams;

  const domains = await prisma.domain.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ expirationDate: "asc" }, { createdAt: "desc" }],
    include: { customer: { select: { email: true, name: true } }, experience: { select: { slug: true, title: true } } },
  });

  return (
    <div className="adm">
      <SiteNav />
      <header className="adm-header">
        <div className="container adm-header__inner">
          <div>
            <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Admin</span>
            <h1>Domain management</h1>
            <p>Custom domains, renewals, and Legacy Protection fallback status.</p>
          </div>
          <div className="adm-header__actions">
            <Link href="/admin/custom-websites" className="btn-outline-gold">Custom websites</Link>
            <form action={adminLogoutAction}><button className="adm-link" type="submit">Sign out</button></form>
          </div>
        </div>
      </header>

      <main className="container adm-main">
        <div className="adm-filters">
          {FILTERS.map((f) => (
            <Link key={f.id} href={f.id ? `/admin/domains?status=${f.id}` : "/admin/domains"} className={`adm-filter${(status ?? "") === f.id ? " is-active" : ""}`}>
              {f.label}
            </Link>
          ))}
        </div>

        {domains.length === 0 ? (
          <div className="adm-empty"><p>No domains{status ? ` with status ${STATUS_LABEL[status] ?? status}` : ""} yet.</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Domain</th><th>Customer</th><th>Experience</th><th>Plan</th>
                  <th>Status</th><th>Expires</th><th>Renewal</th><th>DNS / SSL</th><th>Retries</th><th>Fallback</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d.id}>
                    <td><b>{d.name}</b></td>
                    <td>{d.customer?.email ?? "—"}</td>
                    <td>{d.experience ? <Link href={`/${d.experience.slug}`}>{d.experience.title}</Link> : "—"}</td>
                    <td>{d.planId ?? "—"}</td>
                    <td><span className={`adm-dchip adm-dchip--${d.status.toLowerCase()}`}>{STATUS_LABEL[d.status] ?? d.status}</span></td>
                    <td>{fmt(d.expirationDate)}</td>
                    <td>{d.renewalPrice != null ? formatPrice(d.renewalPrice / 100) : "—"}</td>
                    <td>{d.dnsStatus} / {d.sslStatus}</td>
                    <td>{d.retryCount}</td>
                    <td>{d.usingFallback ? "● On" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
