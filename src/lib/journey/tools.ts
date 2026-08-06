// ── Journey Operations Engine — typed tool registry ─────────────
//
// Journey (OpenAI) never manipulates the database or external services
// through free-form text. It may ONLY call these approved, typed tools.
// Every tool:
//   • runs server-side (the OpenAI key never reaches the browser),
//   • is scoped to the signed-in client (ownership enforced on every read),
//   • validates required fields,
//   • returns a REAL result or an honest failure — never a fabricated success,
//   • records an audit event.
//
// Tool status is deliberately honest. Three states matter:
//   ok:             the tool ran against a real backend and returns data.
//   needs_confirmation: a financial/booking action requires the client to
//                   press CONFIRM — Journey can never charge from chat alone.
//   not_connected:  the provider integration isn't wired/tested live yet, so
//                   the tool refuses and says so ("No booking was made.").
//
// Per the owner's directive: "Do not present Journey as fully operational
// until each tool is connected to a real backend integration and tested
// live." The stubs below make that impossible to violate by accident.

import { prisma } from "@/lib/db";
import type { CurrentAccount } from "@/lib/auth-session";
import { dispatchNotification } from "@/lib/notify";
import { duffelConfigured, searchOffers, summarizeOffer } from "@/lib/duffel";
import { runJourneyStudio, type StudioMediaItem } from "@/lib/studio";
import { getCurrentClientContext } from "./context";
import { recordJourneyEvent } from "./audit";

/** Everything a tool needs: who's asking (ownership) + a trace id + the clock. */
export interface ToolContext {
  account: CurrentAccount;
  traceId: string;
  now: string; // ISO — injected so tools stay testable/pure at the edges
}

export type ToolStatus = "ok" | "unauthorized" | "not_found" | "invalid" | "needs_confirmation" | "not_connected" | "error";

export interface ToolResult {
  status: ToolStatus;
  /** Structured payload on success, or advisory content. Never contains secrets. */
  data?: unknown;
  /** The exact message shown to the client — honest, never a fake success. */
  message: string;
  /** Provider involved, for the audit trail. */
  provider?: string;
  requestId?: string;
}

