import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import { CONTACT_REASONS } from "@/lib/inquiries";
import { submitInquiryAction } from "./actions";
import "./contact-lux.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contact — Magical Moments by Reign",
  description: "Whether you have a question, need guidance, or want to discuss your project, our team is here to help make your vision a reality.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; sent?: string; error?: string }>;
}) {
  const { reason, sent, error } = await searchParams;
  const signedIn = Boolean(await currentAccount());
  const initialReason = reason || "";

  // Confirmation state — after a real submission redirects back with ?sent=<num>.
  if (sent) {
    return (
      <div className="ctk">
        <PublicNav active="contact" signedIn={signedIn} />
        <div className="ctk-wrap">
          <div className="ctk-confirm">
            <div className="ctk-confirm__badge" aria-hidden="true">✦</div>
            <h2>Thank you — your message is on its way.</h2>
            <p>We&apos;ve received your inquiry and created a ticket for you. Our team will follow up soon.</p>
            <p className="ctk-confirm__num">Your inquiry number: <strong>{sent}</strong></p>
            <div className="ctk-confirm__actions">
              <Link href="/" className="ctk-btn">Back to home</Link>
              <Link href="/get-started" className="ctk-btn ctk-btn--ghost">Keep exploring</Link>
            </div>
          </div>
        </div>
        <PublicFooter year={new Date().getFullYear()} />
      </div>
    );
  }

  return (
    <div className="ctk">
      <PublicNav active="contact" signedIn={signedIn} />

      <div className="ctk-wrap">
        {/* Hero */}
        <header className="ctk-hero">
          <div>
            <span className="ctk-eye"><span aria-hidden="true">✦</span> We&apos;re here for you</span>
            <h1 className="ctk-h1">Let&apos;s Create Something Magical <i>Together</i></h1>
            <p className="ctk-hero__s">Whether you have a question, need guidance, or want to discuss your project, our team is here to help make your vision a reality.</p>
            <div className="ctk-rule" aria-hidden="true" />
          </div>
          <div className="ctk-crest" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-champagne.png" alt="" />
          </div>
        </header>

        {/* Choose how we can help */}
        <section className="ctk-panel">
          <div className="ctk-eyebar">Choose how we can help</div>
          <div className="ctk-help">
            <Link href="/contact?reason=general#send" className="ctk-hc">
              <span className="ctk-hc__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 12h5" /></svg></span>
              <h3 className="ctk-hc__t">General Questions</h3>
              <p className="ctk-hc__s">Questions about memberships, experiences, or your account.</p>
              <span className="ctk-hc__go">Get in touch →</span>
            </Link>
            <Link href="/contact?reason=consultation#send" className="ctk-hc">
              <span className="ctk-hc__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /><path d="M12 12.3l.85 1.75 1.95.28-1.4 1.37.33 1.94L12 16.9l-1.73.72.33-1.94-1.4-1.37 1.95-.28z" /></svg></span>
              <h3 className="ctk-hc__t">Schedule a Consultation</h3>
              <p className="ctk-hc__s">Book a private, no-pressure consultation with our team.</p>
              <span className="ctk-hc__go">Book now →</span>
            </Link>
            <Link href="/business" className="ctk-hc">
              <span className="ctk-hc__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="1.5" /><path d="M9 21h6M12 17v4" /><path d="M16 9l1.2 1.2L16 11.4" /></svg></span>
              <h3 className="ctk-hc__t">Business Websites</h3>
              <p className="ctk-hc__s">Need a custom business website? We&apos;ll connect you with our design team.</p>
              <span className="ctk-hc__go">Learn more →</span>
            </Link>
          </div>
        </section>

        {/* Form + promise */}
        <section className="ctk-two ctk-bottompad" id="send">
          <div className="ctk-panel" style={{ margin: 0 }}>
            <div className="ctk-eyebar" style={{ justifyContent: "flex-start" }}>Send us a message</div>
            <form action={submitInquiryAction} className="ctk-form">
              <div className="ctk-field">
                <label htmlFor="c-name">Full Name *</label>
                <input id="c-name" name="name" type="text" required placeholder="Your name" autoComplete="name" />
              </div>
              <div className="ctk-field">
                <label htmlFor="c-email">Email Address *</label>
                <input id="c-email" name="email" type="email" required placeholder="you@email.com" autoComplete="email" />
              </div>
              <div className="ctk-field">
                <label htmlFor="c-phone">Phone Number (optional)</label>
                <input id="c-phone" name="phone" type="tel" placeholder="(555) 555-5555" autoComplete="tel" />
              </div>
              <div className="ctk-field">
                <label htmlFor="c-reason">Subject *</label>
                <select id="c-reason" name="reason" defaultValue={initialReason} required>
                  <option value="" disabled>Select a subject</option>
                  {CONTACT_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div className="ctk-field ctk-field--full">
                <label htmlFor="c-message">Message *</label>
                <textarea id="c-message" name="message" required placeholder="Tell us how we can help you…" />
              </div>
              {error && <p className="ctk-error">Please add your name, a valid email, a message, and agree to be contacted so we can reply.</p>}
              <label className="ctk-consent">
                <input type="checkbox" name="consent" required />
                <span>I agree to be contacted by Magical Moments by Reign about my inquiry.</span>
              </label>
              <button type="submit" className="ctk-submit">Send Message <span aria-hidden="true">✦</span></button>
            </form>
          </div>

          <aside className="ctk-promise">
            <div className="ctk-eyebar" style={{ justifyContent: "flex-start" }}>Our promise</div>
            <div className="ctk-promise__i">
              <span className="ctk-promise__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
              <span className="ctk-promise__t">Most replies within one business day</span>
            </div>
            <div className="ctk-promise__i">
              <span className="ctk-promise__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13z" /></svg></span>
              <span className="ctk-promise__t">Concierge requests receive priority</span>
            </div>
            <div className="ctk-promise__i">
              <span className="ctk-promise__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><rect x="9.5" y="11" width="5" height="4.5" rx="1" /><path d="M10.6 11v-1a1.4 1.4 0 0 1 2.8 0v1" /></svg></span>
              <span className="ctk-promise__t">Your information is always private</span>
            </div>
            <p className="ctk-promise__note">Thank you for letting us be a part of your journey.</p>
            <div className="ctk-promise__heart" aria-hidden="true">♥</div>
          </aside>
        </section>
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
