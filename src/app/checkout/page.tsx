import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import CheckoutClient from "@/components/checkout/CheckoutClient";
import "./checkout.css";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="ck">
      <SiteNav />
      <header className="ck-header">
        <div className="container">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" className="ck-logo" width={40} height={40} />
          <div>
            <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Secure checkout</span>
            <h1>Complete your Magical Moment</h1>
          </div>
          <Link href="/pricing" className="ck-back">← Back to plans</Link>
        </div>
      </header>
      <main className="container ck-main">
        <CheckoutClient />
      </main>
      <SiteFooter />
    </div>
  );
}
