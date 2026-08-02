import type { CSSProperties } from "react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import OccasionIcon from "@/components/OccasionIcon";
import { createExperienceAction } from "@/app/actions";
import { EXPERIENCE_TYPES, getExperienceType } from "@/lib/experience-types";
import { STORY_PHOTOS } from "@/lib/story-photos";
import "./create.css";

export const metadata = { title: "Create an experience" };

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; type?: string }>;
}) {
  const { error, type } = await searchParams;
  const selected = type && getExperienceType(type) ? type : EXPERIENCE_TYPES[0].id;

  return (
    <div className="cr">
      <SiteNav active="experiences" />

      <header className="cr-header">
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>A new moment</span>
          <h1>Choose your story</h1>
          <p>Pick the occasion and give it a name. Ask Magical designs it, provisions a unique URL, and publishes it — instantly.</p>
          <p className="cr-header__preview">Not sure yet? <a href="/journeys">Explore each Journey first →</a></p>
        </div>
      </header>

      <main className="container cr-main">
        <form action={createExperienceAction} className="cr-form">
          {error === "missing" && (
            <div className="cr-error">Please choose an occasion and enter a title.</div>
          )}

          <fieldset className="cr-fieldset">
            <legend className="cr-legend">1 · Choose your occasion</legend>
            <div className="cr-occasions">
              {EXPERIENCE_TYPES.map((t) => {
                const photo = STORY_PHOTOS[t.id];
                return (
                  <label key={t.id} className="cr-occ" style={{ "--c1": t.gradient[0], "--c2": t.gradient[1] } as CSSProperties}>
                    <input type="radio" name="type" value={t.id} defaultChecked={t.id === selected} required />
                    <span className={`cr-occ__card${photo ? " cr-occ__card--photo" : ""}`}>
                      {photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="cr-occ__photo" src={photo} alt="" aria-hidden="true" loading="lazy" />
                      )}
                      <span className="cr-occ__icon"><OccasionIcon name={t.icon} size={24} /></span>
                      <span className="cr-occ__check" aria-hidden="true">✓</span>
                      <span className="cr-occ__label">{t.label}</span>
                      <span className="cr-occ__desc">{t.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="cr-fieldset">
            <legend className="cr-legend">2 · Name your moment</legend>
            <div className="cr-fields">
              <label className="cr-field">
                <span>Title</span>
                <input name="title" type="text" placeholder="e.g. The Smith Wedding" required />
                <small>The headline that greets every visitor.</small>
              </label>
              <label className="cr-field">
                <span>Subtitle (optional)</span>
                <input name="subtitle" type="text" placeholder="e.g. June 14th, 2027 · Napa Valley" />
              </label>
              <label className="cr-field">
                <span>Custom link (optional)</span>
                <input name="slug" type="text" placeholder="smithwedding" />
                <small>Lives at magicalmomentsbyreign.com/<strong>your-link</strong>. Leave blank and we&apos;ll create one.</small>
              </label>
            </div>
          </fieldset>

          <fieldset className="cr-fieldset">
            <legend className="cr-legend">3 · Gifts &amp; registry <span className="cr-legend__opt">(optional)</span></legend>
            <p className="cr-giftq">Would you like to receive gifts, cash gifts, or create a registry for this journey? Always optional — you can change it anytime.</p>
            <div className="cr-gifts">
              {[
                { id: "none", label: "No gifts" },
                { id: "registry", label: "Gift registry" },
                { id: "cash", label: "Cash gifts" },
                { id: "both", label: "Both" },
                { id: "later", label: "Add later" },
              ].map((g, i) => (
                <label key={g.id} className="cr-gift">
                  <input type="radio" name="giftMode" value={g.id} defaultChecked={i === 0} />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="btn-gold cr-submit">Create &amp; publish ✦</button>
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
