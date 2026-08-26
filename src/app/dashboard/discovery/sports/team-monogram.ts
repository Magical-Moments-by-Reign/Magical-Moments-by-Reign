// A plain, no-directive utility module (no "use client") — importable safely
// from BOTH server components ([sport]/page.tsx's Standings rows) and client
// components (TeamDirectory.tsx's All Teams cards). Confirmed real defect
// this fixes: teamMonogram used to live inside TeamDirectory.tsx, a "use
// client" module; [sport]/page.tsx is a Server Component, and Next.js's App
// Router does not support a Server Component calling a plain function
// imported from a Client Component module — every export of a "use client"
// file becomes a client reference at the RSC boundary, not a real callable
// function, so invoking it server-side threw at runtime. Only actually
// crashed the page once a Standings row had no logoUrl (the exact case this
// monogram exists for) — which is why this reproduced as an intermittent,
// sport-dependent crash rather than every render.

/** Up to two real letters from the team's own name — a monogram, never a
 *  drawn/generated logo — for the one honest visual to show when the
 *  provider hasn't resolved a real logoUrl for this team yet. Prefers the
 *  first letter of the last two words (e.g. "Boston Celtics" → "BC") so a
 *  single-word name ("Alumni") still gets one clean letter rather than an
 *  odd two-letter slice of the same word. */
export function teamMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase();
  return (words[0]?.[0] ?? "?").toUpperCase();
}
