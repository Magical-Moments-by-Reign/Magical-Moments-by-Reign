// ── "Everything Included" value section ─────────────────────────
// Drop-in block shown above pricing. All styles are namespaced under
// `.mm-included` so they never collide with the rest of the site. Grouped
// clusters, gold-foil medallions, and gold album photo corners on hover
// (keepsake language). Static/server component — hover/focus is pure CSS.

import { INCLUDED_INTRO, INCLUDED_GROUPS } from "@/lib/everything-included";

export default function EverythingIncluded() {
  return (
    <section className="mm-included" aria-labelledby="mm-included-title">
      {/* Official logo watermark, very low opacity */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mm-included__watermark" src="/brand/logo.png" alt="" aria-hidden="true" />

      <div className="mm-included__inner">
        <header className="mm-included__head">
          <span className="mm-included__eyebrow">✨ {INCLUDED_INTRO.eyebrow}</span>
          <h2 id="mm-included-title" className="mm-included__title">{INCLUDED_INTRO.title}</h2>
          <p className="mm-included__subtitle">{INCLUDED_INTRO.subtitle}</p>

          <p className="mm-included__promise">{INCLUDED_INTRO.promise}</p>
          <p className="mm-included__promise-body">{INCLUDED_INTRO.promiseBody}</p>

          <ul className="mm-included__badge" aria-label="Value promise">
            {INCLUDED_INTRO.badge.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </header>

        {INCLUDED_GROUPS.map((group) => (
          <div key={group.title} className="mm-included__group">
            <h3 className="mm-included__group-title">{group.title}</h3>
            <ul className="mm-included__grid">
              {group.features.map((f) => (
                <li key={f.label} className="mm-card" tabIndex={0}>
                  <span className="mm-card__corner mm-card__corner--tl" aria-hidden="true" />
                  <span className="mm-card__corner mm-card__corner--tr" aria-hidden="true" />
                  <span className="mm-card__corner mm-card__corner--bl" aria-hidden="true" />
                  <span className="mm-card__corner mm-card__corner--br" aria-hidden="true" />
                  <span className="mm-card__medallion" aria-hidden="true">{f.icon}</span>
                  <span className="mm-card__label">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
