import Link from "next/link";
import { listExperiences } from "@/lib/experiences";
import { getExperienceType } from "@/lib/experience-types";
import "./social/social.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const experiences = await listExperiences();

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Magical <span>by Reign</span>
        </Link>
        <div className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/create" className="btn btn-primary">
            New experience
          </Link>
        </div>
      </nav>

      <header className="app-header">
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--gold-400)" }}>
            Your studio
          </span>
          <h1>Every experience, in one place</h1>
          <p>
            These all live inside the same master application — each one unique,
            each one at its own address.
          </p>
        </div>
      </header>

      <main className="container" style={{ padding: "3rem 0 5rem" }}>
        <div className="studio-tile">
          <div>
            <h3>
              <span className="studio-tile__icon" aria-hidden="true">📣</span>{" "}
              Magical Social Studio
            </h3>
            <p>
              Connect Instagram, Facebook, TikTok and YouTube, then share your
              moments — beautifully optimized for each platform, always with your
              approval.
            </p>
          </div>
          <Link href="/dashboard/social" className="btn-gold">
            Open Social Studio ✦
          </Link>
        </div>

        <div className="toolbar">
          <p className="muted" style={{ margin: 0 }}>
            {experiences.length} {experiences.length === 1 ? "experience" : "experiences"}
          </p>
          <Link href="/create" className="btn btn-dark">
            + Create experience
          </Link>
        </div>

        {experiences.length === 0 ? (
          <div className="empty">
            <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
              No experiences yet.
            </p>
            <Link href="/create" className="btn btn-dark">
              Create your first one
            </Link>
          </div>
        ) : (
          <div className="exp-grid">
            {experiences.map((exp) => {
              const t = getExperienceType(exp.type);
              const p = exp.designSpec.palette;
              return (
                <Link href={`/${exp.slug}`} className="exp-card" key={exp.id}>
                  <div
                    className="exp-card__banner"
                    style={{ background: `linear-gradient(135deg, ${p.heroFrom}, ${p.heroTo})` }}
                  />
                  <div className="exp-card__body">
                    <span className="exp-card__type">
                      {t?.emoji} {t?.label ?? exp.type}
                    </span>
                    <h3 className="exp-card__title">{exp.title}</h3>
                    <p className="exp-card__url">/{exp.slug}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
