"use client";

import { useState } from "react";
import { nameConciergeAction, skipConciergeAction } from "@/app/home/actions";
import { CONCIERGE_SUGGESTIONS } from "@/lib/concierge";

// The first meeting. Not a form to fill out — the concierge introduces itself
// and warmly asks for a name. Naming is optional; skipping is graceful and
// never pressured. This is the moment we want the customer to smile.
export default function ConciergeWelcome({
  firstName,
  error,
}: {
  firstName: string;
  error?: string;
}) {
  const [name, setName] = useState("");
  const [skipping, setSkipping] = useState(false);
  const canContinue = name.trim().length > 0;

  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-h">
      <div className="welcome__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-champagne.png" alt="" className="welcome__crown" width={52} height={52} />

        {!skipping ? (
          <>
            <h1 id="welcome-h" className="welcome__h">Welcome home, {firstName}.</h1>
            <p className="welcome__intro">
              I&apos;m your personal concierge. I&apos;ll be here to help you create, organize,
              celebrate, and preserve every meaningful moment in your life.
            </p>
            <p className="welcome__ask">Before we begin&hellip; what would you like to call me?</p>

            <form action={nameConciergeAction} className="welcome__form">
              <input
                name="name"
                className="welcome__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Choose a name"
                aria-label="Your concierge's name"
                maxLength={40}
                autoFocus
              />
              {error && <p className="welcome__error">{error}</p>}

              <div className="welcome__suggests" aria-label="Name suggestions">
                {CONCIERGE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`welcome__chip${name === s ? " is-selected" : ""}`}
                    onClick={() => setName(s)}
                  >
                    ✨ {s}
                  </button>
                ))}
              </div>
              <p className="welcome__hint">
                Some families choose Journey, Grace, or Nova &mdash; others create something
                completely their own.
              </p>

              <div className="welcome__actions">
                <button
                  type="button"
                  className="welcome__skip"
                  onClick={() => setSkipping(true)}
                >
                  Skip for now
                </button>
                <button type="submit" className="welcome__continue" disabled={!canContinue}>
                  Continue
                </button>
              </div>
            </form>
          </>
        ) : (
          // "Skip for now" — a warm reassurance before entering their space.
          <>
            <h1 className="welcome__h">No worries.</h1>
            <p className="welcome__intro">
              Whenever you&apos;re ready, I&apos;ll be here. Until then, you can simply call me
              Magical.
            </p>
            <div className="welcome__actions welcome__actions--center">
              <button type="button" className="welcome__skip" onClick={() => setSkipping(false)}>
                Actually, let me name you
              </button>
              <form action={skipConciergeAction}>
                <button type="submit" className="welcome__continue">
                  Enter my Magical Space
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
