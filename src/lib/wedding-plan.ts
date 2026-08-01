// ── Wedding Journey planning data ───────────────────────────────
// The checklist + budget model behind the "From Yes… to I Do." roadmap.
// Pure data + helpers, no external services — the concierge planner runs
// entirely on the couple's inputs.

export interface ChecklistItem {
  id: string;
  label: string;
}
export interface ChecklistPhase {
  id: string;
  title: string;
  window: string; // human timeframe
  fromMonths: number; // months-before-wedding this phase opens (upper bound)
  items: ChecklistItem[];
}

export const WEDDING_CHECKLIST: ChecklistPhase[] = [
  {
    id: "just-engaged", title: "Just engaged", window: "12+ months out", fromMonths: 12,
    items: [
      { id: "celebrate", label: "Celebrate & announce your engagement" },
      { id: "vision", label: "Dream up your vision, style & colors" },
      { id: "budget", label: "Set your wedding budget" },
      { id: "guest-est", label: "Draft an estimated guest count" },
      { id: "date-range", label: "Pick a season or date range" },
      { id: "party", label: "Choose your wedding party" },
    ],
  },
  {
    id: "foundations", title: "Foundations", window: "9–12 months out", fromMonths: 12,
    items: [
      { id: "venue", label: "Tour & book your ceremony + reception venue" },
      { id: "date-lock", label: "Lock in your wedding date" },
      { id: "planner", label: "Consider a planner or day-of coordinator" },
      { id: "save-dates", label: "Send save-the-dates" },
      { id: "photographer", label: "Book photographer & videographer" },
    ],
  },
  {
    id: "the-look", title: "The look", window: "6–9 months out", fromMonths: 9,
    items: [
      { id: "dress", label: "Find the dress & begin fittings" },
      { id: "attire", label: "Choose wedding-party attire" },
      { id: "catering", label: "Book caterer & schedule a tasting" },
      { id: "cake", label: "Book your cake designer & tasting" },
      { id: "florals", label: "Meet florists & design your arrangements" },
      { id: "music", label: "Book DJ or band" },
    ],
  },
  {
    id: "details", title: "The details", window: "3–6 months out", fromMonths: 6,
    items: [
      { id: "invites", label: "Design & order invitations" },
      { id: "registry", label: "Create your registry & cash fund" },
      { id: "hotels", label: "Reserve hotel blocks & transportation" },
      { id: "menu", label: "Finalize menu & dietary needs" },
      { id: "hairmakeup", label: "Book hair & makeup, schedule trials" },
      { id: "rings", label: "Order wedding bands" },
    ],
  },
  {
    id: "countdown", title: "The countdown", window: "1–3 months out", fromMonths: 3,
    items: [
      { id: "send-invites", label: "Mail invitations & track RSVPs" },
      { id: "seating", label: "Build the seating chart & table assignments" },
      { id: "timeline", label: "Finalize the wedding-day timeline" },
      { id: "vendors-confirm", label: "Confirm every vendor & final payments" },
      { id: "vows", label: "Write your vows" },
      { id: "bridal-shower", label: "Enjoy the bridal shower & bachelor(ette)" },
    ],
  },
  {
    id: "week-of", title: "The final touches", window: "The week of", fromMonths: 1,
    items: [
      { id: "final-count", label: "Give caterer the final guest count" },
      { id: "rehearsal", label: "Rehearsal & rehearsal dinner" },
      { id: "packing", label: "Pack for the honeymoon" },
      { id: "delegate", label: "Delegate day-of tasks to your coordinator" },
      { id: "relax", label: "Rest, breathe & soak it in 💛" },
    ],
  },
];

export interface BudgetCategory { id: string; label: string; pct: number }
export const BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: "venue", label: "Venue & rentals", pct: 0.4 },
  { id: "catering", label: "Catering & bar", pct: 0.18 },
  { id: "photo", label: "Photo & video", pct: 0.12 },
  { id: "attire", label: "Attire & beauty", pct: 0.08 },
  { id: "flowers", label: "Flowers & decor", pct: 0.08 },
  { id: "music", label: "Music & entertainment", pct: 0.07 },
  { id: "stationery", label: "Invitations & favors", pct: 0.03 },
  { id: "misc", label: "Rings, cake & extras", pct: 0.04 },
];

export const WEDDING_STAGES = [
  { id: "engaged", label: "Recently Engaged", note: "We'll start at the very beginning." },
  { id: "date", label: "Wedding Date Selected", note: "We'll build your countdown & roadmap." },
  { id: "planning", label: "Already Planning", note: "We'll help you catch up & stay on track." },
  { id: "looking", label: "Just Looking", note: "Explore what planning with us feels like." },
] as const;

export function monthsUntil(dateISO: string, now: Date): number | null {
  if (!dateISO) return null;
  const d = new Date(dateISO + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

export function daysUntil(dateISO: string, now: Date): number | null {
  if (!dateISO) return null;
  const d = new Date(dateISO + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
