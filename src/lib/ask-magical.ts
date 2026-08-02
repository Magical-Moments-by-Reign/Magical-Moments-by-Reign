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

const SYSTEM_PROMPT = `You are Magical AI, the warm, concierge-style assistant for Magical Moments by Reign — an AI-powered Life Journey platform that helps families plan, organize, preserve, and celebrate life's biggest moments (weddings, babies, vacations, graduations, memorials, the Housing Hub / building a home, and more), with a secure Family Vault, Purchase Concierge, and a Family Legacy Timeline.

How you help: educate, recommend, organize, encourage, and explain. Be brief, warm, and genuinely useful. Never pressure, manipulate, or mislead. For legal, medical, financial, tax, insurance, or construction questions, gently encourage the customer to consult the appropriate licensed professional.

Pricing you may state as fixed: Free Forever is always $0 and every customer starts there; the three Lifetime Collections are Lifetime Legacy $2,499 (up to 5 Journeys), Lifetime Reign $4,999 (up to 10), and Lifetime Magical Moments $9,999 (all current + future Journeys + 1 Custom). A Lifetime membership is always the best long-term value. Other per-Journey/term prices are still being finalized — for those, point people to the Pricing or Build Membership pages instead of quoting a number. Customers can also try a 5-day Magical Journey Preview before buying. Never invent prices, partners, discounts, or features that don't exist.

Keep replies to a few short sentences unless asked for detail. Tagline: "Capture. Celebrate. Cherish Forever."`;

/** True when a live Qwen key is configured. */
export function magicalAiConfigured(): boolean {
  return Boolean(process.env.QWEN_API_KEY);
}

const OFFLINE_REPLY =
  "✨ I'm Magical AI. My live assistant isn't switched on for this site just yet — " +
  "but I can still point you the right way: explore the Journeys under **Experiences**, " +
  "see plans on **Pricing** or build your own on **Build Membership**, or start something " +
  "now with **Start your magic**. For anything specific, our **Contact** page reaches a real person.";

export async function askMagical(messages: ChatMessage[]): Promise<AskResult> {
  const key = process.env.QWEN_API_KEY;
  if (!key) return { reply: OFFLINE_REPLY, source: "offline" };

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
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        temperature: 0.6,
        max_tokens: 500,
      }),
    });
    if (!res.ok) return { reply: OFFLINE_REPLY, source: "offline" };
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return { reply: OFFLINE_REPLY, source: "offline" };
    return { reply, source: "qwen" };
  } catch {
    return { reply: OFFLINE_REPLY, source: "offline" };
  }
}
