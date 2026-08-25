// GET /api/discovery/sports/team-roster?sport=nba&teamId=132&teamName=Boston%20Celtics
// Lazy per-team roster fetch for the Team Directory panel (fetched only
// when a member actually opens a team's card, not eagerly for the whole
// league) — protects the paid API-Sports/SportsDataIO quota. requireAccount
// gates it the same as every other Discovery data route.

import { NextRequest, NextResponse } from "next/server";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { getTeamRoster, sdioLeagueFor, SPORT_CATALOG } from "@/lib/discovery/sports/service";
import { getPlayerIdDirectoryByName, resolveProfileLinksFromDirectory } from "@/lib/discovery/sports/player-profile";
import { sdioConfigured, sdioCommercialMode } from "@/lib/discovery/providers/sportsdata";
import type { SportSlug } from "@/lib/discovery/providers/sports";

export async function GET(req: NextRequest) {
  // requireAccount deliberately throws Next.js's internal redirect signal
  // for a signed-out visitor — that throw must propagate untouched for the
  // framework to actually perform the redirect, so it stays OUTSIDE the
  // try/catch below (never wrap next/navigation's redirect()).
  const account = await requireAccount("/dashboard/discovery/sports");

  // Everything else is wrapped so a genuinely unforeseen failure (a DB
  // blip, a future change that isn't as null-safe as today's code) always
  // degrades to this same honest JSON contract instead of a raw framework
  // error page — which TeamRosterPanel.tsx's client-side res.json() can't
  // parse, and which previously surfaced as a generic "Couldn't load the
  // roster right now." indistinguishable from a real crash. See the PR
  // description's provider-resilience section.
  try {
    const sportParam = req.nextUrl.searchParams.get("sport") ?? "";
    const teamId = req.nextUrl.searchParams.get("teamId")?.trim() ?? "";
    const teamName = req.nextUrl.searchParams.get("teamName")?.trim() ?? "";
    const sport = SPORT_CATALOG.find((s) => s.slug === sportParam)?.slug as SportSlug | undefined;
    if (!sport || !teamId) return NextResponse.json({ roster: [], status: "not_supported" });

    const isOwner = await isOwnerAccount(account.id);
    const allowSdio = Boolean(sdioLeagueFor(sport)) && sdioConfigured() && (sdioCommercialMode() || isOwner);
    // OpenAI web_search fallback — Owner-only for now, for every league
    // that resolver actually supports (see resolveRosterViaOpenAI's own
    // ROSTER_RESOLVER_LEAGUES map in openai-resolver.ts — that map is the
    // single source of truth for which sports this fallback covers; this
    // route deliberately does NOT duplicate a sport allowlist here, only
    // the Owner-preview rollout decision). Broader member exposure is
    // gated behind the Owner performing a live verification pass against
    // the real configured OpenAI account (see the PR description's Live
    // Verification Gate) — this is not a permanent restriction, just
    // today's rollout state.
    const allowOpenAiFallback = isOwner;

    const result = await getTeamRoster(sport, teamId, { teamName: teamName || undefined, allowSecondarySource: allowSdio, allowOpenAiFallback });
    if (!result.players.length) {
      // status is a fixed, safe-to-show enum (never the raw provider message,
      // an internal error string, or anything that could hint at API keys /
      // provider internals). The real plan/subscription text API-Sports
      // reported is only ever included for the owner, as an admin diagnostic —
      // never sent to a regular member. rosterDiagnostic (TEMPORARY — see
      // getTeamRoster's own doc comment) is Owner-only for the same reason.
      return NextResponse.json({
        roster: [],
        status: result.status,
        ...(isOwner && result.planRestrictedReason ? { ownerDiagnostic: result.planRestrictedReason } : {}),
        ...(isOwner && result.diagnostic ? { rosterDiagnostic: result.diagnostic } : {}),
      });
    }

    const sdioLeague = allowSdio ? sdioLeagueFor(sport) : null;
    // ONE bulk directory fetch for the whole roster (never one identical
    // lookup per player) — this is optional enrichment and must never be able
    // to fail the whole roster response, so failures degrade to an empty Map.
    const links = sdioLeague
      ? resolveProfileLinksFromDirectory(result.players, await getPlayerIdDirectoryByName(sdioLeague).catch(() => new Map<string, string>()))
      : new Map<string, string | null>();
    const withLinks = result.players.map((p) => {
      const profilePlayerId = links.get(p.id) ?? null;
      return { ...p, profileHref: profilePlayerId ? `/dashboard/discovery/sports/player/${sdioLeague}/${profilePlayerId}` : null };
    });

    // provenance is only ever present when at least one field in this
    // roster came from the OpenAI fallback (see getTeamRoster) — a pure
    // Tier 1/2 provider hit never sets it, so a regular provider-backed
    // roster renders with no citation line. `sources` is safe to always
    // include (real provider names only, never a key/header/secret) —
    // real per-response attribution of which tier(s) actually contributed,
    // for the same "preserve provenance" discipline as `provenance`.
    return NextResponse.json({
      roster: withLinks,
      status: "hit",
      sources: result.sources ?? [],
      ...(result.provenance ? { provenance: result.provenance } : {}),
      ...(isOwner && result.diagnostic ? { rosterDiagnostic: result.diagnostic } : {}),
    });
  } catch {
    return NextResponse.json({ roster: [], status: "error" });
  }
}
