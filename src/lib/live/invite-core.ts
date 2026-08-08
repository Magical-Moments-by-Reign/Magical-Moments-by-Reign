// ── Magical Live — invitation pure core ─────────────────────────
//
// Pure, dependency-free logic for the invitation system: the invite
// lifecycle, contact normalization (email + phone), how a delivery
// channel is chosen, deduplication, and the reminder schedule. No DB,
// no network, no crypto — all of that lives in server modules that call
// into here. Everything here is unit-tested.

/* ── Invite lifecycle ─────────────────────────────────────────── */
// PENDING  : created, not yet sent
// SENT     : handed to the delivery provider (email/SMS) successfully
// DELIVERED: provider confirmed delivery (only when the provider reports it)
// OPENED   : guest opened the invite (only when trackable)
// JOINED   : guest actually joined the live room
// DECLINED : guest declined (only if we offer that)
// REVOKED  : host removed this guest's access
export type LiveInviteStatus =
  | "PENDING" | "QUEUED" | "SENT" | "DELIVERED" | "OPENED" | "JOINED" | "DECLINED" | "FAILED" | "REVOKED";

export const INVITE_STATUS: Record<LiveInviteStatus, { label: string; tone: string; rank: number }> = {
  PENDING:   { label: "Pending",   tone: "muted",   rank: 0 },
  QUEUED:    { label: "Queued",    tone: "pending", rank: 1 },
  SENT:      { label: "Sent",      tone: "pending", rank: 2 },
  DELIVERED: { label: "Delivered", tone: "pending", rank: 3 },
  OPENED:    { label: "Opened",    tone: "active",  rank: 4 },
  JOINED:    { label: "Joined",    tone: "success", rank: 5 },
  DECLINED:  { label: "Declined",  tone: "warn",    rank: 4 },
  FAILED:    { label: "Delivery failed", tone: "warn", rank: 1 },
  REVOKED:   { label: "Access removed", tone: "muted", rank: 0 },
};

// Progress is monotonic (a guest never "un-joins"), EXCEPT terminal host
// actions and delivery failure/retry. We never downgrade a higher-rank
// status on a late provider webhook — a "delivered" ping can't undo "joined".
export function shouldAdvanceInvite(from: LiveInviteStatus, to: LiveInviteStatus): boolean {
  if (from === to) return false;
  if (to === "REVOKED") return from !== "REVOKED";     // host can always revoke
  if (from === "REVOKED") return false;                // revoked is sticky
  if (to === "DECLINED") return from !== "JOINED";     // can't decline after joining
  // Delivery failure only applies before the message is confirmed delivered.
  if (to === "FAILED") return from === "PENDING" || from === "QUEUED" || from === "SENT";
  // Retry / switch-method: a failed invite can move forward again.
  if (from === "FAILED") return to === "QUEUED" || to === "SENT" || to === "DELIVERED" || to === "OPENED" || to === "JOINED";
  return INVITE_STATUS[to].rank > INVITE_STATUS[from].rank;
}

/* ── Contact normalization ────────────────────────────────────── */
export type InviteChannel = "email" | "sms";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const e = raw.trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : null;
}

