import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import { PRICING_CONFIG } from "@/lib/pricing-engine";
import {
  TRIAL_NAME, TRIAL_TAGLINE, DEFAULT_TRIAL_DAYS,
  computeTrialDates, billingSummary, ctaFinePrint, consentText, START_BUTTON_LABEL,
  TRIAL_ACCESS, TRIAL_LIMITS, TRIAL_FAQ, TRIAL_CONVERSION_REFUND_POLICY,
} from "@/lib/trial-membership";
import "./trial.css";

export const metadata: Metadata = {
  title: "Try the Magic Before Your Membership Begins",
  description:
    "Start a 7-day Magical Preview Pass — create a draft experience, explore Ask Magical, and test the planning tools before your paid monthly membership begins. Transparent pricing, easy online cancellation.",
};

// Example membership shown before checkout — preview pricing while monthly
// amounts are being finalized; the exact plan & price are confirmed at checkout.
const EXAMPLE_PLAN = "Monthly Membership";
const EXAMPLE_MONTHLY_CENTS = PRICING_CONFIG.firstOccasion.monthly * 100;

export default async function TrialPage() {
  const signedIn = Boolean(await currentAccount());
  // Rendered server-side; concrete example dates for the disclosures.
  const dates = computeTrialDates(new Date().toISOString(), DEFAULT_TRIAL_DAYS);
  const disc = {
    planName: EXAMPLE_PLAN,
    days: DEFAULT_TRIAL_DAYS,
    monthlyCents: EXAMPLE_MONTHLY_CENTS,
    firstBillingISO: dates.firstBillingISO,
  };
  const summary = billingSummary(disc);

  return (
    <div className="tr">
      <PublicNav active="get-started" signedIn={signedIn} />
      <main className="tr-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="tr-watermark" src="/brand/logo.png" alt="" aria-hidden="true" />

        <header className="tr-hero">
          <div className="tr-inner">
            <span className="tr-eyebrow">✨ {TRIAL_NAME}</span>
            <h1 className="tr-title">Try the Magic Before Your Membership Begins</h1>
            <p className="tr-tagline">{TRIAL_TAGLINE}</p>
            <p className="tr-lead">
              Create a draft experience, explore Ask Magical, test the planning tools, and see how your
              memories can come to life.
            </p>
          </div>
        </header>

        <div className="tr-inner tr-body">
          {/* 1. What you can explore */}
          <section className="tr-sec">
            <h2 className="tr-h2">1 · What You Can Explore</h2>
            <ul className="tr-list tr-list--check">
              {TRIAL_ACCESS.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </section>

          {/* 2. What is limited */}
          <section className="tr-sec">
            <h2 className="tr-h2">2 · What Is Limited During the Trial</h2>
            <ul className="tr-list tr-list--limit">
              {TRIAL_LIMITS.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p className="tr-note">The preview is useful and exciting — but it doesn&apos;t replace a full preservation plan.</p>
          </section>

          {/* 3. What happens when the trial ends */}
          <section className="tr-sec">
            <h2 className="tr-h2">3 · What Happens When the Trial Ends</h2>
            <p>
              Your {TRIAL_NAME} automatically converts to the paid monthly membership you selected — unless you
              cancel before the trial ends. We remind you at signup, three days before, and one day before, each
              with the exact amount, billing date, and a direct cancellation link.
            </p>
          </section>

          {/* 4 & 5. Selected membership, price, billing date */}
          <section className="tr-sec tr-billing">
            <h2 className="tr-h2">4 · Selected Membership &amp; Monthly Price &nbsp;·&nbsp; 5 · Billing Date</h2>
            <dl className="tr-summary">
              <div><dt>Selected membership</dt><dd>{summary.selectedMembership}</dd></div>
              <div><dt>Trial length</dt><dd>{summary.trialLength}</dd></div>
              <div><dt>Amount due today</dt><dd>{summary.amountDueToday}</dd></div>
              <div><dt>First billing date</dt><dd>{summary.firstBillingDate}</dd></div>
              <div><dt>Amount charged after trial</dt><dd>{summary.amountAfterTrial}<span className="tr-permo">/mo</span></dd></div>
              <div><dt>Billing frequency</dt><dd>{summary.billingFrequency}</dd></div>
              <div><dt>Renewal</dt><dd>{summary.renewal}</dd></div>
            </dl>
            <p className="tr-preview">Preview pricing — monthly amounts are being finalized. Your exact plan and price are shown and confirmed at checkout before you agree.</p>
          </section>

          {/* 6. How to cancel */}
          <section className="tr-sec">
            <h2 className="tr-h2">6 · How to Cancel</h2>
            <p>
              Cancel anytime online — no calls or emails. In your account go to
              {" "}<strong>Membership &amp; Billing → Cancel Trial</strong>. Cancel before your billing date and your
              card is never charged. Canceling is never harder than signing up.
            </p>
          </section>

          {/* 7. Refund policy */}
          <section className="tr-sec tr-policy">
            <h2 className="tr-h2">7 · {TRIAL_CONVERSION_REFUND_POLICY.title}</h2>
            {TRIAL_CONVERSION_REFUND_POLICY.body.map((p) => <p key={p}>{p}</p>)}
            <p className="tr-note">{TRIAL_CONVERSION_REFUND_POLICY.legalNote}</p>
          </section>

          {/* 8. FAQ */}
          <section className="tr-sec">
            <h2 className="tr-h2">8 · Frequently Asked Questions</h2>
            <div className="tr-faq">
              {TRIAL_FAQ.map((f) => (
                <details key={f.q} className="tr-faq__item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* 9. Start */}
          <section className="tr-sec tr-start">
            <h2 className="tr-h2">9 · Start My {TRIAL_NAME}</h2>
            {/* The consent checkbox + secure card capture happen in the checkout
                flow (Square). The exact terms below are what you'll confirm there. */}
            <div className="tr-consent-preview">
              <span className="tr-consent-box" aria-hidden="true">☐</span>
              <p>{consentText(disc)}</p>
            </div>
            <Link href="/create" className="btn-gold tr-cta">{START_BUTTON_LABEL(DEFAULT_TRIAL_DAYS)}</Link>
            <p className="tr-finePrint">{ctaFinePrint(disc)}</p>
          </section>
        </div>
      </main>
      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
