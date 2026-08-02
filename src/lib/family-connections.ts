// ── Family Connections ──────────────────────────────────────────
// Keep families connected across any distance. NOT a social platform and NOT a
// messaging-app replacement — a PRIVATE family space to celebrate, communicate,
// preserve memories, and participate in life's moments together.
//
// Core model: ONE person buys a membership and becomes the HOST of a Magical
// Moment. The Host invites loved ones as GUESTS who participate WITHOUT their own
// paid membership. Premium features outside the shared experience appear behind
// a graceful lock that invites the guest to start their own Magical Preview Pass.
//
// PURE domain: host-controlled guest permissions, the one-membership rule, the
// premium-preview lock, video-gathering/timeline/feed catalogs, the opt-in
// general-location Family Map (NEVER live tracking), and per-moment privacy.
// Video providers, storage, and delivery are seams.

// ── Guest permissions (Host controls all of these) ──────────────
export type GuestPermission =
  | "upload_photos" | "upload_videos" | "join_video_calls" | "comment"
  | "invite_others" | "view_guest_list" | "download_memories" | "edit_timeline";

export const GUEST_PERMISSION_KEYS: { key: GuestPermission; label: string }[] = [
  { key: "upload_photos", label: "Can upload photos" },
  { key: "upload_videos", label: "Can upload videos" },
  { key: "join_video_calls", label: "Can join video calls" },
  { key: "comment", label: "Can comment" },
  { key: "invite_others", label: "Can invite others" },
  { key: "view_guest_list", label: "Can view guest list" },
  { key: "download_memories", label: "Can download memories" },
  { key: "edit_timeline", label: "Can edit timeline" },
];

export type GuestPermissionSet = Partial<Record<GuestPermission, boolean>>;

/** A warm, safe default the Host can expand — participate & celebrate, but not
 *  manage/invite/download/edit by default. */
export function defaultGuestPermissions(): GuestPermissionSet {
  return {
    upload_photos: false, upload_videos: false, join_video_calls: true, comment: true,
    invite_others: false, view_guest_list: false, download_memories: false, edit_timeline: false,
  };
}

export function guestCan(perms: GuestPermissionSet, key: GuestPermission): boolean {
  return perms[key] === true;
}

// ── One membership… the whole family benefits ───────────────────
// Guests do NOT need a paid membership simply to participate in a shared Moment.
export const GUEST_INCLUDED_ACTIONS = [
  "View the experience", "RSVP", "Upload photos (if permitted)", "Upload videos (if permitted)",
  "Sign the guestbook", "Join family video calls", "Participate in countdowns",
  "Leave messages", "View galleries", "Celebrate milestones", "Receive event reminders",
] as const;

export function guestParticipationRequiresMembership(): false {
  return false;
}

// Features that belong to a guest's OWN account (outside the shared experience)
// and are therefore premium-locked for a guest.
const GUEST_PREMIUM_FEATURES = new Set<string>([
  "create_own_moment", "own_library", "own_custom_domain", "own_journey_preview",
  "own_vendor_bookings", "own_purchase_concierge",
]);

export function isPremiumForGuest(feature: string): boolean {
  return GUEST_PREMIUM_FEATURES.has(feature);
}

// ── Premium preview (graceful lock) ─────────────────────────────
export const PREMIUM_LOCK = {
  message: "This feature is available with your own Magical Moments membership.",
  primary: "Start My Magical Preview Pass",
  secondary: "Learn More",
} as const;

/** A locked-feature notice that never interrupts the current family experience. */
export function lockedFeatureNotice(feature: string) {
  return { locked: isPremiumForGuest(feature), ...PREMIUM_LOCK };
}

// ── Family video gatherings (provider is a seam) ────────────────
export const FAMILY_GATHERING_TYPES = [
  "Family Reunions", "Holiday Gatherings", "Birthday Celebrations", "Graduation Celebrations",
  "Military Homecomings", "Baby Showers", "Gender Reveals", "Wedding Planning",
  "Memorial Celebrations", "Celebration of Life Services", "Family Meetings",
  "Long-distance Grandparent Visits",
] as const;

// ── Shared family timeline (living history) ─────────────────────
export const TIMELINE_ENTRY_TYPES = [
  "Birthdays", "Anniversaries", "Graduations", "Weddings", "New Babies",
  "Military Deployments", "Family Vacations", "Achievements", "Retirements", "Memorials",
] as const;

// ── Private family feed ─────────────────────────────────────────
export const FEED_ACTIVITY_TYPES = [
  "Celebrate achievements", "Leave encouraging messages", "Share photos", "Share videos",
  "Celebrate milestones", "Welcome new family members", "Offer support during difficult moments",
] as const;

// ── Family Map (future) — general location only, opt-in ─────────
// NOT live location tracking. Families optionally share a GENERAL location
// (city/region) and choose whether to share it at all.
export const FAMILY_MAP = {
  liveTracking: false,
  precision: "general" as const, // city/region only — never coordinates
  optIn: true,
  note: "The Family Map is optional and shows only a general location (like a city) — never live location tracking.",
};

export function formatGeneralLocation(city: string, region: string): string {
  return [city.trim(), region.trim()].filter(Boolean).join(", ");
}

/** Live/precise location is never permitted in Family Connections. */
export function liveLocationAllowed(): false {
  return false;
}

// ── Privacy — per-moment isolation ──────────────────────────────
/**
 * A guest may access ONLY the specific Magical Moment(s) they were invited to.
 * Being invited to one Moment never grants access to unrelated family info.
 */
export function canAccessMoment(invitedMomentIds: string[], momentId: string): boolean {
  return invitedMomentIds.includes(momentId);
}

export const CONNECTIONS_PRIVACY = [
  "Every Magical Moment remains private.",
  "Only invited participants may view the experience.",
  "Public sharing remains optional.",
  "No participant gains access to unrelated family information simply because they were invited to one Magical Moment.",
] as const;

export const FAMILY_CONNECTIONS = {
  name: "Family Connections",
  philosophy: "Families shouldn't miss life's biggest moments simply because they live in different cities, states, or countries.",
  mission: "When one family member creates a Magical Moment, everyone they love should feel like they're right there — safe, included, and connected.",
} as const;
