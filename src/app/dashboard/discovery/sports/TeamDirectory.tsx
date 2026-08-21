"use client";
// All Teams directory (CLIENT ONLY) — conference/division groups and team
// logos are passed in already-resolved from the server. A team's roster is
// fetched lazily, only the first time its card is opened, from
// /api/discovery/sports/team-roster — never all teams' rosters eagerly, to
// protect the paid API quota. Real players only; a player links to their
// full Player Profile only when the server could confidently resolve one.

import { useState } from "react";
import Link from "next/link";
import JerseyAvatar from "./JerseyAvatar";
import type { DirectoryTeam, DirectoryGroup } from "@/lib/discovery/sports/team-directory";

interface RosterPlayer {
  id: string;
  name: string;
  position?: string;
  number?: number;
  photoUrl?: string;
  profileHref?: string | null;
}

function TeamCard({ sport, team }: { sport: string; team: DirectoryTeam }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null);
  const [error, setError] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && roster === null && !loading) {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/discovery/sports/team-roster?sport=${sport}&teamId=${encodeURIComponent(team.id)}&teamName=${encodeURIComponent(team.name)}`);
        const data = await res.json();
        setRoster(Array.isArray(data?.roster) ? data.roster : []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="spx-directory__team">
      <button type="button" className="spx-directory__team-toggle" onClick={toggle} aria-expanded={open}>
        {team.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logoUrl} alt="" className="spx-directory__team-logo" />
        ) : (
          <div className="spx-team-row__ph spx-directory__team-logo" />
        )}
        <span className="spx-directory__team-name">{team.name}</span>
        <span className="spx-directory__team-arrow" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="spx-roster__grid spx-directory__roster">
          {loading && <p className="spx-panel__empty">Loading roster…</p>}
          {error && <p className="spx-panel__empty">Couldn&rsquo;t load the roster right now.</p>}
          {!loading && !error && roster?.length === 0 && <p className="spx-panel__empty">No roster data available for this team yet.</p>}
          {!loading && roster?.map((p) => {
            const content = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.photoUrl ? <img src={p.photoUrl} alt="" /> : <JerseyAvatar number={p.number} />}
                <span className="spx-roster__name">{p.name}</span>
                <span className="spx-roster__meta">{p.number != null ? `#${p.number}` : ""}{p.number != null && p.position ? " · " : ""}{p.position ?? ""}</span>
              </>
            );
            return p.profileHref ? (
              <Link href={p.profileHref} className="spx-roster__player" key={p.id}>{content}</Link>
            ) : (
              <div className="spx-roster__player" key={p.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TeamDirectory({ sport, groups }: { sport: string; groups: DirectoryGroup[] }) {
  return (
    <div className="spx-directory">
      {groups.map((g) => (
        <div key={g.label} className="spx-standings__group">
          <h3 className="spx-standings__group-label">{g.label}</h3>
          {g.divisions.map((d) => (
            <div key={d.label} className="spx-standings__division">
              {d.label && <h4 className="spx-standings__division-label">{d.label}</h4>}
              <div className="spx-directory__grid">
                {d.teams.map((team) => <TeamCard key={team.id} sport={sport} team={team} />)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
