# Master Design Bible — Family Connections

**Status:** Founder Approved. Subordinate to Book I and the
[Constitution](./CONSTITUTION.md). Builds on Guest Sharing, the Magical Preview
Pass, and the Family Vault.

Keep families connected across any distance. **Not** a social platform, **not** a
messaging-app replacement — a **private** family space to celebrate,
communicate, preserve memories, and participate together, no matter the miles.

**One membership → the whole family benefits.** Only one person buys a
membership and becomes the **Host** of a Magical Moment. The Host invites loved
ones as **Guests** who participate **without their own paid membership**.

---

## Built today (real & verifiable)

`src/lib/family-connections.ts` + `family-connections.test.ts` (**8 tests**,
part of the 221-test `npm test` suite):

- **Host-controlled guest permissions** (`GUEST_PERMISSION_KEYS`: upload photos/
  videos, join video calls, comment, invite others, view guest list, download
  memories, edit timeline) with safe `defaultGuestPermissions()` + `guestCan`.
- **One-membership rule** — `guestParticipationRequiresMembership()` → **false**;
  `GUEST_INCLUDED_ACTIONS` (view, RSVP, uploads if permitted, guestbook, video
  calls, countdowns, messages, galleries, milestones, reminders).
- **Premium preview (graceful)** — `isPremiumForGuest` (a guest's OWN account
  features), `lockedFeatureNotice` + `PREMIUM_LOCK`: *"This feature is available
  with your own Magical Moments membership."* → **Start My Magical Preview Pass**
  / **Learn More**. Never interrupts the family experience.
- **Catalogs** — `FAMILY_GATHERING_TYPES` (video gatherings), `TIMELINE_ENTRY_TYPES`
  (living family history), `FEED_ACTIVITY_TYPES` (private family feed).
- **Family Map (future)** — `FAMILY_MAP` (general location only, opt-in),
  `formatGeneralLocation`, `liveLocationAllowed()` → **false**. **Never live
  location tracking.**
- **Per-moment privacy** — `canAccessMoment` (a guest accesses only invited
  Moments; being invited to one never exposes unrelated family info),
  `CONNECTIONS_PRIVACY`.

`prisma/schema.prisma` — `FamilyGuest` (invite + host-controlled permissions +
invited-moments scope), `FamilyTimelineEntry`, `FamilyFeedPost`,
`FamilyGathering` (video provider seam), `FamilyMapLocation` (general, opt-in).

## Needs (foundation seams — never faked)

Auth (Host + guest identities, invitations), storage (photo/video uploads),
trusted **video providers** (or a native solution) for gatherings, and
notification delivery — gated. The Magical Preview Pass conversion is the
existing trial seam. No live location is ever built.

**Guardrail:** private by default (invited-only, no cross-moment access);
guests never need a paid membership to participate; premium locks are graceful,
never interruptive; the Family Map is general + opt-in — **never live tracking.**
