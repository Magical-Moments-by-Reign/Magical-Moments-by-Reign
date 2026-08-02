// ── "Everything Included" — the value section content ───────────
// Grouped feature clusters shown above pricing so a visitor understands the
// full value before choosing a term. Customer-facing copy avoids the word
// "journey" per the Founder's terminology direction (use "Magical Moment").
// Icons are modular gold-foil medallions (emoji today) — swap the medallion
// contents for custom line icons later without touching the cards.

export interface IncludedFeature {
  icon: string;  // emoji shown inside a gold-foil medallion
  label: string;
}

export interface IncludedGroup {
  title: string;
  features: IncludedFeature[];
}

export const INCLUDED_INTRO = {
  eyebrow: "Everything Included",
  title: "Everything Included With Every Magical Moment",
  subtitle:
    "Every membership includes the complete Magical Moments experience. No hidden fees. No feature unlocks. Just everything you need to plan, celebrate, share, and preserve your moment.",
  promise: "Everything you need. One beautiful place.",
  promiseBody:
    "No more switching between invitation sites, registries, calendars, planning apps, photo galleries, video tools, guest lists, and reminder services. Magical Moments by Reign brings everything together so you can plan it, celebrate it, share it, and preserve it without leaving the platform.",
  badge: ["No Hidden Fees", "No Feature Unlocks", "Everything Included"],
} as const;

export const INCLUDED_GROUPS: IncludedGroup[] = [
  {
    title: "The Complete Toolkit",
    features: [
      { icon: "🌐", label: "Personalized Magical Moment website" },
      { icon: "🖼️", label: "Photo galleries" },
      { icon: "🎬", label: "Video galleries" },
      { icon: "💌", label: "Digital invitations" },
      { icon: "✅", label: "RSVP management" },
      { icon: "👥", label: "Guest list management" },
      { icon: "📖", label: "Guestbook" },
      { icon: "🎁", label: "Registries & gift links" },
      { icon: "⏳", label: "Countdown timers" },
      { icon: "🗓️", label: "Event details & schedules" },
      { icon: "📋", label: "Planning checklists" },
      { icon: "🗺️", label: "Interactive maps & travel info" },
      { icon: "✨", label: "Magical AI planning assistant" },
    ],
  },
  {
    title: "Magical Moments for Every Occasion",
    features: [
      { icon: "💍", label: "Weddings" },
      { icon: "👶", label: "Baby showers & gender reveals" },
      { icon: "🎂", label: "Birthdays" },
      { icon: "🎓", label: "Graduations" },
      { icon: "💞", label: "Anniversaries" },
      { icon: "🕊️", label: "Memorials & celebrations of life" },
      { icon: "🥂", label: "Retirements" },
      { icon: "🏝️", label: "Vacations" },
      { icon: "🎗️", label: "Military homecomings & reunions" },
      { icon: "🏆", label: "Sports & milestone moments" },
    ],
  },
  {
    title: "Sharing, Privacy & Preservation",
    features: [
      { icon: "🔗", label: "Private, controlled sharing" },
      { icon: "🎟️", label: "Magical Access Pass" },
      { icon: "🔒", label: "Password & privacy controls" },
      { icon: "📚", label: "Magical Moments Library" },
      { icon: "🏛️", label: "Family access & legacy preservation" },
    ],
  },
];

export const PRICING_HEADLINE = {
  title: "How Long Would You Like Us to Preserve Your Magical Moment?",
  body:
    "Everything you need to create, celebrate, share, and preserve your special moment is already included. Simply choose how long you want the memory to remain available.",
} as const;
