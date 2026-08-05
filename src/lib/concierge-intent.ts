// ── Concierge intent detection (pure) ───────────────────────────
// Shared by Ask Magical (client) and tests. Decides whether a message is a
// hands-on CONCIERGE request (book, reserve, plan a dinner, find a vendor…)
// rather than a general Ask-Magical question about the app. Kept deliberately
// conservative: it only triggers on clear service verbs, so ordinary questions
// ("how does pricing work?") stay with Ask Magical.

const SERVICE_PATTERNS: RegExp[] = [
  /\bbook(ing)?\b/i,
  /\breserv(e|ation)\b/i,
  /\bmake (me )?a reservation\b/i,
  /\bfind (me )?a (vendor|photographer|venue|caterer|florist|dj|planner|hotel|restaurant)\b/i,
  /\bplan (my|a|our) (dinner|trip|travel|birthday|party|celebration|wedding|vacation|getaway)\b/i,
  /\b(flight|hotel|airfare|itinerary)s?\b/i,
  /\b(restaurant|dinner) (reservation|booking|table)\b/i,
  /\bcoordinate (my|our|the) (travel|trip|celebration|event)\b/i,
  /\bhire (a|an)\b/i,
  /\bbook me\b/i,
];

/** True when the text reads like a hands-on service request for the Concierge. */
export function looksLikeConciergeRequest(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 3) return false;
  return SERVICE_PATTERNS.some((re) => re.test(t));
}

/** The single opening line the Concierge always greets with. */
export const CONCIERGE_OPENING =
  "Concierge at your service. What may I help you with today?";

/** What Ask Magical says when a signed-out visitor asks for a Concierge service. */
export const CONCIERGE_SIGNIN_PROMPT =
  "Concierge services are available to signed-in members. Please sign in to continue with this request.";
