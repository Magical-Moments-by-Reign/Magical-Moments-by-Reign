import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeConciergeRequest, CONCIERGE_OPENING } from "./concierge-intent.ts";

test("concierge service requests are detected", () => {
  const yes = [
    "Book me a flight",
    "Help me reserve dinner",
    "Find me a hotel",
    "Plan my birthday dinner",
    "Find a photographer",
    "Help me book a venue",
    "Make me a reservation at Nobu",
    "Coordinate our travel to Italy",
  ];
  for (const t of yes) assert.ok(looksLikeConciergeRequest(t), `should route to Concierge: "${t}"`);
});

test("general app questions stay with Ask Magical", () => {
  const no = [
    "How does the app work?",
    "What does a membership cost?",
    "Which Journey should I choose?",
    "How do I set up my account?",
    "What is the Family Vault?",
    "Tell me about pricing",
  ];
  for (const t of no) assert.ok(!looksLikeConciergeRequest(t), `should stay with Ask Magical: "${t}"`);
});

test("opening line is the exact required copy", () => {
  assert.equal(CONCIERGE_OPENING, "Concierge at your service. What may I help you with today?");
});
