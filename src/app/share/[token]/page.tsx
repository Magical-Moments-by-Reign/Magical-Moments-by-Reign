import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/site/SiteFooter";
import { getShareByToken, checkShareAccess, recordShareView, resolveSharedExperiences } from "@/lib/shares";
import { getExperienceType } from "@/lib/experience-types";
import { heroMediaFor } from "@/lib/hero-media";
import "./share.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "A shared family journey", robots: { index: false } };

function fmt(d?: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";
}

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pw?: string; e?: string }>;
}) {
  const { token } = await params;
  const { pw, e } = await searchParams;
  const link = await getShareByToken(token);
  if (!link) notFound();

  const access = checkShareAccess(link, pw, new Date());

  if (!access.ok) {
    return (
      <div className="shv shv--gate">
        <div className="shv-gate">
          <div className="shv-gate__mark" aria-hidden="true">✦</div>
          <div className="shv-gate__brand">Magical Moments <span>by reign</span></div>
          {access.reason === "expired" && <><h1>This link has expired</h1><p>Please ask the family for an updated link.</p></>}
          {access.reason === "maxviews" && <><h1>This link is no longer available</h1><p>It has reached its viewing limit. Please ask the family for a new link.</p></>}
          {access.reason === "password" && (
            <>
              <h1>This journey is private</h1>
              <p>Enter the password shared with you to continue.</p>
              <form className="shv-gate__form" method="get">
                {e && <input type="hidden" name="e" value={e} />}
                <input name="pw" type="password" placeholder="Password" autoFocus required />
                <button type="submit" className="btn-gold">View journey</button>
              </form>
              {pw && <p className="shv-gate__err">That password didn&apos;t match. Please try again.</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  // Access granted — count the view once (best-effort).
  await recordShareView(link.id);
  const experiences = await resolveSharedExperiences(link);

  return (
    <div className="shv">
      <header className="shv-header">
        <div className="container">
          <div className="shv-brand">Magical Moments <span>by reign</span></div>
          <span className="eyebrow shv-eyebrow">A shared family journey</span>
          <h1>{link.title || "Our Family Timeline"}</h1>
          <p>You&apos;ve been given a private view of {link.includeAll ? "this family's timeline" : "these journeys"}. Only what the family chose to share appears here.</p>
        </div>
      </header>

      <main className="container shv-main">
        {experiences.length === 0 ? (
          <p className="shv-empty">There&apos;s nothing to show in this link yet.</p>
        ) : (
          <ol className="shv-timeline">
            {experiences.map((exp, i) => {
              const t = getExperienceType(exp.type);
              let content: { hero?: { videoUrl?: string; posterUrl?: string }; gallery?: { url: string }[] } = {};
              try { content = JSON.parse(exp.content); } catch { /* ignore */ }
              const cover = heroMediaFor(exp.slug, content).poster ?? content.gallery?.[0]?.url;
              return (
                <li className="shv-chapter" key={exp.id}>
                  <span className="shv-chapter__index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <Link href={`/${exp.slug}`} className="shv-card">
                    <div className="shv-card__cover">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt={exp.title} loading="lazy" />
                      ) : <div className="shv-card__fallback" aria-hidden="true" />}
                      <span className="shv-card__type">{t?.emoji} {t?.label ?? exp.type}</span>
                    </div>
                    <div className="shv-card__body">
                      <h2>{exp.title}</h2>
                      {(exp.subtitle || exp.eventDate) && <p className="shv-card__sub">{exp.subtitle || fmt(exp.eventDate)}</p>}
                      <span className="shv-card__cta">Open this journey →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        <p className="shv-locked">🔒 Any journeys not shared in this link stay completely private.</p>
      </main>

      <SiteFooter />
    </div>
  );
}
