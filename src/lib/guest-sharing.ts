// ── Guest Sharing, Selective Access & Public Experience Mode ─────
// "Share the Moment — not the entire account."
//
// This is the PURE domain layer that decides, for a guest share link:
//   • which sections/actions a guest may see and do (granular permissions),
//   • whether a request may access the link at all (type/password/invitation/
//     expiry/max-uses/paused/revoked),
//   • what the guest-facing navigation should contain (no empty sections),
//   • how account-less guestbook entries and guest uploads are validated and
//     moderated,
//   • when a later-created account may connect to a past RSVP.
//
// SERVER-ENFORCED. These functions are the single source of truth the server
// MUST call on every request. Permissions are never enforced by hiding buttons
// alone — a guest changing the URL still hits the same capability check. The
// PRIVATE_NEVER_EXPOSED set can never be turned on for a guest link.
//
// Pure & fully testable: no persistence, no I/O. Password hashing and the
// actual invitation lookup happen server-side; callers pass the *result*
// (passwordOk / invitationOk) in so this module stays deterministic.

import { canonicalEmail, normalizePhone } from "@/lib/account-identity";

// ── Granular permissions ────────────────────────────────────────
export type PermissionGroup = "view" | "interaction";

export type ViewPermission =
  | "view_hero"
  | "view_welcome"
  | "view_event_details"
  | "view_datetime_location"
  | "view_countdown"
  | "view_photo_albums"
  | "view_videos"
  | "view_timeline"
  | "view_registry"
  | "view_guestbook"
  | "view_livestream"
  | "view_updates";

export type InteractionPermission =
  | "rsvp"
  | "guestbook_sign"
  | "upload_photos"
  | "upload_videos"
  | "message_host"
  | "reserve_gift"
  | "contribute"
  | "vote_prediction"
  | "add_to_calendar"
  | "receive_updates";

export type SharePermission = ViewPermission | InteractionPermission;

export interface PermissionDef {
  id: SharePermission;
  label: string;
  group: PermissionGroup;
  /** Guest-nav section this permission belongs to (view perms only). */
  section?: GuestSection;
}

export type GuestSection =
  | "welcome"
  | "details"
  | "countdown"
  | "gallery"
  | "videos"
  | "timeline"
  | "registry"
  | "guestbook"
  | "livestream"
  | "updates";

export const SHARE_PERMISSIONS: PermissionDef[] = [
  { id: "view_hero", label: "View hero image or video", group: "view", section: "welcome" },
  { id: "view_welcome", label: "View welcome message", group: "view", section: "welcome" },
  { id: "view_event_details", label: "View event details", group: "view", section: "details" },
  { id: "view_datetime_location", label: "View date, time & approved location", group: "view", section: "details" },
  { id: "view_countdown", label: "View countdown", group: "view", section: "countdown" },
  { id: "view_photo_albums", label: "View selected photo albums", group: "view", section: "gallery" },
  { id: "view_videos", label: "View selected videos", group: "view", section: "videos" },
  { id: "view_timeline", label: "View the public timeline", group: "view", section: "timeline" },
  { id: "view_registry", label: "View registry or gift links", group: "view", section: "registry" },
  { id: "view_guestbook", label: "View approved guestbook messages", group: "view", section: "guestbook" },
  { id: "view_livestream", label: "View livestream link", group: "view", section: "livestream" },
  { id: "view_updates", label: "View public updates", group: "view", section: "updates" },
  { id: "rsvp", label: "RSVP", group: "interaction" },
  { id: "guestbook_sign", label: "Leave a guestbook message", group: "interaction" },
  { id: "upload_photos", label: "Upload photos", group: "interaction" },
  { id: "upload_videos", label: "Upload videos", group: "interaction" },
  { id: "message_host", label: "Send a private message to the host", group: "interaction" },
  { id: "reserve_gift", label: "Reserve a gift", group: "interaction" },
  { id: "contribute", label: "Contribute toward an approved Experience", group: "interaction" },
  { id: "vote_prediction", label: "Vote in a gender-reveal prediction", group: "interaction" },
  { id: "add_to_calendar", label: "Add the event to a calendar", group: "interaction" },
  { id: "receive_updates", label: "Receive event updates", group: "interaction" },
];

const ALL_PERMISSION_IDS = new Set<string>(SHARE_PERMISSIONS.map((p) => p.id));

