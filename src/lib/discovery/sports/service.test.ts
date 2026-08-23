import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveWithFailureIsolation } from "./service";

// ── Regression: followed-team roster/injury enrichment must never take the
// whole Sport page down. resolveWithFailureIsolation is the exact shared
// primitive resolveFollowedTeamRosters and resolveFollowedTeamInjuries
// (service.ts) both build on — these tests exercise the real exported
// function, not a re-implementation of its logic.

interface FakeTeam {
  id: string;
}

interface FakeRosterResult {
  players: { id: string; name: string }[];
  status: "hit" | "empty" | "plan_restricted" | "error" | "not_supported";
}

test("resolveWithFailureIsolation: two teams, one roster succeeds and one throws — the thrown team gets the error fallback, the other keeps its real result", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }];
  const results = await resolveWithFailureIsolation<FakeTeam, FakeRosterResult>(
    teams,
    async (t) => {
      if (t.id === "B") throw new Error("provider outage for team B");
      return { players: [{ id: "p1", name: "Real Player" }], status: "hit" };
    },
    () => ({ players: [], status: "error" })
  );
  assert.deepEqual(results[0], { players: [{ id: "p1", name: "Real Player" }], status: "hit" });
  assert.deepEqual(results[1], { players: [], status: "error" });
});

test("resolveWithFailureIsolation: two teams, one injury lookup succeeds and one throws — the thrown team gets [], the other keeps its real result", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }];
  const results = await resolveWithFailureIsolation(
    teams,
    async (t) => {
      if (t.id === "B") throw new Error("injury feed outage for team B");
      return [{ playerId: "p1", playerName: "Real Player", status: "Questionable" }];
    },
    () => [] as unknown[]
  );
  assert.deepEqual(results[0], [{ playerId: "p1", playerName: "Real Player", status: "Questionable" }]);
  assert.deepEqual(results[1], []);
});

test("resolveWithFailureIsolation: every team's optional call fails — resolves a full, safe array of fallbacks, never rejects", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }, { id: "C" }];
  const results = await resolveWithFailureIsolation<FakeTeam, FakeRosterResult>(
    teams,
    async () => { throw new Error("provider entirely down"); },
    () => ({ players: [], status: "error" })
  );
  assert.equal(results.length, 3);
  for (const r of results) assert.deepEqual(r, { players: [], status: "error" });
});

test("resolveWithFailureIsolation: a genuine 'plan_restricted' or 'empty' status is never converted to 'error' — only an actual thrown rejection is", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }];
  const results = await resolveWithFailureIsolation<FakeTeam, FakeRosterResult>(
    teams,
    async (t) => (t.id === "A" ? { players: [], status: "plan_restricted" } : { players: [], status: "empty" }),
    () => ({ players: [], status: "error" })
  );
  assert.deepEqual(results[0], { players: [], status: "plan_restricted" });
  assert.deepEqual(results[1], { players: [], status: "empty" });
});

test("resolveWithFailureIsolation: preserves the real per-team ordering (a rejection doesn't reorder or drop results)", async () => {
  const teams: FakeTeam[] = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }];
  const results = await resolveWithFailureIsolation(
    teams,
    async (t) => { if (t.id === "B" || t.id === "D") throw new Error("down"); return t.id; },
    () => "error"
  );
  assert.deepEqual(results, ["A", "error", "C", "error"]);
});
