import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkAssistantName, normalizeAssistantName, assistantGreeting,
  DEFAULT_ASSISTANT_NAME, SUGGESTED_ASSISTANT_NAMES, MAX_ASSISTANT_NAME_LEN,
} from "./assistant-name.ts";

test("accepts and title-cases valid names", () => {
  assert.deepEqual(checkAssistantName("journey"), { ok: true, name: "Journey" });
  assert.deepEqual(checkAssistantName("  luna  "), { ok: true, name: "Luna" });
  assert.deepEqual(checkAssistantName("mary-jane"), { ok: true, name: "Mary-Jane" });
});

test("all suggested names are valid", () => {
  for (const n of SUGGESTED_ASSISTANT_NAMES) assert.equal(checkAssistantName(n).ok, true);
});

test("rejects empty, too-long, bad chars, and profanity/reserved", () => {
  assert.equal(checkAssistantName("").ok, false);
  assert.equal(checkAssistantName("a".repeat(MAX_ASSISTANT_NAME_LEN + 1)).ok, false);
  assert.equal(checkAssistantName("Nova123").ok, false);
  assert.equal(checkAssistantName("Nova!").ok, false);
  assert.equal(checkAssistantName("shithead").ok, false);
  assert.equal(checkAssistantName("Concierge").ok, false); // reserved role
});

test("normalize falls back to default on bad input", () => {
  assert.equal(normalizeAssistantName("f#ck"), DEFAULT_ASSISTANT_NAME);
  assert.equal(normalizeAssistantName(null), DEFAULT_ASSISTANT_NAME);
  assert.equal(normalizeAssistantName("Grace"), "Grace");
});

test("greeting introduces the assistant by name", () => {
  const back = assistantGreeting({ assistantName: "Journey", firstName: "Tabitha" });
  assert.ok(back.includes("Welcome back, Tabitha"));
  assert.ok(back.includes("I'm Journey, your Magical Assistant"));

  const first = assistantGreeting({ assistantName: "Luna", firstTime: true });
  assert.ok(first.startsWith("Welcome to your Magical Space. I'm Luna, your Magical Assistant."));

  // Missing first name → first-time style even when not flagged
  const nofirst = assistantGreeting({ assistantName: "Nova", firstName: "" });
  assert.ok(nofirst.includes("I'm Nova, your Magical Assistant"));
});
