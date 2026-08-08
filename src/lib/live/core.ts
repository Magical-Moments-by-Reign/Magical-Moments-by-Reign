// ── Magical Moments Live — pure core ────────────────────────────
//
// Pure, testable rules for live rooms: states, roles, channel/invite
// generation, TTLs, and legal transitions. No prisma, no Agora, no network.
// The security-critical decisions (who may publish, what a token is scoped to)
// are derived here and enforced by the server token route.

export type LiveRole = "host" | "audience";
export type LiveStatus = "SCHEDULED" | "LIVE" | "ENDED" | "REPLAY";

export interface LiveStatusMeta {
  label: string;
  /** Audience may request a token to join the live channel in this state. */
  joinable: boolean;
  tone: "pending" | "active" | "muted" | "success";
}

export const LIVE_STATUS: Record<LiveStatus, LiveStatusMeta> = {
  SCHEDULED: { label: "Scheduled", joinable: true, tone: "pending" }, // waiting room + countdown
  LIVE: { label: "Live", joinable: true, tone: "active" },
  ENDED: { label: "Ended", joinable: false, tone: "muted" },
  REPLAY: { label: "Replay", joinable: false, tone: "success" }, // watched via recording, not the channel
};

/** Agora RTC role code space we map our roles onto (publisher/subscriber). */
export type AgoraRoleName = "publisher" | "subscriber";

/** Hosts publish; audience subscribes. This is the core security mapping. */
export function agoraRoleFor(role: LiveRole): AgoraRoleName {
  return role === "host" ? "publisher" : "subscriber";
}

/** Token lifetime — short-lived; clients refresh by re-requesting. */
export const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

/** A globally-unique Agora channel name. `rand` must be unique per room. */
export function channelNameFor(rand: string): string {
  const clean = rand.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
  return `mm_${clean}`;
}

/** Agora channel names are limited to 64 bytes of a specific charset. */
export function isValidChannelName(name: string): boolean {
  return /^[a-zA-Z0-9_]{1,64}$/.test(name);
}

/** A human-shareable invite code (unguessable enough for a private room). */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Constant-time-ish invite comparison (avoids trivial early-exit leaks). */
export function inviteMatches(expected: string, provided: string | null | undefined): boolean {
  if (!provided) return false;
  const a = normalizeInviteCode(expected);
  const b = normalizeInviteCode(provided);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Legal state transitions. Host-driven; recording flips SCHEDULED/LIVE→ENDED→REPLAY. */
const TRANSITIONS: Record<LiveStatus, LiveStatus[]> = {
  SCHEDULED: ["LIVE", "ENDED"],
  LIVE: ["ENDED"],
  ENDED: ["REPLAY"], // only when a real recording exists
  REPLAY: [],
};
export function canTransition(from: LiveStatus, to: LiveStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Decide whether a join request may be issued a token, and as what role.
 * Central authorization rule used by the token route:
 *  • the host (account owns the room) always publishes,
 *  • otherwise a valid invite code grants audience (subscriber), and only
 *    while the room is joinable.
 * Returns null when access is denied (no token issued).
 */
export function authorizeJoin(input: {
  isHost: boolean;
  status: LiveStatus;
  expectedInvite: string;
  providedInvite: string | null | undefined;
}): { role: LiveRole; agoraRole: AgoraRoleName } | null {
  if (input.isHost) return { role: "host", agoraRole: "publisher" };
  if (!LIVE_STATUS[input.status].joinable) return null; // ended/replay → no live token
  if (!inviteMatches(input.expectedInvite, input.providedInvite)) return null;
  return { role: "audience", agoraRole: "subscriber" };
}
