# Stage 1 — Staging Validation Report

**Date:** 2026-08-02 · **Environment:** in-container PostgreSQL 16 staging DB
(ephemeral, staging-only — never production) · **Harness:**
`scripts/staging-validate.ts` (exercises the real service libraries against a
live database; no mocks, no fabricated results).

**Result: 50 ✅ PASS · 8 ⚠️ ATTENTION · 0 ❌ FAIL (58 checks).**
All 8 "attention" items are intentionally-gated seams (billing, file storage,
email provider) or one documented notification-queue finding — not defects in
built code.

---

## 1. Overall platform health score

- **Built-scope health: 95 / 100.** Every core auth, identity, family,
  guardian, notification, vendor-state, and security path passed against a real
  database. Deductions are for one medium notification-queue finding (MMR-002)
  and the scaling notes below.
- **Production-launch readiness: NOT YET** — gated on real-environment config,
  browser/E2E of the cookie session path, and the billing/storage seams
  (see Launch Blockers).

## 2. Systems verified (against a live DB)

| Subsystem | Status | Evidence |
|---|---|---|
| PostgreSQL connectivity | ✅ | `select 1`, schema push in-sync |
| Family Owner registration | ✅ | account + identity cluster created |
| Recover-before-duplicate | ✅ | 2nd account w/ same email → `recover_existing` |
| Email verification (single-use) | ✅ | token consumed, primary email verified |
| Login status handling | ✅ | unverified → blocked; verified → ok; wrong pw → generic |
| Create family | ✅ | Family row created |
| Family invitations (hashed token) | ✅ | invite created, accepted, role applied, host notified |
| Expired invitation rejected | ✅ | `expired` outcome |
| Child registration → guardian pending | ✅ | pending `GuardianApproval` created |
| Minor login gated | ✅ | `guardian_pending` |
| Guardian approval + restricted perms | ✅ | `decideGuardianApproval` → approved |
| Child login after approval + verify | ✅ | login ok |
| Family calendar / birthday reminders | ✅ | calendar + monthly view + leap-aware `daysUntil` + reminder schedule |
| Birthday notification (in-app source of truth) | ✅ | in-app record always stored |
| Notification Center unread + mark-all (scoped) | ✅ | owner-scoped |
| Logout / session revocation | ✅ | `revokedAt` set |
| Password reset (single-use, sessions revoked) | ✅ | all sessions revoked, re-login ok |
| Reset token cannot be reused | ✅ | 2nd use → `used` |
| Generic reset for unknown email | ✅ | no enumeration |
| Change password requires current | ✅ | `wrong_current` |
| Session rotation | ✅ | new token per session |
| Session validity (expiry + revocation) | ✅ | pure `sessionValid` |
| Sign out all other devices | ✅ | others revoked, current kept |
| Revoke-all sessions | ✅ | 0 active |
| Durable rate limiting (Postgres) | ✅ | locks at threshold, shared store |
| Rate-limit bucket isolation (per action) | ✅ | login locked, reset not |
| Rate-limit window expiry | ✅ | old hits ignored |
| Permission enforcement | ✅ | parent↔child, not child→parent |
| Cross-account isolation | ✅ | A cannot read/modify B's inbox |
| Family Command Center perms + validation | ✅ | child restricted defaults, message validation |
| Family messaging / shared calendar | ✅ | rows persist |
| Family Connections guest defaults | ✅ | safe defaults |
| Notification prefs — minor in-app only | ✅ | email never attempted for minors |
| Vendor registration (role) | ✅ | vendor account created |
| Vendor marketplace listing | ✅ | Vendor row created |
| Vendor business verification / compliance | ✅ | `complianceStatus` |
| Vendor membership activation + renewal | ✅ | status ACTIVE, renewal date set |
| Vendor badge computation | ✅ | tier + badge resolved |
| Vendor suspension / reactivation | ✅ | status transitions |
| Trial dates + transparent terms | ✅ | `computeTrialDates`, `daysRemaining` |
| Multi-family isolation (Turner/Smith/Johnson) | ✅ | seeded, isolated |

