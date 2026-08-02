# Master Design Bible — Guest Sharing, Selective Access & Public Experience Mode

**Status:** Founder Approved. Subordinate to the [Constitution](./CONSTITUTION.md),
Book I, the [Brand, Account & Commerce standard](./STANDARD-brand-and-account.md),
and the [Customer Identity standard](./STANDARD-account-identity.md).

**The rule: Share the Moment — not the entire account.** Customers share
*selected* parts of an Experience with people who have no account. A guest gets
a beautiful, useful glimpse and can participate without unnecessary signup —
never the owner's dashboard, Library, planning tools, billing, Magical AI
history, or private data.

---

## Two distinct front-end modes

Every Experience has two separate views:

1. **Owner / Collaborator View** — the private working area (Magical Tracker
   admin, checklist, Magical AI, guest contacts, vendors, contracts, budgets,
   orders, billing, draft invitations, private albums/videos, settings,
   permissions, analytics, moderation). Never rendered to a guest.
2. **Guest Experience View** — the polished shareable page, showing **only**
   the sections the owner enabled. It feels like a complete premium experience,
   not a stripped-down dashboard.

## Server-side enforcement (non-negotiable)

Permissions are enforced **on the server for every request** — never by hiding
buttons. A guest who edits the URL still hits the same capability check. The
authority is `src/lib/guest-sharing.ts`:

- `evaluateAccess(link, ctx)` — the access gate: `revoked → paused → expired →
  max_uses → password → invitation`, in that order. A revoked/paused link is
  never `ok`, regardless of capabilities.
- `resolveCapabilities(enabled, linkType)` — returns exactly what a guest may
  see/do. Non-shareable / private ids are silently dropped; **the
  `PRIVATE_NEVER_EXPOSED` denylist can never be enabled.** Contributor links are
  clamped to upload/participation only.
- `guestNavSections(caps)` — only sections with an enabled view permission, in
  order; **no empty menu items**.

## Built today (real & verifiable)

`src/lib/guest-sharing.ts` + `src/lib/guest-sharing.test.ts` (**24 tests**, part
of the 62-test `npm test` suite):

- Granular permission catalog (`SHARE_PERMISSIONS`: 12 view + 10 interaction,
  each independently toggleable), link types (`SHARE_LINK_TYPES`).
- Access evaluation, capability resolution, guest navigation, invitation
  matching (`invitationMatches`, normalized email/phone).
- Account-less guestbook: `validateGuestbookEntry` (name + message + consent;
  optional email never shown publicly), `guestbookInitialStatus` (moderation),
  `publicGuestbookView` (anonymous / private-to-host / email-safe),
  `GUESTBOOK_CONFIRMATION`.
- Guest uploads: `uploadInitialStatus` (defaults to a **review queue**),
  `uploadsOpen` (deadline).
- Rate-limit decision (`withinRateLimit`), account-conversion copy
  (`CONVERSION_PROMPT`), attendance connection (`attendanceConnectDecision` —
  **verified contact only**), owner summary (`ownerLinkSummary`).

`prisma/schema.prisma` — `ShareLink` extended (linkType, invitation match lists,
upload/guestbook deadlines, paused/revokedAt, granular `permissions`, upload
handling) plus `GuestbookEntry`, `GuestUpload`, and `Rsvp` (all account-less;
`Rsvp.accountId` set only after a verified match). Builds on the existing
`src/lib/shares.ts` (token, password hash, expiry, view cap).

## Needs (foundation seams — never faked)

Auth/accounts (owner identity, collaborator roles, account-conversion),
storage (guest uploads), notifications (event updates, host messages), and the
owner Share panel + Guest Experience View UI. Nothing is simulated: with no
storage, uploads have nowhere to land; RSVPs/guestbook counts are real rows.

---

## Share settings — selectable permissions

Add a **"Share This Magical Moment"** area in every Experience. Each permission
is independently enabled/disabled.

**View:** hero image/video · welcome message · event details · date/time &
approved location · countdown · selected photo albums · selected videos · public
timeline · registry/gift links · approved guestbook · livestream link · public
updates.

**Interaction:** RSVP · leave a guestbook message · upload photos · upload
videos · private message to host · reserve a gift · contribute toward an
approved Experience · vote in a gender-reveal prediction · add to calendar ·
receive event updates.

## Share-link types

- **Public** — anyone with the link uses enabled public features.
- **Invitation-only** — access matches an invited email or phone.
- **Password-protected** — host sets a password / access code.
- **Private contributor** — upload approved photos/videos/messages, no dashboard.
- **One-time / expiring** — expiration date, max uses, event-only access, upload
  deadline, guestbook closing date. The owner may **revoke any link
  immediately**.

## Guestbook without an account

Guests leave a message with no signup. Collect only: display name, message,
optional email, optional relationship, consent checkbox. Guest chooses: display
my name · display as anonymous · keep private for the host. Submissions enter
moderation when the owner enables approval, are spam-controlled and
rate-limited, allow reporting/removal, and **never expose the guest's email
publicly**. Confirmation: *"Your message has been shared with the host."*

## Photo & video sharing

Owner shares individual photos, selected albums, or selected videos without
opening the whole gallery: share this photo/album/selected memories · allow or
disable downloads · allow guest uploads · require upload approval · close
uploads after a date. **Guest uploads enter a review queue unless the owner
deliberately enables auto-publish.** Guests never browse private uploads or
other private albums.

## Account-conversion (never forced)

Guests are never forced to sign up to view approved content, RSVP, sign the
guestbook, open a registry, or view event details. After they interact, show a
gentle optional invitation (`CONVERSION_PROMPT`): **Create Free Account** /
**Continue as Guest**. Never block the original action behind signup.

## Magical Moments I'm Attending

If a guest later creates an account with the **same verified** email/phone used
for the RSVP, offer to connect the event, then place it under *"Magical Moments
I'm Attending."* Never auto-connect on an unverified email, and never
auto-expose private information (`attendanceConnectDecision`).

## Owner controls

The dashboard shows, per link: active status, link type, enabled permissions,
date created, expiration, views, guestbook submissions, uploads received, RSVPs,
contributions, last activity — with copy / edit / pause / revoke. Different
links for different audiences (e.g. **Family**: gallery+videos+guestbook+uploads;
**General Guest**: details+RSVP+registry; **Photographer**: upload only).

## Privacy rules — never exposed through a guest link

Magical Moments Library · customer account info · full residential address
(unless explicitly approved for the event) · billing · orders · payment methods
· internal balances · Magical AI conversations · vendor contracts · private
notes · complete guest list · other Experiences · unapproved photos/videos ·
admin controls · account-recovery information. **Enforce on the server; hidden
buttons are not enough.**

## Owner share flow

Open Experience → "Share This Magical Moment" → choose what guests can **see** →
choose what guests can **do** → choose link privacy → **Preview as Guest** →
Create Link → copy/send. A permanent **"Preview as Guest"** button shows exactly
what the guest will see before publishing.

**Guardrail:** never expose the private denylist through a guest link; enforce
every permission server-side; guest uploads and (optionally) guestbook entries
are moderated by default; the guest's email is never public; attendance connects
only on a verified match; sharing never requires the guest to create an account.
