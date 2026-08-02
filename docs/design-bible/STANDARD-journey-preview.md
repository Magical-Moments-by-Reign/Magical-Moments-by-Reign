# Master Design Bible — Journey Preview™ (5-day premium trial)

**Status:** Founder Approved (canonical). A premium feature. Subordinate to
Book I. *(™ appears in customer-facing UI only once the trademark completes.)*

**Naming (reconciled):** this is different from the **Journey Experience** tour
(the no-signup guided look documented in
[STANDARD-journey-experience.md](./STANDARD-journey-experience.md) at
`/journeys/[type]`). **Journey Preview™** is a **hands-on 5-day trial** of a
premium Journey — started as one of the three choices on that tour page.

**Built today:** the three-option choice on every Journey Experience page
(Continue with Free Forever · Start a Journey Preview · Purchase immediately) and
the fully transparent **Journey Preview terms/checkout screen** at
`/journeys/[type]/preview` — future-membership picker, live price, exact 5-day
schedule (start → end → first billing), renewal schedule, everything-included
list, preview limits, and the reminder cadence. **Nothing is hidden.**

**Needs (to truly begin a trial):** accounts/auth, a **captured payment method**
(Square card-on-file / setup intent), and a **billing scheduler** for the day-6
conversion + reminder emails. These are graceful seams today — the "Begin"
action is gated and **we never capture a fake payment or fake a charge.**

---

## Purpose

Let families **experience the value** of a premium Life Journey before a
financial commitment — building confidence, excitement, and trust. It is **not a
free giveaway**; customers should feel informed and welcomed, never pressured.
Every preview answers one question: *"Can I truly see myself using this for one
of the biggest moments of my life?"*

## The three options (on the Journey Experience page)

1. **Continue with Free Forever Magical Moments.**
2. **Start a Journey Preview™** (this feature).
3. **Purchase Immediately.**

## How it works

- **Length:** 5 days, beginning immediately after signup.
- A **valid payment method is required** to begin; **no payment is collected
  until the preview ends.**
- **Cancel anytime before expiration** → no charge; the account automatically
  returns to Free Forever Magical Moments.

## Checkout (nothing hidden)

Customer must: create an account · accept Terms of Service · accept Privacy
Policy · select a future membership · provide a valid payment method. They review
**Preview Start Date · Preview End Date · Future Billing Date · Membership Price
· Renewal Schedule** before starting.

## What's included

Experienced as if a paying member: Journey Dashboard, Timeline, Planning Tools,
AI Assistant, Budget Tools, Sample Website, Gallery, Message Center, Checklists,
Task Manager, Calendar, Document Vault, Voice Notes, Purchase Concierge™,
Notifications, Vendor Marketplace, Planning Templates, Timeline Automation.

## Preview limits (protect the platform)

Up to 10 photos · up to 5 documents · limited AI requests · limited storage ·
public website stays in **Preview Mode** (subtle "Preview" badge until a paid
membership begins) · invitation sending disabled · marketplace purchases
continue through partner websites.

## One-preview rule

One active Journey Preview at a time · one per Journey type · repeat previews on
the same account or payment method are prevented. *(Enforcement needs
auth + payment fingerprinting — later phase.)*

## Reminders

Day 1 "Welcome! Your Journey Preview has officially begun." · Day 3 "You're
halfway through…" · Day 4 "Only one day remaining…" · Final day "Your Journey
Preview ends tomorrow. If you do nothing, your selected membership will begin
automatically." *(Needs the reminder scheduler.)*

## After the preview

- **Continue:** nothing changes — the Journey continues exactly where they left
  off, no data lost, no setup repeated, premium features stay unlocked.
- **Cancel:** account returns to Free Forever; they keep their account, Family
  Vault, basic dashboard/calendar/notes, and core memories (within Free Forever
  limits); premium features go inactive until they upgrade.
- **Returning later:** upgrade anytime — all eligible preview content stays
  connected; the transition is seamless.

## Recommended build phasing

- **Phase A (done):** three-option choice + transparent Journey Preview terms/
  checkout screen (picker, price, dates, limits, reminders). Self-contained.
- **Phase B:** real start — auth + Square card-on-file capture + preview state on
  the account + the day-6 conversion job + reminder emails + one-preview
  enforcement + the "Preview Mode" badge and preview limits on live content.

**Guardrail:** never capture a fake payment or imply a charge; nothing hidden at
checkout; no pressure; placeholder prices labeled non-final (Lifetime Collections
set); cancel-anytime and returns-to-Free-Forever honored exactly.
