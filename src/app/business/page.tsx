import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import { submitCustomWebsiteAction } from "./actions";
import { PROJECT_TYPES, BUDGET_RANGES, TIMELINES } from "@/lib/custom-website";
import "./business.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Custom Business Websites",
  description:
    "Bespoke, lifetime business websites hand-crafted by Magical Moments by Reign — your own domain, a personal consultation, and a design no template could ever match.",
};

const STEPS = [
  { n: "01", t: "Tell us your vision", d: "Share a few details below. It takes two minutes — no commitment." },
  { n: "02", t: "We review & accept", d: "Our team personally reviews every request. Once accepted, you'll get an email — stand by for a phone call to get started." },
  { n: "03", t: "Guided intake form", d: "We send a short, guided form to gather your brand, content and goals so nothing gets missed." },
  { n: "04", t: "We craft & launch", d: "We design, build and launch your one-of-a-kind site on its own domain — beautiful, fast and unmistakably yours." },
];

const INCLUDES = [
  {
    icon: (<><path d="M12 3l1.9 5.4L19.4 10l-5.5 1.6L12 17l-1.9-5.4L4.6 10l5.5-1.6z" /><path d="M18.4 4.4l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" /></>),
    t: "Made uniquely for you", d: "Every Magical Moment is personalized around your story, style, photos, and celebration.",
  },
  {
    icon: (<><circle cx="6" cy="12" r="2.4" /><circle cx="17" cy="6" r="2.4" /><circle cx="17" cy="18" r="2.4" /><path d="M8.2 10.9l6.5-3.6M8.2 13.1l6.5 3.6" /></>),
    t: "Your own shareable page", d: "Receive one beautiful link to share with family and friends anywhere.",
  },
  {
    icon: (<><rect x="2.5" y="5" width="12" height="8.5" rx="1.3" /><path d="M6 17h5.5" /><rect x="16" y="8.5" width="5.5" height="9.5" rx="1.3" /></>),
    t: "Beautiful on every device", d: "Your moment will look polished and seamless on phones, tablets, and computers.",
  },
  {
    icon: (<><path d="M5 19l8.4-8.4" /><path d="M17 4l.7 1.9 1.9.7-1.9.7L17 9.2l-.7-1.9L14.4 6.6l1.9-.7z" /><path d="M6.6 5l.45 1.3 1.3.45-1.3.45L6.6 8.5l-.45-1.3L4.85 6.75l1.3-.45z" /></>),
    t: "Easy personal setup", d: "We guide you through each step so creating your page feels simple, joyful, and stress-free.",
  },
  {
    icon: (<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path d="M4 17.5l5-4 3.5 2.6M12.5 15l3.5-2.6 4 3.1" /></>),
    t: "Photos, videos, and memories", d: "Bring your story to life with favorite pictures, videos, messages, milestones, and special details.",
  },
  {
    icon: (<path d="M12 20.5s-6.7-4.3-6.7-9.2A3.6 3.6 0 0 1 12 8a3.6 3.6 0 0 1 6.7 3.3c0 4.9-6.7 9.2-6.7 9.2z" />),
    t: "A lasting digital keepsake", d: "Your Magical Moment becomes a beautiful online home you can revisit for years to come.",
  },
];

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const signedIn = Boolean(await currentAccount());

  if (sent) {
    return (
      <div className="biz">
        <PublicNav active="get-started" signedIn={signedIn} />
        <main className="container biz-main">
          <div className="biz-confirm">
            <div className="biz-confirm__badge" aria-hidden="true">✦</div>
            <span className="eyebrow" style={{ color: "var(--gold-deep)" }}>Request received</span>
            <h1>Thank you — we can&apos;t wait to build with you.</h1>
            <p>
              We&apos;ve received your custom website request and sent a confirmation to your
              email. Our team personally reviews every project.
            </p>
            <p className="biz-confirm__number">Your reference: <strong>{sent}</strong></p>
            <p className="biz-confirm__hint">
              Once we accept your project, you&apos;ll get an email — please be on standby for a
              phone call so we can get started, plus a short intake form to gather everything we need.
            </p>
            <div className="biz-confirm__actions">
              <Link href="/" className="btn-gold">Back to home</Link>
              <Link href="/pricing" className="btn btn-dark">See memory plans</Link>
            </div>
          </div>
        </main>
        <PublicFooter year={new Date().getFullYear()} />
      </div>
    );
  }

  return (
    <div className="biz">
      <PublicNav active="get-started" signedIn={signedIn} />

      {/* Hero */}
      <header className="biz-hero">
        <div className="container biz-hero__inner">
          <span className="eyebrow biz-hero__eyebrow">Custom business websites</span>
          <h1 className="biz-hero__title">
            <span>Your business deserves</span>
            <span className="accent">a masterpiece.</span>
          </h1>
          <p className="biz-hero__lede">
            Beyond our memory experiences, Magical Moments by Reign hand-crafts bespoke,
            lifetime websites for businesses and brands — your own domain, a personal
            consultation, and a design no template could ever match.
          </p>
          <div className="biz-hero__actions">
            <a href="#start" className="btn-gold">Start your project ✦</a>
            <a href="#includes" className="btn-ghost">What&apos;s included</a>
          </div>
          <p className="biz-hero__note">
            Custom, quote-based projects — created separately from our self-serve memory plans.
          </p>
        </div>
      </header>

      {/* What's included */}
      <section id="includes" className="biz-section">
        <div className="container">
          <div className="section-head--left">
            <span className="eyebrow">The Magic</span>
            <h2>Everything your special moment needs</h2>
            <p className="muted">Beautifully designed to help you celebrate, share, and preserve life&apos;s most meaningful memories.</p>
          </div>
          <div className="biz-inc-grid">
            {INCLUDES.map((it) => (
              <article className="biz-inc" key={it.t}>
                <span className="biz-inc__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">{it.icon}</svg>
                </span>
                <h3>{it.t}</h3>
                <p>{it.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="biz-section biz-section--alt">
        <div className="container">
          <div className="section-head--left">
            <span className="eyebrow">How it works</span>
            <h2>From first idea to launch day</h2>
          </div>
          <div className="biz-steps">
            {STEPS.map((s) => (
              <article className="biz-step" key={s.n}>
                <span className="biz-step__n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Request form */}
      <section id="start" className="biz-section">
        <div className="container biz-form-wrap">
          <div className="biz-form-intro">
            <span className="eyebrow">Start your project</span>
            <h2>Tell us about your vision</h2>
            <p className="muted">
              Share a few details and we&apos;ll be in touch personally. There&apos;s no
              commitment — just the beginning of something beautiful.
            </p>
          </div>

          <form className="biz-form" action={submitCustomWebsiteAction}>
            {error && (
              <div className="biz-error">Please add your name, a valid email, and a little about your project.</div>
            )}
            <div className="biz-row">
              <label className="biz-field">
                <span>Your name *</span>
                <input name="name" required autoComplete="name" placeholder="Jane Doe" />
              </label>
              <label className="biz-field">
                <span>Email *</span>
                <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
              </label>
            </div>
            <div className="biz-row">
              <label className="biz-field">
                <span>Phone</span>
                <input name="phone" type="tel" autoComplete="tel" placeholder="(555) 555-5555" />
              </label>
              <label className="biz-field">
                <span>Business / brand name</span>
                <input name="business" placeholder="Your business" />
              </label>
            </div>
            <div className="biz-row biz-row--3">
              <label className="biz-field">
                <span>Project type</span>
                <select name="projectType" defaultValue="">
                  <option value="" disabled>Choose one…</option>
                  {PROJECT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="biz-field">
                <span>Budget</span>
                <select name="budget" defaultValue="">
                  <option value="" disabled>Choose one…</option>
                  {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className="biz-field">
                <span>Timeline</span>
                <select name="timeline" defaultValue="">
                  <option value="" disabled>Choose one…</option>
                  {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>
            <label className="biz-field">
              <span>Tell us about your project *</span>
              <textarea name="details" rows={5} required placeholder="What does your business do? What do you want your website to achieve? Any sites you love?" />
            </label>
            <button type="submit" className="btn-gold biz-submit">Send my request ✦</button>
            <p className="biz-form__fine">
              By sending, you agree to be contacted about your project. We&apos;ll never share your details.
            </p>
          </form>
        </div>
      </section>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
