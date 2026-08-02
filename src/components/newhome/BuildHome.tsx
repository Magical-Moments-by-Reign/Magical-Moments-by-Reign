"use client";

// ── Build a Home (first slice) ──────────────────────────────────
// Intake → personalized roadmap + an interactive 28-stage construction
// timeline. Progress persists locally (localStorage). Informational only
// — organizational & educational assistance, NOT mortgage/legal/
// engineering/construction advice. Data centers that need uploads,
// budgets, and collaboration are documented for later phases.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  INTAKE_QUESTIONS, BUILD_STAGES, BUILD_PHASES, roadmapFrom,
  type IntakeAnswers,
} from "@/lib/build-home";

interface Saved {
  started?: boolean;
  answers: IntakeAnswers;
  done: Record<number, boolean>;
}

const KEY = "mmr_build_home_v1";

export default function BuildHome() {
  const [loaded, setLoaded] = useState(false);
  const [s, setS] = useState<Saved>({ answers: {}, done: {} });

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setS(JSON.parse(raw)); } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }
  }, [s, loaded]);

  const answered = INTAKE_QUESTIONS.filter((q) => s.answers[q.id]).length;
  const roadmap = useMemo(() => roadmapFrom(s.answers), [s.answers]);
  const completed = BUILD_STAGES.filter((st) => s.done[st.n]).length;
  const pct = Math.round((completed / BUILD_STAGES.length) * 100);

  if (!loaded) return <div className="bh-loading">Loading your build…</div>;

  // ── Intake ──
  if (!s.started) {
    return (
      <div className="bh-intake">
        <p className="bh-intro">A few quick questions and we&apos;ll shape a personalized roadmap — from your first floor plan to the front-door key.</p>
        {INTAKE_QUESTIONS.map((q) => (
          <div key={q.id} className="bh-q">
            <label className="bh-q__label">{q.label}</label>
            {q.kind === "choice" ? (
              <div className="bh-choices">
                {q.options!.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`bh-choice${s.answers[q.id] === opt ? " bh-choice--on" : ""}`}
                    onClick={() => setS((p) => ({ ...p, answers: { ...p.answers, [q.id]: opt } }))}
                  >{opt}</button>
                ))}
              </div>
            ) : (
              <input
                className="bh-input"
                type={q.kind === "date" ? "date" : "text"}
                placeholder={q.placeholder}
                value={s.answers[q.id] ?? ""}
                onChange={(e) => setS((p) => ({ ...p, answers: { ...p.answers, [q.id]: e.target.value } }))}
              />
            )}
          </div>
        ))}
        <div className="bh-intake__foot">
          <span className="bh-intake__count">{answered}/{INTAKE_QUESTIONS.length} answered</span>
          <button type="button" className="btn btn-gold" onClick={() => setS((p) => ({ ...p, started: true }))}>Build my roadmap</button>
        </div>
        <p className="bh-disclaimer">Magical Moments provides organizational &amp; educational assistance — not mortgage, legal, engineering, or construction advice. Always confirm costs and decisions with your builder or lender.</p>
      </div>
    );
  }

  // ── Roadmap + timeline ──
  return (
    <div className="bh">
      <div className="bh-topbar">
        <button type="button" className="bh-link" onClick={() => setS((p) => ({ ...p, started: false }))}>← Edit answers</button>
        {s.answers.location && <span className="bh-loc">Building in {s.answers.location}</span>}
      </div>

      <section className="bh-card bh-roadmap">
        <h2 className="bh-h2">Your personalized roadmap</h2>
        <ol className="bh-steps">
          {roadmap.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
        {s.answers.budget && (
          <p className="bh-budgetline">Target budget: <strong>{s.answers.budget}</strong>{s.answers.completion ? ` · Target completion: ${s.answers.completion}` : ""}</p>
        )}
      </section>

      <section className="bh-card">
        <div className="bh-progress__head">
          <h2 className="bh-h2">Construction timeline</h2>
          <span className="bh-progress__pct">{completed} of {BUILD_STAGES.length} stages · {pct}%</span>
        </div>
        <div className="bh-progress"><div className="bh-progress__bar" style={{ width: `${pct}%` }} /></div>

        {BUILD_PHASES.map((phase) => (
          <div key={phase} className="bh-phase">
            <h3 className="bh-phase__title">{phase}</h3>
            <div className="bh-stages">
              {BUILD_STAGES.filter((st) => st.phase === phase).map((st) => {
                const on = !!s.done[st.n];
                return (
                  <button
                    key={st.n}
                    type="button"
                    className={`bh-stage${on ? " bh-stage--on" : ""}`}
                    onClick={() => setS((p) => ({ ...p, done: { ...p.done, [st.n]: !p.done[st.n] } }))}
                    aria-pressed={on}
                  >
                    <span className="bh-stage__n">{on ? "✓" : st.n}</span>
                    <span className="bh-stage__body">
                      <span className="bh-stage__title">{st.title}</span>
                      <span className="bh-stage__captures">{st.captures.join(" · ")}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="bh-disclaimer">Each stage will soon capture dates, photos &amp; videos, documents, costs, payments, approvals, delays, inspection results, and assigned contacts — with versioned floor plans, a budget tracker, and your build team. Confirm all costs with your builder or lender.</p>
      </section>

      <section className="bh-card bh-next">
        <h2 className="bh-h2">Keep the whole story</h2>
        <p>When your build is complete, the construction Journey becomes the permanent history of your home. Add a housewarming celebration with a <Link href="/membership">registry &amp; cash gifts</Link>, or explore other <Link href="/create">Journeys</Link> for your family.</p>
      </section>
    </div>
  );
}
