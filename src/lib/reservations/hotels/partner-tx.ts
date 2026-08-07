// ── Expedia Partner-Transaction-ID ──────────────────────────────
//
// Every Expedia (Rapid) request carries a unique Partner-Transaction-ID so
// support can locate any transaction instantly. The member never enters it —
// it is generated server-side and stored with the reservation.
//
//   Format: MM-{USER_ID}-{SERVICE}-{YYYYMMDD}-{RANDOM_ID}
//   Example: MM-48392-HOTEL-20260807-7Q9X2
//
// The formatter is pure (testable); the wrapper supplies today's date + a
// random suffix.

export type ExpediaService = "HOTEL" | "PACKAGE" | "FLIGHT";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Pure: assemble the id from its parts. `date` is used for the YYYYMMDD stamp. */
export function formatPartnerTransactionId(userId: string, service: ExpediaService, date: Date, randomId: string): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const cleanUser = String(userId || "guest").replace(/[^A-Za-z0-9]/g, "").slice(0, 16) || "guest";
  return `MM-${cleanUser}-${service}-${y}${m}${d}-${randomId}`;
}

/** A 5-char uppercase alphanumeric suffix. */
function randomSuffix(len = 5): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

/** Generate a fresh Partner-Transaction-ID for this member + service. */
export function newPartnerTransactionId(userId: string, service: ExpediaService): string {
  return formatPartnerTransactionId(userId, service, new Date(), randomSuffix());
}