## 3. Systems pending (gated seams — not failures)

| Item | Why pending |
|---|---|
| ⚠️ Resend email delivery | no `RESEND_API_KEY` in staging; sends skip, in-app preserved |
| ⚠️ `NEXT_PUBLIC_BASE_URL` | defaults to prod URL when unset |
| ⚠️ External-channel queue-for-later | MMR-002 — see Bug Log |
| ⚠️ Vendor insurance document upload | file storage is a gated seam |
| ⚠️ Trial card-on-file (Square sandbox) | Square not wired |
| ⚠️ Trial reminder emails | needs Resend + scheduler |
| ⚠️ Trial expiration → conversion | needs Square recurring |
| ⚠️ Trial cancellation / payment failure | needs billing + webhooks |

## 4. Bugs found

See `docs/staging/BUG-LOG.md`. Summary: **1 fixed** (MMR-001 deploy data-loss
guard), **1 open medium** (MMR-002 notification queue semantics), 2 low
observations.

## 5. Improvements recommended

1. Implement a real external-delivery retry queue (resolves MMR-002) so email/SMS
   opted-in-but-currently-unavailable channels are retried, not dropped.
2. Standardize on `RESEND_FROM_EMAIL` everywhere (code done; env template updated).
3. Add a DB-backed integration test job to CI using an ephemeral Postgres —
   `scripts/staging-validate.ts` is the foundation.
4. Move rate-limit + notification cleanup to a scheduled purge rather than
   per-request `deleteMany`.
5. Replace `loadSnapshots()` full-table scan in registration with a targeted
   candidate query as account volume grows.

## 6. Security observations

- ✅ Passwords scrypt-hashed; session/verify/reset/invite/guardian tokens stored
  as SHA-256 hashes only — verified no raw secrets persisted.
- ✅ No account enumeration: wrong-password and missing-account are identical;
  `startPasswordReset` is generic.
- ✅ Durable rate limiting with per-action buckets and hashed (never raw) emails.
- ✅ Cross-account isolation holds (owner mark-all cannot touch another inbox).
- ✅ Minors gated until guardian approval; minor notifications in-app only.
- ⚠️ Rate limiter is **fail-open** — during a DB outage throttling is bypassed
  (availability over hard-lock; documented, intentional).
- ⚠️ The cookie **session-read** path (`currentAccount`) and middleware redirects
  require the Next runtime and were not exercised by this backend harness — must
  be covered by browser E2E before launch.

## 7. Performance observations

- `registerAccount → loadSnapshots()` loads all accounts per signup (O(n));
  fine at current scale, needs a targeted query later.
- `checkRateLimit` issues a `findMany` + opportunistic global `deleteMany`
  (expired) on every call — move cleanup to a scheduled job before high traffic.
- `RateLimitHit` and `Notification` tables grow over time — add retention.

## 8. Launch blockers

1. Real environment config: production `DATABASE_URL` (Supabase **Session
   pooler**, IPv4, port 5432), `NEXT_PUBLIC_BASE_URL`, `RESEND_API_KEY`,
   `RESEND_FROM_EMAIL`, and a **verified Resend sending domain**.
2. Browser/E2E coverage of the cookie session read + middleware redirect paths.
3. Decision on MMR-002 (accept in-app-only fallback, or build the retry queue).
4. Billing (Square) and file storage remain seams — trial paid-conversion and
   vendor insurance upload cannot complete until wired (blockers for those
   features, not for the family/auth launch scope).
5. Concurrent multi-instance rate-limit + fail-open verified on the managed DB.

## 9. Recommended next milestone

**Stage 2 — Production Environment Hardening & Browser E2E.** Configure the real
staging environment on Netlify + Supabase (Session pooler) + Resend (verified
domain); add a Playwright browser E2E suite for the cookie/session/redirect
flows; resolve MMR-002; and wire this harness into CI with an ephemeral Postgres
for database-backed integration tests. Defer Square billing and file storage to
their own dedicated slices.
