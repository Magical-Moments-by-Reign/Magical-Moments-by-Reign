// ── Token encryption (AES-256-GCM) ──────────────────────────────
// Social access tokens are encrypted at rest and only ever decrypted
// server-side, in memory, at the moment of an API call. They are never
// returned to the browser, written to logs, placed in URLs, or shown
// on customer-facing pages.
//
// Key: SOCIAL_TOKEN_KEY — a 32-byte key, hex (64 chars) or base64.
// Generate one with:  openssl rand -hex 32
// In development, if unset, an ephemeral key is derived so the demo
// runs — but tokens encrypted with it won't survive a restart, and a
// warning is logged. NEVER run production without a real key.

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.SOCIAL_TOKEN_KEY?.trim();
  if (raw) {
    let key: Buffer;
    if (/^[0-9a-fA-F]{64}$/.test(raw)) key = Buffer.from(raw, "hex");
    else key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
      throw new Error(
        "SOCIAL_TOKEN_KEY must be 32 bytes (hex: 64 chars, or base64). " +
          "Generate one with: openssl rand -hex 32",
      );
    }
    cachedKey = key;
    return key;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SOCIAL_TOKEN_KEY is required in production to encrypt social tokens.",
    );
  }

  // Dev-only ephemeral key (stable within a single process).
  console.warn(
    "[crypto] SOCIAL_TOKEN_KEY not set — using an ephemeral dev key. " +
      "Encrypted tokens will not survive a restart. Do not use in production.",
  );
  cachedKey = crypto.createHash("sha256").update("magical-dev-ephemeral").digest();
  return cachedKey;
}

/** Encrypt a secret. Returns "iv:tag:ciphertext" (all base64). */
export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/** Decrypt a secret produced by encryptSecret. Server-side only. */
export function decryptSecret(payload: string): string {
  const key = loadKey();
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted payload.");
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Last-4-style hint safe to display; never reveals the token. */
export function tokenFingerprint(payload: string): string {
  return "•••• " + crypto.createHash("sha256").update(payload).digest("hex").slice(0, 4);
}
