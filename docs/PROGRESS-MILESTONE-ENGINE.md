# Progress & Milestone Engine — Movement, Not Perfection
### Step 8 deliverable · Design & architecture only (no product code) · Founder Review

> Progress is not perfection. Progress is movement.
> *"I am moving forward. I can see what I've accomplished. I know what still matters.
> I am not behind just because life changed. I can pause and return without losing my
> story."*
> A calm, encouraging reflection of the journey — never a productivity score.

**Governing references:** the constitution, framework, concierge, education, planning, and
Vault designs (`DOCUMENT-VAULT.md`, commit `451e4d9`). This document specifies the shared
Progress & Milestone Engine every Estate inherits. **Design only — no product code, schema,
routes, or UI are created here.**

**Contents:** 1) Purpose · 2) Philosophy · 3) Sources · 4) Dimensions · 5) States · 6) Health
· 7) Milestone model · 8) Milestone sources · 9) Sequencing · 10) Dependencies & blockers ·
11) Member control · 12) Family collaboration · 13) Child/teen progress · 14) Professional
confirmation · 15) Concierge · 16) Proactive support · 17) Celebration · 18) Sensitive
milestones · 19) Timeline & history · 20) Cross-Estate progress · 21) Long-term progress ·
22) Plan changes · 23) Safe insights · 24) Metrics & analytics · 25) Admin governance · 26)
Honest empty states · 27) Safety & trust · 28) Existing foundations · 29) Example flows · 30)
What Home inherits · 31) Recommended next step.

---

## 1. Purpose

Turn activity into **meaning** — help members understand where they started, where they are,
what's complete, what's waiting, what needs attention, which milestone is next, what changed,
who contributed, which documents/professional steps are pending, what to celebrate, and what
continues long-term. It **supports momentum without creating pressure.**

---

## 2. Philosophy

Calm · supportive · honest · elegant · personal · context-aware. It helps members feel they're
moving forward and never "behind" for life changing.

**Avoid:** punitive red scores · shame-based messaging · fake success probabilities ·
competitive ranking between family members · artificial streak pressure · gamification that
trivializes serious moments · any claim that checklist completion guarantees success.

---

## 3. Progress Sources

Signals may come from: completed tasks · completed checklist sections · uploaded documents ·
verified documents · completed learning paths · member-saved calculator results · professional
confirmations · completed appointments · family responses · accepted invitations · vendor
bookings · milestones reached · member-entered updates · concierge-confirmed actions · official
confirmations · Estate stage changes · recurring-maintenance completion · memory capture ·
celebration completion.

