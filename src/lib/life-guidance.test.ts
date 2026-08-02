// Unit tests for the Life Guidance Center.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GRADE_TIMELINE, timelineForGrade, GRAD_TOPICS, GRAD_TOPIC_GROUPS, topicsInGroup,
  GUIDE_ARTICLES, guide, OFFICIAL_RESOURCES, officialResource,
  US_STATES, stateResource, recommendForGrade, LIFE_GUIDANCE,
} from "./life-guidance.ts";

test("grade timeline covers 8th–12th with focus areas", () => {
  assert.deepEqual(GRADE_TIMELINE.map((g) => g.grade), ["8", "9", "10", "11", "12"]);
  assert.ok(timelineForGrade("11")?.focus.includes("FAFSA preparation"));
  assert.ok(timelineForGrade("10")?.focus.includes("Dual enrollment"));
});

test("graduation topics are grouped and complete", () => {
  assert.equal(GRAD_TOPIC_GROUPS.length, 5);
  assert.ok(GRAD_TOPICS.length >= 18);
  const groupIds = new Set(GRAD_TOPIC_GROUPS.map((g) => g.id));
  for (const t of GRAD_TOPICS) assert.ok(groupIds.has(t.group));
  assert.ok(topicsInGroup("paying").some((t) => t.label.includes("FAFSA")));
});

test("guides answer the example questions in plain language", () => {
  for (const slug of ["what-is-dual-enrollment", "what-is-fafsa", "can-my-child-graduate-early", "what-juniors-should-do-now"]) {
    const g = guide(slug);
    assert.ok(g, `missing guide ${slug}`);
    assert.ok(g!.answer.length > 40);
  }
});

test("official resources are real links; FAFSA points to studentaid.gov", () => {
  assert.ok(OFFICIAL_RESOURCES.fafsa.url.includes("studentaid.gov"));
  assert.ok(officialResource("collegeboard")?.url.startsWith("https://"));
  // state_doe is intentionally blank until curated per-state
  assert.equal(OFFICIAL_RESOURCES.state_doe.url, "");
});

test("all 50 states + DC are available for selection", () => {
  assert.equal(US_STATES.length, 51);
  assert.ok(US_STATES.some((s) => s.code === "TX" && s.name === "Texas"));
});

test("state guidance links to official source or gives a guided pointer (never invented)", () => {
  const tx = stateResource("TX");
  assert.equal(tx.configured, false);   // no curated URL yet
  assert.equal(tx.url, null);           // never a fabricated URL
  assert.ok(tx.label.includes("Texas"));
  assert.ok(tx.note.includes("official"));
});

test("Ask Magical recommends by grade — 10th grade offers dual enrollment", () => {
  const r = recommendForGrade("10");
  assert.ok(r.message.toLowerCase().includes("dual enrollment"));
  assert.ok(r.suggestedTopics.includes("Dual enrollment"));
  assert.equal(recommendForGrade("12").grade, "12");
  assert.ok(recommendForGrade("12").message.toLowerCase().includes("senior"));
});

test("mission copy present", () => {
  assert.equal(LIFE_GUIDANCE.name, "Life Guidance Center");
  assert.ok(LIFE_GUIDANCE.mission.includes("didn't know that was an option"));
});
