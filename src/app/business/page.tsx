import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
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
  { icon: "✦", t: "Bespoke design", d: "Never a template. A look created for your brand alone." },
  { icon: "🌐", t: "Your own domain", d: "A custom domain and professional email-ready setup." },
  { icon: "📱", t: "Flawless on every device", d: "Cinematic on desktop, effortless on mobile." },
  { icon: "🤝", t: "Personal consultation", d: "A real conversation — we build it with you, not at you." },
  { icon: "🔍", t: "Built to be found", d: "Search-friendly foundations so customers can find you." },
  { icon: "♾", t: "A lasting home online", d: "A polished, lifetime digital home for your business." },
];

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  if (sent) {
    return (
      <div className="biz">
        <SiteNav active="business" />
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
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="biz">
      <SiteNav active="business" />

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
            <span className="eyebrow">The craft</span>
            <h2>Everything a beautiful business site needs</h2>
            <p className="muted">Designed like a luxury agency project — because that&apos;s exactly what it is.</p>
          </div>
          <div className="biz-inc-grid">
            {INCLUDES.map((it) => (
              <article className="biz-inc" key={it.t}>
                <span className="biz-inc__icon" aria-hidden="true">{it.icon}</span>
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

      <SiteFooter />
    </div>
  );
}
