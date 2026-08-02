# Master Design Bible — Platform Foundation (Accounts · Auth · Permissions · Notifications)

**Status:** Founder Approved · **the shared spine.** Subordinate to Book I, the
[Constitution](./CONSTITUTION.md), and the
[Customer Identity standard](./STANDARD-account-identity.md).

The reusable foundation that **activates** the eight completed ecosystems
(Family Connections, Family Command Center, Family Birthday & Celebration
Network, Vendor Marketplace/Membership, Life Guidance, Life After High School,
Family Financial Foundation, Guest Sharing / Access Pass) — **one** account,
role, permission, and notification model shared by all of them. It does **not**
rebuild any domain library; it unifies and connects them.

---

## Built today (real & verifiable)

Four service libraries + `platform-foundation.test.ts` (**17 tests**, part of
the 250-test `npm test` suite):

### 1. Roles & permissions — `src/lib/roles.ts`
One canonical `PlatformRole` set (family_owner, parent, guardian, spouse,
partner, teen, child, invited_member, guest, vendor, admin) with adult/minor/
manager/staff flags. It **delegates** to the existing permission sets
(`family-command` family permissions, `family-connections` guest permissions) —
no duplication. `requiresGuardian`, `canManagePermissionsFor`, `childSafeguards`.

### 2. Auth & sessions — `src/lib/auth.ts`
Real crypto: scrypt `hashPassword`/`verifyPassword` (salted, timing-safe), opaque
session tokens stored **hashed** (`newSessionToken`/`hashSessionToken`,
`sessionValid`), social sign-in subject mapping. `signupDecision` **reuses**
account-identity: required fields → **recover-before-duplicate** → minors need a
guardian; success still gates purchasing on email + phone verification. Built on
the existing `Account` (passwordHash / googleSub / appleSub).

### 3. Notifications — `src/lib/notifications.ts`
One delivery service for **every** ecosystem alert: celebration / task /
appointment reminders, education & scholarship deadlines, vendor compliance,
trial & billing, domain renewal, messages, invitations, achievements, RSVPs.
Channels: **in-app (always), email, SMS (optional), push (future)** via a
**provider-agnostic dispatcher** (`registerNotificationProvider`,
`channelAvailable`). `resolveChannels` honors type defaults, availability,
per-recipient prefs, and **child safeguards (minors stay in-app)**; `planDispatch`
always stores in-app and queues external channels until a provider exists.

### 4. Secure invitations — `src/lib/invitations.ts`
Cryptographically random, **hashed-token** invitations for family members
(minors via a guardian), guests, vendors, and collaborators. `buildInvitation`
(masked target, normalized for matching), `acceptInvitation` (revoked / expired /
already-accepted / guardian-required), `targetMatches`.

### Schema (`prisma/schema.prisma`)
`Account` gains `platformRole` + `guardianAccountId`; new `Session`,
`Notification` (in-app source of truth + delivery record), `NotificationPreference`
(per-account, per-type channels), and `Invitation`.

## How roles & permissions work
Every surface asks one role model. A role maps to default permissions drawn from
the **already-built** domain sets, so a "child" here is the same "child" the
Family Command Center enforces. Family managers (owner/parent/guardian) configure
others — especially minors. Staff/admin and vendor are first-class roles.

## Parent & child access
Minor accounts (`requiresGuardian`) must link to a parent/guardian at sign-up
and at invitation acceptance; parents control their permissions
(`canManagePermissionsFor`); minors' notifications resolve to **in-app only**;
child accounts start restricted by default (`childSafeguards`).

## Notification delivery
In-app is the source of truth and always stored; email/SMS/push deliver only
through a registered provider (Resend/SMS/push are seams) — otherwise the
notification is **queued**, never lost. Preferences are per-account, per-type,
per-channel, with sensible type defaults.

## Which ecosystems connect now
- **Celebration Network** → `celebration_reminder`
- **Family Command Center** → `task_reminder`, `appointment_reminder`, `message`, `achievement` + family permissions/roles
- **Life Guidance / Life After HS** → `education_deadline`, `scholarship_deadline`
- **Vendor Marketplace/Membership** → `vendor_compliance` + vendor role
- **Trial / Commerce / Domains** → `trial_billing`, `domain_renewal`
- **Family Connections / Guest Sharing** → `invitation`, `rsvp` + guest role + secure invitations
All share the one `Account`, `Session`, role model, and notification service.

## Needs (seams — never faked)
Login / sign-up / social-OAuth **UI + cookie/middleware wiring**, email/SMS/push
**providers** (Resend + an SMS/push service), and a scheduler to fire time-based
reminders. The mechanics (hashing, sessions, decisions, dispatch planning) are
real and tested; no one is logged in and no message is delivered without a real
credential/provider.

**Guardrail:** one account per person; recover-before-duplicate; minors always
guarded; passwords hashed, session/invite tokens hashed; notifications never
fabricated or lost (in-app fallback); providers register — nothing hardcoded.
