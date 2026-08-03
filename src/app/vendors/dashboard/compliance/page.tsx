import type { Metadata } from "next";
import Link from "next/link";
import { requireVendorSection } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { missingDocumentsMessage, agreementMessage, UPLOAD_COMING_SOON } from "@/lib/vendor-portal";

export const metadata: Metadata = { title: "Compliance", robots: { index: false } };

const LABELS: Record<string, string> = {
  business_info: "Business information", business_license: "Business license",
  gl_insurance: "General Liability Insurance", workers_comp: "Workers' Compensation",
  certification: "Professional certification", permit: "Permit", w9: "W-9",
};
function statusChip(c: { provided: boolean; verified: boolean; expiresAt: Date | null }) {
  const now = Date.now();
  if (c.expiresAt && c.expiresAt.getTime() < now) return <span className="chip chip--warn">expired</span>;
  if (c.provided && c.verified) return <span className="chip chip--ok">verified</span>;
  if (c.provided) return <span className="chip chip--warn">under review</span>;
  return <span className="chip chip--muted">needed</span>;
}

export default async function VendorCompliancePage() {
  const ctx = await requireVendorSection("compliance");

  const creds = ctx.vendorId
    ? await prisma.vendorCredential.findMany({ where: { vendorId: ctx.vendorId }, select: { kind: true, required: true, provided: true, verified: true, expiresAt: true } })
    : [];

  return (
    <>
      <h1>Compliance &amp; documents</h1>
      <p>Keeping your credentials current keeps your listing active and visible in the marketplace.</p>

      {!ctx.state.complianceOk && (
        <div className="auth-note auth-note--warn" style={{ marginTop: "0.6rem" }}>{missingDocumentsMessage(ctx.missingDocuments)}</div>
      )}
      {ctx.state.complianceOk && (
        <div className="auth-note auth-note--ok" style={{ marginTop: "0.6rem" }}>All required documents are on file. Thank you!</div>
      )}

      <h2>Documents</h2>
      {creds.length === 0 ? (
        <p style={{ color: "#8a8394" }}>No documents on file yet. Our team will let you know exactly what's required for your category.</p>
      ) : (
        creds.map((c) => (
          <div className="acct__row" key={c.kind}>
            <span className="acct__v">{LABELS[c.kind] ?? c.kind}{c.required && <span style={{ color: "#a79", fontWeight: 400, fontSize: "0.8rem" }}> · required</span>}</span>
            <span className="acct__v">{statusChip(c)}{c.expiresAt && <span style={{ fontSize: "0.78rem", color: "#9a93a2", marginLeft: 6 }}>exp {c.expiresAt.toLocaleDateString()}</span>}</span>
          </div>
        ))
      )}

      <h2>Vendor agreement</h2>
      <div className={`auth-note auth-note--${ctx.state.agreementAccepted ? "ok" : "warn"}`}>{agreementMessage(ctx.state.agreementAccepted)}</div>

      <h2>Uploading documents</h2>
      <div className="auth-note auth-note--info">{UPLOAD_COMING_SOON}</div>

      <p style={{ marginTop: "1rem" }}><Link href="/vendors/dashboard" className="auth-link">← Back to overview</Link></p>
    </>
  );
}
