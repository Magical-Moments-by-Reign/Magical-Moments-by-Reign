import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import { listExperiences } from "@/lib/experiences";
import { getExperienceType } from "@/lib/experience-types";
import { heroMediaFor } from "@/lib/hero-media";
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
  // One master timeline: every journey as a connected chapter, in order.
  const timeline = [...experiences].sort((a, b) => {
    const da = (a.eventDate ? new Date(a.eventDate) : new Date(a.createdAt)).getTime();
    const db = (b.eventDate ? new Date(b.eventDate) : new Date(b.createdAt)).getTime();
    return da - db;
  });

  return (
    <div className="ss">
      <SiteNav />

      <header className="app-header" style={{ background: "linear-gradient(160deg, var(--charcoal-900), var(--charcoal-800))" }}>
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Your family studio</span>
          <h1>One family. One legacy. Every chapter.</h1>
          <p>Every journey lives together here — nothing overwritten, nothing lost. Add new chapters as your family grows.</p>
        </div>
      </header>

      <main className="container" style={{ padding: "2.5rem 0 5rem" }}>
        {/* Legacy Timeline — the master family timeline */}
        {timeline.length > 0 && (
          <section className="legacy">
            <div className="legacy__head">
              <h2>Your Family Timeline</h2>
              <Link href="/create" className="btn-gold">+ Start a New Journey</Link>
            </div>
            <ol className="legacy__track">
              {timeline.map((exp) => {
                const t = getExperienceType(exp.type);
                return (
                  <li className="legacy__chapter" key={exp.id}>
                    <Link href={`/${exp.slug}`}>
                      <span className="legacy__emoji" aria-hidden="true">{t?.emoji ?? "✦"}</span>
                      <span className="legacy__title">{exp.title}</span>
                      <span className="legacy__date">{exp.eventDate ? fmtDate(exp.eventDate) : fmtDate(exp.createdAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <div className="studio-tiles">
          <div className="studio-tile">
            <div>
              <h3><span className="studio-tile__icon" aria-hidden="true">📣</span> Magical Social Studio</h3>
              <p>Connect Instagram, Facebook, TikTok and YouTube, then share your moments — beautifully optimized for each platform, always with your approval.</p>
            </div>
            <Link href="/dashboard/social" className="btn-gold">Open Social Studio ✦</Link>
          </div>
          <div className="studio-tile">
            <div>
              <h3><span className="studio-tile__icon" aria-hidden="true">🔗</span> Private family sharing</h3>
              <p>Create a private link that includes only the journeys you choose — with an optional password, expiry, and view limit. Everything else stays hidden.</p>
            </div>
            <Link href="/dashboard/shares" className="btn-gold">Create a share link ✦</Link>
          </div>
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
              // Preview of their item; if none, a still of the experience's video.
              const cover = heroMediaFor(exp.slug, exp.content).poster ?? exp.content.gallery?.[0]?.url;
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
                      <Link href={`/dashboard/${exp.slug}/media`} className="storycard__btn">Upload media</Link>
                      <Link href={`/dashboard/${exp.slug}/domain`} className="storycard__btn">Domain</Link>
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
