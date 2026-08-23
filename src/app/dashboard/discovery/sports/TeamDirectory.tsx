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

import { useState } from "react";
import type { DirectoryTeam, DirectoryGroup } from "@/lib/discovery/sports/team-directory";
import { TeamRosterPanel } from "./TeamRosterPanel";

export default function TeamDirectory({ sport, groups }: { sport: string; groups: DirectoryGroup[] }) {
  const [openTeam, setOpenTeam] = useState<{ team: DirectoryTeam; breadcrumb: string } | null>(null);

  if (openTeam) {
    return (
      <TeamRosterPanel
        sport={sport}
        team={openTeam.team}
        breadcrumb={openTeam.breadcrumb}
        onBack={() => setOpenTeam(null)}
        backLabel="← All Teams"
        viewTeamHref={`/dashboard/discovery/sports/team/${sport}/${openTeam.team.id}`}
      />
    );
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
