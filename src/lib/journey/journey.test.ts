import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, toAuditRecord } from "./audit.ts";
import { dispatchTool, TOOL_BY_NAME, toolSchemasForOpenAI, type ToolContext } from "./tools.ts";
import { runJourney, journeyEngineConfigured } from "./runtime.ts";
import type { CurrentAccount } from "../auth-session.ts";

const ACCOUNT: CurrentAccount = {
  id: "acct_test", customerId: "C1", firstName: "Reign", lastName: "R",
  role: "member" as never, status: "active", guardianAccountId: null,
  membershipTier: "free" as never, assistantName: "Journey",
  sessionId: "s1", sessionTokenHash: "h1",
};
const CTX: ToolContext = { account: ACCOUNT, traceId: "trace_1", now: "2026-08-06T00:00:00.000Z" };

test("audit redacts secrets and never logs them", () => {
  const rec = toAuditRecord({
    kind: "tool_requested", accountId: "a", at: "2026-01-01T00:00:00Z", tool: "x",
    detail: { password: "hunter2", token: "abc", cardNumber: "4111", note: "ok" },
  });
  const detail = rec.detail as Record<string, unknown>;
  assert.equal(detail.password, "[redacted]");
  assert.equal(detail.token, "[redacted]");
  assert.equal(detail.cardNumber, "[redacted]");
  assert.equal(detail.note, "ok", "non-secret fields pass through");
});

test("redact leaves undefined as undefined", () => {
  assert.equal(redact(undefined), undefined);
});

test("unknown tools are refused — the model can't reach a backend directly", async () => {
  const r = await dispatchTool("dropAllTables", { evil: true }, CTX);
  assert.equal(r.status, "error");
  assert.match(r.message, /approved tools/i);
});

test("confirmPurchase without a confirmation token refuses and charges nothing", async () => {
  const r = await dispatchTool("confirmPurchase", { reviewId: "rev_x", confirmationToken: "" }, CTX);
  assert.equal(r.status, "needs_confirmation");
  assert.match(r.message, /CONFIRM PURCHASE|nothing was charged/i);
});

test("confirmPurchase WITH a token is still honest — no payment processor is connected", async () => {
  const r = await dispatchTool("confirmPurchase", { reviewId: "rev_x", confirmationToken: "tok_pressed" }, CTX);
  assert.equal(r.status, "not_connected", "never fabricates a charge or receipt");
  assert.match(r.message, /nothing was booked or charged/i);
});

test("createPurchaseReview prepares a review but charges nothing", async () => {
  const r = await dispatchTool("createPurchaseReview", { item: "Dinner for 2", total: 240, currency: "USD" }, CTX);
  assert.equal(r.status, "ok");
  const review = r.data as Record<string, unknown>;
  assert.equal(review.requiresConfirmation, true);
  assert.equal(review.item, "Dinner for 2");
  assert.match(r.message, /CONFIRM PURCHASE|nothing is charged/i);
});

test("bookFlight without confirmation refuses; issues no ticket", async () => {
  const r = await dispatchTool("bookFlight", { offerId: "off_1", confirmationToken: "" }, CTX);
  assert.equal(r.status, "needs_confirmation");
  assert.match(r.message, /no ticket|nothing was charged/i);
});

test("unconnected provider tools return an honest not_connected — never faked", async () => {
  for (const name of ["searchHotels", "bookHotel", "searchRestaurants", "bookRestaurant", "searchVendors", "trackDelivery", "requestRefund"]) {
    const r = await dispatchTool(name, {}, CTX);
    assert.equal(r.status, "not_connected", `${name} must be honest`);
    assert.match(r.message, /connected|booked or charged/i);
  }
});

test("searchFlights is not_connected when the flight provider isn't configured", async () => {
  const had = process.env.DUFFEL_ACCESS_TOKEN;
  delete process.env.DUFFEL_ACCESS_TOKEN;
  try {
    const r = await dispatchTool("searchFlights", { origin: "JFK", destination: "LHR", departureDate: "2026-09-01", adults: 2 }, CTX);
    assert.equal(r.status, "not_connected");
  } finally {
    if (had !== undefined) process.env.DUFFEL_ACCESS_TOKEN = had;
  }
});

test("every tool exposes an OpenAI function schema", () => {
  const schemas = toolSchemasForOpenAI();
  assert.equal(schemas.length, TOOL_BY_NAME.size);
  for (const s of schemas) {
    assert.equal(s.type, "function");
    assert.ok(s.function.name);
    assert.ok(s.function.parameters);
  }
});

test("money/booking tools are marked requiresConfirmation", () => {
  for (const name of ["confirmPurchase", "bookFlight", "bookHotel", "bookRestaurant", "requestRefund"]) {
    assert.equal(TOOL_BY_NAME.get(name)?.requiresConfirmation, true, `${name} must be confirmation-gated`);
  }
});

test("runJourney degrades honestly with no OPENAI_API_KEY — no fabricated actions", async () => {
  const had = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(journeyEngineConfigured(), false);
    const r = await runJourney([{ role: "user", content: "Book me a flight to Paris" }], ACCOUNT, { now: CTX.now, traceId: "t2" });
    assert.equal(r.source, "offline");
    assert.equal(r.toolEvents.length, 0, "no tools run offline");
    assert.match(r.reply, /not.*(switched on|connected)|nothing was booked/i);
  } finally {
    if (had !== undefined) process.env.OPENAI_API_KEY = had;
  }
});
