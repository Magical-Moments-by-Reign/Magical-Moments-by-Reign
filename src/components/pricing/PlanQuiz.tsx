"use client";

import { useState } from "react";
import Link from "next/link";
import { PLAN_QUIZ, getPlan, formatPrice, type PlanId } from "@/lib/plans";

export default function PlanQuiz() {
  const [step, setStep] = useState(0);
  const [votes, setVotes] = useState<PlanId[]>([]);

  function choose(plan: PlanId) {
    const next = [...votes, plan];
    setVotes(next);
    setStep((s) => s + 1);
  }
  function reset() {
    setVotes([]);
    setStep(0);
  }

  const done = step >= PLAN_QUIZ.length;

  if (done) {
    // Tally: pick the highest-tier plan among the most-voted.
    const order: PlanId[] = ["silver", "gold", "diamond", "lifetime"];
    const counts: Record<string, number> = {};
    votes.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
    const max = Math.max(...Object.values(counts));
    const winner = order.filter((p) => counts[p] === max).pop() ?? "gold";
    const plan = getPlan(winner)!;
    return (
      <div className="pp-quiz">
        <div className="pp-quiz__result">
          <p className="pp-quiz__progress">Your match</p>
          <h3>{plan.name}</h3>
          <p style={{ color: "#5f5866" }}>
            {plan.label} — {formatPrice(plan.price)} {plan.priceKind}.
          </p>
          <div style={{ display: "flex", gap: "0.7rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.2rem" }}>
            <Link href={`/checkout?plan=${plan.id}`} className="btn-gold">Choose {plan.name}</Link>
            <button type="button" className="sc-btn" onClick={reset} style={{ padding: "0.7rem 1.1rem", borderRadius: 10, border: "1px solid var(--gray-200)", background: "#fff", cursor: "pointer" }}>Retake</button>
          </div>
        </div>
      </div>
    );
  }

  const q = PLAN_QUIZ[step];
  return (
    <div className="pp-quiz">
      <p className="pp-quiz__progress">Question {step + 1} of {PLAN_QUIZ.length}</p>
      <p className="pp-quiz__q">{q.question}</p>
      <div className="pp-quiz__opts">
        {q.options.map((o) => (
          <button key={o.label} type="button" className="pp-quiz__opt" onClick={() => choose(o.plan)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
