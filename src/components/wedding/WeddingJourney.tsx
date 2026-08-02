"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  WEDDING_CHECKLIST, BUDGET_CATEGORIES, WEDDING_STAGES,
  daysUntil,
} from "@/lib/wedding-plan";

interface SavedState {
  stage?: string;
  bride?: string;
  groom?: string;
  date?: string;
  budget?: string;
  done?: Record<string, boolean>;
}

const KEY = "mmr_wedding_journey_v1";
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function WeddingJourney() {
  const [loaded, setLoaded] = useState(false);
  const [s, setS] = useState<SavedState>({ done: {} });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }
  }, [s, loaded]);

  const set = (patch: Partial<SavedState>) => setS((prev) => ({ ...prev, ...patch }));
  const toggle = (id: string) => setS((prev) => ({ ...prev, done: { ...prev.done, [id]: !prev.done?.[id] } }));

  const days = useMemo(() => (s.date ? daysUntil(s.date, new Date()) : null), [s.date]);
  const total = WEDDING_CHECKLIST.reduce((n, p) => n + p.items.length, 0);
  const completed = WEDDING_CHECKLIST.reduce((n, p) => n + p.items.filter((i) => s.done?.[i.id]).length, 0);
  const pct = Math.round((completed / total) * 100);
  const budgetNum = parseFloat((s.budget || "").replace(/[^0-9.]/g, "")) || 0;

  if (!loaded) return <div className="wj-loading">Loading your journey…</div>;

  // ── Step 1: Welcome / stage ──
  if (!s.stage) {
    return (
      <div className="wj">
        <div className="wj-welcome">
          <span className="eyebrow wj-eyebrow">From Yes… to I Do.</span>
          <h1>Congratulations! Let&apos;s begin your forever.</h1>
          <p>Where are you in your journey? We&apos;ll build a calm, personalized plan around your answer.</p>
          <div className="wj-stages">
            {WEDDING_STAGES.map((st) => (
              <button key={st.id} type="button" className="wj-stage" onClick={() => set({ stage: st.id })}>
                <span className="wj-stage__label">{st.label}</span>
                <span className="wj-stage__note">{st.note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stage = WEDDING_STAGES.find((x) => x.id === s.stage);

  return (
    <div className="wj">
      {/* Couple + date */}
      <div className="wj-profile">
        <div className="wj-profile__head">
          <div>
            <span className="eyebrow wj-eyebrow">{stage?.label}</span>
            <h1>{s.bride || s.groom ? `${s.bride || "___"} & ${s.groom || "___"}` : "Your Wedding Journey"}</h1>
          </div>
          <button type="button" className="wj-reset" onClick={() => set({ stage: undefined })}>Change</button>
        </div>
        <div className="wj-fields">
          <label><span>Partner 1</span><input value={s.bride || ""} onChange={(e) => set({ bride: e.target.value })} placeholder="Name" /></label>
          <label><span>Partner 2</span><input value={s.groom || ""} onChange={(e) => set({ groom: e.target.value })} placeholder="Name" /></label>
          <label><span>Wedding date</span><input type="date" value={s.date || ""} onChange={(e) => set({ date: e.target.value })} /></label>
          <label><span>Total budget</span><input inputMode="numeric" value={s.budget || ""} onChange={(e) => set({ budget: e.target.value })} placeholder="$" /></label>
        </div>
      </div>

      {/* Countdown + progress */}
      <div className="wj-stats">
        <div className="wj-stat">
          <b>{days != null ? (days > 0 ? days : 0) : "—"}</b>
          <span>{days != null && days > 0 ? "days to go" : days != null ? "it's here!" : "add your date"}</span>
        </div>
        <div className="wj-stat wj-stat--progress">
          <div className="wj-stat__top"><span>Planning progress</span><span>{completed}/{total}</span></div>
          <div className="wj-bar"><span style={{ width: `${pct}%` }} /></div>
          <span className="wj-stat__pct">{pct}% complete</span>
        </div>
      </div>

      {/* Roadmap checklist */}
      <section className="wj-section">
        <h2>Your roadmap</h2>
        <p className="wj-muted">Check things off as you go — nothing here is ever due all at once.</p>
        <div className="wj-phases">
          {WEDDING_CHECKLIST.map((phase) => {
            const doneCount = phase.items.filter((i) => s.done?.[i.id]).length;
            return (
              <details className="wj-phase" key={phase.id} open={doneCount < phase.items.length}>
                <summary>
                  <span className="wj-phase__title">{phase.title}</span>
                  <span className="wj-phase__window">{phase.window}</span>
                  <span className="wj-phase__count">{doneCount}/{phase.items.length}</span>
                </summary>
                <ul className="wj-items">
                  {phase.items.map((it) => (
                    <li key={it.id}>
                      <label className={s.done?.[it.id] ? "is-done" : undefined}>
                        <input type="checkbox" checked={Boolean(s.done?.[it.id])} onChange={() => toggle(it.id)} />
                        <span>{it.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      {/* Budget tracker */}
      <section className="wj-section">
        <h2>Budget tracker</h2>
        {budgetNum > 0 ? (
          <>
            <p className="wj-muted">A suggested breakdown of your {money(budgetNum)} budget — a calm starting point you can adjust with real quotes.</p>
            <div className="wj-budget">
              {BUDGET_CATEGORIES.map((c) => (
                <div className="wj-bcat" key={c.id}>
                  <div className="wj-bcat__top"><span>{c.label}</span><b>{money(budgetNum * c.pct)}</b></div>
                  <div className="wj-bbar"><span style={{ width: `${c.pct * 100}%` }} /></div>
                  <span className="wj-bcat__pct">{Math.round(c.pct * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="wj-muted">Add your total budget above and we&apos;ll suggest a calm, category-by-category breakdown.</p>
        )}
      </section>

      {/* Next steps → real experiences */}
      <section className="wj-next">
        <h2>Ready to make it beautiful?</h2>
        <p>Turn your journey into a living keepsake — an engagement announcement, a wedding page, a shared gallery, and more.</p>
        <div className="wj-next__actions">
          <Link href="/create?type=wedding" className="btn-gold">Create your wedding experience ✦</Link>
          <Link href="/pricing" className="btn btn-dark">See plans</Link>
        </div>
      </section>
    </div>
  );
}
