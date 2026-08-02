# Master Design Bible — Magical Preview Pass (Trial Membership + Billing)

**Status:** Founder Approved · **billing NOT live until fully verified.**
Subordinate to the [Constitution](./CONSTITUTION.md), Book I, the
[Pricing Engine](./STANDARD-pricing-engine.md), and the
[Customer Identity standard](./STANDARD-account-identity.md).

**What it is:** a **Magical Preview Pass** — a trial that lets a new customer
explore before a paid **monthly** membership begins. It must be **transparent,
easy to understand, easy to cancel, and built to earn trust** — no deceptive
wording, hidden pricing, pre-checked consent, confusing cancellation, or
surprise charges. Not a "free forever" plan.

**Honesty guardrails (enforced in the domain layer):** exact price, exact
billing date, exact trial length, and the selected paid plan are always shown;
the consent box is **never pre-checked**; cancellation is online and never
harder than enrollment; a forgotten cancellation is disclosed up front. Card
data is never stored (Square tokens only). Prices are validated server-side.

---

## Built today (real & verifiable)

`src/lib/trial-membership.ts` + `trial-membership.test.ts` (**18 tests**, part
of the 151-test `npm test` suite):

- **Configurable length** (`DEFAULT_TRIAL_DAYS = 7`, stored in `SystemConfig` so
  admins change it without a deploy), `computeTrialDates` (billing date = trial
  end), `formatBillingDate` (deterministic), `daysRemaining` (dashboard
  countdown).
- **Exact disclosures** — `consentText` (interpolated, versioned
  `TRIAL_CONSENT_V1`), `billingSummary` ($0 today + plan/price/date/frequency/
  renewal), `ctaFinePrint`, `START_BUTTON_LABEL`.
- **Refund policy** — `TRIAL_CONVERSION_REFUND_POLICY` (versioned; flagged for
  legal review).
- **Access vs. limits** — `TRIAL_ACCESS` (15) / `TRIAL_LIMITS` (11).
- **Reminders** — `reminderSchedule` (signup · 3 days · 1 day before; delivery
  is a seam).
- **Status & billing logic** — `onTrialEnd` (active vs past_due),
  `paidFeatureAvailable`, `PAST_DUE_POLICY` (bounded retries, grace, preserve
  content), `cancellationPreview` (no charge during trial; keep paid period).
- **Consent record** — `buildConsentRecord` (immutable snapshot).
- **Abuse prevention** — `eligibleForTrial` (one introductory trial per
  customer across account/email/Square-customer/card-fingerprint; admin can
  override).
- **FAQ** — `TRIAL_FAQ` (12 Q&A).

`prisma/schema.prisma` — `TrialMembership` (dates, selected plan, monthly price,
status/billing status, **Square token references only**), `TrialConsent`
(immutable, versioned), `TrialBillingEvent` (append-only audit), `SystemConfig`
(admin-configurable trial length) + `MembershipStatus`, `TrialBillingStatus`
enums.

Public page **`/trial`** — warm, welcoming, logo watermark, all nine sections
(What You Can Explore · What Is Limited · What Happens When It Ends · Selected
Membership & Price · Billing Date · How to Cancel · Refund Policy · FAQ · Start),
with the exact billing summary and a preview of the consent text. Monthly amount
shows the pricing engine's preview figure, clearly flagged "preview pricing —
confirmed at checkout."

## Needs (foundation seams — never faked)

Auth/accounts, **Square** (secure card-on-file, customer creation, recurring/
subscription, payment confirmation, failed-payment handling, webhooks, receipts,
refunds — validate price server-side, idempotency keys, verify webhooks before
changing status), **email delivery** (the reminder + confirmation + receipt +
cancellation emails), and a **scheduler** (to fire reminders and conversion).
The interactive checkout (account → select plan → card → consent checkbox → begin)
and the customer **Membership & Billing** dashboard + admin trial reporting are
gated on those. **Automatic billing is NOT activated** until Square production
credentials, webhook verification, cancellation testing, legal review, and
email delivery are all complete.

---

## Checkout flow (target)

Create account → select paid membership → review trial access → add payment card
(Square) → review exact billing date & monthly charge → check the (un-pre-checked)
consent box → agree to Terms & Privacy → **Start My 7-Day Magical Preview Pass**
→ confirmation email. The paid-plan selection is never hidden below the fold; the
button is never a bare "Continue"; the `$0 due today…` line sits directly beneath.

## Reminders (delivery = seam)

Signup (confirmation + plan + end date + first charge + cancel link) · 3 days
before · 1 day before (each: exact amount, billing date, direct cancel link) ·
after conversion (receipt + next billing + cancel link) · on cancellation
(confirmation + access-end date + "no charge will occur if canceled before
conversion").

## Cancellation

Account → Membership & Billing → Cancel Trial / Cancel Membership. Before
confirming, show current plan, access-end date, whether another charge occurs,
what content is saved, and reactivation. Buttons: **Keep My Membership** /
**Cancel My Trial** (or **Cancel My Membership**). Immediate on-screen + email
confirmation. Never harder than enrollment.

## Failed payment (at conversion)

Don't publish · mark **Past Due** · notify + allow card update · retry per policy
(bounded — never charge without limits) · suspend paid features after the grace
period · preserve draft content (never delete immediately).

## Records & terms

Store the exact accepted **terms version**, refund-policy version, consent
timestamp, selected plan, trial length, first charge date/amount, recurring
amount, and billing frequency. Customers can view their accepted terms in-account.
**Staff may never alter consent records.**

## Abuse prevention

One introductory trial per customer (account · email · Square customer · card
fingerprint where available · device/IP risk where legally appropriate). Don't
auto-block legitimate household members without review; admins approve exceptions.

## Launch checklist (must all pass before live billing)

No pre-checked consent · exact price/date/length/plan shown · reminder emails
work · online cancellation + confirmation work · Square sandbox conversion works
· failed payment handled · duplicate charging prevented (idempotency) · trial +
refund language on both `/trial` and `/checkout` · **legal counsel reviews the
final policy language**.

**Guardrail:** never deceptive; never a surprise charge; never a pre-checked box;
never store raw card data; validate prices server-side; verify Square webhooks
before changing status; do not activate live automatic billing until the full
checklist and legal review are complete.
