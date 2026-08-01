import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import { listExperiences } from "@/lib/experiences";
import { getExperienceType } from "@/lib/experience-types";
import "./social/social.css";
import "./dashboard.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function DashboardPage() {
  const all = await listExperiences();
  // Business websites are custom projects — never shown in the customer library.
  const experiences = all.filter((e) => e.type !== "business");

  return (
    <div className="ss">
      <SiteNav />

      <header className="app-header" style={{ background: "linear-gradient(160deg, var(--charcoal-900), var(--charcoal-800))" }}>
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Your studio</span>
          <h1>A beautiful library of stories</h1>
          <p>Every experience lives here — each one unique, each at its own address.</p>
        </div>
      </header>

      <main className="container" style={{ padding: "2.5rem 0 5rem" }}>
        <div className="studio-tile">
          <div>
            <h3><span className="studio-tile__icon" aria-hidden="true">📣</span> Magical Social Studio</h3>
            <p>Connect Instagram, Facebook, TikTok and YouTube, then share your moments — beautifully optimized for each platform, always with your approval.</p>
          </div>
          <Link href="/dashboard/social" className="btn-gold">Open Social Studio ✦</Link>
        </div>

        <div className="toolbar">
          <p className="muted" style={{ margin: 0 }}>
            {experiences.length} {experiences.length === 1 ? "experience" : "experiences"}
          </p>
          <Link href="/create" className="btn-gold">+ Create experience</Link>
        </div>

        {experiences.length === 0 ? (
          <div className="empty">
            <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>No experiences yet.</p>
            <Link href="/create" className="btn-gold">Create your first one</Link>
          </div>
        ) : (
          <div className="exp-grid">
            {experiences.map((exp) => {
              const t = getExperienceType(exp.type);
              const p = exp.designSpec.palette;
              const cover = exp.content.gallery?.[0]?.url;
              const memories = exp.content.gallery?.length ?? 0;
              return (
                <article className="storycard" key={exp.id}>
                  <div className="storycard__cover">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={exp.title} loading="lazy" />
                    ) : (
                      <div className="storycard__fallback" style={{ background: `linear-gradient(135deg, ${p.heroFrom}, ${p.heroTo})` }} />
                    )}
                    <span className="storycard__type">{t?.emoji} {t?.label ?? exp.type}</span>
                    <span className="storycard__status">{exp.status === "PUBLISHED" ? "● Live" : exp.status}</span>
                  </div>
                  <div className="storycard__body">
                    <h3 className="storycard__title">{exp.title}</h3>
                    <p className="storycard__url">magicalmomentsbyreign.com/{exp.slug}</p>
                    <div className="storycard__stats">
                      <span className="storycard__stat"><b>{memories}</b><span>Memories</span></span>
                      <span className="storycard__stat"><b>{fmtDate(exp.updatedAt)}</b><span>Updated</span></span>
                    </div>
                    <div className="storycard__actions">
                      <Link href={`/${exp.slug}`} className="storycard__btn storycard__btn--primary">Preview</Link>
                      <Link href={`/${exp.slug}`} className="storycard__btn">Edit</Link>
                      <Link href="/dashboard/social/share" className="storycard__btn">Share</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
