"use client";

import { useState } from "react";

// A password input with show/hide and (optionally) a live strength meter.
// The meter is a UX aid only — the authoritative password policy is enforced
// server-side in src/lib/auth-support.ts (passwordStrength). We intentionally
// do NOT import the server helper here (it pulls in node:crypto); this is a
// lightweight mirror of the same rules for instant feedback.

function clientStrength(pw: string): { score: number; label: string; color: string } {
  const len = pw.length;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  let raw = 0;
  if (len >= 10) raw += 1;
  if (len >= 14) raw += 1;
  if (variety >= 3) raw += 1;
  if (variety >= 4 && len >= 12) raw += 1;
  const score = Math.max(0, Math.min(4, raw));
  if (len === 0) return { score: 0, label: "", color: "transparent" };
  if (len < 10) return { score: 1, label: "Too short", color: "#c98b8b" };
  const map = [
    { label: "Weak", color: "#d8a05a" },
    { label: "Weak", color: "#d8a05a" },
    { label: "Fair", color: "#d8c05a" },
    { label: "Good", color: "#9fc06a" },
    { label: "Strong", color: "#5fae6a" },
  ];
  return { score, ...map[score] };
}

export default function PasswordField({
  name,
  label,
  autoComplete = "current-password",
  meter = false,
  required = true,
  placeholder,
}: {
  name: string;
  label: string;
  autoComplete?: string;
  meter?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const s = clientStrength(value);

  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-pw">
        <input
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          className="auth-pw__toggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {meter && (
        <>
          <div className="auth-meter" aria-hidden="true">
            <i style={{ width: `${(s.score / 4) * 100}%`, background: s.color }} />
          </div>
          {s.label && <div className="auth-meter__label">Password strength: {s.label}</div>}
        </>
      )}
    </label>
  );
}
