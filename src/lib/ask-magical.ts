// ── Magical AI (Ask Magical) — Qwen-backed concierge ────────────
// Server-only. Calls Qwen through its OpenAI-compatible chat endpoint when
// configured, and degrades gracefully (an honest "not connected yet"
// concierge message — never a fabricated AI answer) when it isn't.
//
// Governance (Constitution, Article V): Magical AI educates, recommends,
// organizes, encourages, and explains — it never pressures, manipulates,
// or misleads, and it points customers to a licensed professional for
// legal / medical / financial / construction matters.
//
// Env (all optional; the widget degrades without them):
//   QWEN_API_KEY   — DashScope / Qwen API key (required to go live)
//   QWEN_BASE_URL  — default https://dashscope-intl.aliyuncs.com/compatible-mode/v1
//   QWEN_MODEL     — default qwen-plus

export interface ChatMessage { role: "user" | "assistant"; content: string; }
export interface AskResult { reply: string; source: "qwen" | "offline"; }

// Shared brand/pricing/honesty knowledge for BOTH assistants.
const BASE_PROMPT = `You work for Magical Moments by Reign — an AI-powered Life Journey platform that helps families plan, organize, preserve, and celebrate life's biggest moments (weddings, babies, vacations, graduations, memorials, the Housing Hub / building a home, and more), with a secure Family Vault, Purchase Concierge, and a Magical Moments Library.

Be brief, warm, and genuinely useful. Never pressure, manipulate, or mislead. For legal, medical, financial, tax, insurance, or construction questions, gently encourage the customer to consult the appropriate licensed professional.

Pricing you may state as fixed: Free Forever is always $0 and every customer starts there; the three Lifetime Collections are Lifetime Legacy $2,499 (up to 5 Journeys), Lifetime Reign $4,999 (up to 10), and Lifetime Magical Moments $9,999 (all current + future Journeys + 1 Custom). A Lifetime membership is always the best long-term value. Other per-Journey/term prices are still being finalized — for those, point people to the Pricing or Build Membership pages instead of quoting a number. Customers can also try a 5-day Magical Journey Preview before buying. Never invent prices, partners, discounts, or features that don't exist.

Brand names to use consistently: Magical Moments, the Magical Moments Library (everything a customer creates lives here, nothing lost), the Magical Tracker (real-time progress of a Journey), Magical Invitations, and Magical Galleries. Never call these "Journey Tracker," "Legacy Library," or "Legacy Timeline" — Project Legacy is a separate company. Tagline: "Capture. Celebrate. Cherish Forever."`;

// Ask Magical — the general app guide (everyone, signed in or not).
const MAGICAL_SYSTEM = `You are Magical AI ("Ask Magical"), the warm general guide for the app.

${BASE_PROMPT}

YOUR ROLE: Explain how Magical Moments works — memberships, pricing, Journeys, features, navigation, account setup — and help people choose the right Journey or service. You are available to everyone.

You do NOT perform hands-on concierge services (booking flights, hotels, or restaurants; finding vendors; planning dinners; coordinating travel; completing purchased-service requests). When someone asks for one of those, briefly tell them the **Concierge** — the member service assistant inside their account — handles that, and to open the Concierge (or sign in to a member account) to continue. Keep replies to a few short sentences.`;

// Concierge — the hands-on member service assistant (signed-in members only).
const CONCIERGE_SYSTEM = `You are the Magical Concierge, the hands-on member service assistant. Greet with "Concierge at your service."

${BASE_PROMPT}

YOUR ROLE: Help signed-in members get things done — plan dinners, research restaurants/flights/hotels, coordinate celebrations and travel, find vendors, build checklists, organize Journey details, plan guests and invitations, gift ideas, scheduling, and manage purchased services. Reduce the stress of planning.

Before promising included assistance, remember that some services depend on the member's membership tier or purchased plan; if something isn't included, kindly point to the upgrade, purchase, or request-a-service option.

Never claim that a reservation, restaurant booking, flight/hotel booking, payment, vendor confirmation, or invitation send has been completed — you cannot perform those yet. Say what you CAN do now (plan, draft, organize, build a checklist, research options), and clearly label any not-yet-connected step "Coming Soon" or ask for the details you'd need. Never pretend to act.`;

export type AssistantMode = "magical" | "concierge";

/** True when a live Qwen key is configured. */
export function magicalAiConfigured(): boolean {
  return Boolean(process.env.QWEN_API_KEY);
}

const OFFLINE_REPLY =
  "✨ I'm Magical AI. My live assistant isn't switched on for this site just yet — " +
  "but I can still point you the right way: explore the **Journeys**, " +
  "see plans on **Pricing** or build your own on **Build Membership**, or start something " +
  "now with **Start your magic**. For anything specific, our **Contact** page reaches a real person.";

const CONCIERGE_OFFLINE =
  "✦ Concierge at your service. My live planning assistant isn't switched on for this site just yet — " +
  "but you can still organize everything here: build a **Journey** to hold your plans, add dates and a checklist, " +
  "and keep it all in your **Library**. Anything that needs a live reservation, booking, or vendor is **Coming Soon**. " +
  "Need a person? Email info@magicalmomentsbyreign.com.";

export async function askMagical(messages: ChatMessage[], mode: AssistantMode = "magical"): Promise<AskResult> {
  const key = process.env.QWEN_API_KEY;
  const systemPrompt = mode === "concierge" ? CONCIERGE_SYSTEM : MAGICAL_SYSTEM;
  const offline = mode === "concierge" ? CONCIERGE_OFFLINE : OFFLINE_REPLY;
  if (!key) return { reply: offline, source: "offline" };

  const base = process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const model = process.env.QWEN_MODEL || "qwen-plus";

  // Keep only the recent turns and cap length to protect the endpoint.
  const trimmed = messages.slice(-10).map((m) => ({
    role: m.role,
    content: String(m.content || "").slice(0, 2000),
  }));

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...trimmed],
        temperature: 0.6,
        max_tokens: 500,
      }),
    });
    if (!res.ok) return { reply: offline, source: "offline" };
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return { reply: offline, source: "offline" };
    return { reply, source: "qwen" };
  } catch {
    return { reply: offline, source: "offline" };
  }
}