// Nav section order for the guest experience.
const SECTION_ORDER: GuestSection[] = [
  "welcome", "details", "countdown", "gallery", "videos",
  "timeline", "registry", "guestbook", "livestream", "updates",
];

const SECTION_LABELS: Record<GuestSection, string> = {
  welcome: "Welcome", details: "Details", countdown: "Countdown", gallery: "Gallery",
  videos: "Videos", timeline: "Timeline", registry: "Registry", guestbook: "Guestbook",
  livestream: "Livestream", updates: "Updates",
};

// ── The privacy denylist — NEVER exposed through any guest link ──
export const PRIVATE_NEVER_EXPOSED = [
  "Magical Moments Library",
  "Customer account information",
  "Full residential address (unless explicitly approved for the event)",
  "Billing information",
  "Orders",
  "Payment methods",
  "Internal balances",
  "Magical AI conversations",
  "Vendor contracts",
  "Private notes",
  "Complete guest list",
  "Other Experiences",
  "Unapproved photos or videos",
  "Admin controls",
  "Account-recovery information",
] as const;

/** A private feature id is anything NOT in the shareable permission catalog. */
export function isShareablePermission(id: string): id is SharePermission {
  return ALL_PERMISSION_IDS.has(id);
}

// ── Link types ──────────────────────────────────────────────────
export type ShareLinkType = "public" | "invitation" | "password" | "contributor" | "expiring";

export const SHARE_LINK_TYPES: { id: ShareLinkType; label: string; blurb: string }[] = [
  { id: "public", label: "Public link", blurb: "Anyone with the link can access enabled public features." },
  { id: "invitation", label: "Invitation-only", blurb: "Access matches an invited email or phone." },
  { id: "password", label: "Password-protected", blurb: "Guests enter a password or access code." },
  { id: "contributor", label: "Private contributor", blurb: "Selected people upload approved memories — no dashboard access." },
  { id: "expiring", label: "One-time / expiring", blurb: "Expiration, max uses, and deadlines you control." },
];

// Contributor links are upload/participation only — no browsing of content.
const CONTRIBUTOR_ALLOWED: SharePermission[] = [
  "view_hero", "view_welcome", "upload_photos", "upload_videos", "message_host", "guestbook_sign",
];

// ── Capability resolution ───────────────────────────────────────
export type GuestCapabilities = Record<SharePermission, boolean>;

function emptyCaps(): GuestCapabilities {
  const caps = {} as GuestCapabilities;
  for (const p of SHARE_PERMISSIONS) caps[p.id] = false;
  return caps;
}

/**
 * Resolve exactly what a guest may see/do. Only permissions the owner enabled
 * are ever true; anything outside the catalog is ignored; a private feature can
 * never be enabled. Contributor links are clamped to upload/participation.
 */
export function resolveCapabilities(enabled: string[], linkType: ShareLinkType): GuestCapabilities {
  const caps = emptyCaps();
  const contributorSet = new Set<string>(CONTRIBUTOR_ALLOWED);
  for (const id of enabled) {
    if (!isShareablePermission(id)) continue; // silently drop non-shareable / private ids
    if (linkType === "contributor" && !contributorSet.has(id)) continue;
    caps[id] = true;
  }
  return caps;
}

/** True only when the permission is both shareable AND enabled for this guest. */
export function guestCan(caps: GuestCapabilities, permission: SharePermission): boolean {
  return caps[permission] === true;
}

/** The nav sections to render — only those with an enabled view permission, in order. No empty items. */
export function guestNavSections(caps: GuestCapabilities): { id: GuestSection; label: string }[] {
  const present = new Set<GuestSection>();
  for (const def of SHARE_PERMISSIONS) {
    if (def.group === "view" && def.section && caps[def.id]) present.add(def.section);
  }
  return SECTION_ORDER.filter((s) => present.has(s)).map((s) => ({ id: s, label: SECTION_LABELS[s] }));
}

// ── Access evaluation (server calls this on every request) ──────
export interface ShareLinkState {
  linkType: ShareLinkType;
  paused: boolean;
  revokedAt: Date | null;
  expiresAt: Date | null;
  maxViews: number | null;
  viewCount: number;
  hasPassword: boolean;
  invitationRequired: boolean;
}

export interface AccessContext {
  now: Date;
  /** Result of the server-side password check (null when not applicable/attempted). */
  passwordOk?: boolean | null;
  /** Result of the server-side invitation match (null when not attempted). */
  invitationOk?: boolean | null;
}

