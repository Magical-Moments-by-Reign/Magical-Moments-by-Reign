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

import { useEffect, useRef, useState } from "react";
import type { DirectoryTeam, DirectoryGroup } from "@/lib/discovery/sports/team-directory";
import { formatGroupLabel, groupCollectiveNoun } from "@/lib/discovery/sports/group-labels";
import { TeamRosterPanel } from "./TeamRosterPanel";

export default function TeamDirectory({ sport, groups }: { sport: string; groups: DirectoryGroup[] }) {
  const [openTeam, setOpenTeam] = useState<{ team: DirectoryTeam; breadcrumb: string } | null>(null);
  // Real, working filter — built from the groups' own real labels (e.g.
  // MLB's "American League"/"National League", college football/basketball's
  // real conferences, straight from provider standings/catalog data), never
  // a hardcoded league/conference/division list — kept neutral ("group") in
  // both this state and its UI copy so it reads correctly no matter what a
  // given sport calls its groupings. An empty set means no explicit
  // selection has been made — the natural "All" state, same meaning the
  // old `activeGroup: null` had — and selecting every group explicitly
  // (via "Select All") is treated identically to the empty set for
  // filtering purposes, so it never accidentally hides a group added by a
  // later fetch. Only rendered when there's more than one real group to
  // actually filter between.
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(() => new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const allGroupLabels = groups.map((g) => g.label);
  const isAllSelected = selectedGroups.size === 0 || selectedGroups.size >= allGroupLabels.length;
  const visibleGroups = isAllSelected ? groups : groups.filter((g) => selectedGroups.has(g.label));

  // Escape closes the open filter menu; a click/tap outside its wrapper
  // (trigger + popover together) does the same — both only wired up while
  // the menu is actually open, never a stray global listener.
  useEffect(() => {
    if (!filterOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOpen(false);
    }
    function onPointerDown(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [filterOpen]);

  function toggleGroup(label: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  // "All Conferences" / "SEC" / "SEC + Big Ten" / "3 Conferences Selected" —
  // the collective noun is derived from the REAL (pre-formatGroupLabel)
  // labels so it never calls a non-conference grouping a Conference (see
  // groupCollectiveNoun's doc comment); every individual label shown here
  // goes through formatGroupLabel for its short/common form where one
  // exists — filtering itself (selectedGroups, toggleGroup, isAllSelected
  // above) still only ever reads/writes the real, unformatted g.label.
  const collectiveNoun = groupCollectiveNoun(allGroupLabels);
  const selectedList = [...selectedGroups];
  const filterTriggerLabel = isAllSelected
    ? `All ${collectiveNoun}`
    : selectedList.length === 1
      ? formatGroupLabel(selectedList[0])
      : selectedList.length === 2
        ? selectedList.map(formatGroupLabel).join(" + ")
        : `${selectedList.length} ${collectiveNoun} Selected`;

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
      {groups.length > 1 && (
        <div className="spx-directory__filter" ref={filterRef}>
          <button
            type="button"
            className="spx-directory__filter-trigger"
            aria-haspopup="true"
            aria-expanded={filterOpen}
            aria-controls="spx-directory-filter-menu"
            onClick={() => setFilterOpen((v) => !v)}
          >
            <span>{filterTriggerLabel}</span>
            <span className="spx-directory__filter-caret" aria-hidden="true">▾</span>
          </button>
          {filterOpen && (
            <div id="spx-directory-filter-menu" className="spx-directory__filter-menu" role="dialog" aria-label={`Filter teams by ${collectiveNoun.toLowerCase()}`}>
              <div className="spx-directory__filter-actions">
                <button type="button" onClick={() => setSelectedGroups(new Set(allGroupLabels))}>Select All</button>
                <button type="button" onClick={() => setSelectedGroups(new Set())}>Clear Selection</button>
              </div>
              <div className="spx-directory__filter-options">
                {groups.map((g) => (
                  <label key={g.label} className="spx-directory__filter-option">
                    <input
                      type="checkbox"
                      checked={selectedGroups.size > 0 && selectedGroups.has(g.label)}
                      onChange={() => toggleGroup(g.label)}
                    />
                    <span>{formatGroupLabel(g.label)}</span>
                  </label>
                ))}
              </div>
              <button type="button" className="spx-directory__filter-done" onClick={() => setFilterOpen(false)}>Done</button>
            </div>
          )}
        </div>
      )}
      {visibleGroups.map((g) => (
        <div key={g.label} className="spx-standings__group">
          <h3 className="spx-standings__group-label">{formatGroupLabel(g.label)}</h3>
          {g.divisions.map((d) => (
            <div key={d.label} className="spx-standings__division">
              {d.label && <h4 className="spx-standings__division-label">{formatGroupLabel(d.label)}</h4>}
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
                      <span className="spx-directory__team-info">
                        <span className="spx-directory__team-name">{team.name}</span>
                        {(team.league || team.division) && (
                          <span className="spx-directory__team-meta">{[team.league, team.division].filter(Boolean).join(" · ")}</span>
                        )}
                        <span className="spx-directory__team-record">{team.record ?? "Record unavailable"}</span>
                      </span>
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
