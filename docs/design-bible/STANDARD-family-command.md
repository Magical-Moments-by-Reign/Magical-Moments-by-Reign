# Master Design Bible — Family Command Center

**Status:** Founder Approved. Subordinate to Book I and the
[Constitution](./CONSTITUTION.md). Builds on the Family Vault + account
permissions foundations.

A **private** family communication & organization system built on trust,
collaboration, reminders, and shared responsibilities. It is **NOT** a phone
tracker, **NOT** a social platform, **NOT** a texting replacement, and **NOT**
surveillance. It reduces confusion and helps every member stay connected
**without invading anyone's privacy**.

**Privacy is non-negotiable:** no live location tracking, no hidden monitoring,
no surveillance — `locationTrackingAllowed()` returns `false`, always.

---

## Built today (real & verifiable)

`src/lib/family-command.ts` + `family-command.test.ts` (**10 tests**, part of
the 213-test `npm test` suite):

- **Roles** (`FAMILY_ROLES`) — parent, guardian, spouse, grandparent, caregiver,
  trusted, teen, child (each adult/minor).
- **Permission-based access** — `PERMISSION_KEYS` (view calendar/chores/homework/
  celebrations/savings/checklists, send/receive messages, mark tasks complete),
  `defaultPermissions(role)` (adults full; children a safe minimal set the owner
  expands), `canAccess`. **Every permission is configurable.**
- **Family messages** — `validateMessage` (sender/recipients/body, priority,
  due/remind).
- **Smart reminders** — `REMINDER_TYPES`; children mark complete;
  `reminderConfirmationNeeded` (parent confirmation when enabled).
- **Task manager** — assign to one or many members; `taskProgress`.
- **Partner organizer** & **family calendar** catalogs.
- **Achievements** (`ACHIEVEMENTS`).
- **Ask Magical family digest** — `familyDigest` produces helpful, non-nagging
  lines ("Jeremy has 3 reminders due today.", "The family vacation checklist is
  85% complete.").
- **Notifications** — `NOTIFICATION_CHANNELS` (in-app, email, SMS optional, push
  future) + `activeChannels(prefs)`.
- **Privacy guarantees** (`PRIVACY_GUARANTEES`, `locationTrackingAllowed`).

`prisma/schema.prisma` — `FamilyMember` gains `permissions` + `notifyPrefs`; new
`FamilyMessage`, `FamilyReminder`, `FamilyTask`, `FamilyCalendarEvent`,
`FamilyAchievement` (all under `Family`).

## Needs (foundation seams — never faked)

Per-member secure logins (auth), notification delivery (in-app/email/SMS; push
future), and the in-context UI (messages, reminders, tasks, spouse organizer,
calendar, achievements). No location feature is ever built.

**Guardrail:** connection, not control; the owner controls permissions; children
see only what's allowed; **never location tracking, hidden monitoring, or
surveillance.**
