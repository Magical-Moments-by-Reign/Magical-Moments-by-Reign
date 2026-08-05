// ── Magical Assistant naming (pure) ─────────────────────────────
// Each member names their Magical Assistant (the Ask Magical guide). This module
// is the single source of truth for the suggested names, validation, profanity
// filtering, length limits, the default, and the greeting copy — shared by the
// Settings UI, the server action, and the assistants. No I/O, fully testable.

export const DEFAULT_ASSISTANT_NAME = "Journey";
export const MAX_ASSISTANT_NAME_LEN = 20;
export const MIN_ASSISTANT_NAME_LEN = 2;

/** Suggested names shown as chips (plus "Custom Name" in the UI). */
export const SUGGESTED_ASSISTANT_NAMES = ["Journey", "Reign", "Luna", "Grace", "Nova"] as const;

// Basic blocklist — roots matched as substrings (case-insensitive). Intentionally
// conservative; catches profanity/slurs and obviously inappropriate names without
// trying to be exhaustive. Extend as needed.
const BLOCKED = [
  "fuck", "shit", "bitch", "cunt", "dick", "cock", "pussy", "asshole", "bastard",
  "slut", "whore", "nigg", "fag", "retard", "rape", "nazi", "hitler", "kkk",
  "porn", "sex", "penis", "vagina", "anal", "cum", "damn", "piss",
  "admin", "concierge", // reserve system roles so the assistant can't impersonate them
];

export type NameCheck =
  | { ok: true; name: string }
  | { ok: false; reason: "empty" | "too_short" | "too_long" | "invalid_chars" | "inappropriate" };

/** Validate a raw assistant-name input. Allows letters, spaces, hyphen, apostrophe. */
export function checkAssistantName(raw: string): NameCheck {
  const trimmed = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.length < MIN_ASSISTANT_NAME_LEN) return { ok: false, reason: "too_short" };
  if (trimmed.length > MAX_ASSISTANT_NAME_LEN) return { ok: false, reason: "too_long" };
  if (!/^[\p{L}][\p{L} '-]*$/u.test(trimmed)) return { ok: false, reason: "invalid_chars" };
  const lower = trimmed.toLowerCase();
  if (BLOCKED.some((b) => lower.includes(b))) return { ok: false, reason: "inappropriate" };
  // Title-case the first letter of each word for a polished display.
  const name = trimmed.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return { ok: true, name };
}

/** Coerce any stored/raw value to a safe display name; falls back to the default. */
export function normalizeAssistantName(raw: string | null | undefined): string {
  const res = checkAssistantName(raw ?? "");
  return res.ok ? res.name : DEFAULT_ASSISTANT_NAME;
}

/** Human-readable message for a failed check (for the Settings form). */
export function nameCheckMessage(reason: Exclude<NameCheck, { ok: true }>["reason"]): string {
  switch (reason) {
    case "empty": return "Please enter a name.";
    case "too_short": return "That name is a little too short.";
    case "too_long": return `Please keep it to ${MAX_ASSISTANT_NAME_LEN} characters or fewer.`;
    case "invalid_chars": return "Use letters, spaces, hyphens, or apostrophes only.";
    case "inappropriate": return "Let's choose a name that fits a luxury assistant.";
  }
}

/** The assistant's self-introduction on entry to the Magical Space. */
export function assistantGreeting(opts: { assistantName: string; firstName?: string | null; firstTime?: boolean }): string {
  const name = normalizeAssistantName(opts.assistantName);
  const first = (opts.firstName ?? "").trim();
  if (opts.firstTime || !first) {
    return `Welcome to your Magical Space. I'm ${name}, your Magical Assistant. I'm here to help you create, organize, and preserve your most meaningful moments.`;
  }
  return `Welcome back, ${first}. I'm ${name}, your Magical Assistant. What would you like to create, plan, or remember today?`;
}