**Every signal preserves its source** (per the Planning Engine's sourcing). **An unverified
member entry is never treated as an official confirmation.**

---

## 4. Progress Dimensions

Reusable dimensions: Planning · Education · Documents · Financial readiness · Professional
support · Family coordination · Deadlines · Milestones · Memories · Preservation · Ongoing
management · Safety & compliance.

**Each Estate uses a subset** — no Estate is forced into a single universal progress formula.
The Estate config declares which dimensions apply.

---

## 5. Progress States

Shared states: Not Started · Exploring · Preparing · In Progress · On Track · Waiting ·
Waiting on Member · Waiting on Family · Waiting on Professional · Waiting on Official Source ·
Needs Information · Needs Document · Needs Decision · Needs Attention · Paused · Delayed ·
Milestone Reached · Completed · Preserved · Ongoing · Archived.

| Representative state | Interface | Concierge | Reminders | Celebration |
|----------------------|-----------|-----------|-----------|-------------|
| Exploring / Preparing | gentle, low-pressure | teaches, invites | rare | none |
| In Progress / On Track | active, calm | narrates next step | timely | on milestones |
| Waiting on * | shows who/what, "not your fault" | sets expectations | to the right party | none |
| Needs Attention / Delayed | calmly flagged w/ reason | explains, offers help | supportive, not nagging | none |
| Paused | "resume when ready" | steps back | off | none |
| Milestone Reached / Completed | marked, celebrated per tone | congratulates, prompts capture | wind-down | yes (tone-matched) |
| Preserved / Ongoing / Archived | reflective / steady / read-only | available | seasonal or off | none |

Rule: a member only ever sees the **true** state; "Waiting on Professional/Official" never
reads as the member being behind.

---

## 6. Progress Health

Supportive signals (words, not scores): Moving Forward · On Track · Waiting · Needs Attention ·
Missing Information · Professional Support Needed · Paused by You · Recently Updated · Milestone
Reached · Complete · Ongoing Care.

**Percentages are used only when based on transparent, meaningful components.** If shown, the
engine: explains what's counted · **excludes not-applicable items** · avoids implying guaranteed
success · recalculates honestly when plans change · preserves prior history · **lets the member
hide percentages.**

---

## 7. Milestone Model

Milestone types: readiness · decision · financial · document · professional · family · event ·
approval · completion · celebration · preservation · ongoing-management · custom member.

Each milestone may include: name · meaning · source · related Estate · related plan · related
tasks · related documents · related professional · target date · reached date · status ·
visibility · celebration preference · evidence · notes · next recommended step · cross-Estate
transition. (Reuses `MagicalTrackerStage` + `FamilyAchievement` + `FinancialMilestoneProgress`.)

---

## 8. Milestone Sources

A milestone clearly records **how** it was reached: member confirmation · family confirmation ·
professional confirmation · official confirmation · document verification · task completion ·
system-derived logic · admin review · concierge suggestion.

**Wording is bounded by source** — the engine does **not** display "Approved," "Accepted,"
"Verified," "Closed," or "Completed" unless the source supports that exact wording. A
member-confirmed step reads "member-confirmed," never "officially approved."

---

## 9. Milestone Sequencing

Milestones relate in an ordered but flexible sequence (reorder / skip / not-applicable where
appropriate):

- **Home purchase:** affordability reviewed → credit prep complete → preapproval received →
  realtor selected → offer submitted → offer accepted → inspection completed → loan approved →
  closing completed → Welcome Home celebration → homeownership management begins.
- **Graduation:** requirements reviewed → pathway selected → applications started → financial
  aid submitted → scholarships completed → acceptance received → enrollment confirmed →
  graduation celebrated → transition begins.
- **Celebration of Life:** immediate family notified → funeral home selected → service details
  confirmed → obituary completed → program finalized → guests informed → service held →
  memories preserved → ongoing remembrance begins.

The sequence is Estate configuration, not code; dependencies (§10) govern what can be reached.

---

## 10. Dependencies & Blockers

Progress honestly reflects blockers: waiting on professional response · missing document ·
waiting on approval · waiting on payment · waiting on family decision · official deadline not
yet available · vendor unavailable · integration disconnected · member paused · conflicting
information · safety review required.

The engine explains: what's blocked · why · who can help · what can continue meanwhile · whether
it's urgent · whether the member may override or skip. **A member is never shown as "behind"
when the delay is outside their control.**

---

## 11. Member-Controlled Progress

Members may: confirm completion · add a progress note · correct a mistake · reopen an item ·
pause progress · change the goal · mark not applicable · hide a milestone · add a custom
milestone · change celebration preferences · request professional confirmation · preserve a
milestone privately · share selected milestones.

**Members cannot falsely create official approval/verification labels** — a member action is
always attributed as member-confirmed (§8).

---

## 12. Family & Collaboration

Progress across shared Estates: shared family progress · private member progress · parent-managed
child progress · teen-owned tasks with guardian oversight · professional-contributed progress ·
vendor-confirmed booking progress · guest participation · family celebration visibility.

Permissions determine who may view · update · confirm · celebrate · receive reminders · see
sensitive details · share externally. **A shared progress card never reveals private financial,
legal, medical, or document details** (only the permitted summary).

---

## 13. Child & Teen Progress

- **Children:** simple steps · encouraging language · visual milestones · family-approved
  celebrations · chores & school progress · savings goals · birthday planning.
- **Teens:** graduation progress · applications · scholarship deadlines · college/career
  decisions · first job · first bank account · driver milestones · volunteer hours · family
  responsibilities. **Avoid childish gamification for teens.**

Parents/guardians retain permission control throughout (per Concierge & Planning designs).

---

## 14. Professional Confirmation

Professionals may confirm progress — lender confirms preapproval received · realtor confirms
showing scheduled · inspector confirms report issued · counselor confirms document submitted ·
vendor confirms booking accepted · attorney confirms review completed · contractor confirms a
milestone · funeral professional confirms arrangements.

Requirements: permission-limited · clearly attributed · audit-logged · revocable · no access to
unrelated Estate information · and a clear distinction between **"professional confirmed"** and
**"officially approved."** (Reuses vendor booking/performance events + access-pass audit.)

---

## 15. Concierge & Progress

The concierge may: summarize progress · explain what changed · identify the next milestone ·
explain blockers · suggest what can continue · ask whether to adjust dates · celebrate steps ·
prepare family updates · link relevant learning · link missing documents · suggest professional
help · recommend a pause when the member is overwhelmed · help restart a paused Estate.

**It never pressures members to move faster** (consistent with Concierge Architecture).

---

## 16. Proactive Progress Support

Optional: weekly progress summary · monthly Estate review · upcoming-milestone notice · blocker
reminder · missing-document reminder · family-contribution reminder · professional-response
reminder · celebration prompt · anniversary of a completed milestone · ongoing-maintenance
reminder.

Members control: frequency · channel · quiet hours · categories · family sharing · tone ·
whether proactive support is enabled at all. (Reuses `Notification` / `NotificationPreference`.)

---

## 17. Celebration System

Milestones are celebrated meaningfully and elegantly: subtle visual moment · concierge message ·
family notification · memory prompt · digital keepsake · timeline entry · certificate/summary
where appropriate · invitation to share · optional social post · suggested next chapter.

Examples: *"You completed an important step today. Your home journey is moving forward
beautifully." · "Congratulations, Karlie. Your college application is officially submitted." ·
"Your family has completed the arrangements. We're here to help you preserve the memories with
care."*

**Tone adapts to context** and to the member's Concierge mode; sensitive milestones are never
celebrated inappropriately (§18). (Reuses the Celebration Network.)

---

## 18. Serious & Sensitive Milestones

Restrained treatment for: death · funeral arrangements · medical updates · legal proceedings ·
financial hardship · foreclosure prevention · insurance claims · family conflict · safety
concerns · vendor complaints.

Language: **Completed · Confirmed · Prepared · Ready · Recorded · Preserved.** **No confetti, no
gamification, no cheerful language.** The engine detects sensitive Estates/milestones (from
config) and suppresses celebratory treatment automatically.

---

## 19. Timeline & History

A **private, chronological** Estate history: Estate created · goal selected · task completed ·
document uploaded · professional added · decision made · date changed · milestone reached · plan
paused · plan resumed · family member joined · memory added · Estate completed · preservation
began.

Each entry shows: what happened · when · who performed it · source · visibility · related
records. **Shared timeline entries never expose sensitive detail** — only the permitted summary.
(Reuses `FamilyTimelineEntry`.)

---

## 20. Cross-Estate Progress

Milestones can lead into another Estate — the member feels **one continuous life story, not a
transfer between products:**
- **Home purchase completed →** Homeownership · Financial · Family · Celebration · Legacy.
- **Graduation completed →** Education · Career · Financial · Home · Travel.
- **Wedding completed →** Family · Home · Financial · Travel · Legacy.
- **New baby milestone →** Family · Health · Financial · Education · Home.

The concierge offers the transition warmly; goals, permissions, documents, and milestones carry
forward per the framework's continuity model.

---

## 21. Long-Term Progress

Ongoing progress for: home maintenance · financial goals · education progression · career growth
· family traditions · health routines · vehicle maintenance · vendor compliance · business
milestones · retirement preparation · legacy planning · memorial remembrance.

Supports **years-long progress without clutter:** annual summary · archived years · recurring
milestone cycles · long-term trend view · privacy controls · preservation rules. Older years
archive gracefully; recurring cycles never stack.

---

## 22. Plan Changes & History

When a plan changes (wedding postponed · college changed · home purchase cancelled · builder
changed · vendor replaced · career path changed · family goal revised), the engine: preserves
prior milestones · marks replaced goals clearly · explains what changed · recalculates future
progress · **never erases completed history** · keeps member notes · preserves document links ·
preserves professional confirmations · allows old-vs-new comparison. **The story is never
erased** (consistent with the Planning Engine).

---

## 23. Safe Progress Insights

Supportive, honest observations only — e.g. *"Most of your remaining steps depend on one missing
document." · "You've completed the education portion and are ready to begin planning." · "Your
plan is waiting on a professional response." · "Three deadlines are coming within thirty days." ·
"You may want to review your budget before choosing a contractor."*

**Never** produce: success probability · approval likelihood · financial guarantee · health
outcome prediction · legal-outcome prediction · competitive family scores.

---

## 24. Metrics & Analytics

Member-facing metrics that are **useful, not performative:** tasks completed · milestones reached
· documents complete · days until next milestone · family contributions · professional responses
· memories captured · recurring items completed · Estate age · recent activity.

**Admin analytics are separate** and aggregate — they do not expose private member details
unnecessarily (data minimization; consistent with the Vault's admin-access rules).

---

## 25. Admin Governance (future workflow — no UI built)

Future admin workflow: milestone-template configuration · progress-rule configuration · state
labels · celebration rules · sensitive-milestone handling · template versioning ·
professional-confirmation rules · emergency disable · audit review · member dispute · correction
request · abuse investigation · analytics · content review. Composes with admin roles/access +
audit. **No admin UI is built in this step.**

---

## 26. Honest Empty & Failure States

- *No progress yet:* "Your journey is ready whenever you are."
- *No milestone configured:* show the Estate calmly without fake markers.
- *Incomplete/insufficient data:* "We don't have enough verified information to mark this
  milestone complete."
- *Professional hasn't responded:* shown as Waiting on Professional, not member-behind.
- *Integration unavailable / date unknown:* honest, with the real alternative.
- *Completed offline:* "This step was completed outside Magical Moments. You may record it as
  member-confirmed."
- *Conflicting records:* asks which to use, never guesses.
- *Timeline indexing delayed:* "Still organizing your history — back shortly."

**Never** fabricate a milestone, a confirmation, or a completion to fill a gap.

---

## 27. Safety & Trust

The Progress Engine must **never:** invent milestone completion · present member confirmation as
official · guarantee success · shame delays · reveal private information · alter history silently
· delete completed progress without confirmation · celebrate sensitive events inappropriately ·
show unearned verification · claim professional confirmation without a record · rank family
members · pressure children or teens.

---

## 28. Existing Foundations to Reuse

Build on what exists — don't rebuild progress/milestone logic:
- **Planning & Checklist Engine** — task completion → progress signals.
- **Celebration Network** — `CelebrationEntry`, `celebration-network.ts` → §17.
- **Family Command Center** — `FamilyAchievement`, tasks, timeline.
- **`FinancialMilestoneProgress`** — financial milestones.
- **Scholarship & College Application models** — Education milestones.
- **Vendor events** — `VendorPerformanceEvent`, `VendorBookingEvent`, `VendorBadgeAudit` →
  professional/vendor confirmations (§14).
- **`MagicalTracker` + `MagicalTrackerStage`** — the core progress/stage store.
- **Notification system** — proactive summaries & reminders (§16).
- **Audit logs** — confirmations & corrections (§14, §25, §27).
- **Journey & Experience models** — Estate association.
- **Document Vault design** — document milestones & verification (§3, §8).
- **Concierge Architecture · Education Engine** — summaries, insights, next steps.
- **Family permissions · Guest sharing** — visibility (§12).
- **Preservation terms · Timeline/memory foundations** — history & long-term (§19, §21).

---

## 29. Example Estate Progress Flows

**A) 🏡 Home — buying.** Dimensions: Planning, Education, Documents, Financial, Professional,
Deadlines, Milestones. Signals roll up: affordability reviewed (education) → preapproval received
(**professional-confirmed**, not "approved by us") → offer accepted (member+professional) →
inspection completed → loan approved → closing completed → **Welcome Home** celebration
(tone-matched) → transitions to Homeownership (long-term). Blockers (missing doc, awaiting
lender) shown honestly; member never "behind" for a lender delay.

**B) 🎓 Education — graduation.** Milestones: requirements → applications (deadline-sourced) →
financial aid → scholarships (recurring deadlines) → acceptance (celebrate) → enrollment. Teen-
owned with guardian oversight; no childish gamification; cross-Estate to Career/Financial.

