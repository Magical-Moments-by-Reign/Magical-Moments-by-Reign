"use client";

// Start-a-Moment form. Journey → sub-occasion is a dependent select; the rest
// (name, date, privacy) post to createMomentAction, which creates a real DRAFT
// and opens the builder. Template selection is marked Coming Soon (not a dead
// control) since the template library isn't built yet.

import { useState } from "react";
import { createMomentAction } from "./actions";

interface JourneyOpt { id: string; label: string; milestones: { id: string; label: string }[] }

export default function CreateMomentForm({ journeys }: { journeys: JourneyOpt[] }) {
  const [journey, setJourney] = useState(journeys[0]?.id ?? "");
  const current = journeys.find((j) => j.id === journey);

  return (
    <form action={createMomentAction} className="cm-form">
      <label className="cm-field">
        <span>1 · Choose a Journey</span>
        <select name="journey" value={journey} onChange={(e) => setJourney(e.target.value)} required>
          {journeys.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
        </select>
      </label>

      <label className="cm-field">
        <span>2 · Sub-occasion <em className="note">(optional)</em></span>
        <select name="milestone" defaultValue="">
          <option value="">— None / general —</option>
          {current?.milestones.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </label>

      <div className="cm-field">
        <span>3 · Choose a template <span className="badge badge--soon">Coming Soon</span></span>
        <p className="note">Designed templates are on the way. For now, a beautiful default design is created for you and you can regenerate it anytime.</p>
      </div>

      <label className="cm-field">
        <span>4 · Name your Moment</span>
        <input type="text" name="title" placeholder="e.g. The Smith Wedding" maxLength={120} />
      </label>

      <label className="cm-field">
        <span>5 · Important date <em className="note">(optional)</em></span>
        <input type="date" name="date" />
      </label>

      <label className="cm-field">
        <span>6 · Privacy</span>
        <select name="privacy" defaultValue="PRIVATE">
          <option value="PRIVATE">Private — only you</option>
          <option value="UNLISTED">Unlisted — anyone with the link</option>
          <option value="PUBLIC">Public — discoverable</option>
        </select>
      </label>

      <div className="pg-actions">
        <button type="submit" className="btn btn--gold">Save draft &amp; continue to builder →</button>
      </div>
    </form>
  );
}
