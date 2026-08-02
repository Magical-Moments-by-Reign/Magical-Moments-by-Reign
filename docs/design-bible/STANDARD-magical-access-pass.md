# Master Design Bible — Magical Access Pass™ (Recipient-Bound Sharing)

**Status:** Founder Approved. Subordinate to the [Constitution](./CONSTITUTION.md),
Book I, and the [Guest Sharing standard](./STANDARD-guest-sharing.md) (this is the
private, recipient-bound tier of that system).

**Core rule: Easy for the invited person. Useless to anyone else. Fully
controlled by the owner.** A Magical Access Pass binds **one Experience · one
owner · one recipient · one verified email/phone · one permission set · one
expiration policy.** A guest gets in only by entering a one-time code sent to
the owner-specified contact — **so forwarding the URL alone grants nothing.**

**The honest promise (never overstated):** Magical Moments can restrict access,
downloads, forwarding, and duration — but **cannot** prevent an authorized
viewer from taking screenshots, screen recordings, or photos with another
device. We say this plainly to owners and recipients and never claim otherwise.

---

## Built today (real & verifiable)

`src/lib/magical-access-pass.ts` + `magical-access-pass.test.ts` (**20 tests**,
part of the 82-test `npm test` suite):

- **Recipient binding** — `normalizedDestination` (binding/lookup),
  `maskedDestination` (display only, never the full contact).
- **Secure tokens & codes** — `generatePassToken` (opaque, high-entropy),
  `hashToken`/`tokenMatches` (hashed storage, timing-safe compare),
  `generateVerificationCode` (uniform 6-digit), `hashCode` (per-pass salt). The
  URL carries **only** the opaque token — no ids/emails/phones/permissions.
- **Access rules** — `computeExpiry` (until-closed / one-time / 1·3·7·30 days /
  custom date / until-event), `viewLimitReached` (unlimited / one-view /
  max-views / max-sessions), `resolveStatus` (revoked > closed > paused > used >
  expired > active — revocation honored on every request), `canOpenContent`.
- **One-view** — the verification screen never counts; the view starts only when
  content opens; `ONE_VIEW_GRACE_MS` absorbs accidental refreshes; then the pass
  is marked used with a clear already-viewed message.
- **Verification** — `verifyCode` (no-code / expired / locked / incorrect),
  rate-limited (`MAX_VERIFICATION_ATTEMPTS`, `CODE_TTL_MS`).
- **Device controls** — `deviceAllowsReturn` (Quick Access vs Verify Every
  Time); device recognition is **never the only control** — a mismatch simply
  requires verifying again.
- **Privacy Score™** — `privacyScore` → 🟢 Maximum / 🟡 Standard / 🔴 Public
  (public warns before allowing).
- **Versioned acknowledgment** — `SHARING_NOTICE`, `SHARING_NOTICE_VERSION`,
  `needsFullNotice` (re-prompts when missing / not "don't show again" / version
  bumped), short reminder, guest notice, recipient agreement.
- **Fail-closed** — `failedAccessPayload` reveals nothing but the notice;
  `watermarkLabel` (name + masked destination; **originals never altered**);
  `PASS_AUDIT_EVENTS`; premium creation/recipient copy.

`prisma/schema.prisma` — `MagicalAccessPass` (hashed token, recipient binding,
permissions, duration/view/device policies, owner state, privacy/download
controls, activity), `AccessPassVerification`, `AccessPassSession` (short-lived,
hashed session token), `AccessPassAudit` (append-only), `RecipientAgreement`, and
`SharingAcknowledgment` (owner, versioned, non-erasable). `Rsvp` links to a pass.

## Needs (foundation seams — never faked)

Auth (owner identity, optional recipient account-conversion), **email/SMS
delivery** of the one-time code, storage for guest uploads and watermark
rendering, and the owner "Magical Access" dashboard + recipient verification UI.
Nothing is simulated — with no delivery provider a code cannot be sent, so no
pass can be verified; nothing grants access without a real code.

---

## Owner sharing flow

Choose content (gallery / album / photos / videos / guestbook / event info /
registry / invitation / approved timeline / any combination) → enter the
recipient's name + email **or** phone → set access rules → **accept the Sharing
Notice** → send the Magical Access Pass. A permanent **Privacy Score** and the
owner reminder ("Your Magical Moments are private by default…") sit near Share.

## Recipient experience (a few steps, premium)

Open private link → see the masked destination it was sent to → receive a
one-time code → enter the code → view the approved Magical Moment. No account
required; optional account creation is offered *after* viewing, never before.
Optional recipient privacy agreement when the owner enables it.

## Owner access options

- **Duration:** open until closed · one-time · 1 / 3 / 7 / 30 days · custom date
  · until the event ends.
- **View limits:** unlimited during the period · one view · max views · max
  sessions · one verified device · verify every visit · remember device for a
  limited period.
- **Content permissions (each independent):** view only · view + sign guestbook
  · view + upload photos/videos · view + download · view without download ·
  RSVP · open registry · private message · receive updates.
- **Open/close:** open · pause · close · reopen · extend / reduce expiration ·
  add/remove permissions · reset view count · revoke immediately · issue a
  replacement. Changes take effect immediately; if access closes mid-view it
  ends gracefully.

## Magical Access dashboard

Per pass: recipient name, masked email/phone, content shared, access &
verification status, date sent, first/last opened, views, uploads, guestbook
activity, expiration, device status, and Active / Paused / Closed / Expired /
Used — with edit / resend / revoke / reset. Sensitive info is never over-exposed.

## Download, watermark & anti-forwarding controls

Disable download buttons / direct file links / public indexing / social
previews / in-view copy-link; add visible or light repeated **recipient
watermarks** (name or masked email) applied at view/download time (originals
untouched); log downloads where permitted. Always show the screenshot
disclaimer.

## Secure-link requirements (server-enforced)

Cryptographically random tokens · hashed token storage · signed, expiring access
records · server-side permission checks · rate-limited verification · one-time
codes · short-lived guest sessions · revocation checks on every protected
request · audit logs · protection against token guessing, URL manipulation, and
direct file access. **No private identifiers in readable URL params. Never rely
on hidden buttons — enforce every permission on the server.**

## Failed / unauthorized access

Reveal nothing — no gallery title, owner name, recipient info, event details,
thumbnails, media, or guestbook. Show only: *"This Magical Access Pass is
private. Verification is required to continue."*

## Required Sharing Acknowledgment (versioned)

Before sharing, the owner accepts the **Private Sharing Notice** (required
checkbox + optional "don't show again"). "Don't show again" saves the accepted
**version + timestamp + account** and thereafter shows only a short reminder
near Share (with a "Review Sharing Notice" link). A material wording change
bumps the version and re-prompts. **Account Settings → Privacy & Sharing →
Sharing Notices** shows status/date/version and a "show every time" toggle; the
historical acknowledgment record **cannot be erased**.

**Guardrail:** recipient-bound only (forwarded links are useless without the
code); email/phone verification is the primary control (device is secondary and
never sufficient alone); reveal nothing on failure; never place private data in
URLs; enforce every permission server-side; originals are never altered by
watermarks; and we never claim screenshots/recordings can be prevented.
