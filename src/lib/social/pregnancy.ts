// ── Pregnancy & Baby Journey milestones ─────────────────────────
// Baby/pregnancy experiences support sharing a specific set of
// milestones. When a milestone is published, the owner is asked (and
// must approve) two separate things:
//   1. Notify Magical Moment followers?
//   2. Also share this update on social media?
// Neither happens automatically.

export interface Milestone {
  id: string;
  label: string;
  emoji: string;
  /** default suggested source label for the share composer */
  shareLabel: string;
}

export const PREGNANCY_MILESTONES: Milestone[] = [
  { id: "announcement", label: "Pregnancy announcement", emoji: "🤍", shareLabel: "We're expecting!" },
  { id: "ultrasound", label: "Ultrasound update", emoji: "🩺", shareLabel: "Our latest ultrasound" },
  { id: "gender-reveal", label: "Gender reveal", emoji: "🎉", shareLabel: "It's a…!" },
  { id: "name-reveal", label: "Baby-name reveal", emoji: "📛", shareLabel: "Meet baby by name" },
  { id: "shower-invite", label: "Baby-shower invitation", emoji: "🎈", shareLabel: "You're invited to the baby shower" },
  { id: "registry", label: "Registry update", emoji: "🎁", shareLabel: "Our registry is ready" },
  { id: "nursery", label: "Nursery reveal", emoji: "🧸", shareLabel: "The nursery is ready" },
  { id: "arrival", label: "Arrival announcement", emoji: "👶", shareLabel: "Baby has arrived!" },
  { id: "birth-story", label: "Birth story", emoji: "📖", shareLabel: "Our birth story" },
  { id: "monthly", label: "Monthly milestones", emoji: "📅", shareLabel: "A new monthly milestone" },
  { id: "first-birthday", label: "First birthday", emoji: "🎂", shareLabel: "Happy 1st birthday!" },
];

export function isBabyJourney(type: string): boolean {
  return type === "baby";
}
