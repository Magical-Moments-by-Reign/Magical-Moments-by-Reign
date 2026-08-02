// ── Magical Tracker™ — canonical stage catalog ──────────────────
// Every Experience automatically receives a Magical Tracker: the customer's
// progress dashboard. These are the canonical stage keys/labels that back the
// MagicalTrackerStage rows (see prisma/schema.prisma). Stage *status* is
// computed from real Experience/order/media state once those exist — this
// module only defines the vocabulary and order (no fabricated progress).

export type TrackerStageStatus = "pending" | "active" | "complete" | "needs_attention";

export interface TrackerStageDef {
  key: string;
  label: string;
}

/** The 17 standard stages, in order, per the Platform Foundation directive. */
export const MAGICAL_TRACKER_STAGES: TrackerStageDef[] = [
  { key: "purchase_confirmed", label: "Purchase Confirmed" },
  { key: "experience_created", label: "Experience Created" },
  { key: "website_ready", label: "Website Ready" },
  { key: "ai_activated", label: "AI Activated" },
  { key: "guest_list_started", label: "Guest List Started" },
  { key: "invitations_designed", label: "Invitations Designed" },
  { key: "invitations_sent", label: "Invitations Sent" },
  { key: "rsvp_updates", label: "RSVP Updates" },
  { key: "registry_added", label: "Registry Added" },
  { key: "appointments_scheduled", label: "Appointments Scheduled" },
  { key: "vendor_progress", label: "Vendor Progress" },
  { key: "countdown_active", label: "Countdown Active" },
  { key: "event_day", label: "Event Day" },
  { key: "photos_uploading", label: "Photos Uploading" },
  { key: "videos_uploading", label: "Videos Uploading" },
  { key: "highlight_video", label: "Highlight Video" },
  { key: "memory_album_complete", label: "Memory Album Complete" },
];

/** Build the initial (all-pending) stage set for a new Experience's tracker. */
export function initialTrackerStages(): { key: string; label: string; status: TrackerStageStatus; order: number }[] {
  return MAGICAL_TRACKER_STAGES.map((s, i) => ({ ...s, status: "pending", order: i }));
}

/** Overall completion (0–100) from a set of stage statuses. */
export function trackerProgress(statuses: TrackerStageStatus[]): number {
  if (statuses.length === 0) return 0;
  const done = statuses.filter((s) => s === "complete").length;
  return Math.round((done / statuses.length) * 100);
}