export interface JourneyTool {
  name: string;
  description: string;
  /** JSON Schema for the arguments the model may pass. */
  parameters: Record<string, unknown>;
  /** True for money/booking actions that must show a review + confirm button. */
  requiresConfirmation?: boolean;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

// ── helpers ─────────────────────────────────────────────────────

const ok = (message: string, data?: unknown, extra?: Partial<ToolResult>): ToolResult => ({ status: "ok", message, data, ...extra });
const fail = (status: ToolStatus, message: string, extra?: Partial<ToolResult>): ToolResult => ({ status, message, ...extra });

/** Load an occasion the caller OWNS, or return a not_found/unauthorized result. */
async function loadOwnedOccasion(ctx: ToolContext, ref: string) {
  const row = await prisma.experience.findFirst({
    where: {
      accountId: ctx.account.id, // ← ownership gate
      OR: [{ id: ref }, { slug: ref }],
    },
    select: {
      id: true, slug: true, type: true, title: true, subtitle: true,
      status: true, visibility: true, eventDate: true, content: true,
      // MediaAsset has no capture-date field; createdAt (upload time) is the
      // only timestamp we have and is used as the timeline ordering key.
      media: { select: { id: true, kind: true, url: true, caption: true, width: true, height: true, createdAt: true } },
    },
  });
  return row;
}

/** Honest refusal used by every provider tool that isn't wired + tested live. */
function notConnected(service: string, provider?: string): ToolResult {
  return fail("not_connected", `${service} isn't connected yet, so nothing was booked or charged. This will go live once the provider integration is connected and tested.`, { provider });
}

// ── the approved tools ──────────────────────────────────────────

export const JOURNEY_TOOLS: JourneyTool[] = [
  // ---- Context & content (connected, read-only or safe writes) ----
  {
    name: "getCurrentClientContext",
    description: "Get the signed-in client's occasions, drafts, upload counts, and what looks incomplete. Read-only.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async handler(_args, ctx) {
      const context = await getCurrentClientContext(ctx.account);
      return ok("Here is the client's current context.", context);
    },
  },
  {
    name: "getOccasion",
    description: "Get one occasion the client owns, by slug or id, including its sections and media.",
    parameters: {
      type: "object",
      properties: { ref: { type: "string", description: "The occasion slug or id." } },
      required: ["ref"],
      additionalProperties: false,
    },
    async handler(args, ctx) {
      const ref = String(args.ref || "").trim();
      if (!ref) return fail("invalid", "An occasion slug or id is required.");
      const row = await loadOwnedOccasion(ctx, ref);
      if (!row) return fail("not_found", "That occasion doesn't exist under this account.");
      return ok(`Loaded “${row.title}”.`, {
        id: row.id, slug: row.slug, type: row.type, title: row.title, subtitle: row.subtitle,
        status: row.status, visibility: row.visibility,
        eventDate: row.eventDate ? row.eventDate.toISOString() : null,
        mediaCount: row.media.length,
      });
    },
  },
  {
    name: "listUploads",
    description: "List the photos and videos uploaded to an occasion the client owns.",
    parameters: {
      type: "object",
      properties: { ref: { type: "string", description: "The occasion slug or id." } },
      required: ["ref"],
      additionalProperties: false,
    },
    async handler(args, ctx) {
      const ref = String(args.ref || "").trim();
      const row = await loadOwnedOccasion(ctx, ref);
      if (!row) return fail("not_found", "That occasion doesn't exist under this account.");
      const uploads = row.media.map((m) => ({
        id: m.id, kind: m.kind, url: m.url, caption: m.caption, width: m.width, height: m.height,
        uploadedAt: m.createdAt.toISOString(),
      }));
      return ok(`Found ${uploads.length} upload(s) on “${row.title}”.`, { uploads });
    },
  },
  {
    name: "organizeGallery",
    description: "Ask Journey Studio to recommend a cover image, gallery order, timeline, duplicates, and missing sections for an occasion the client owns. Returns recommendations only — nothing is applied until the client approves.",
    parameters: {
      type: "object",
      properties: { ref: { type: "string", description: "The occasion slug or id." } },
      required: ["ref"],
      additionalProperties: false,
    },
    async handler(args, ctx) {
      const ref = String(args.ref || "").trim();
      const row = await loadOwnedOccasion(ctx, ref);
      if (!row) return fail("not_found", "That occasion doesn't exist under this account.");
      const media: StudioMediaItem[] = row.media.map((m) => ({
        id: m.id,
        kind: m.kind === "VIDEO" ? "video" : "photo",
        url: m.url,
        filename: m.caption ?? undefined,
        width: m.width ?? undefined,
        height: m.height ?? undefined,
        takenAt: m.createdAt.toISOString(), // upload time — the only timestamp we have
      }));
      const rec = await runJourneyStudio({ task: "enhance", occasionType: row.type, title: row.title, media });
      return ok("Studio prepared recommendations. Review and approve before anything is applied.", rec);
    },
  },