// US-first E.164 normalization. Returns "+1XXXXXXXXXX" style or null.
// Keeps a leading "+" country code if the caller already provided one.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (hasPlus) {
    // International: 8–15 digits per E.164.
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;               // US 10-digit
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`; // US with country code
  return null;
}

export interface RawRecipient { name?: string | null; email?: string | null; phone?: string | null; preferredMethod?: PreferredMethod | null; }
export interface Recipient { name: string | null; email: string | null; phone: string | null; channel: InviteChannel | null; }

// Normalize a raw recipient. `channel` is the channel we CAN reach them on:
// email preferred, else sms, else null (unreachable → not invitable).
export function normalizeRecipient(raw: RawRecipient): Recipient {
  const email = normalizeEmail(raw.email);
  const phone = normalizePhone(raw.phone);
  const name = raw.name?.trim() ? raw.name.trim() : null;
  const channel: InviteChannel | null = email ? "email" : phone ? "sms" : null;
  return { name, email, phone, channel };
}

// A stable identity key for dedup: prefer email, then phone.
export function recipientKey(r: Recipient): string | null {
  return r.email ?? r.phone ?? null;
}

// Dedupe by identity, keeping the first occurrence (and its name). Drops
// unreachable recipients (no email and no phone).
export function dedupeRecipients(list: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of list) {
    const key = recipientKey(r);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/* ── Per-contact delivery preference ──────────────────────────── */
export type PreferredMethod = "sms" | "email" | "both" | "ask";

export interface DeliveryPlan {
  channels: InviteChannel[]; // channels we'll actually send on (only reachable ones)
  needsPrompt: boolean;      // true only when we must ask the host how to send
}

// Decide how to reach a saved contact. `override` is a host's per-invitation
// choice (from the "How should we send …?" prompt) and wins over the saved
// preference. "ask" prompts ONLY when both email and phone exist and no
// override is given; with a single channel there's nothing to ask.
export function resolveDelivery(
  contact: { email?: string | null; phone?: string | null; preferredMethod?: PreferredMethod | null },
  override?: "sms" | "email" | "both" | null,
): DeliveryPlan {
  const hasEmail = !!normalizeEmail(contact.email);
  const hasPhone = !!normalizePhone(contact.phone);
  const avail = (want: InviteChannel[]): InviteChannel[] =>
    want.filter((c) => (c === "email" ? hasEmail : hasPhone));

  const method = override ?? contact.preferredMethod ?? "ask";

  if (method === "email") return { channels: avail(["email"]).length ? avail(["email"]) : avail(["sms"]), needsPrompt: false };
  if (method === "sms") return { channels: avail(["sms"]).length ? avail(["sms"]) : avail(["email"]), needsPrompt: false };
  if (method === "both") return { channels: avail(["email", "sms"]), needsPrompt: false };

  // "ask"
  if (hasEmail && hasPhone) return { channels: [], needsPrompt: true };
  return { channels: avail(["email", "sms"]), needsPrompt: false };
}

/* ── Reminders ────────────────────────────────────────────────── */
export type ReminderKey = "t24h" | "t1h" | "liveNow";
export const REMINDER_OFFSETS_MS: Record<ReminderKey, number> = {
  t24h: 24 * 60 * 60 * 1000,
  t1h: 60 * 60 * 1000,
  liveNow: 0,
};
export const REMINDER_LABEL: Record<ReminderKey, string> = {
  t24h: "24 hours before",
  t1h: "1 hour before",
  liveNow: "When the Live begins",
};

export interface ReminderPrefs { t24h?: boolean; t1h?: boolean; liveNow?: boolean; }

// Which reminders are due to send right now for a scheduled live.
// A reminder is due when: it's enabled, not already sent, and we've
// reached (start - offset). We don't fire time-based reminders once the
// start is more than an hour past (stale) — except liveNow, which the
// host triggers explicitly when they actually go live.
export function dueReminders(args: {
  scheduledStart: Date;
  now: Date;
  prefs: ReminderPrefs;
  alreadySent: Iterable<ReminderKey>;
}): ReminderKey[] {
  const sent = new Set(args.alreadySent);
  const startMs = args.scheduledStart.getTime();
  const nowMs = args.now.getTime();
  const due: ReminderKey[] = [];
  for (const key of ["t24h", "t1h"] as ReminderKey[]) {
    if (!args.prefs[key]) continue;
    if (sent.has(key)) continue;
    const fireAt = startMs - REMINDER_OFFSETS_MS[key];
    // due once we pass the fire time, up to the start moment (not stale-old)
    if (nowMs >= fireAt && nowMs < startMs + REMINDER_OFFSETS_MS.t1h) due.push(key);
  }
  return due;
}

/* ── Secure invite token format ───────────────────────────────── */
// The RANDOM token itself is minted server-side with crypto; here we only
// validate shape. Tokens are URL-safe hex, long enough to be unguessable.
const TOKEN_RE = /^[a-f0-9]{32,64}$/;
export function isWellFormedInviteToken(token: string | null | undefined): boolean {
  return !!token && TOKEN_RE.test(token);
}

// Constant-time-ish equality for the invite token (avoid early-exit leak).
export function inviteTokenMatches(expected: string, provided: string | null | undefined): boolean {
  if (!provided) return false;
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

/* ── Optional host gates (stricter privacy) ───────────────────── */
export interface GuestGateSettings {
  inviteOnly?: boolean;       // must present a valid invite token (default true)
  passcode?: string | null;   // if set, guest must enter it
  requireName?: boolean;      // guest must give a display name
  requireContact?: boolean;   // guest must verify email/mobile (honest: needs provider)
}

export interface GuestClaim { name?: string | null; passcode?: string | null; contactVerified?: boolean; }

// Pure decision: given the host's gates and what the guest presented, can
// they proceed to request an audience token? Returns ok or a reason.
export function evaluateGuestGate(gate: GuestGateSettings, claim: GuestClaim):
  { ok: true } | { ok: false; reason: "passcode" | "name" | "contact" } {
  if (gate.passcode && gate.passcode.length > 0) {
    if (!claim.passcode || claim.passcode.trim() !== gate.passcode) return { ok: false, reason: "passcode" };
  }
  if (gate.requireName && !(claim.name && claim.name.trim().length > 0)) return { ok: false, reason: "name" };
  if (gate.requireContact && !claim.contactVerified) return { ok: false, reason: "contact" };
  return { ok: true };
}
