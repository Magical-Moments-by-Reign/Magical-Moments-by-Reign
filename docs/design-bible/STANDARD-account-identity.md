# Master Design Bible — Customer Identity, Duplicate Prevention & Balance Controls

**Status:** Founder Approved. The customer-account foundation. Subordinate to
the [Constitution](./CONSTITUTION.md), Book I, and the
[Brand, Account & Commerce standard](./STANDARD-brand-and-account.md).

**The rule:** **ONE PERSON = ONE MAGICAL MOMENTS ACCOUNT.** The platform must
make creating a *duplicate* account harder than recovering the *correct* one —
so a customer can't open a second account to escape a balance, payment plan,
restriction, chargeback, or unresolved issue. Email alone is never enough
(people use another email), so matching is multi-signal.

**Not a bank/lender.** Duplicate-account controls are **separate from credit
approval**. Magical Moments may restrict *internal* purchasing based on
unresolved *platform* balances only. Any financing approval, identity/credit
decision, lending disclosure, or adverse-action process is handled by the
approved financing provider (see [Magical+](./STANDARD-magical-plus.md)). **No
internal lending or credit-scoring logic is built at this stage.**

---

## Built today (real & verifiable)

`src/lib/account-identity.ts` — the **pure domain layer**, fully unit-tested
(24 checks) with no external dependency:

- **Required-field + verification gates** — `missingRequiredFields()`,
  `purchasingEnabled()` (purchasing stays off until email **and** phone are
  verified).
- **Normalization** — `normalizeEmail`, `canonicalEmail` (Gmail dot/+tag
  collapse, matching only), `normalizePhone`, `normalizeName`, `addressKey`
  (with street-abbreviation folding).
- **Masking** — `maskEmail` (`t••••@e••••.com`), `maskPhone` (`•••-•••-4821`).
- **Duplicate detection** — `matchSignals`, `scoreMatch`, `findProbableMatches`
  with weighted signals and two thresholds (`REVIEW_THRESHOLD`,
  `STRONG_THRESHOLD`). **A shared residential address alone scores 0** — it
  never flags a match.
- **Balance-aware purchase gating** — `AccountStatus`, `ACCOUNT_STATUSES`,
  `canPerform(status, action, config)`, `allowedActions`, `isUnresolved`.
- **Merge planning** — `planMerge()` returns an auditable plan that preserves
  balances/disputes/history and prevents duplicate reuse.
- **Customer-facing copy** — `MESSAGES`, `PREFERRED_FLOW` (respectful,
  never accusatory).

`prisma/schema.prisma` — the **data foundation**: `AccountIdentity` (normalized
identifiers + verification flags + status + balance), `AccountStatusHistory`
(append-only who/when/why), `DuplicateReview` (flagged pairs for admin), and
`AccountMergeAudit` (append-only merge log).

## Needs (foundation seams — never faked)

- **Accounts / auth** — real sessions, password/social sign-in, the signup UI.
- **Email + SMS verification** — one-time link / code delivery (Resend + an SMS
  provider). Until then verification flags default false and purchasing is off.
- **Billing (Square)** — Square customer identifiers, the payment portal,
  payment-method update, balance state.
- **Storage + encryption at rest** — for residential/identity data.
- **Risk signals** — device/velocity indicators, rate limiting, repeated
  signup detection (the `riskFlags` seam on `DuplicateReview`).
- **Admin Duplicate Review UI** — renders `DuplicateReview` records; actions
  write `AccountStatusHistory` / `AccountMergeAudit`.

Nothing above is simulated: an unverified account cannot purchase; with no risk
provider, `riskFlags` is empty; matching runs purely on the data supplied.

---

## Required account information

Legal first name · legal last name · email · mobile phone · full residential
address (street, apt/unit, city, state, ZIP, country) · date of birth *only*
when payment-plan eligibility or identity verification requires it · password
or approved secure social sign-in · agreement to Terms & Privacy. **Verify**
email (link/code) and phone (SMS code) before purchasing/payment-plan
privileges activate.

## Account matching & duplicate detection

Before creating a new account, compare normalized versions of: verified email,
verified phone, legal name, residential address, previous emails/phones,
billing addresses, Square customer id, order history, gift-recipient records,
payment-plan records, and chargeback/dispute records. Use **exact matches +
carefully weighted probable matches**. **Never auto-reject on a shared
residential address alone** — multiple legitimate people live at one address.

