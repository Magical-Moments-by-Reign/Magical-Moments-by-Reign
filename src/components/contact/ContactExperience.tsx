"use client";

import { useState } from "react";
import { submitInquiryAction } from "@/app/contact/actions";
import { CONTACT_REASONS } from "@/lib/inquiries";
import { PLANS, formatPrice } from "@/lib/plans";
import { EXPERIENCE_TYPES } from "@/lib/experience-types";

// Ask Magical answers use ONLY approved pricing + current capabilities.
// It never invents prices, features, legal promises, or turnaround times.
const planLine = PLANS.map((p) => `${p.name} ${formatPrice(p.price)} (${p.termShort})`).join(" · ");

interface QA {
  q: string;
  a: string;
  prefill?: string; // reason id to preselect if this needs staff
}

const QUICK: QA[] = [
  { q: "Which plan is right for me?", a: `We have four one-time plans: ${planLine}. Diamond is most popular (includes a custom domain); Lifetime is our best legacy value. Try the “Which plan fits my story?” quiz on the Pricing page — or tell us about your moment and we'll help.`, prefill: "plan" },
  { q: "Help me choose an experience", a: `You can create any of ${EXPERIENCE_TYPES.length} occasion types — weddings, baby journeys, graduations, celebrations of life, new-home journeys and more. Head to “Start your magic” and pick the one that fits, or ask us to recommend one.`, prefill: "create" },
  { q: "How do custom domains work?", a: "Diamond and Lifetime include one custom domain, subject to availability. Initial registration is included for the term; future renewal terms are disclosed before any charge. Your Magical Moments by Reign address always stays available while your plan is active." },
  { q: "Can guests upload photos?", a: "Yes — Diamond and Lifetime allow guest photo & video uploads; Gold includes family upload access; Silver includes guest messages." },
  { q: "Can I add a registry?", a: "Yes — registry links are included on Gold, Diamond, and Lifetime plans." },
  { q: "Can I send invitations & track RSVPs?", a: "Yes — RSVP tools are included on Gold, Diamond, and Lifetime plans, so you can invite guests and track responses." },
  { q: "How do notifications work?", a: "When you publish a new approved milestone, you choose whether to notify your followers and whether to also share on social media — nothing is sent automatically without your approval." },
  { q: "I need a business website", a: "Business websites are custom, lifetime projects created separately from Magical Moments experiences — with their own domain and a custom quote. Share a few details below and our team will follow up.", prefill: "business" },
];

interface Props {
  initialReason: string;
  error?: boolean;
}

export default function ContactExperience({ initialReason, error }: Props) {
  const [reason, setReason] = useState(initialReason || "general");
  const [message, setMessage] = useState("");
  const [openAnswer, setOpenAnswer] = useState<QA | null>(null);

  function ask(item: QA) {
    setOpenAnswer(item);
  }
  function prefillFromAnswer(item: QA) {
    if (item.prefill) setReason(item.prefill);
    setMessage((m) => (m ? m : `Question about: ${item.q}`));
    document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="ct-grid">
      {/* Ask Magical */}
      <aside className="ct-ask">
        <div className="ct-ask__head">
          <span className="ct-ask__spark" aria-hidden="true">✦</span>
          <div>
            <h2 className="ct-ask__title">Ask Magical</h2>
            <p className="ct-ask__sub">Quick answers before you reach out.</p>
          </div>
        </div>
        <div className="ct-ask__quick">
          {QUICK.map((item) => (
            <button key={item.q} type="button" className="ct-chip" onClick={() => ask(item)}>
              {item.q}
            </button>
          ))}
        </div>
        {openAnswer && (
          <div className="ct-answer" role="status">
            <p className="ct-answer__q">{openAnswer.q}</p>
            <p className="ct-answer__a">{openAnswer.a}</p>
            <button type="button" className="ct-answer__prefill" onClick={() => prefillFromAnswer(openAnswer)}>
              Still need us? Prefill the form →
            </button>
          </div>
        )}
        <p className="ct-ask__note">
          Ask Magical shares approved pricing and current capabilities only. For anything
          specific, the form sends it straight to our team.
        </p>
      </aside>

      {/* Contact form */}
      <section className="ct-formwrap" id="contact-form">
        <h2 className="ct-h2">Send us a message</h2>
        {error && <div className="ct-error">Please add your name, a valid email, a message, and agree to be contacted.</div>}
        <form action={submitInquiryAction} className="ct-form">
          <div className="ct-row">
            <label className="ct-field">
              <span>Name *</span>
              <input name="name" type="text" required placeholder="Your name" />
            </label>
            <label className="ct-field">
              <span>Email *</span>
              <input name="email" type="email" required placeholder="you@email.com" />
            </label>
          </div>
          <div className="ct-row">
            <label className="ct-field">
              <span>Phone (optional)</span>
              <input name="phone" type="tel" placeholder="(555) 555-5555" />
            </label>
            <label className="ct-field">
              <span>Preferred contact</span>
              <select name="preferredContact" defaultValue="email">
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="either">Either</option>
              </select>
            </label>
          </div>
          <div className="ct-row">
            <label className="ct-field">
              <span>Reason for contacting</span>
              <select name="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                {CONTACT_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            <label className="ct-field">
              <span>Experience type (optional)</span>
              <select name="experienceType" defaultValue="">
                <option value="">— Select —</option>
                {EXPERIENCE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="ct-field">
            <span>Message *</span>
            <textarea name="message" rows={5} required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your moment or question…" />
          </label>
          <label className="ct-consent">
            <input type="checkbox" name="consent" required />
            <span>I agree to be contacted by Magical Moments by Reign about my inquiry.</span>
          </label>
          <button type="submit" className="btn-gold">Send message ✦</button>
        </form>
      </section>
    </div>
  );
}
