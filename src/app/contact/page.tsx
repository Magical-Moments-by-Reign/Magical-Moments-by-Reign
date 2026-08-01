import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import ContactExperience from "@/components/contact/ContactExperience";
import "./contact.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" } satisfies Metadata;

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; sent?: string; error?: string }>;
}) {
  const { reason, sent, error } = await searchParams;
  const initialReason = reason === "business" ? "business" : reason || "general";

  return (
    <div className="ct">
      <SiteNav active="contact" />
      <header className="ct-header">
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>We&apos;d love to hear from you</span>
          <h1>Let&apos;s make something magical together</h1>
          <p>Questions about a plan, help creating an experience, or a custom business website — we&apos;re here.</p>
        </div>
      </header>

      <main className="container ct-main">
        {sent ? (
          <div className="ct-confirm">
            <div className="ct-confirm__badge" aria-hidden="true">✦</div>
            <h2>Thank you — your message is on its way.</h2>
            <p>
              We&apos;ve received your inquiry and created a ticket for you. Our team
              will follow up soon.
            </p>
            <p className="ct-confirm__number">
              Your inquiry number: <strong>{sent}</strong>
            </p>
            <p className="ct-confirm__hint">Keep this number handy if you need to reference your request.</p>
            <div className="ct-confirm__actions">
              <Link href="/" className="btn-gold">Back to home</Link>
              <Link href="/pricing" className="btn btn-dark">View plans</Link>
            </div>
          </div>
        ) : (
          <ContactExperience initialReason={initialReason} error={Boolean(error)} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