**C) 🕊 Legacy — celebration of life.** **Sensitive:** restrained language (Confirmed, Prepared,
Recorded, Preserved), no confetti; milestones (family notified → funeral home selected → service
confirmed → obituary completed → service held → memories preserved) with gentle concierge tone;
history preserved privately; transitions to ongoing remembrance.

All three use the **same** engine, dimensions, states, sourcing, and safety rules — only
configuration differs.

---

## 30. What Home Will Inherit

Home inherits the entire Progress & Milestone Engine unchanged: sources, dimensions, states,
health signals, the milestone model & sourcing, sequencing, dependencies, member control, family
collaboration, child/teen handling, professional confirmation, concierge integration, proactive
support, celebration, sensitive handling, timeline, cross-Estate progress, long-term progress,
plan-change handling, safe insights, metrics, admin governance, and safety rules.

**Home authors its content/config:** its dimensions (Planning/Education/Documents/Financial/
Professional/Deadlines/Milestones), its milestone sequence (affordability → … → keys → ownership),
its professional-confirmation types (lender/realtor/inspector), and its celebration moments
(Welcome Home) — all consuming the shared engine.

---

## 31. Recommended Next Step

The natural **Step 9 is the Partner Ecosystem** — how vetted professionals and institutional
partners are honestly introduced, matched (with reasons, no pay-to-rank without disclosure),
credentialed, booked, reviewed, and scoped; how "no verified professionals in your area" is
handled truthfully; and how the ecosystem reuses the existing Vendor marketplace (applications,
compliance, credentials, bookings, reviews, Primary/Standby protection).

**This remains design-only.** Per your instruction: no product code, no schema, no routes, no
merge, no deploy — and **Step 9 does not begin until you approve Step 8.**

---

*Prepared for founder review as Step 8 of the approved 12-step build order. No product code,
schema, routes, UI, or deployment were created. The member Home remains on the feature branch,
unmerged and undeployed.*
