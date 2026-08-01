# Custom Domains + Legacy Protection

Diamond and Lifetime customers can layer one **custom domain** on top of
their experience's **permanent platform address**. This document covers
the architecture, what's built, and what each production credential
turns on.

## The core rule (Legacy Protection)

Every experience ALWAYS has a permanent address:

```
smithfamily.magicalmomentsbyreign.com
```

A custom domain (`smithfamily.com`) is optional and layered on top. The
platform address is **never removed** because a custom-domain payment
fails or a domain expires — the experience automatically falls back to
it. This is the **Legacy Protection** feature.

- `src/lib/domains.ts` — statuses, `fallbackAddressFor()`,
  `activeAddressFor()`, `isFallbackActive()`, lifecycle transitions
  (`markRegistered` / `markPaymentFailed` → fallback / `markRestored`),
  and an append-only audit log (`DomainEvent`).

## What's built now

- **Data model** — `Domain` + `DomainEvent` (Prisma). Captures registrar,
  registration/expiration, renewal price, DNS/SSL status, Square
  card-on-file references (token only), retry/notice counters, fallback
  timestamps, and the full 13-state status lifecycle.
- **Customer dashboard** — `/dashboard/[slug]/domain`: permanent address,
  custom-domain status + all fields, Legacy Protection banner when the
  fallback is serving, and Retry / Update payment / auto-renew / view
  fallback actions.
- **Admin** — `/admin/domains`: filterable table (Active, Renewal Due,
  Payment Failed, Grace Period, Expired, Using Fallback, Restored,
  Manual Review) with registrar/DNS/SSL/retry columns.
- **Emails** (`src/lib/email.ts`) — renewal reminder, payment failed,
  fallback ("your memories are safe"), and restored.
- **Customer language** — `DOMAIN_LANGUAGE` / `DOMAIN_LANGUAGE_LIFETIME`
  shown on the domain dashboard (and reusable on pricing/checkout/Terms).
- **Registrar seam** — `src/lib/registrar.ts` (`checkAvailability`,
  `registerDomain`, `renewDomain`) — pluggable, gated, and graceful when
  unconfigured (never fakes a purchase).

## What each credential turns on

| Env | Enables |
| --- | --- |
| `REGISTRAR_PROVIDER` + `REGISTRAR_API_KEY` (+ user/base) | Real-time availability, registration, and renewal via the registrar |
| Square keys (existing) + card-on-file | Charging the saved card for renewals |

Wire the registrar's endpoints inside the three `TODO(production)` stubs
in `registrar.ts`. Pricing must always come from the registrar and be
validated server-side — never trust the browser.

## The automation still to wire (needs a scheduler)

Netlify functions are request-scoped, so the recurring pieces run from a
**scheduled job** (Netlify Scheduled Functions, a cron worker, or a
queue) that calls the renewal logic:

1. **Reminders** — 60 / 30 / 14 / 7 / 0 days before expiration →
   `domainRenewalReminderEmail`.
2. **Auto-renew on expiration day** — charge Square card-on-file
   (idempotency key) → `renewDomain()` → `markRestored()`; on failure →
   `markPaymentFailed()` (fallback + `domainPaymentFailedEmail` +
   `domainFallbackEmail`).
3. **Retry schedule** — renewal day, +3 days, +7 days, final notice.
4. **Restoration** — when the customer updates their card and the charge
   succeeds → `renewDomain()` + `markRestored()` + `domainRestoredEmail`.
   The restored domain points at the **same** experience (never a new one).

All steps write `DomainEvent` audit rows and use idempotency keys to
prevent duplicate charges/renewals.

## Security

Raw card data is never stored (Square card-on-file tokens only).
Registrar and Square secrets live in server-only env vars. Webhooks
(Square + registrar) must be signature-verified. Renewal totals are
computed server-side. Admin domain actions are gated behind
`ADMIN_PASSWORD`.
