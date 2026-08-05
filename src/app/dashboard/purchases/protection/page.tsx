import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import ProtectionDemo from "./ProtectionDemo";
import "./protection.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Journey Purchase Protection", robots: { index: false } };

const TIMELINE = ["Purchased", "Confirmed", "Packed", "Shipped", "Delivered", "Verified", "Completed"];

const ADVOCATE = [
  "Find coupons", "Compare plans", "Detect better pricing", "Detect duplicate purchases",
  "Detect upgrade opportunities", "Explain merchant policies", "Store receipts", "Monitor deliveries",
  "Help contact support", "Track refunds", "Monitor exchanges",
];

const CONTACT_CENTER = [
  "Merchant logo & website", "Phone & email", "Customer service hours", "Return & refund policy",
  "Warranty", "Tracking number", "Order number", "Invoice & receipt",
];

// Live now vs. needs a merchant integration (honest — no fabricated data).
const LIVE = [
  "Purchase Review screen (no charge until you confirm)",
  "Duplicate-purchase detection",
  "Cheaper-plan / upgrade detection",
  "Protection threshold (Always → Never)",
  "Merchant capability warnings (e.g. no prorated upgrades)",
  "Journey Protection Promise checklist",
];
// These need a live, approved merchant integration before Journey can show real
// data. Until then they stay labelled Coming Soon — Journey never fabricates a
// coupon, tracking number, or savings figure.
const SOON = [
  "Live Coupons",
  "Live Tracking",
  "Live Returns",
  "Live Refund Requests",
  "Live Exchanges",
  "Live Order Status",
  "Live Warranty Claims",
  "Live Subscription Cancellation",
  "Price History",
  "Price Drop Alerts",
];

export default async function ProtectionPage() {
  await requireAccount("/dashboard/purchases/protection");

  return (
    <div className="prot">
      <div className="pg-head">
        <span className="pg-eyebrow">Journey Purchase Protection™</span>
        <h1 className="pg-title">Journey protects you — it doesn&rsquo;t just check you out.</h1>
        <p className="pg-sub">Before any money changes hands, Journey reviews the order, flags duplicates and better plans, checks the merchant&rsquo;s policies, and waits for your explicit approval. After the purchase, it keeps helping until the order is complete.</p>
        <p style={{ marginTop: ".5rem" }}><Link href="/dashboard/purchases" className="btn btn--sm btn--ghost">← Back to Purchases</Link></p>
      </div>

      <ProtectionDemo />

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Every order gets a timeline</h2></div>
        <ol className="prot-timeline">
          {TIMELINE.map((t, i) => (
            <li key={t} className="prot-timeline__i"><span className="prot-timeline__n">{i + 1}</span>{t}</li>
          ))}
        </ol>
        <p className="note">Delivery verification asks &ldquo;Did everything arrive correctly?&rdquo; with <b>Perfect · Minor issue · Need help</b> once live tracking is connected.</p>
      </section>

      <div className="grid grid--cards sec">
        <div className="card">
          <h3>AI Purchase Advocate</h3>
          <ul className="prot-list">{ADVOCATE.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Merchant Contact Center</h3>
          <p className="note">Everything for a purchase, in one place:</p>
          <ul className="prot-list">{CONTACT_CENTER.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      </div>

      <div className="grid grid--cards sec">
        <div className="card">
          <h3>Live now</h3>
          <ul className="prot-list prot-list--ok">{LIVE.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Coming soon <span className="badge badge--soon">Needs merchant integration</span></h3>
          <p className="note">Journey never fabricates a coupon, tracking number, or savings figure. These activate as each merchant connection is built:</p>
          <ul className="prot-list prot-list--soon">{SOON.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
