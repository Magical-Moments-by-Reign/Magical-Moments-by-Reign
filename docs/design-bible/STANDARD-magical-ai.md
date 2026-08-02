# Master Design Bible — Magical AI (Ask Magical)

**Status:** Founder Approved (requested). Subordinate to the
[Constitution](./CONSTITUTION.md) — especially **Article V (AI Philosophy)** and
**Article VIII of Book I (The AI Promise)**.

**Built today:** a floating **Ask Magical** concierge available site-wide (a
chat widget bottom-right on every page), backed by **Qwen** via its
OpenAI-compatible chat endpoint, with a graceful offline reply when no key is
set. **Needs:** `QWEN_API_KEY` to go live (a graceful seam until then — we never
fabricate an AI answer).

---

## Behavior (per the Constitution)
Magical AI **guides — it does not replace — human decision-making.** It
educates, recommends, organizes, encourages, and explains; it **never pressures,
manipulates, or misleads.** For legal, medical, financial, tax, insurance, or
construction questions it encourages consulting the appropriate **licensed
professional.** Replies are warm, brief, and genuinely useful. A persistent
disclaimer notes the AI can make mistakes.

## What it knows
The platform's Life Journeys, Family Vault, Purchase Concierge, Journey
Experience/Preview, and pricing. It may state the fixed facts — Free Forever is
$0 and the entry point; the Lifetime Collections are **Legacy $2,499 / Reign
$4,999 / Magical Moments $9,999**; Lifetime is always the best long-term value —
and it **must not quote non-final per-Journey/term prices** (it points to the
Pricing / Build Membership pages instead) or invent partners, discounts, or
features.

## Architecture
- **`src/lib/ask-magical.ts`** — server-only. Builds the Magical AI system prompt
  (brand voice + guardrails) and calls Qwen; returns `{ reply, source }` where
  `source` is `"qwen"` (live) or `"offline"` (graceful fallback). Trims history
  and caps length to protect the endpoint.
- **`/api/ask-magical`** — POST route; validates messages; never exposes the key.
- **`src/components/ai/AskMagical.tsx`** — the floating widget (mounted once in
  the root layout), safe markdown-lite rendering, typing indicator, disclaimer.

## Configuration (graceful seam)
| Env | Purpose | Default |
| --- | --- | --- |
| `QWEN_API_KEY` | Qwen / DashScope key — **required to go live** | — (offline) |
| `QWEN_BASE_URL` | OpenAI-compatible base URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| `QWEN_MODEL` | model id | `qwen-plus` |

Without a key, the widget shows an honest "assistant isn't switched on yet"
concierge message with helpful links — **it does not fabricate answers.**

## Recommended next phases
- **Context-aware answers:** pass the current Journey / page so replies are
  tailored (e.g. wedding planning steps, Family Vault help).
- **Actions:** let Magical AI create checklist items, draft messages, or start a
  Journey (with the customer's confirmation) once accounts/auth exist.
- **Streaming responses**, rate limiting, and abuse protection.

**Guardrail:** never present the offline fallback as a real AI answer; never
quote non-final prices; always defer to licensed professionals where required;
no change to AI behavior that alters the customer experience without Founder
approval (Constitution, Article XI).
