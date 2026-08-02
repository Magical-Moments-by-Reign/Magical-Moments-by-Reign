# Bug & Improvement Log

Running log from Stage 1 staging validation. Severity: 🔴 High · 🟠 Medium ·
🟡 Low · 🔵 Improvement.

---

## MMR-001 — Deploy fails: unique constraint on `Account.legacyUserId` 🔴
- **Status:** ✅ FIXED (commit `49ab40b`).
- **Description:** The Netlify build's `prisma db push` failed with a data-loss
  guard: adding a `@unique` constraint to the already-populated `Account` table.
- **Steps to reproduce:** With existing `Account` rows, `prisma db push` a schema
  where `Account.legacyUserId` is `@unique` → "Use the --accept-data-loss flag…"
  → non-zero exit → deploy fails.
- **Suggested solution / fix applied:** Dropped the DB-level `@unique` on the
  nullable transition column and replaced it with `@@index([legacyUserId])`. The
  one-Account-per-User invariant is enforced in application logic (verified-email
  match + `linkAndBackfill … where legacyUserId: null`) and by the global
  uniqueness of `User.email`. Verified by reproducing the exact scenario on a
  populated table: the new schema now applies "in sync" with no data-loss error.

## MMR-002 — Notification "queue for later" never populates 🟠
- **Status:** OPEN.
- **Description:** `resolveChannels` drops any channel without an available
  provider *before* `planDispatch` runs, so `Notification.channelsQueued` is
  always empty. The in-app record is still stored (nothing disappears from the
  user's inbox), but an opted-in email is **not** retried once Resend is added —
  contradicting the "queued until a provider exists, never lost" design note.
- **Steps to reproduce:** With no `RESEND_API_KEY`, `dispatchNotification` for a
  type whose defaults include `email` → the stored row has `channelsPlanned=[]`
  and `channelsQueued=[]`; the email is neither sent nor queued.
- **Severity rationale:** Medium — no inbox data loss (in-app is source of
  truth), but the delivery promise and the field are misleading.
- **Suggested solution:** In `resolveChannels`, keep opted-in channels even when
  unavailable and let `planDispatch` place them in `queued`; add a small
  delivery-retry worker that drains `channelsQueued` once a provider registers.
  Alternatively, update the docs/field to reflect in-app-only fallback and remove
  the dead `channelsQueued` field.

## MMR-003 — Dashboard bridge may create a User with a placeholder email 🟡
- **Status:** OBSERVATION (currently unreachable).
- **Description:** `getDashboardIdentity` creates a legacy `User` with a
  synthetic `account+<id>@accounts.magicalmomentsbyreign.com` address when the
  Account has no verified primary email. In practice login requires a verified
  email, so an unverified account can't obtain a session to reach `/dashboard`,
  making this path unreachable today.
- **Suggested solution:** Keep as-is but add a guard/assert that the bridge only
  runs for verified accounts; revisit if social-OAuth (unverified-email) sign-in
  lands.

## MMR-004 — (Harness) staging reset didn't clear `Family` 🟡
- **Status:** ✅ FIXED (harness only, not product).
- **Description:** `scripts/staging-validate.ts` `reset()` didn't delete `Family`
  rows, so families accumulated across repeated runs (cosmetic in the seeded-row
  report). Added best-effort family/experience/calendar cleanup.

---

## Improvements backlog 🔵
- **IMP-01:** Real external-delivery retry queue (see MMR-002).
- **IMP-02:** DB-backed integration tests in CI via ephemeral Postgres (reuse
  `scripts/staging-validate.ts`).
- **IMP-03:** Scheduled purge for `RateLimitHit` / expired tokens instead of
  per-request `deleteMany`.
- **IMP-04:** Targeted duplicate-candidate query in `registerAccount` instead of
  full-table `loadSnapshots()` at scale.
- **IMP-05:** Browser E2E (Playwright) for cookie session read + middleware
  redirects (not covered by the backend harness).
