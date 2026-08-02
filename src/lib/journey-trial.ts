// ── Journey Preview™ (5-day premium trial) ──────────────────────
// A hands-on trial of a premium Life Journey before committing to a paid
// membership. Distinct from the Journey EXPERIENCE tour (the no-signup
// guided look at /journeys/[type]); the trial is one of the three choices
// a customer makes on that tour page. See
// docs/design-bible/STANDARD-journey-preview.md.
//
// Truly starting a trial needs accounts/auth + a captured payment method
// (Square card-on-file / setup intent) + a billing scheduler for the
// day-6 conversion and the reminder emails. Those are graceful seams
// today — we never capture a fake payment or fake a charge.

export const PREVIEW_DAYS = 5;

export const JOURNEY_PREVIEW = {
  name: "Journey Preview",
  days: PREVIEW_DAYS,
  // Experienced as if a paying member:
  included: [
    "Journey Dashboard", "Timeline", "Planning Tools", "AI Assistant",
    "Budget Tools", "Sample Website", "Gallery", "Message Center",
    "Checklists", "Task Manager", "Calendar", "Document Vault",
    "Voice Notes", "Purchase Concierge", "Notifications",
    "Vendor Marketplace", "Planning Templates", "Timeline Automation",
  ],
  // Reasonable limits that protect the platform during the preview:
  limits: [
    "Up to 10 uploaded photos",
    "Up to 5 uploaded documents",
    "Limited AI requests",
    "Limited storage",
    "Your public website stays in Preview Mode",
    "Invitation sending is disabled",
    "Marketplace purchases continue through partner websites",
    "A subtle “Preview” badge until a paid membership begins",
  ],
  rules: [
    "One active Journey Preview at a time",
    "One Journey Preview per Journey type",
    "Repeat previews on the same account or payment method are prevented",
  ],
  // Friendly reminders across the 5 days:
  reminders: [
    { day: 1, label: "Day 1", message: "Welcome! Your Journey Preview has officially begun." },
    { day: 3, label: "Day 3", message: "You're halfway through your Journey Preview. Let us know if you have questions." },
    { day: 4, label: "Day 4", message: "Only one day remaining. Everything you've created will remain available if you continue your membership." },
    { day: 5, label: "Final day", message: "Your Journey Preview ends tomorrow. If you do nothing, your selected membership will begin automatically." },
  ],
} as const;

export interface PreviewSchedule {
  start: Date;
  end: Date;        // preview ends after PREVIEW_DAYS
  firstBilling: Date; // first charge on the day the preview ends
}

/** Deterministic schedule from a start date (billing begins when the preview ends). */
export function previewSchedule(start: Date): PreviewSchedule {
  const end = new Date(start);
  end.setDate(end.getDate() + PREVIEW_DAYS);
  return { start, end, firstBilling: new Date(end) };
}

export function formatPreviewDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}
