"use client";
// Wraps one Standings row (still rendered server-side as `children`) so
// clicking it opens that team's real roster inline, right below the row —
// reuses the same TeamRosterPanel/roster endpoint as the All Teams
// directory rather than a second implementation.

import { useState } from "react";
import { TeamRosterPanel, type RosterTeam } from "./TeamRosterPanel";

export default function StandingsTeamRow({ sport, team, children }: { sport: string; team: RosterTeam; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="spx-standings__team-wrap">
      <button type="button" className="spx-team-row spx-team-row--clickable" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {children}
      </button>
      {open && (
        <div className="spx-standings__inline-roster">
          <TeamRosterPanel
            sport={sport}
            team={team}
            breadcrumb=""
            onBack={() => setOpen(false)}
            backLabel="✕ Close"
            viewTeamHref={`/dashboard/discovery/sports/team/${sport}/${team.id}`}
          />
        </div>
      )}
    </div>
  );
}
