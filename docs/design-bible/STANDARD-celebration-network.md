# Master Design Bible — Family Birthday & Celebration Network

**Status:** Founder Approved. Subordinate to Book I and the
[Constitution](./CONSTITUTION.md). Builds on Family Connections + the Family Vault.

Eliminate forgotten birthdays and help families celebrate one another
intentionally. Once a family is connected, celebration dates organize themselves
into a **living Family Celebration Calendar** that repeats **automatically every
year** — no one recreates birthday lists annually.

Mission: **No birthday should be forgotten. No celebration should feel
overlooked. Every family should have one beautiful place that keeps everyone
connected.**

---

## Built today (real & verifiable)

`src/lib/celebration-network.ts` + `celebration-network.test.ts` (**12 tests**,
part of the 233-test `npm test` suite):

- **Celebration types** (`CELEBRATION_TYPES`) — birthdays, baby birthdays,
  anniversaries, graduations, memorials (optional), military homecomings,
  retirements, reunions, adoption days, custom.
- **Automatic calendar + monthly view** — `buildCelebrationCalendar` (only
  shared/visible entries appear), `monthlyCelebrations` (sorted by day).
- **Yearly + leap-year recurrence** — `nextOccurrence` / `daysUntil` (roll to
  next year once passed); `resolveLeapDay` (Feb-29 → Feb-28 or Mar-1, configurable).
- **Smart reminders** — `reminderSchedule` (14 / 7 / 2 / morning-of; optional
  30-day) + `REMINDER_IDEAS`.
- **Group reminders** — `REMINDER_GROUPS` (immediate / entire / grandchildren /
  friends / custom).
- **Non-members** — `manualPersonEntries` (add a loved one with no account;
  appears in calendar & reminders; linkable later without losing history).
- **One-touch birthday experience** — `BIRTHDAY_ACTIONS` (page / gift / flowers /
  cake / video / family call / card / memories).
- **Ask Magical digest** — `upcomingCelebrations`, `celebrationDigest`
  ("You have 3 family celebrations this month.", "Daria's birthday is in 2 days!").

`prisma/schema.prisma` — `CelebrationEntry` (member or manual; visibility) and
`CelebrationReminderPref` (group, offsets, leap mode, channels).

## Needs (foundation seams — never faked)

Auth (connected members + per-member preferences), notification delivery
(reminders across channels), device-calendar export, and the one-touch
integrations (gift/flowers/cake/card via the [Ecosystem](./VISION-ecosystem.md)
registry). Print/share/download of the monthly view is presentation-only.

**Guardrail (privacy):** only celebrations a family/member chooses to share
appear; each member controls what's visible; no personal information surfaces
without being shared.
