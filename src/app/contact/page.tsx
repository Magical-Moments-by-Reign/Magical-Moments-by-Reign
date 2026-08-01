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
  const initialReason = reason || "general";

  const CONTACT_FAQ = [
    { q: "How soon will you reply?", a: "We personally read every message and typically reply within one business day." },
    { q: "What's the Custom Concierge experience?", a: "A white-glove, done-for-you service (starting at $5,000) where our team designs, builds, and produces your entire experience — media curation, cinematic video, custom domain, and lifetime preservation included." },
    { q: "Can I schedule a consultation?", a: "Yes — choose \"Schedule a consultation\" below and share a couple of times that work. We'll confirm by email and call you." },
    { q: "Do you offer business websites?", a: "Yes, as a separate custom service. Visit our Business Sites page to start a request." },
  ];

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

        {!sent && (
          <>
            {/* Concierge + consultation */}
            <section className="ct-services">
              <article className="ct-service ct-service--concierge">
                <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>White-glove service</span>
                <h2>Custom Concierge experience</h2>
                <p>Let our team design, build, and produce your entire experience for you — start to finish. Starting at <strong>$5,000</strong>.</p>
                <Link href="/contact?reason=concierge#contact-form" className="btn-gold">Request a Concierge experience</Link>
              </article>
              <article className="ct-service">
                <span className="eyebrow" style={{ color: "var(--gold-deep)" }}>Let&apos;s talk</span>
                <h2>Schedule a consultation</h2>
                <p>Prefer to talk it through? Book a friendly, no-pressure consultation and we&apos;ll help you choose the perfect experience.</p>
                <Link href="/contact?reason=consultation#contact-form" className="btn-outline-gold ct-service__outline">Schedule a consultation</Link>
              </article>
            </section>

            {/* FAQ */}
            <section className="ct-faq">
              <h2 className="ct-faq__title">Frequently asked questions</h2>
              <div className="ct-faq__list">
                {CONTACT_FAQ.map((f) => (
                  <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