export type AccessReason =
  | "revoked"
  | "paused"
  | "expired"
  | "max_uses"
  | "password_required"
  | "invitation_required";

export type AccessDecision = { ok: true } | { ok: false; reason: AccessReason };

/**
 * The single gate. Order matters: hard blocks (revoked/paused/expired/max) before
 * credential gates (password/invitation). Never returns ok for a revoked/paused link.
 */
export function evaluateAccess(link: ShareLinkState, ctx: AccessContext): AccessDecision {
  if (link.revokedAt) return { ok: false, reason: "revoked" };
  if (link.paused) return { ok: false, reason: "paused" };
  if (link.expiresAt && ctx.now > link.expiresAt) return { ok: false, reason: "expired" };
  if (link.maxViews != null && link.viewCount >= link.maxViews) return { ok: false, reason: "max_uses" };
  if (link.hasPassword && ctx.passwordOk !== true) return { ok: false, reason: "password_required" };
  if ((link.invitationRequired || link.linkType === "invitation") && ctx.invitationOk !== true) {
    return { ok: false, reason: "invitation_required" };
  }
  return { ok: true };
}

export const ACCESS_MESSAGES: Record<AccessReason, string> = {
  revoked: "This link is no longer active.",
  paused: "The host has temporarily paused this link. Please check back later.",
  expired: "This link has expired.",
  max_uses: "This link has reached its access limit.",
  password_required: "This Magical Moment is password-protected. Please enter the access code.",
  invitation_required: "This link is for invited guests. Please use the email or phone from your invitation.",
};

// ── Invitation matching (pure; server supplies the invite list) ─
/** True when the guest's contact matches any invited email/phone (normalized). */
export function invitationMatches(
  guest: { email?: string; phone?: string },
  invited: { emails?: string[]; phones?: string[] },
): boolean {
  const ge = guest.email ? canonicalEmail(guest.email) : "";
  const gp = guest.phone ? normalizePhone(guest.phone) : "";
  const emails = new Set((invited.emails ?? []).map(canonicalEmail).filter(Boolean));
  const phones = new Set((invited.phones ?? []).map(normalizePhone).filter((p) => p.length >= 7));
  return (!!ge && emails.has(ge)) || (!!gp && gp.length >= 7 && phones.has(gp));
}

// ── Guestbook without an account ────────────────────────────────
export type GuestbookVisibility = "display_name" | "anonymous" | "private_host";
export type GuestSubmissionStatus = "pending" | "published" | "hidden" | "reported";

export interface GuestbookInput {
  displayName?: string;
  message?: string;
  email?: string;         // optional
  relationship?: string;  // optional
  visibility?: GuestbookVisibility;
  consent?: boolean;
}

export interface GuestbookNormalized {
  displayName: string;
  message: string;
  email: string | null;
  relationship: string | null;
  visibility: GuestbookVisibility;
}

const MAX_NAME = 80;
const MAX_MESSAGE = 2000;
const MAX_RELATIONSHIP = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GuestbookValidation =
  | { ok: true; value: GuestbookNormalized }
  | { ok: false; errors: string[] };

/** Validate an account-less guestbook submission. Collects only what's needed. */
export function validateGuestbookEntry(input: GuestbookInput): GuestbookValidation {
  const errors: string[] = [];
  const displayName = (input.displayName ?? "").trim();
  const message = (input.message ?? "").trim();
  const visibility: GuestbookVisibility = input.visibility ?? "display_name";
  const email = (input.email ?? "").trim();
  const relationship = (input.relationship ?? "").trim();

  if (!displayName) errors.push("Please enter a display name.");
  else if (displayName.length > MAX_NAME) errors.push("Display name is too long.");
  if (!message) errors.push("Please enter a message.");
  else if (message.length > MAX_MESSAGE) errors.push("Message is too long.");
  if (email && !EMAIL_RE.test(email)) errors.push("Please enter a valid email or leave it blank.");
  if (relationship.length > MAX_RELATIONSHIP) errors.push("Relationship is too long.");
  if (!input.consent) errors.push("Please confirm consent to share your message with the host.");
  if (!(["display_name", "anonymous", "private_host"] as string[]).includes(visibility)) {
    errors.push("Invalid visibility option.");
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      displayName, message,
      email: email || null,
      relationship: relationship || null,
      visibility,
    },
  };
}

