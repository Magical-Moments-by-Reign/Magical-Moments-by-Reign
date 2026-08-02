import type { Metadata } from "next";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import {
  LIFE_GUIDANCE, GRADE_TIMELINE, GRAD_TOPIC_GROUPS, topicsInGroup,
  GUIDE_ARTICLES, officialResource, OFFICIAL_RESOURCES, recommendForGrade, US_STATES,
} from "@/lib/life-guidance";
import "./life-guidance.css";

export const metadata: Metadata = {
  title: "Life Guidance Center — Graduation Success",
  description:
    "Helping families navigate life's biggest milestones with confidence. Plain-language guides, a grade-by-grade timeline, and official resources for graduation, college, and financial aid. Educational only.",
};

const FEDERAL = ["fafsa", "studentaid_scholarships", "collegeboard", "bigfuture", "act", "ed_gov"];

export default function LifeGuidancePage() {
  const sample = recommendForGrade("10");
  return (
    <div className="lg">
      <SiteNav />
      <main className="lg-main">
        <header className="lg-hero">
          <div className="lg-inner">
            <span className="lg-eyebrow">{LIFE_GUIDANCE.name}</span>
            <h1 className="lg-title">Navigate life&apos;s biggest milestones with confidence</h1>
            <p className="lg-tagline">{LIFE_GUIDANCE.tagline}</p>
            <p className="lg-lead">{LIFE_GUIDANCE.philosophy}</p>
          </div>
        </header>

        <div className="lg-inner lg-body">
          <section className="lg-sec">
            <span className="lg-kicker">Graduation Success Center</span>
            <h2 className="lg-h2">Prepare years in advance — not just senior year</h2>
            <div className="lg-timeline">
              {GRADE_TIMELINE.map((g) => (
                <article key={g.grade} className="lg-grade">
                  <span className="lg-grade__badge">{g.label}</span>
                  <ul>{g.focus.map((f) => <li key={f}>{f}</li>)}</ul>
                </article>
              ))}
            </div>
          </section>

          <section className="lg-sec">
            <h2 className="lg-h2">What you can explore</h2>
            <div className="lg-topics">
              {GRAD_TOPIC_GROUPS.map((grp) => (
                <div key={grp.id} className="lg-topicgroup">
                  <h3>{grp.label}</h3>
                  <ul>{topicsInGroup(grp.id).map((t) => <li key={t.label}>{t.label}</li>)}</ul>
                </div>
              ))}
            </div>
          </section>

          <section className="lg-sec">
            <h2 className="lg-h2">Simple answers to common questions</h2>
            <div className="lg-guides">
              {GUIDE_ARTICLES.map((g) => {
                const more = officialResource(g.learnMore);
                return (
                  <details key={g.slug} className="lg-guide">
                    <summary>{g.question}</summary>
                    <p>{g.answer}</p>
                    {more && more.url ? (
                      <a className="lg-guide__link" href={more.url} target="_blank" rel="noopener noreferrer">Learn more · {more.label} ↗</a>
                    ) : null}
                  </details>
                );
              })}
            </div>
          </section>

          <section className="lg-sec lg-ai">
            <h2 className="lg-h2">Ask Magical guides you along the way</h2>
            <div className="lg-ai__bubble">
              <span className="lg-ai__spark" aria-hidden="true">✨</span>
              <p>{sample.message}</p>
            </div>
            <p className="lg-note">Ask Magical proactively surfaces the right resources for your child&apos;s grade and goals — gently, never overwhelming.</p>
          </section>

          <section className="lg-sec">
            <h2 className="lg-h2">State-specific guidance</h2>
            <p>
              Education requirements differ by state, so we link families to their state&apos;s
              <strong> official Department of Education</strong> for the most current, accurate
              information — rather than generalized advice. All 50 states and D.C. are supported
              ({US_STATES.length} in total); per-state official links are curated and kept up to date.
            </p>
            <h3 className="lg-h3">Trusted official resources</h3>
            <ul className="lg-resources">
              {FEDERAL.map((k) => {
                const r = OFFICIAL_RESOURCES[k];
                return <li key={k}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.label} ↗</a></li>;
              })}
            </ul>
          </section>

          <section className="lg-mission">
            <p className="lg-mission__line">{LIFE_GUIDANCE.mission}</p>
            <p className="lg-mission__sub">Informed. Empowered. Prepared for life&apos;s next chapter.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
