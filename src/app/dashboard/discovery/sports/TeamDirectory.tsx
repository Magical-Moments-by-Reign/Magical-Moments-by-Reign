"use client";
// All Teams directory (CLIENT ONLY) — conference/division groups and team
// logos are passed in already-resolved from the server. Clicking a team
// replaces the grid with that team's own roster panel — never a card
// expanding in place among its siblings, so a member only ever sees the one
// team they asked for. A team's roster is fetched lazily, only when its
// panel opens, from /api/discovery/sports/team-roster — never all teams'
// rosters eagerly, to protect the paid API quota. Real players only; a
// player's NAME links to their full Player Profile only when the server
// could confidently resolve one — the row itself is plain text, not a link.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DirectoryTeam, DirectoryGroup } from "@/lib/discovery/sports/team-directory";

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

function TeamRosterPanel({ sport, team, breadcrumb, onBack }: { sport: string; team: DirectoryTeam; breadcrumb: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setRoster(null);
    fetch(`/api/discovery/sports/team-roster?sport=${sport}&teamId=${encodeURIComponent(team.id)}&teamName=${encodeURIComponent(team.name)}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setRoster(Array.isArray(data?.roster) ? data.roster : []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sport, team.id, team.name]);

  const groups = roster ? groupRoster(roster) : [];

  return (
    <div className="spx-directory__panel">
      <button type="button" className="spx-directory__back" onClick={onBack}>← All Teams</button>
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
      <div className="spx-directory__roster-box">
        {loading && <p className="spx-panel__empty">Loading roster…</p>}
        {error && <p className="spx-panel__empty">Couldn&rsquo;t load the roster right now.</p>}
        {!loading && !error && roster?.length === 0 && <p className="spx-panel__empty">No roster data available for this team yet.</p>}
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

export default function TeamDirectory({ sport, groups }: { sport: string; groups: DirectoryGroup[] }) {
  const [openTeam, setOpenTeam] = useState<{ team: DirectoryTeam; breadcrumb: string } | null>(null);

  if (openTeam) {
    return <TeamRosterPanel sport={sport} team={openTeam.team} breadcrumb={openTeam.breadcrumb} onBack={() => setOpenTeam(null)} />;
  }

  return (
    <div className="spx-directory">
      {groups.map((g) => (
        <div key={g.label} className="spx-standings__group">
          <h3 className="spx-standings__group-label">{g.label}</h3>
          {g.divisions.map((d) => (
            <div key={d.label} className="spx-standings__division">
              {d.label && <h4 className="spx-standings__division-label">{d.label}</h4>}
              <div className="spx-directory__grid">
                {d.teams.map((team) => (
                  <div key={team.id} className="spx-directory__team">
                    <button
                      type="button"
                      className="spx-directory__team-toggle"
                      onClick={() => setOpenTeam({ team, breadcrumb: [g.label, d.label].filter(Boolean).join(" · ") })}
                    >
                      {team.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logoUrl} alt="" className="spx-directory__team-logo" />
                      ) : (
                        <div className="spx-team-row__ph spx-directory__team-logo" />
                      )}
                      <span className="spx-directory__team-name">{team.name}</span>
                      <span className="spx-directory__team-arrow" aria-hidden="true">▸</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
