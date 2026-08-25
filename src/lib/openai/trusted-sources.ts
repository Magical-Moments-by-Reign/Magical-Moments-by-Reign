// ── Trusted-source domain policy — shared helper (SERVER ONLY) ──────────
// One place that knows how to check whether a URL is within an approved
// domain allowlist. Each feature resolver (sports/openai-resolver.ts today;
// future travel/events/entertainment resolvers later) owns its OWN domain
// list as a plain string array — this file is just the shared matching
// logic, not a giant central registry of every feature's domains. Building
// a speculative registry entry for a feature that doesn't have a resolver
// yet would be exactly the kind of premature abstraction this codebase
// avoids; the extension point is "define your own list, pass it here."

/** True when `url`'s hostname is exactly one of `domains`, or a subdomain
 *  of one (e.g. "www.nba.com" and "watch.nba.com" both match "nba.com").
 *  Never throws on a malformed URL — just returns false. */
export function isUrlWithinDomains(url: string, domains: readonly string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
