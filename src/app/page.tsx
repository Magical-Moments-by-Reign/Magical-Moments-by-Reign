import Link from "next/link";
import { EXPERIENCE_TYPES } from "@/lib/experience-types";

export default function LandingPage() {
  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Magical <span>by Reign</span>
        </Link>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#moments">Moments</a>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/create" className="btn btn-primary">
            Create an experience
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="container hero-inner">
          <span className="eyebrow">One platform · unlimited unique experiences</span>
          <h1>
            Every moment deserves to be
            <br />
            <span className="accent">unforgettable.</span>
          </h1>
          <p className="lede">
            Magical by Reign is one beautifully engineered platform that turns
            life&apos;s biggest moments into custom-designed, interactive
            keepsakes — each with its own address, its own story, and a look no
            other page will ever share.
          </p>
          <div className="hero-actions">
            <Link href="/create" className="btn btn-primary">
              Begin your first moment
            </Link>
            <Link href="/dashboard" className="btn btn-ghost">
              View the dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section id="how">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">The experience</span>
            <h2>Like hiring a luxury design agency</h2>
            <p>
              No cookie-cutter templates. No blank-canvas anxiety. Every
              experience is generated uniquely from one master application.
            </p>
          </div>
          <div className="grid">
            <article className="card">
              <div className="icon">✦</div>
              <h3>Start from a moment</h3>
              <p>Choose an occasion — a wedding, a birthday, a new baby. Never a blank page.</p>
            </article>
            <article className="card">
              <div className="icon">✧</div>
              <h3>The engine designs it</h3>
              <p>Colors, fonts, layout, animation and story order are composed uniquely — no two pages alike.</p>
            </article>
            <article className="card">
              <div className="icon">❦</div>
              <h3>Gets its own address</h3>
              <p>Every experience is instantly published to its own link, like magicalbyreign.com/smithwedding.</p>
            </article>
            <article className="card">
              <div className="icon">♥</div>
              <h3>Grows over time</h3>
              <p>Add photos, chapters and guests. A moment becomes a living keepsake families return to.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Moments */}
      <section id="moments" style={{ background: "var(--ivory)" }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">For every chapter</span>
            <h2>The moments worth keeping</h2>
            <p>One platform for all of life&apos;s most meaningful celebrations.</p>
          </div>
          <div className="type-cloud">
            {EXPERIENCE_TYPES.map((t) => (
              <span className="type-chip" key={t.id}>
                <span aria-hidden="true">{t.emoji}</span> {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "linear-gradient(160deg, var(--plum-900), var(--plum-800))", color: "var(--ivory)", textAlign: "center" }}>
        <div className="container">
          <span className="eyebrow">Ready when you are</span>
          <h2 style={{ fontSize: "clamp(2rem,5vw,3.2rem)" }}>Create your first magical moment</h2>
          <p style={{ color: "rgba(248,243,236,0.8)", maxWidth: "40em", margin: "0 auto 2rem" }}>
            It takes seconds. The platform provisions a unique URL, a database
            record, a story structure and a one-of-a-kind design — instantly.
          </p>
          <Link href="/create" className="btn btn-primary">
            Create an experience
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p className="brand">
            Magical <span>by Reign</span>
          </p>
          <p>Preserving life&apos;s biggest moments, one magical experience at a time.</p>
          <small>© {new Date().getFullYear()} Magical by Reign · Founded by Tabitha Turner</small>
        </div>
      </footer>
    </>
  );
}
