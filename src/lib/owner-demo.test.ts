import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPERIENCES } from "./membership-builder.ts";
import { EXPERIENCE_TYPES } from "./experience-types.ts";
import { demoDraftPlans, demoSlugFor, JOURNEY_TYPE, DEMO_SLUG_PREFIX, OWNER_DEMO_EMAIL } from "./owner-demo.ts";

test("one demo draft plan per built Journey", () => {
  const plans = demoDraftPlans();
  assert.equal(plans.length, EXPERIENCES.length);
  assert.deepEqual(plans.map((p) => p.journeyId), EXPERIENCES.map((e) => e.id));
});

test("every plan is titled 'Demo — [Journey]' with a unique demo slug", () => {
  const plans = demoDraftPlans();
  const slugs = new Set<string>();
  for (const p of plans) {
    assert.ok(p.title.startsWith("Demo — "), `title should start with 'Demo — ': ${p.title}`);
    assert.ok(p.slug.startsWith(DEMO_SLUG_PREFIX), `slug should start with ${DEMO_SLUG_PREFIX}: ${p.slug}`);
    assert.ok(!slugs.has(p.slug), `duplicate slug ${p.slug}`);
    slugs.add(p.slug);
  }
});

test("every plan maps to a REAL renderable experience type (no dead themes)", () => {
  const valid = new Set(EXPERIENCE_TYPES.map((t) => t.id));
  for (const p of demoDraftPlans()) {
    assert.ok(valid.has(p.type), `type '${p.type}' for ${p.journeyId} is not a known EXPERIENCE_TYPE`);
  }
});

test("JOURNEY_TYPE covers every Journey id", () => {
  for (const e of EXPERIENCES) {
    assert.ok(JOURNEY_TYPE[e.id], `missing JOURNEY_TYPE mapping for ${e.id}`);
  }
});

test("demoSlugFor is deterministic and prefixed", () => {
  assert.equal(demoSlugFor("home"), "demo-home");
  assert.equal(demoSlugFor("celebration-of-life"), "demo-celebration-of-life");
});

test("owner demo email is the brand address", () => {
  assert.equal(OWNER_DEMO_EMAIL, "info@magicalmomentsbyreign.com");
});
