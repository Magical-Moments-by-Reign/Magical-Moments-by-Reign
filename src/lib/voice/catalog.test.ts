import { test } from "node:test";
import assert from "node:assert/strict";
import { VOICES, voicesFor, getVoice, voiceAccess, tierVoiceId, freeVoiceForStyle, DEFAULT_VOICE } from "./catalog.ts";

test("voice ids are unique and defaults resolve", () => {
  const ids = new Set(VOICES.map((v) => v.id));
  assert.equal(ids.size, VOICES.length);
  assert.ok(getVoice(DEFAULT_VOICE.journey));
  assert.ok(getVoice(DEFAULT_VOICE.concierge));
});

test("Journey and Concierge each have their own personalities", () => {
  const j = voicesFor("journey", "free").map((v) => v.personality);
  for (const p of ["Warm", "Friendly", "Elegant", "Professional"]) assert.ok(j.includes(p), `journey missing ${p}`);
  const c = voicesFor("concierge", "free").map((v) => v.personality);
  for (const p of ["Luxury Hotel Concierge", "Executive Assistant", "Travel Specialist"]) assert.ok(c.includes(p), `concierge missing ${p}`);
});

test("tierVoiceId keeps a valid selection but moves across tiers", () => {
  // Already in the target persona+tier → unchanged.
  assert.equal(tierVoiceId("journey", "free", "journey-elegant"), "journey-elegant");
  // Free id but asking for premium → returns a premium journey voice.
  const toPremium = tierVoiceId("journey", "premium", "journey-warm");
  assert.equal(getVoice(toPremium)!.tier, "premium");
  assert.equal(getVoice(toPremium)!.persona, "journey");
  // Wrong persona / unknown id → falls back to that tier's default voice.
  assert.equal(getVoice(tierVoiceId("concierge", "free", "nope"))!.persona, "concierge");
});

test("freeVoiceForStyle maps gender+style to a matching free voice", () => {
  const elegant = getVoice(freeVoiceForStyle("journey", "female", "elegant"))!;
  assert.equal(elegant.tier, "free");
  assert.equal(elegant.gender, "female");
  assert.equal(elegant.browserStyle, "elegant");
  // A male request returns a male free voice even if the exact style is absent.
  assert.equal(getVoice(freeVoiceForStyle("journey", "male", "executive"))!.gender, "male");
});

test("access tiers: free always available; premium gated by cloud + membership", () => {
  const free = VOICES.find((v) => v.tier === "free")!;
  const prem = VOICES.find((v) => v.tier === "premium")!;
  assert.equal(voiceAccess(free, { paidMember: false, cloudReady: false }), "available");
  assert.equal(voiceAccess(prem, { paidMember: true, cloudReady: false }), "coming_soon");
  assert.equal(voiceAccess(prem, { paidMember: false, cloudReady: true }), "needs_membership");
  assert.equal(voiceAccess(prem, { paidMember: true, cloudReady: true }), "available");
});
