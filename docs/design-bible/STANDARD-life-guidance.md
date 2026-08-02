# Master Design Bible — Life Guidance Center

**Status:** Founder Approved · **educational only.** Subordinate to Book I, the
[Constitution](./CONSTITUTION.md), and the [Ecosystem vision](./VISION-ecosystem.md).

**"Helping families navigate life's biggest milestones with confidence."** A
trusted educational resource that helps families prepare for milestones *before
they happen* — never overwhelming, always empowering. First center: **Graduation
Success**. Mission: *"No family should ever have to say, 'We didn't know that was
an option.'"*

**Guardrails:** educational only — Magical Moments does **not** replace school
counselors, financial advisors, recruiters, or admissions offices, and never
guarantees admission, aid, or outcomes. Requirements differ by state and change
over time, so we explain concepts in plain language and **link to official
sources** (federal + each state's Department of Education) rather than giving
state-specific advice we can't keep current.

---

## Built today (real & verifiable)

`src/lib/life-guidance.ts` + `life-guidance.test.ts` (**8 tests**, part of the
184-test `npm test` suite):

- **Grade-by-grade timeline** (`GRADE_TIMELINE`, 8th–12th) so families prepare
  years in advance.
- **Graduation topics** (`GRAD_TOPICS`, 20, in 5 groups).
- **Plain-language guides** (`GUIDE_ARTICLES`) answering the example questions
  ("What is dual enrollment?", "What is FAFSA?", "Can my child graduate early?",
  "What should juniors be doing now?", …) — evergreen, with official learn-more
  links.
- **Official resources** (`OFFICIAL_RESOURCES`) — real, stable links (FAFSA at
  studentaid.gov, College Board, BigFuture, ACT, ed.gov).
- **State-specific guidance** (`US_STATES` — 50 + DC; `stateResource`) — links to
  a state's official Department of Education; per-state links are curated in the
  CMS and **never fabricated** (a guided pointer until curated).
- **Ask Magical, grade-based** (`recommendForGrade`) — proactive, gentle
  recommendations (e.g. 10th grade → dual enrollment).

`prisma/schema.prisma` — `GuideArticle` (CMS: slug, center, title, category,
grade, stateCode, summary, body, officialLinks, status, featured) +
`GuideStatus` enum, so admins add / edit / archive / feature guides and keep
resources current.

Public page **`/life-guidance`** — warm, empowering: philosophy, the Graduation
Success Center (grade timeline, topic groups, plain-language guides with official
links), an Ask Magical example, state-specific guidance + trusted official
resources, and the mission.

## Needs (foundation seams — never faked)

The **admin CMS UI** (add/edit/archive/feature, curate per-state official links),
Ask Magical wiring to `recommendForGrade` based on a real student grade, and
account-based saving of a family's progress — gated on auth. No state-specific
requirement is invented; content is editable so it stays current.

**Guardrail:** educational only; never replaces professional advice; never
guarantees outcomes; links to official sources; state specifics come from
curated official links, never fabricated.