  // ---- Coordination (connected, safe) ----
  {
    name: "createNotification",
    description: "Send an in-app (and, if the client allows, email) notification to the signed-in client — e.g. a reminder or a nudge back to unfinished work. Only ever notifies the client themselves.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        actionUrl: { type: "string", description: "A deep link into the app, e.g. /dashboard/journeys/wedding." },
        relatedLabel: { type: "string" },
      },
      required: ["title", "body"],
      additionalProperties: false,
    },
    async handler(args, ctx) {
      const title = String(args.title || "").trim();
      const body = String(args.body || "").trim();
      if (!title || !body) return fail("invalid", "A title and body are required.");
      const id = await dispatchNotification({
        accountId: ctx.account.id, // ← only ever the signed-in client
        type: "general",
        title, body,
        actionUrl: typeof args.actionUrl === "string" ? args.actionUrl : undefined,
        relatedLabel: typeof args.relatedLabel === "string" ? args.relatedLabel : undefined,
      });
      if (!id) return fail("error", "The notification could not be saved.");
      return ok("Notification sent to the client.", { notificationId: id });
    },
  },
  {
    name: "handoffToConcierge",
    description: "Hand the client to the human Concierge / support with an approved summary, so they don't have to repeat themselves. Use when a person is requested, a refund is disputed, a purchase fails repeatedly, a specialist is needed, or the client is distressed.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why the handoff is needed." },
        summary: { type: "string", description: "Approved summary of the issue and relevant records." },
      },
      required: ["reason", "summary"],
      additionalProperties: false,
    },
    async handler(args, ctx) {
      const reason = String(args.reason || "").trim();
      const summary = String(args.summary || "").trim();
      if (!reason || !summary) return fail("invalid", "A reason and summary are required for a handoff.");
      // Record the handoff as a notification the client can see, and audit it.
      await dispatchNotification({
        accountId: ctx.account.id,
        type: "general",
        title: "Connected you with our Concierge",
        body: `We've passed your request to a person so you won't have to repeat it: ${reason}`,
        relatedLabel: "Concierge",
      });
      return ok("Handoff prepared for the Concierge with the client's summary.", { reason, summary });
    },
  },

  // ---- Purchases & booking (confirmation-gated; never charge from chat) ----
  {
    name: "createPurchaseReview",
    description: "Build the final review a client must see BEFORE any charge: item, provider, dates, price, taxes, fees, cancellation/refund policy, total, and payment method. Charges nothing — it only prepares the review that the CONFIRM PURCHASE button acts on.",
    parameters: {
      type: "object",
      properties: {
        item: { type: "string" },
        provider: { type: "string" },
        total: { type: "number", description: "The all-in total in the given currency." },
        currency: { type: "string" },
        details: { type: "object", description: "dates, travelers, base price, taxes, fees, policies, etc.", additionalProperties: true },
      },
      required: ["item", "total"],
      additionalProperties: false,
    },
    async handler(args, ctx) {
      const item = String(args.item || "").trim();
      if (!item) return fail("invalid", "An item or service is required for a review.");
      // A review is data only — it never charges. The UI renders it with a
      // CONFIRM PURCHASE button; confirmPurchase must receive its token.
      const review = {
        reviewId: `rev_${ctx.traceId}`,
        item,
        provider: typeof args.provider === "string" ? args.provider : "Pending provider",
        total: typeof args.total === "number" ? args.total : null,
        currency: typeof args.currency === "string" ? args.currency : "USD",
        details: (args.details && typeof args.details === "object") ? (args.details as Record<string, unknown>) : {},
        requiresConfirmation: true,
      };
      return ok("Review prepared. The client must press CONFIRM PURCHASE — nothing is charged yet.", review);
    },
  },
  {
    name: "confirmPurchase",
    description: "Attempt to complete a purchase the client explicitly confirmed by pressing CONFIRM PURCHASE. Refuses without a confirmation token from a review. Even with a token, no charge happens until a payment provider is connected and tested live.",
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        reviewId: { type: "string" },
        confirmationToken: { type: "string", description: "Proof the client pressed CONFIRM PURCHASE in the UI." },
      },
      required: ["reviewId", "confirmationToken"],
      additionalProperties: false,
    },
    async handler(args, _ctx) {
      const token = String(args.confirmationToken || "").trim();
      if (!token) {
        return fail("needs_confirmation", "This purchase needs the client to press CONFIRM PURCHASE first. Nothing was charged.");
      }
      // A real payment processor is not connected for this path. Be honest —
      // never fabricate a charge, order number, or receipt.
      return notConnected("Payment processing", "payments");
    },
  },

  // ---- Flights: search is REAL (read-only); booking is gated/honest ----
  {
    name: "searchFlights",
    description: "Search real, live flight options for a trip. Read-only — books nothing. Returns current offers with airline, price, stops, and refundability when the provider reports it (never invented).",
    parameters: {
      type: "object",
      properties: {
        origin: { type: "string", description: "IATA code, e.g. JFK." },
        destination: { type: "string", description: "IATA code, e.g. LHR." },
        departureDate: { type: "string", description: "YYYY-MM-DD." },
        returnDate: { type: "string", description: "YYYY-MM-DD (round trip; optional)." },
        adults: { type: "number", description: "1–9." },
        cabin: { type: "string", enum: ["economy", "premium_economy", "business", "first"] },
      },
      required: ["origin", "destination", "departureDate", "adults"],
      additionalProperties: false,
    },
    async handler(args, _ctx) {
      if (!duffelConfigured()) return notConnected("Flight search", "duffel");
      const origin = String(args.origin || "").trim();
      const destination = String(args.destination || "").trim();
      const departureDate = String(args.departureDate || "").trim();
      const adults = Number(args.adults);
      if (!origin || !destination || !departureDate || !Number.isFinite(adults) || adults < 1) {
        return fail("invalid", "Origin, destination, departure date, and at least one traveler are required.");
      }
      const cabin = (["economy", "premium_economy", "business", "first"] as const).includes(args.cabin as never)
        ? (args.cabin as "economy" | "premium_economy" | "business" | "first")
        : "economy";
      try {
        const { requestId, offers } = await searchOffers({
          origin, destination, departureDate,
          returnDate: typeof args.returnDate === "string" ? args.returnDate : undefined,
          adults, cabin,
        });
        const summaries = offers.slice(0, 8).map(summarizeOffer);
        return ok(`Found ${summaries.length} live flight option(s).`, { offers: summaries }, { provider: "duffel", requestId });
      } catch {
        // Never claim availability we couldn't fetch.
        return fail("error", "Flight search is temporarily unavailable. No booking was made.", { provider: "duffel" });
      }
    },
  },
  {
    name: "bookFlight",
    description: "Book a specific flight offer for named travelers. Requires the client to confirm first. Real charging goes live only when the ticketing provider is connected and tested.",
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        offerId: { type: "string" },
        confirmationToken: { type: "string" },
      },
      required: ["offerId", "confirmationToken"],
      additionalProperties: false,
    },
    async handler(args, _ctx) {
      const token = String(args.confirmationToken || "").trim();
      if (!token) return fail("needs_confirmation", "Booking a flight needs the client to press CONFIRM PURCHASE first. No ticket was issued and nothing was charged.");
      return notConnected("Flight ticketing", "duffel");
    },
  },

  // ---- Provider tools not connected yet — honest stubs, never faked ----
  ...(["searchHotels", "bookHotel", "searchVacationHomes", "searchRestaurants", "bookRestaurant", "searchVendors", "trackDelivery", "requestRefund", "sendMerchantEmail"] as const).map((name): JourneyTool => ({
    name,
    description: `${name}: not connected to a live provider yet. Returns an honest 'not connected' result — it never fabricates results, availability, prices, confirmations, or charges.`,
    requiresConfirmation: /book|refund|sendMerchantEmail/i.test(name),
    parameters: { type: "object", properties: {}, additionalProperties: true },
    async handler() {
      const label = name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
      return notConnected(label);
    },
  })),
];