| Signal | Weight | Notes |
| --- | --- | --- |
| Verified email matches | 1.0 | decisive |
| Verified phone matches | 1.0 | decisive |
| Square customer id matches | 1.0 | decisive |
| A previous email/phone matches | 0.9 | catches contact-swap dodgers |
| Legal name + date of birth | 0.8 | strong |
| Name + shared phone / email | 0.6 | probable |
| Legal name + residential address | 0.5 | probable → review |
| **Residential address alone** | **0.0** | **never a match by itself** |

`≥ 0.5` surfaces the *possible existing account* flow; `≥ 1.0` is treated as
very likely the same person.

## Possible-existing-account flow

On a probable match, **don't create a second account.** Show *"It looks like
you may already have a Magical Moments account. Let's help you regain access."*
and offer: login link to verified email · code to verified phone ·
forgot-password · update old email/phone after identity verification · contact
support. **Never reveal** the full existing email/phone/balance/purchases before
identity is verified — use masked values (`t••••@email.com`, `•••-•••-4821`).

## Unresolved-balance rules

A customer with an unresolved balance keeps their memories and a clear path to
resolve. **Always allowed:** log in · view the Magical Moments Library · view
purchases · view Magical Tracker · payment portal · make a payment · contact
support · update contact info (after verification). **Restricted until
resolved:** new financed purchases · Magical+ Pay Later applications · new
installment plans · transfers of unpaid purchases · creating another account
via alternate info · using gift credits to conceal/bypass an unpaid obligation.
Whether ordinary **paid-in-full** purchases stay available is an
admin-configurable business rule (`allowPaidInFullWhilePastDue`).

**We never delete photos, videos, invitations, or memories over a payment
issue. We never make the account disappear.** A past-due customer can still log
in and resolve.

**Statuses:** ACTIVE · PAYMENT_DUE · PAST_DUE · PAYMENT_PLAN_ACTIVE ·
PAYMENT_METHOD_FAILED · UNDER_REVIEW · CHARGEBACK_REVIEW · PURCHASE_RESTRICTED ·
FINANCING_RESTRICTED · CLOSED.

## Family & household accounts

Don't force a family into one identity: one verified account per adult; child
profiles under a parent/guardian; shared Experiences via Journey Circle
permissions; separate credentials per invited adult; household linking
**without merging personal balances**. A relative sharing an address never
inherits another person's debt.

## Account merging (support-approved only)

Require identity verification; pick one primary; merge purchases, gifts,
Experiences, Library content, and tracker history; **preserve a complete audit
log**; never merge unrelated people; never erase balances/disputes/history;
prevent the closed duplicate from being reused; redirect future logins to the
primary. Only authorized support staff may approve a manual merge.

## Admin Duplicate Account Review

A secure area showing potential matches, match reasons, verified identifiers,
order/payment/balance status, restrictions, device/risk indicators, previous
merges, and audit history. Actions: confirm same customer · confirm different
people · send recovery message · merge · restrict / remove restriction · add
notes · escalate to payment/fraud review. **Every action is logged** with admin
identity, timestamp, reason, previous status, and new status.

## Security & privacy

Encrypt sensitive PII; never expose account-matching data to another customer;
never store card numbers (Square tokens only); rate-limit signup/verification;
detect repeated creation attempts; require stronger verification for suspicious
activity; keep an auditable history; **provide a correction process for anyone
incorrectly matched**; never treat a shared address as proof of identity; do
not use SSNs unless a regulated financing partner specifically requires it
through its own secure process.

## Customer-facing tone

Respectful, never accusatory. Not *"You are blocked because you owe money."*
Instead: *"We found an existing Magical Moments account connected to your
information. Please sign in or verify your identity so we can reconnect you with
your purchases and account details."* For a balance: *"Your account needs
attention before additional payment plans can be opened. You can review your
balance, update your payment method, or contact support below."*

## The preferred flow

Recognize customer → recover existing account → reconnect all purchases →
display unresolved balance → provide a clear resolution path → restore eligible
purchasing access.

**Guardrail:** never a bank/lender; no internal lending or credit-scoring; never
fabricate balances, matches, verifications, or restrictions; a shared address is
never proof of identity; memories are never deleted over a payment issue; all
money movement runs server-side through approved processors.
