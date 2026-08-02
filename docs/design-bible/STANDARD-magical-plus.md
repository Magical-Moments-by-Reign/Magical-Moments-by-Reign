# Master Design Bible — Magical+ Ecosystem

**Status:** Founder Approved. The financial & membership layer for Magical
Moments. Subordinate to the [Constitution](./CONSTITUTION.md), Book I, and the
[Brand, Account & Commerce standard](./STANDARD-brand-and-account.md).

**Not a bank or lender.** There is **no lending logic** — today or in this
codebase. Magical+ is a **scalable architecture** for memberships, wallets,
credits, gifting, payments, and *future* financing integrations.

**Built today (architecture, real & functional):** `src/lib/magical-plus.ts` —
the pure domain layer (Magical Wallet balance/ledger, Magical Credits by kind,
gift-contribution pools with auto-unlock math, payment-method catalog, Magical+
perks, Magical Tracker stages) **and the provider-agnostic Magical+ Financing
Gateway** (register/aggregate approved providers; returns "unavailable" when none
are configured — it never invents an offer, and no provider is hardcoded).

**Needs (foundation):** accounts/auth + billing (Square) + storage for real
persistence, credit earning, charging, and live wallets. Until then nothing is
faked — an empty ledger is $0, and financing shows only when a real provider is
registered.

---

## Magical Wallet
One wallet per customer, storing Gift · Promotional · Reward · Purchase credits,
a running balance, and transaction history. `computeWallet(ledger)` derives the
balance and per-kind totals from the ledger (balance never goes below zero);
`applyableCredit(wallet, price)` caps how much credit a purchase can use.

## Magical Credits
Earned through purchases, referrals, promotions, special events, and gift
contributions; redeemable toward Experiences and approved upgrades. *(Earning
rules run once accounts + billing exist.)*

## Gift contributions (group funding)
Multiple people contribute toward an Experience (e.g. Grandmother $100 + Dad $150
+ Friend $50). `poolProgress(pool)` returns raised / target / remaining / % and
**auto-unlocks** when the target is reached.

## Payments
Accepted methods: credit/debit cards · Apple Pay · Google Pay · Gift Credits ·
Wallet Credits. Processing runs through **Square** server-side (existing seam) —
validated totals, idempotency, confirm-before-complete.

## Magical+ Financing Gateway (provider-agnostic)
A neutral abstraction so financing providers connect later **without redesign**
and **without hardcoding any provider**:
- `FinancingProvider` interface (`id`, `name`, `isAvailable()`, `quote(amount)`).
- `registerFinancingProvider()` to plug approved third parties in at setup.
- `financingOptions(amount)` aggregates available providers — returns
  `{ available:false, options:[] }` when none exist. **Magical Moments never
  lends;** the gateway only routes to approved providers when present.
- **Phase 1:** approved third-party providers (e.g. Affirm/Klarna) register here.
- **Phase 2 — Magical Pay™:** could register as its own provider *only* after the
  required legal/financial/regulatory approvals. No lending logic is implemented
  until then.

## Magical+ membership
Members receive special pricing, reward credits, exclusive templates, priority
support, and future financing eligibility. *(Perks apply once membership +
billing exist.)*

## Magical Tracker
Canonical stages live here too: Purchase Complete · Payment Confirmed ·
Experience Created · Planning Started · Invitations · RSVP · Gallery · Completion
Status. *(Live status needs account/order state.)*

## Future-ready
The architecture lets Magical+ evolve into its own financing ecosystem **if** the
business pursues the required legal and regulatory approvals — by registering a
first-party provider into the same gateway. **Today: flexible, functional
architecture; no lending.**

**Guardrail:** never a bank/lender; no lending logic; no hardcoded financing
provider; never fabricate balances, credits, charges, or financing offers; all
money movement runs server-side through approved processors.
