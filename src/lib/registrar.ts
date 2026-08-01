// ── Domain registrar seam ───────────────────────────────────────
// A thin, pluggable interface over a real domain registrar (Namecheap,
// GoDaddy, Cloudflare, etc.). Real credentials are read from secure
// env vars and NEVER exposed to the browser. When unconfigured, the
// seam reports so cleanly (like the Square/Storage seams) so the rest
// of the flow can degrade gracefully instead of faking a purchase.
//
// Env (server-only):
//   REGISTRAR_PROVIDER     e.g. "namecheap" | "godaddy"
//   REGISTRAR_API_KEY      secret
//   REGISTRAR_API_USER     (provider-dependent)
//   REGISTRAR_API_BASE     API base URL

const PROVIDER = process.env.REGISTRAR_PROVIDER || "";
const API_KEY = process.env.REGISTRAR_API_KEY || "";

export function registrarConfigured(): boolean {
  return Boolean(PROVIDER && API_KEY);
}

export interface AvailabilityResult {
  domain: string;
  available: boolean;
  price?: number; // cents, initial registration
  renewalPrice?: number; // cents
  extension?: string; // ".com"
  privacyIncluded?: boolean;
  currency?: "USD";
}

export interface RegisterResult {
  ok: boolean;
  registrar?: string;
  registrarOrderId?: string;
  expirationDate?: Date;
  error?: string;
}

/**
 * Check domain availability + pricing in real time.
 * Wire the provider's availability endpoint here. Until credentials
 * exist, returns a clearly-flagged "not configured" result so the UI
 * can prompt the operator instead of showing fake availability.
 */
export async function checkAvailability(domain: string): Promise<AvailabilityResult & { configured: boolean }> {
  const name = domain.toLowerCase().trim();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : ".com";
  if (!registrarConfigured()) {
    return { domain: name, available: false, extension: ext, configured: false };
  }
  // TODO(production): call `${REGISTRAR_API_BASE}` availability endpoint
  // with server-only credentials, map the response to AvailabilityResult.
  // Pricing MUST come from the registrar, never the browser.
  return { domain: name, available: false, extension: ext, configured: true };
}

/** Register a domain after Square confirms the initial payment. */
export async function registerDomain(_params: {
  domain: string;
  years?: number;
  privacy?: boolean;
  contact?: Record<string, string>;
}): Promise<RegisterResult> {
  if (!registrarConfigured()) {
    return { ok: false, error: "Registrar is not configured." };
  }
  // TODO(production): call the registrar register endpoint, provision
  // DNS to point at the platform, and return the real order id +
  // expiration. Do NOT claim success unless the registrar confirms.
  return { ok: false, error: "Registrar integration pending." };
}

/** Renew a domain via the registrar (called after a successful charge). */
export async function renewDomain(_params: { domain: string; years?: number }): Promise<RegisterResult> {
  if (!registrarConfigured()) {
    return { ok: false, error: "Registrar is not configured." };
  }
  // TODO(production): call the registrar renew endpoint (idempotent).
  return { ok: false, error: "Registrar integration pending." };
}
