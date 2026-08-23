"use client";
// Shared "open one team's roster in place" panel (CLIENT ONLY) — used by
// both the All Teams directory and any clickable team row elsewhere on a
// sport page (e.g. Standings). Fetches lazily from
// /api/discovery/sports/team-roster only when opened — never all teams'
// rosters eagerly. Real players only; a player's NAME links to their full
// Player Profile only when the server could confidently resolve one.

import { useEffect, useState } from "react";
import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";

export interface RosterTeam {
  id: string;
  name: string;
  logoUrl?: string;
}

interface RosterPlayer {
  id: string;
  name: string;
  position?: string;
  number?: number;
  photoUrl?: string;
  profileHref?: string | null;
}

// Real football position codes — used to order a roster Offense first, then
// Defense, then Special Teams, the way a real depth chart reads. A sport
// whose positions don't match any of these (e.g. NBA's G/F/C) simply lands
// everyone in one ungrouped list, same as before — never a wrong grouping.
const OFFENSE_POSITIONS = new Set(["QB", "RB", "FB", "HB", "WR", "TE", "OL", "T", "LT", "RT", "OT", "G", "LG", "RG", "OG", "C"]);
const DEFENSE_POSITIONS = new Set(["DL", "DE", "DT", "NT", "LB", "ILB", "OLB", "MLB", "CB", "S", "SS", "FS", "DB"]);
const SPECIAL_TEAMS_POSITIONS = new Set(["K", "P", "LS", "KR", "PR"]);
const POSITION_GROUP_ORDER = ["Offense", "Defense", "Special Teams", "Other"] as const;

function positionGroup(position?: string): (typeof POSITION_GROUP_ORDER)[number] {
  const p = position?.toUpperCase().trim();
  if (!p) return "Other";
  if (OFFENSE_POSITIONS.has(p)) return "Offense";
  if (DEFENSE_POSITIONS.has(p)) return "Defense";
  if (SPECIAL_TEAMS_POSITIONS.has(p)) return "Special Teams";
  return "Other";
}

function groupRoster(roster: RosterPlayer[]): { label: string; players: RosterPlayer[] }[] {
  const buckets = new Map<string, RosterPlayer[]>();
  for (const p of roster) {
    const key = positionGroup(p.position);
    buckets.set(key, [...(buckets.get(key) ?? []), p]);
  }
  return POSITION_GROUP_ORDER.map((label) => ({ label, players: buckets.get(label) ?? [] })).filter((g) => g.players.length > 0);
}

function RosterPlayerRow({ player }: { player: RosterPlayer }) {
  return (
    <div className="spx-roster__row">
      <PlayerAvatar photoUrl={player.photoUrl} number={player.number} name={player.name} size="sm" />
      <span className="spx-roster__number">{player.number != null ? `#${player.number}` : "—"}</span>
      {player.profileHref ? (
        <Link href={player.profileHref} className="spx-roster__name-link">{player.name}</Link>
      ) : (
        <span className="spx-roster__name-link">{player.name}</span>
      )}
      {player.position && <span className="spx-roster__pos">{player.position}</span>}
    </div>
  );
}

type RosterStatus = "hit" | "empty" | "plan_restricted" | "error" | "not_supported";

// Honest, member-safe copy per real reason — never the raw provider message
// (that stays server-side, owner-diagnostic only; see team-roster/route.ts).
// A plan restriction must never read as "this team just has no roster."
const STATUS_COPY: Partial<Record<RosterStatus, string>> = {
  plan_restricted: "Roster data is unavailable from our current sports-data plan.",
  error: "We couldn't verify this team's roster right now — please try again shortly.",
};

export function TeamRosterPanel({ sport, team, breadcrumb, onBack, backLabel = "← Back", viewTeamHref, hideHead = false }: { sport: string; team: RosterTeam; breadcrumb: string; onBack?: () => void; backLabel?: string; viewTeamHref?: string; hideHead?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null);
  const [status, setStatus] = useState<RosterStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // No verified provider id for this team (see team-directory.ts) — a
    // roster lookup would have nothing real to ask for, so skip the doomed
    // fetch and show the honest reason directly instead of "Loading…"
    // forever or a generic empty result.
    if (!team.id) {
      setLoading(false);
      setRoster([]);
      setStatus("not_supported");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setRoster(null);
    setStatus(null);
    fetch(`/api/discovery/sports/team-roster?sport=${sport}&teamId=${encodeURIComponent(team.id)}&teamName=${encodeURIComponent(team.name)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setRoster(Array.isArray(data?.roster) ? data.roster : []);
        setStatus(typeof data?.status === "string" ? (data.status as RosterStatus) : "empty");
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sport, team.id, team.name]);

  const groups = roster ? groupRoster(roster) : [];

  return (
    <div className="spx-directory__panel">
      {(onBack || viewTeamHref) && (
        <div className="spx-directory__panel-toprow">
          {onBack ? <button type="button" className="spx-directory__back" onClick={onBack}>{backLabel}</button> : <span />}
          {/* Every inline quick-view (Standings row, All Teams card) links out
              to the real Team Detail page — never rendered when this panel
              IS that page (hideHead callers never pass viewTeamHref). */}
          {viewTeamHref && <Link href={viewTeamHref} className="spx-directory__view-team">View Full Team →</Link>}
        </div>
      )}
      {!hideHead && (
        <div className="spx-directory__panel-head">
          {team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logoUrl} alt="" className="spx-directory__team-logo" />
          ) : (
            <div className="spx-team-row__ph spx-directory__team-logo" />
          )}
          <div>
            <h3>{team.name}</h3>
            {breadcrumb && <span className="spx-directory__breadcrumb">{breadcrumb}</span>}
          </div>
        </div>
      )}
      <div className="spx-directory__roster-box">
        {loading && <p className="spx-panel__empty">Loading roster…</p>}
        {error && <p className="spx-panel__empty">Couldn&rsquo;t load the roster right now.</p>}
        {!loading && !error && roster?.length === 0 && (
          <p className="spx-panel__empty">{(status && STATUS_COPY[status]) ?? "No roster data available for this team yet."}</p>
        )}
        {!loading && groups.map((g) => (
          <div key={g.label} className="spx-directory__roster-group">
            {groups.length > 1 && <h4 className="spx-directory__roster-group-label">{g.label}</h4>}
            {g.players.map((p) => <RosterPlayerRow key={p.id} player={p} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
