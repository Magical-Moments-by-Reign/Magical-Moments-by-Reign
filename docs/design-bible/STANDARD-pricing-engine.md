# Master Design Bible — Pricing Engine v1.0

**Status:** **Founder Approved** (canonical). This document *replaces every
previous pricing conversation* and supersedes the prior fixed-package model
(Silver / Gold / Diamond / Lifetime Legacy / Custom Concierge) as the pricing
**philosophy**. Subordinate to Book I.

**Amounts:** Only the three **Lifetime Collections** below carry Founder-fixed
dollar amounts. All per-occasion / per-term amounts are **placeholders the
Founder will finalize later** — they live in one config object
(`PRICING_CONFIG` in `src/lib/pricing-engine.ts`) and are flagged as
non-final in code and UI.

---

## Philosophy

Customers **build the membership they need** — we do not force fixed packages.
We sell two things: **Occasions** and a **Membership Term**. The system
intelligently recommends savings while staying completely flexible. The goal is
**lifelong customer relationships, not maximizing a single sale.**

The engine must always feel: **Simple · Flexible · Transparent · Fair · Easy to
understand.**

---

## Step One — Select Occasions

Customers first choose the Occasions they want, in any number (1 … all).
There are currently **twenty (20) standard Occasions + one (1) Custom Journey**:

Proposal · Wedding · Anniversary · Pregnancy · Baby · Birthday · Graduation ·
Vacation · New Home · First Car · College · Retirement · Military · Memorial ·
Family Reunion · Holiday · Pet Journey · Business Launch · Bucket List ·
Celebration of Life · **+ Custom Journey**.

## Live Cart

As Occasions are selected, the cart updates automatically and stays visible.
It shows: selected Occasions · number of Occasions · running total · current
savings · upgrade opportunities.

## Smart Savings

The platform intelligently recommends better value — e.g. *"You've selected two
Occasions. Compare adding one more?"* or *"You've selected seven Occasions.
Compare Lifetime Reign?"* **It educates; it never pressures.**

## Step Two — Select Membership Term

After Occasions, the customer chooses a term that applies to **every** selected
Occasion: **1 Year · 5 Years · 10 Years · Lifetime.**

## Upgrades — never lose money invested

Customers may upgrade Occasions, Years, or both at any time. The engine
automatically **credits previous purchases and charges only the difference.**
*Example:* bought 1 Occasion / 1 Year, later upgrades to 7 Occasions / 5 Years →
engine computes previous-purchase credit, new price, amount due; charges only
the difference.

---

## Lifetime Collections (Founder-fixed amounts)

| Collection | Price | Includes |
| --- | --- | --- |
| **Lifetime Legacy** | **$2,499** | up to **5** Lifetime Occasions |
| **Lifetime Reign** | **$4,999** | up to **10** Lifetime Occasions |
| **Lifetime Magical Moments** | **$9,999** | **every current + future** Occasion + **1 Custom Journey** |

## Pricing Protection Rule

Lifetime Memberships must **always** remain the best long-term value. No
discount, coupon, promotion, bundle, loyalty reward, or upgrade credit may
reduce a recurring/term price **below the comparable Lifetime Collection.** When
a build approaches a Lifetime Collection's price, the system automatically
**compares the Lifetime option before checkout.**

---

## Membership Options (billing cadence)

Customers may choose **Monthly · Annual · 5 Years · 10 Years · Lifetime**, and
may upgrade at any time.

## Journey Protection™ (optional add-on)

**$2.99 / month or $29.99 / year.** Lets a customer **pause** a paid membership
for **1, 2, or 3 months** — their choice, no documentation, no explanation.

- **During a pause:** premium features pause (uploads, editing, premium AI,
  premium planning, premium invitations, premium storage, premium galleries);
  the customer keeps their account, memories, photos, videos, documents, and
  website, and continues to receive **Free Forever** features.
- **Pause billing:** the selected pause period is **added to the end** of the
  membership — customers never lose paid time.

*(™ appears in customer-facing UI only once the trademark process completes.)*

## Required account · every family starts here

Every person must create a Magical Moments account — **there is no guest /
anonymous membership.** Every account **begins by selecting a membership
option**, and **everyone completes checkout**, including Free Forever members
(their total is **$0.00**). Checkout creates the account, Family Vault, and
dashboard, and records acceptance of the **Terms of Service** and **Privacy
Policy**. Paid memberships follow the same checkout with the applicable charges.

**Membership options (the account-entry selection):** Free Forever · Monthly ·
Annual · 5-Year · 10-Year · Lifetime Legacy · Lifetime Reign · Lifetime Magical
Moments.

## Free Forever Magical Moments

Every customer may begin with **Free Forever** — our gift to every family — and
it is **always included** in every paid membership too. Free Forever includes:
Family Dashboard · Family Vault (Basic) · Family Calendar · Grocery Lists ·
Doctor Appointment Tracker · Medical Timeline (Basic) · School Center (Basic) ·
Emergency Contacts · Family Profiles · Voice Notes · AI Reminders (Basic) · One
Basic Journey · Limited Photo & Document Storage · Basic Message Center · Basic
Sharing.

**Upgrading** (any time): no information is lost, no memories deleted, no account
recreated — premium features simply unlock after payment.

**Downgrading / cancellation:** a cancelled paid membership **automatically
returns to Free Forever.** The customer keeps their account, Family Vault, core
memories, and basic features; premium website features become inactive until
they upgrade again. **The account is never deleted simply because they cancel.**

---

## Reconciliation with prior pricing (resolved)

The earlier **Journey Protection pricing-model conflict** (recurring + Free
Forever vs. one-time term-based packages) is **resolved by this document**: the
Founder has approved the **recurring / build-your-own model with a Free Forever
tier.** The prior fixed packages remain only as historical reference; the
build-your-membership engine is now the canonical path. No amounts change beyond
the three Founder-fixed Lifetime Collections without further Founder approval.

## Build phasing (recommended)

- **Phase A (this slice):** the pure pricing **engine** (occasions × term,
  running total, savings, smart recommendations, Pricing Protection cap,
  upgrade-credit math, Journey Protection, Free Forever) + a live
  **Build Your Membership** experience. Amounts are placeholders except the
  Lifetime Collections. **No checkout / money movement yet.**
- **Phase B:** wire to accounts + Square so a built membership can be purchased,
  paused (Journey Protection), and upgraded (credit-the-difference) for real.
  *Requires auth + Square keys.*

**Guardrail:** we never invent a *final* price. Placeholder amounts are labeled
as such until the Founder finalizes them; only the Lifetime Collections are
fixed today.
