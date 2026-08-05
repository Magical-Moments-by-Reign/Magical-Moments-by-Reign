// ── ElevenLabs API key (server-only) ────────────────────────────
// Reads and SANITIZES the key. Env values pasted into a dashboard often carry an
// invisible trailing newline, a leading/trailing space, or wrapping quotes — any
// of which makes ElevenLabs reject the request with 401 even though the key is
// "present". We trim whitespace and strip a single pair of surrounding quotes so
// the header carries the real token. The key value is NEVER logged or returned.

export function elevenKey(): string {
  let k = process.env.ELEVENLABS_API_KEY || "";
  k = k.trim();
  if (k.length >= 2 && ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'")))) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

/** Safe, key-free diagnostics so the owner can see if the stored value is malformed. */
export function elevenKeyDiagnostics() {
  const raw = process.env.ELEVENLABS_API_KEY || "";
  const clean = elevenKey();
  return {
    present: raw.length > 0,
    length: clean.length,                        // length only, never the value
    trimmedWhitespace: raw !== raw.trim(),       // had leading/trailing whitespace
    strippedQuotes: raw.trim() !== clean && /^["']|["']$/.test(raw.trim()),
    hasInternalWhitespace: /\s/.test(clean),     // a space/newline inside → definitely wrong
    prefix: clean ? clean.slice(0, 3) : "",      // e.g. "sk_" — helps confirm it's a key, not a URL
  };
}