/** New guestbook entries enter moderation when the owner requires approval. */
export function guestbookInitialStatus(ownerRequiresApproval: boolean): GuestSubmissionStatus {
  return ownerRequiresApproval ? "pending" : "published";
}

/**
 * How a guestbook entry appears publicly. Anonymous hides the name; private
 * entries are never shown publicly; the email is NEVER exposed publicly.
 */
export function publicGuestbookView(entry: GuestbookNormalized & { status: GuestSubmissionStatus }): {
  visible: boolean; name: string; message: string;
} {
  if (entry.status !== "published" || entry.visibility === "private_host") {
    return { visible: false, name: "", message: entry.message };
  }
  return {
    visible: true,
    name: entry.visibility === "anonymous" ? "Anonymous" : entry.displayName,
    message: entry.message,
  };
}

export const GUESTBOOK_CONFIRMATION = "Your message has been shared with the host.";

// ── Rate limiting (pure decision; server tracks counts) ─────────
export function withinRateLimit(recentCount: number, maxPerWindow: number): boolean {
  return recentCount < maxPerWindow;
}

// ── Guest uploads (review queue) ────────────────────────────────
export type GuestUploadStatus = "pending" | "published" | "rejected";

/** Guest uploads enter review UNLESS the owner deliberately enables auto-publish. */
export function uploadInitialStatus(autoPublishEnabled: boolean): GuestUploadStatus {
  return autoPublishEnabled ? "published" : "pending";
}

/** Whether uploads are still open (deadline is optional). */
export function uploadsOpen(uploadDeadline: Date | null, now: Date): boolean {
  return !uploadDeadline || now <= uploadDeadline;
}

// ── RSVP ────────────────────────────────────────────────────────
export type RsvpStatus = "yes" | "no" | "maybe";

// ── Account-conversion (never forced) ───────────────────────────
export const CONVERSION_PROMPT = {
  heading: "Enjoyed this Magical Moment?",
  body: "Create a free Magical Moments account to save this Experience, receive updates, upload memories, and create one of your own.",
  primary: "Create Free Account",
  secondary: "Continue as Guest",
} as const;

// ── "Magical Moments I'm Attending" ─────────────────────────────
export interface VerifiedContacts {
  emails: string[]; // verified emails
  phones: string[]; // verified phones
}

/**
 * Decide whether a newly-created account may connect to a past RSVP. Requires a
 * VERIFIED email/phone that matches the RSVP contact — never connects on an
 * unverified email, and never auto-exposes private info.
 */
export function attendanceConnectDecision(
  rsvp: { email?: string; phone?: string },
  verified: VerifiedContacts,
): { connect: boolean; matchedOn: "email" | "phone" | null } {
  const re = rsvp.email ? canonicalEmail(rsvp.email) : "";
  const rp = rsvp.phone ? normalizePhone(rsvp.phone) : "";
  const vEmails = new Set(verified.emails.map(canonicalEmail).filter(Boolean));
  const vPhones = new Set(verified.phones.map(normalizePhone).filter((p) => p.length >= 7));
  if (re && vEmails.has(re)) return { connect: true, matchedOn: "email" };
  if (rp && rp.length >= 7 && vPhones.has(rp)) return { connect: true, matchedOn: "phone" };
  return { connect: false, matchedOn: null };
}

// ── Owner dashboard summary shape ───────────────────────────────
export interface ShareLinkCounts {
  views: number;
  guestbookSubmissions: number;
  uploadsReceived: number;
  rsvps: number;
  contributions: number;
}

export interface OwnerLinkSummary {
  linkType: ShareLinkType;
  enabledPermissions: SharePermission[];
  createdAt: Date;
  expiresAt: Date | null;
  paused: boolean;
  revoked: boolean;
  counts: ShareLinkCounts;
}

/** Build the owner-facing summary for one link (enabled perms in catalog order). */
export function ownerLinkSummary(
  link: { linkType: ShareLinkType; enabled: string[]; createdAt: Date; expiresAt: Date | null; paused: boolean; revokedAt: Date | null },
  counts: ShareLinkCounts,
): OwnerLinkSummary {
  const enabledSet = new Set(link.enabled);
  return {
    linkType: link.linkType,
    enabledPermissions: SHARE_PERMISSIONS.map((p) => p.id).filter((id) => enabledSet.has(id)),
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    paused: link.paused,
    revoked: !!link.revokedAt,
    counts,
  };
}