/** Fast lookup by name. */
export const TOOL_BY_NAME: Map<string, JourneyTool> = new Map(JOURNEY_TOOLS.map((t) => [t.name, t]));

/** The OpenAI "tools" array (function-calling schema) for the whole registry. */
export function toolSchemasForOpenAI() {
  return JOURNEY_TOOLS.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/**
 * Dispatch a single tool call through the registry with ownership context,
 * recording the request and result in the audit trail. Unknown tools are
 * refused — the model can never reach a backend except through this map.
 */
export async function dispatchTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const tool = TOOL_BY_NAME.get(name);
  recordJourneyEvent({ kind: "tool_requested", accountId: ctx.account.id, at: ctx.now, tool: name, traceId: ctx.traceId, detail: args });
  if (!tool) {
    const result = fail("error", `Unknown tool "${name}". Journey can only use approved tools.`);
    recordJourneyEvent({ kind: "error", accountId: ctx.account.id, at: ctx.now, tool: name, traceId: ctx.traceId, errorCode: "unknown_tool", userMessage: result.message });
    return result;
  }
  try {
    const result = await tool.handler(args, ctx);
    recordJourneyEvent({
      kind: result.status === "ok" ? "tool_result" : "error",
      accountId: ctx.account.id, at: ctx.now, tool: name, traceId: ctx.traceId,
      provider: result.provider, requestId: result.requestId,
      errorCode: result.status === "ok" ? undefined : result.status,
      userMessage: result.message,
    });
    return result;
  } catch (err) {
    const result = fail("error", "That action hit an unexpected error and was not completed.");
    recordJourneyEvent({ kind: "error", accountId: ctx.account.id, at: ctx.now, tool: name, traceId: ctx.traceId, errorCode: "handler_threw", userMessage: String(err) });
    return result;
  }
}
