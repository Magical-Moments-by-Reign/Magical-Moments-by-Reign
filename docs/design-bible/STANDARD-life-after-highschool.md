# Master Design Bible — Life After High School Ecosystem

**Status:** Founder Approved · **educational only.** Extends the
[Life Guidance Center](./STANDARD-life-guidance.md). Subordinate to Book I and
the [Constitution](./CONSTITUTION.md).

Graduation isn't just an event — it's one of the biggest life transitions a
family experiences. Magical Moments guides students & families through every
major decision **before** graduation and keeps supporting them after. We
**educate, organize, guide, and connect** — we do **not** replace counselors,
financial advisors, recruiters, or admissions offices, and we present **every
path with equal respect** (college is not the only success).

---

## Built today (real & verifiable)

`src/lib/life-after-hs.ts` + `life-after-hs.test.ts` (**12 tests**, part of the
196-test `npm test` suite):

- **College Discovery** — search facets (`COLLEGE_SEARCH_FACETS`), `filterColleges`
  (state/major/type/tuition/distance/campus/athletics/HBCU/veterinary/community/
  technical), `compareColleges`. *Empty dataset → no results — no colleges are
  invented.*
- **Scholarship Command Center** — `scholarshipSummary` (applied / awarded /
  pending / total earned) and `upcomingDeadlines`.
- **Financial calculators (educational)** — `costOfAttendance`,
  `remainingCollegeCost`, amortized `loanEstimate` (with disclaimer). Not advice.
- **Savings goal** — `savingsGoalProgress` (aggregates saved + gifts +
  scholarships + contributions; capped 0–100; reached flag).
- **Alternative pathways** — `PATHWAYS` (college · military · trade · technical
  cert · apprenticeship · entrepreneurship · workforce · gap year), each with
  benefits, considerations, career outlook, checklist, timeline.
- **Career exploration** — `CAREER_FIELDS` (description, typical education,
  skills, outlook) with the salary-approximate disclaimer.
- **Checklists** — `APPLICATION_CHECKLIST`, `ENROLLMENT_CHECKLIST`.
- **Ask Magical** examples for proactive, grade/context-aware guidance.

`prisma/schema.prisma` — `CollegeFavorite`, `CollegeVisit`, `ScholarshipEntry`,
`CollegeApplication`, and a generic `SavingsGoal` + `SavingsContribution` (also
powers Family Financial Foundation goals). Documents are secure storage refs.

## Needs (foundation seams — never faked)

A **college dataset / API** (search & compare), account-based saving of lists /
visits / scholarships / applications / goals, secure **document uploads**
(essays, transcripts, letters), **payment providers** for family contributions
(when enabled), calendar reminders, and the in-context UI (College Discovery,
Scholarship Center, Financial Planning, Application & Enrollment centers, Family
Collaboration) — all gated on auth + data + storage + payments. No college,
dollar figure, or aid amount is fabricated.

## Family collaboration

Parents, guardians, grandparents, mentors, and the student may collaborate **if
invited**; loved ones may contribute toward savings goals when enabled; **the
student controls what is shared** (ties into the [Guest Sharing](./STANDARD-guest-sharing.md)
and account/permission foundations).

**Guardrail:** educational only; never replaces professionals; every pathway
gets equal respect and encouragement; salary/cost figures are approximate and
sourced; no fabricated colleges, aid, or offers; documents are secure refs only.
