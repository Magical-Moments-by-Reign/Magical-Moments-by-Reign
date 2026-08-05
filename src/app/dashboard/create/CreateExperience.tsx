"use client";

// ── Universal Memory Flow (Create page) ─────────────────────────
// No member lands directly on a planning form anymore. Every memory begins with
// one question: are we CAPTURING a moment that already happened, or CREATING a
// new one? Capture → pick a type, optionally name it → straight into the real
// gallery uploader. Create → the full planning form (unchanged flow, warmer
// words). Both paths create a real DRAFT Experience; nothing here is a mock.

import { useState } from "react";
import CreateMomentForm from "./CreateMomentForm";
import { captureMemoryAction } from "./actions";

interface JourneyOpt { id: string; label: string; milestones: { id: string; label: string }[] }
type Mode = null | "capture" | "create";

const NAME_EXAMPLES = [
  "❤️ Our Forever Begins", "🏡 Our First Home", "🎓 Sarah's Graduation",
  "🌴 Weekend in Maui", "💍 She Said Yes!", "👶 Baby Emma",
];

export default function CreateExperience({ journeys }: { journeys: JourneyOpt[] }) {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === null) {
    return (
      <div className="mf">
        <div className="mf-head">
          <span className="mf-eyebrow">Welcome to Magical Moments</span>
          <h1 className="mf-title">Every unforgettable memory begins with a single choice.</h1>
          <p className="mf-ask">What would you like to do today?</p>
        </div>
        <div className="mf-choices">
          <button type="button" className="mf-choice" onClick={() => setMode("capture")}>
            <span className="mf-choice__ic" aria-hidden="true">📸</span>
            <span className="mf-choice__t">Capture a Memory</span>
            <span className="mf-choice__d">This special moment has already happened. Upload your photos, videos, voice recordings, documents, and stories into a beautiful gallery you&rsquo;ll always cherish.</span>
            <span className="mf-choice__cta">Capture a Memory →</span>
          </button>
          <button type="button" className="mf-choice" onClick={() => setMode("create")}>
            <span className="mf-choice__ic" aria-hidden="true">✨</span>
            <span className="mf-choice__t">Create a Memory</span>
            <span className="mf-choice__d">Let&rsquo;s create something unforgettable together. Journey will guide you through every step&mdash;from planning and budgeting to bookings, reminders, and preserving the finished experience.</span>
            <span className="mf-choice__cta">Create a Memory →</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "capture") return <CaptureFlow journeys={journeys} onBack={() => setMode(null)} />;

  // Create → the existing planning form (warmer wording lives inside the form).
  return (
    <div className="mf">
      <button type="button" className="mf-back" onClick={() => setMode(null)}>← Back</button>
      <div className="mf-head mf-head--sm">
        <span className="mf-eyebrow">✨ Create a Memory</span>
        <h2 className="mf-title mf-title--sm">Let&rsquo;s create something unforgettable.</h2>
        <p className="mf-ask mf-ask--sm">Choose your Journey, name your memory, and we&rsquo;ll set up a beautiful draft you can build from.</p>
      </div>
      <div className="card" style={{ maxWidth: 620 }}>
        <CreateMomentForm journeys={journeys} />
      </div>
    </div>
  );
}

function CaptureFlow({ journeys, onBack }: { journeys: JourneyOpt[]; onBack: () => void }) {
  const [step, setStep] = useState<"type" | "name">("type");
  const [journeyId, setJourneyId] = useState<string>("");
  const chosen = journeys.find((j) => j.id === journeyId);

  if (step === "type") {
    return (
      <div className="mf">
        <button type="button" className="mf-back" onClick={onBack}>← Back</button>
        <div className="mf-head mf-head--sm">
          <span className="mf-eyebrow">📸 Capture a Memory</span>
          <h2 className="mf-title mf-title--sm">What type of memory are you capturing today?</h2>
          <p className="mf-ask mf-ask--sm">Each occasion gets its own dedicated gallery.</p>
        </div>
        <div className="mf-types">
          {journeys.map((j) => (
            <button key={j.id} type="button" className="mf-type" onClick={() => { setJourneyId(j.id); setStep("name"); }}>
              {j.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Name step → submits to captureMemoryAction (creates the draft, opens the gallery).
  return (
    <div className="mf">
      <button type="button" className="mf-back" onClick={() => setStep("type")}>← Back</button>
      <div className="mf-head mf-head--sm">
        <span className="mf-eyebrow">📸 {chosen?.label} Memory</span>
        <h2 className="mf-title mf-title--sm">Would you like to give this memory a name?</h2>
        <p className="mf-ask mf-ask--sm">You can always change it later.</p>
      </div>

      <div className="mf-examples">
        {NAME_EXAMPLES.map((ex) => <span key={ex} className="mf-example">{ex}</span>)}
      </div>

      <form action={captureMemoryAction} className="mf-nameform card" style={{ maxWidth: 560 }}>
        <input type="hidden" name="journey" value={journeyId} />
        <label className="cm-field">
          <span>Memory name <em className="note">(optional)</em></span>
          <input type="text" name="title" placeholder="e.g. Our Forever Begins" maxLength={120} autoFocus />
        </label>
        <div className="mf-nameform__actions">
          <button type="submit" className="btn btn--gold">Name My Memory →</button>
          <button type="submit" className="btn btn--ghost" onClick={(e) => { const f = e.currentTarget.form; const t = f?.elements.namedItem("title"); if (t instanceof HTMLInputElement) t.value = ""; }}>Skip For Now</button>
        </div>
        <p className="note" style={{ marginTop: ".2rem" }}>Next: your private gallery, where you can add photos and videos right away.</p>
      </form>
    </div>
  );
}
