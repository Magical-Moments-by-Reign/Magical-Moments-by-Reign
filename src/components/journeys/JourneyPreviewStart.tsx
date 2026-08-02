"use client";

// The transparent Magical Journey Preview™ terms + checkout summary. Nothing
// hidden: the customer picks a future membership term, sees the price,
// the exact 5-day schedule (start → end → first billing), the renewal
// schedule, what's included, the limits, and the reminder cadence.
// Truly beginning the trial is gated behind the auth + payment-capture +
// billing seams — we never capture a fake payment.

import { useMemo, useState } from "react";
import Link from "next/link";
import { TERMS, quote, formatUSD, type TermId } from "@/lib/pricing-engine";
import { JOURNEY_PREVIEW, previewSchedule, formatPreviewDate } from "@/lib/journey-trial";

export default function JourneyPreviewStart({ type, label }: { type: string; label: string }) {
  const [term, setTerm] = useState<TermId>("5yr");
  const [tos, setTos] = useState(false);

  // Client-computed so the dates are real relative to "today".
  const schedule = useMemo(() => previewSchedule(new Date()), []);
  const price = quote(1, term);
  const renewal = term === "lifetime" ? "One-time — no renewal" : `Renews every ${TERMS.find((t) => t.id === term)?.label.toLowerCase()}`;

  return (
    <div className="jp">
      {/* Choose the membership that begins after the preview */}
      <section className="jx-block">
        <h2 className="jx-h2">Choose your membership</h2>
        <p className="jx-muted">This is the plan that begins automatically when your 5-day preview ends — you&apos;re never charged until then, and you can cancel anytime.</p>
        <div className="jp-terms">
          {TERMS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`jp-term${term === t.id ? " jp-term--on" : ""}`}
              aria-pressed={term === t.id}
              onClick={() => setTerm(t.id)}
            >
              <span className="jp-term__label">{t.label}</span>
              <span className="jp-term__price">{formatUSD(quote(1, t.id).total)}{t.suffix ?? ""}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Transparent schedule */}
      <section className="jx-block">
        <h2 className="jx-h2">Your preview, in full view</h2>
        <div className="jp-schedule">
          <div className="jp-srow"><span>Preview starts</span><strong>{formatPreviewDate(schedule.start)}</strong></div>
          <div className="jp-srow"><span>Preview ends</span><strong>{formatPreviewDate(schedule.end)}</strong></div>
          <div className="jp-srow"><span>First billing date</span><strong>{formatPreviewDate(schedule.firstBilling)}</strong></div>
          <div className="jp-srow"><span>Membership price</span><strong>{formatUSD(price.total)}{price.suffix ?? ""}</strong></div>
          <div className="jp-srow"><span>Renewal schedule</span><strong>{renewal}</strong></div>
        </div>
        <p className="jx-fine">Preview pricing — final amounts are being finalized (Lifetime Collections are set). No payment is collected until the preview ends; cancel before then and you&apos;re never charged.</p>
      </section>

      {/* What's included */}
      <section className="jx-block">
        <h2 className="jx-h2">Everything you can explore</h2>
        <ul className="jx-included">
          {JOURNEY_PREVIEW.included.map((f) => <li key={f}><span aria-hidden="true">✓</span>{f}</li>)}
        </ul>
      </section>

      {/* Limits */}
      <section className="jx-block">
        <h2 className="jx-h2">Preview limits</h2>
        <ul className="jp-limits">
          {JOURNEY_PREVIEW.limits.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </section>

      {/* Reminders */}
      <section className="jx-block">
        <h2 className="jx-h2">We&apos;ll keep you posted</h2>
        <ol className="jx-timeline">
          {JOURNEY_PREVIEW.reminders.map((r) => (
            <li key={r.day} className="jx-tl">
              <span className="jx-tl__when">{r.label}</span>
              <span className="jx-tl__what">{r.message}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Checkout */}
      <section className="jx-block jp-checkout">
        <h2 className="jx-h2">Start your 5-day {label} preview</h2>
        <ul className="jp-req">
          <li>Create your Magical Moments account</li>
          <li>Accept the Terms of Service &amp; Privacy Policy</li>
          <li>Select your future membership (above)</li>
          <li>Provide a valid payment method — <strong>not charged until {formatPreviewDate(schedule.firstBilling)}</strong></li>
        </ul>
        <label className="jp-tos">
          <input type="checkbox" checked={tos} onChange={(e) => setTos(e.target.checked)} />
          <span>I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>, and I understand my selected membership begins automatically when the preview ends unless I cancel.</span>
        </label>
        <button type="button" className="btn btn-gold jp-begin" disabled={!tos} aria-disabled={!tos}>
          Begin my 5-day Magical Journey Preview
        </button>
        <p className="jx-fine">Secure payment-method capture and preview billing unlock with accounts &amp; billing (coming soon). Today you can review every detail here — nothing is hidden. Prefer to wait? <Link href="/membership">Start with Free Forever</Link> or <Link href={`/create?type=${type}`}>purchase immediately</Link>.</p>
      </section>
    </div>
  );
}
