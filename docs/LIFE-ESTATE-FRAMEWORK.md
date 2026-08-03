# Life Estate Framework — Shared Foundation Design
### Step 3 deliverable · Design & architecture only (no product code) · Founder Review

> Build the foundation once so every Estate inherits excellence.
> Every Estate is another elegant wing of one connected Magical Moments world —
> never a separate website.

**Governing reference:** `docs/LIFE-ESTATE-BLUEPRINT.md` (approved, commit `cdf56c9`).
This document details the reusable framework all fourteen Estates inherit. It is a
design specification — no schema, routes, UI, or production code are created here.

**Contents:** 1) Purpose · 2) Shared lifecycle · 3) Shared modules · 4) Member states ·
5) Concierge behavior · 6) Cross-Estate continuity · 7) Information architecture ·
8) Configuration model · 9) Visual principles · 10) Honest empty states ·
11) Integration boundaries · 12) Safety & trust · 13) Example walkthroughs ·
14) What Home inherits · 15) What's unique to Home · 16) Recommended next step.

---

## 1. Framework Purpose

A single, reusable architecture that turns any life domain into a **complete,
concierge-guided Estate** — from the member's first entrance through long-term
preservation — without rebuilding the foundation fourteen times.

The framework guarantees three things for every Estate:

1. **Consistency of feeling.** Same shell, same warmth, same concierge, same trust — one
   home, many wings.
2. **Completeness of journey.** Every Estate can carry a member through the full arc
   (educate → plan → connect → track → celebrate → preserve → maintain), so no one is
   ever left wondering "what's next."
3. **Configuration over code.** An Estate is defined mostly by **data + content**
   (its goals, stages, checklists, tools, professional categories, milestones), not by a
   bespoke application. Adding an Estate should not require re-engineering the platform.

Everything here inherits the constitution's non-negotiables: **no fabrication**,
neutral education, honest partner introductions, licensed-professional deferral, privacy
by default, and before/during/after.

---

## 2. The Shared Estate Lifecycle

Every Estate expresses the **same sixteen-step sequence**. The steps are universal; their
*content* is Estate-specific (supplied by configuration, §8). Not every member touches
every step, and steps are revisitable — the concierge meets people where they are.

| # | Step | What it does | Powered by module (§3) |
|---|------|--------------|------------------------|
| 1 | **Welcome** | Warm arrival; orient without overwhelming | Estate Welcome |
| 2 | **Understand the goal** | "What are you hoping to do?" | Goal Discovery |
| 3 | **Assess current stage** | "Where are you today?" | Stage Assessment |
| 4 | **Educate** | Neutral learning matched to goal + stage | Learning Center |
| 5 | **Build a personalized plan** | Turn understanding into a path | Personalized Plan |
| 6 | **Create tasks & checklists** | Concrete, ordered next steps | Checklist Center |
| 7 | **Organize documents** | A secure home for the paperwork | Document Vault |
| 8 | **Use tools/calculators** | Honest, input-driven math where useful | Calculator & Tools |
| 9 | **Compare options honestly** | Neutral side-by-side of real choices | Learning + Tools |
| 10 | **Connect trusted professionals** | Real, vetted, only when helpful | Professional Connections |
| 11 | **Track progress** | Where they are, at a glance and in depth | Progress Tracker |
| 12 | **Coordinate family/collaborators** | Bring the right people in | Family & Collaboration |
| 13 | **Celebrate milestones** | Mark the meaningful moments | Milestones + Celebration |
| 14 | **Capture the experience** | Save what happened | Memory Capture |
| 15 | **Preserve memories & records** | Into the permanent Library | Preservation |
| 16 | **Continue long-term support** | Estates don't "end" | Long-Term Management |

The sequence adapts per Estate purely through configuration — the architecture is
identical whether the domain is Home, Wedding, or Pets.

---

## 3. The Shared Modules

Twenty reusable modules. Each Estate inherits all of them; configuration decides which
are emphasized, and honest empty states (§10) cover the rest. For each module:
**Purpose · Data · Member sees · Concierge · Optional? · Estate-specific vs Shared ·
Real integration? · Never fake.**

> "Shared" = one implementation reused by all Estates. "Estate-specific" = content/config
> the Estate supplies into that shared module.

### 3.1 Estate Welcome
- **Purpose:** the first-entrance moment into a wing; sets tone, orients by real state.
- **Data:** member name, Estate config (welcome language, imagery), current state (§4).
- **Member sees:** a warm, photographic welcome + 2–3 honest next steps.
- **Concierge:** greets by name and situation; offers to begin Goal Discovery.
- **Optional:** can be skipped after first visit (returns to Overview).
- **Estate-specific:** welcome copy, imagery. **Shared:** the welcome pattern.
- **Real integration:** none. **Never fake:** a member's stage or progress.

### 3.2 Concierge Entry Point
- **Purpose:** the always-present way to ask the named concierge for help in this Estate.
- **Data:** `Concierge` (name/persona), conversation history, Estate context.
- **Member sees:** the "Ask [Name]" panel, "Powered by Magical."
- **Concierge:** answers, suggests next steps, can act on other modules (draft a checklist,
  surface content, open a calculator).
- **Optional:** collapsible; presence is not.
- **Estate-specific:** the context prompt. **Shared:** the concierge engine.
- **Real integration:** `askMagical()` (real when AI key set; honest offline otherwise).
- **Never fake:** an answer — offline says so; regulated specifics defer to a pro.

### 3.3 Goal Discovery
- **Purpose:** learn what the member is trying to accomplish (Step 2).
- **Data:** Estate `goalTypes`, member selections.
- **Member sees:** a warm, short chooser ("Which best describes you?") — e.g. Home:
  *buying · building · renting · selling · investing*.
- **Concierge:** can ask conversationally instead of a form; explains where each path leads.
- **Optional:** members can explore without committing to a goal.
- **Estate-specific:** the goal set. **Shared:** the discovery flow.
- **Real integration:** none. **Never fake:** narrowing that misrepresents options.

### 3.4 Stage Assessment
- **Purpose:** locate the member on the journey (Step 3) so guidance fits.
- **Data:** Estate `stages`, member's self-reported/derived stage.
- **Member sees:** a gentle "where are you today?" (e.g. *just curious → pre-approved →
  under contract → closed*).
- **Concierge:** infers stage from context where possible; confirms, never assumes.
- **Optional:** yes; defaults to "Exploring."
- **Estate-specific:** stage ladder. **Shared:** assessment pattern + `MemberState` (§4).
- **Real integration:** none. **Never fake:** a stage the member hasn't reached.

### 3.5 Learning Center
- **Purpose:** neutral, genuinely useful education (Steps 4 & 9).
- **Data:** `GuideArticle` + Estate `learningPaths` (ordered sequences).
- **Member sees:** guided paths + an article library; honest option comparisons.
- **Concierge:** recommends the right lesson for the member's goal/stage; summarizes.
- **Optional:** always browsable; never gated behind a purchase to *understand*.
- **Estate-specific:** paths & content. **Shared:** the learning engine.
- **Real integration:** content authoring (internal). **Never fake:** figures, "typical"
  rates, or steering toward a paid party as if neutral.

### 3.6 Personalized Plan
- **Purpose:** turn understanding into a path (Step 5).
- **Data:** goal + stage + Estate `planTemplates`; member choices.
- **Member sees:** a clear, sequenced plan ("your path to keys in hand") they can adjust.
- **Concierge:** drafts the plan, explains each phase, adapts as things change.
- **Optional:** members can proceed ad hoc without a formal plan.
- **Estate-specific:** plan templates. **Shared:** the plan engine.
- **Real integration:** none. **Never fake:** timelines presented as guarantees (they're
  estimates).

### 3.7 Checklist Center
- **Purpose:** concrete, ordered, checkable next steps (Step 6).
- **Data:** Estate `checklistTemplates`; member completion state.
- **Member sees:** living checklists, personalized, with real progress.
- **Concierge:** generates/updates lists, reminds gently, checks items on confirmation.
- **Optional:** yes; some members prefer the concierge to hold the list.
- **Estate-specific:** templates. **Shared:** checklist engine (reuses `FamilyTask` pattern).
- **Real integration:** none. **Never fake:** pre-checked items or false completion.

### 3.8 Document Vault
- **Purpose:** a secure home for the chapter's paperwork (Step 7).
- **Data:** Estate `documentTypes`; member uploads (`FamilyDocument`/`MediaAsset`).
- **Member sees:** categorized, owner-controlled documents with reminders.
- **Concierge:** suggests which documents matter now; never opens/shares without consent.
- **Optional:** yes. **Estate-specific:** document categories. **Shared:** the vault.
- **Real integration:** secure storage (existing Vault). **Never fake:** a document, a
  signature, or "verified" status the platform can't confirm.

### 3.9 Calculator & Tools Area
- **Purpose:** honest, input-driven math and utilities (Step 8).
- **Data:** member inputs only; Estate `tools` config.
- **Member sees:** transparent calculators (affordability, ROI, savings, cost compare)
  that **state their assumptions** and label outputs as estimates.
- **Concierge:** explains inputs and what results mean; never turns an estimate into advice.
- **Optional:** shown only where a tool genuinely applies.
- **Estate-specific:** which tools. **Shared:** the tools framework + `SavingsGoal` engine.
- **Real integration:** none required (pure math) — **but** any tool needing live data
  (e.g. current rates) is honestly gated until that data is real.
- **Never fake:** rates, projections, approvals, or eligibility.

### 3.10 Professional Connections
- **Purpose:** connect real, vetted professionals when helpful (Step 10).
- **Data:** Estate `professionalCategories`; the **Vendor marketplace** (applications,
  compliance, credentials, bookings, reviews).
- **Member sees:** real vetted professionals with genuine credentials/reviews — or an
  honest "connections coming soon for your area."
- **Concierge:** suggests *when* a pro helps and *why* a match fits; never pressures.
- **Optional:** always; the member chooses to connect.
- **Estate-specific:** categories (realtor, lender…). **Shared:** the marketplace.
- **Real integration:** **required** — the Vendor system. **Never fake:** a firm, a match,
  a credential, availability, or "3 professionals found."

### 3.11 Family & Collaboration
- **Purpose:** bring the right people into a journey (Step 12).
- **Data:** `Family`/`FamilyMember`, `Invitation`, `CollaboratorPermission`, permissions.
- **Member sees:** who's involved, what they can see/do; invite controls.
- **Concierge:** each member has their own; respects permissions; coordinates across people.
- **Optional:** solo by default; collaboration is invited.
- **Estate-specific:** collaboration roles. **Shared:** the family/permission system.
- **Real integration:** none external. **Never fake:** participation or consent.

### 3.12 Progress Tracker
- **Purpose:** where the member is, at a glance and in depth (Step 11).
- **Data:** `MagicalTracker` + stages; module completion.
- **Member sees:** a calm progress view; reflected on Home. Real activity, zeros when new.
- **Concierge:** narrates progress, flags what's next / stalled.
- **Optional:** always visible; never inflated.
- **Estate-specific:** stage definitions. **Shared:** the tracker.
- **Real integration:** none. **Never fake:** progress percentages or completed stages.

### 3.13 Milestones
- **Purpose:** the meaningful markers (Step 13).
- **Data:** Estate `milestones`; member achievement records (`FamilyAchievement`).
- **Member sees:** milestone moments ("pre-approved," "keys in hand") worth celebrating.
- **Concierge:** recognizes reaching one; prompts capture + celebration.
- **Optional:** milestones fire from real events only.
- **Estate-specific:** the milestone set. **Shared:** the milestone engine.
- **Real integration:** none. **Never fake:** a milestone not actually reached.

### 3.14 Notifications & Reminders
- **Purpose:** gentle nudges, never nagging.
- **Data:** `Notification`, reminders, member preferences.
- **Member sees:** timely, relevant, dismissible reminders; a quiet inbox.
- **Concierge:** reminds with care; respects quiet preferences and frequency.
- **Optional:** fully controllable. **Estate-specific:** which events notify.
- **Shared:** the notification system. **Real integration:** email/SMS providers (honest
  when a channel isn't connected). **Never fake:** a delivery that didn't happen.

### 3.15 Memory Capture
- **Purpose:** save what happened (Step 14).
- **Data:** photos/notes/records; `LibraryEntry`.
- **Member sees:** simple prompts to capture a moment; nothing forced.
- **Concierge:** invites capture at natural moments (a milestone, a completion).
- **Optional:** entirely. **Estate-specific:** capture prompts. **Shared:** capture flow.
- **Real integration:** media storage. **Never fake:** a memory or a date.

### 3.16 Celebration
- **Purpose:** mark the joy with the family (Step 13).
- **Data:** `CelebrationEntry`, `Invitation`, galleries, guestbook.
- **Member sees:** a warm celebration moment; optional sharing with loved ones.
- **Concierge:** offers to celebrate; helps invite; keeps it tasteful.
- **Optional:** yes. **Estate-specific:** celebration types. **Shared:** celebration engine.
- **Real integration:** sharing/invitations. **Never fake:** guests, RSVPs, or reactions.

### 3.17 Preservation
- **Purpose:** move the chapter into the permanent record (Step 15).
- **Data:** `LibraryEntry`, `FamilyTimelineEntry`.
- **Member sees:** the Estate's story preserved in the Magical Moments Library + timeline.
- **Concierge:** ensures nothing is lost; helps organize.
- **Optional:** on by default (member-controlled), nothing deleted silently.
- **Estate-specific:** preservation rules. **Shared:** Library + timeline.
- **Real integration:** durable storage. **Never fake:** preserved content.

### 3.18 Long-Term Management
- **Purpose:** ongoing support after the "main" journey (Step 16).
- **Data:** recurring reminders, seasonal schedules, annual reviews.
- **Member sees:** maintenance reminders, periodic check-ins, ongoing tracking.
- **Concierge:** stays available; surfaces seasonal/annual next steps.
- **Optional:** yes. **Estate-specific:** what "ongoing" means (Home maintenance vs.
  Financial reviews). **Shared:** reminder/scheduling system.
- **Real integration:** none. **Never fake:** a due task or a maintenance record.

### 3.19 Safety & Trust Notices
- **Purpose:** keep the member safe and informed at sensitive moments.
- **Data:** Estate `safetyNotices`; context (regulated topic detected).
- **Member sees:** clear, calm notices ("this is educational — confirm with a licensed
  professional"), privacy assurances, assumption disclosures on tools.
- **Concierge:** surfaces the right notice at the right time; routes regulated matters out.
- **Optional:** never — required where regulated topics appear.
- **Estate-specific:** which notices. **Shared:** the notice framework + governance.
- **Real integration:** none. **Never fake:** a certification, endorsement, or safety claim.

### 3.20 Estate Settings
- **Purpose:** member control over the Estate.
- **Data:** preferences, notifications, collaborators, concierge name/voice, privacy.
- **Member sees:** clear controls; rename concierge; manage sharing; leave/pause an Estate.
- **Concierge:** honors every setting immediately.
- **Optional:** always available. **Estate-specific:** a few Estate options.
- **Shared:** the settings framework. **Real integration:** none. **Never fake:** a setting
  that doesn't take effect.

---

## 4. Member Experience States

A shared `MemberState` machine every Estate uses. State drives what the interface,
concierge, reminders, and progress emphasize. States are honest reflections of reality —
never cosmetic.

| State | Interface emphasis | Concierge | Reminders | Progress |
|-------|--------------------|-----------|-----------|----------|
| **Exploring** | Learning Center, gentle welcome | invites, teaches, low-pressure | none/rare | 0% |
| **Considering** | option comparisons, tools | explains trade-offs | occasional, soft | early |
| **Preparing** | readiness checklists, documents | "let's get you ready" | light | rising |
| **Planning** | Personalized Plan front-and-center | co-builds the plan | plan-based | defined |
| **In Progress** | tasks, tracker, professionals | active guidance | timely nudges | advancing |
| **Waiting** | "what we're waiting on," status | reassures, sets expectations | status-based | held |
| **Needs Attention** | the blocking item, clearly flagged | surfaces the issue calmly | prompt (not nagging) | flagged |
| **Professional Support Required** | connect-a-pro, safety notice | routes to licensed pro | as needed | gated |
| **Milestone Reached** | celebration + capture prompt | congratulates, invites capture | celebratory | +milestone |
| **Completed** | summary, celebrate, preserve | celebrates, offers next Estate | wind-down | 100% |
| **Preserved** | the story in the Library/timeline | reflective, available | none | archived-complete |
| **Ongoing Management** | maintenance/seasonal view | periodic check-ins | seasonal/annual | steady |
| **Paused** | calm "resume when ready" | steps back, no pressure | off | frozen |
| **Archived** | read-only, respectful | available on request | off | closed |

Rule: a member is only ever shown the state that is **true**. "Needs Attention" and
"Professional Support Required" always carry an honest explanation and a real next step.

---

## 5. Concierge Behavior (consistent across every Estate)

The named concierge (Journey, Grace, Atlas…) behaves the same way everywhere; only its
*context* changes. It:

- **Welcomes** by name and real situation.
- **Asks the goal** conversationally (or accepts the Goal Discovery choice).
- **Learns preferences** over time (stored on `Concierge`), applying them tactfully.
- **Explains the next step** in plain, warm language.
- **Recommends education** matched to goal + stage.
- **Creates checklists** and keeps them current.
- **Helps organize documents** (suggests what matters; never opens without consent).
- **Reminds without nagging** — frequency-aware, quiet-hours-aware.
- **Connects professionals honestly** — *when* it helps and *why* a match fits; real
  vendors or an honest "coming soon."
- **Explains assumptions** behind any tool or estimate.
- **Celebrates progress** at real milestones.
- **Adapts to adults, teens, and children** — tone and scope by age; child-safe by design.
- **Supports family collaboration** — coordinates across members, each with their own concierge.
- **Remembers cross-Estate context** — carries goals, permissions, documents, milestones,
  relationships between wings (§6).
- **Respects permissions and privacy** — never exposes what a member isn't permitted to see.
- **Handles regulated matters safely** — educates, then routes to a licensed professional.

**The concierge never invents:** rates · approvals · eligibility · credentials ·
availability · professional matches · financial outcomes · legal conclusions · medical
conclusions · construction guarantees. (Governance already encoded in `ask-magical.ts`.)

---

## 6. Cross-Estate Continuity

Life doesn't stay in one wing. The framework carries forward relevant **goals,
permissions, documents, milestones, and relationships** so a member is *guided onward*,
never transferred to "another product." Transitions are defined per Estate config
(`crossEstateTransitions`) and offered by the concierge at natural moments.

**Example flows:**
- **Graduation →** Education · Career · Financial · Home · Travel
- **Wedding →** Home · Family · Financial · Travel · Legacy
- **New Baby →** Family · Financial · Education · Health · Home

**What travels across a transition:**
- *Goals & context* — the concierge knows why you're here from where you were.
- *Permissions & family* — collaborators and roles carry where appropriate.
- *Documents* — a document raised in one Estate is available in another when relevant
  (with consent).
- *Milestones & memories* — flow into the one Library and family timeline.

The member experience of a transition is a warm suggestion ("Your wedding's done — shall
we help you find your first home together?"), one continuous conversation, one shell.

---

## 7. Information Architecture (proposal only — no routes created)

A single reusable route shape, parameterized by Estate. Universal routes exist for every
Estate; their **content** is generated from Estate configuration (§8).

```
/estate/[estate]                 → Overview (the Estate's "Home within Home")
/estate/[estate]/overview        → same as root (canonical)
/estate/[estate]/learn           → Learning Center (+ /learn/[path])
/estate/[estate]/plan            → Personalized Plan
/estate/[estate]/tasks           → Checklist Center
/estate/[estate]/documents       → Document Vault
/estate/[estate]/tools           → Calculators & Tools (+ /tools/[tool])
/estate/[estate]/professionals   → Professional Connections
/estate/[estate]/progress        → Progress Tracker
/estate/[estate]/milestones      → Milestones & Celebration
/estate/[estate]/memories        → Memory Capture & Preservation
/estate/[estate]/settings        → Estate Settings
```

- **Universal (same for all Estates):** the twelve routes above — one implementation,
  driven by config. This is how we avoid rebuilding fourteen times.
- **Config-generated:** sub-paths like `/learn/[path]`, `/tools/[tool]`, and the *content*
  of every module come from the Estate's configuration and content, not new code.
- **Customer-facing naming:** members never see `/estate/home` as "Home Life Estate" —
  the nav says **🏡 Home**; the URL/architecture term is internal.
- **Home dashboard relationship:** the member's Magical Space (`/home`) is the hub that
  links into each Estate overview; an Estate overview is a "home within Home."

*(Routes are illustrative. No routes are created in Step 3.)*

---

## 8. Configuration Model (one framework, fourteen expressions)

An Estate is a **configuration object + content**, consumed by the shared framework.
Conceptual shape (illustrative, not a schema):

```
EstateConfig {
  key                     // "home", "wedding", …  (internal)
  name                    // "Home"                (nav label, warm)
  icon                    // 🏡
  welcome                 // language + imagery for Estate Welcome
  goalTypes[]             // Goal Discovery options
  stages[]                // Stage Assessment ladder
  learningPaths[]         // ordered Learning Center sequences
  planTemplates[]         // Personalized Plan skeletons per goal
  checklistTemplates[]    // Checklist Center templates
  tools[] / calculators[] // which tools apply, with assumptions
  documentTypes[]         // Document Vault categories
  professionalCategories[]// Professional Connections (→ Vendor categories)
  milestones[]            // Milestone set
  celebrations[]          // Celebration moments
  preservationRules       // what preserves, how
  safetyNotices[]         // regulated-topic notices
  partnerIntegrations[]   // institutional partners (honest availability)
  crossEstateTransitions[]// suggested onward wings
  memberStates            // any Estate-specific state nuances (defaults shared)
}
```

- **Inherited (never re-authored):** all twenty modules, the lifecycle, the state machine,
  the concierge engine, the visual shell, the trust rules.
- **Supplied per Estate:** everything in `EstateConfig` above — data and content.
- **Result:** launching a new Estate is primarily authoring its config + content +
  (occasionally) one or two unique tools — not building a new application.

---

## 9. Visual Experience Principles (wireframe-level only)

Inherits the **approved luxury visual language** (the Home preview is the approved visual
foundation): ivory & champagne, warm natural light, generous spacing, the existing logo in
champagne-gold/luxury finishes, estate photography, soft motion, quiet hospitality, clear
hierarchy, **mobile-first**, and never a corporate-dashboard feeling.

**Entering an Estate should feel like walking into another elegant wing of the same home.**

**Wireframe-level structure of an Estate Overview (not final UI):**
```
┌ Magical Space shell (champagne logo, quiet nav, member presence) ────────────┐
│  Estate hero: photograph + "Welcome to your Home journey, Tabitha"            │
│  Concierge entry: "Ask [Name]"  ·  Powered by Magical                         │
│  Where you are: current state + the single most useful next step             │
│  Module rail (only what's relevant to goal/stage):                           │
│    Learn · Plan · Tasks · Documents · Tools · Professionals · Progress        │
│  Warm sections below: milestones · memories · long-term management           │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Principles:** one screen answers "where am I and what's next"; relevant modules surface,
irrelevant ones rest; motion is ambient and subtle; every module renders inside the same
shell so movement never feels like leaving. *(No final UI screens produced in Step 3.)*

---

## 10. Honest Empty States (supportive, luxurious, never fabricated)

Empty is common and must feel like calm possibility, not a broken page. Per scenario:

- **No plan yet →** "Let's design your path when you're ready." + start-a-plan invite.
- **No tasks yet →** "Nothing on your list right now. [Name] will add steps as we go."
- **No documents yet →** "Your secure vault is ready for the first document."
- **No professionals available (area/coverage) →** "We don't yet have vetted [realtors] in
  your area. We'll tell you the moment we do — never a name we can't stand behind."
- **No integration connected →** "This connects to [service] — coming soon. Here's what you
  can do meanwhile."
- **No partner serves the area →** honest, specific, with an alternative next step.
- **No calculator applies →** the tool simply isn't shown; the concierge explains if asked.
- **No memories uploaded →** "Your story starts with a single moment — capture one when it
  feels right."
- **Member not ready to continue →** "No rush. Whenever you're ready, I'll be right here." +
  Paused state.

Rule: an empty state **never** invents content, counts, partners, or matches to look full.

---

## 11. Integration Boundaries (real vs. honest "coming soon")

| Capability | Status today | Rule |
|------------|--------------|------|
| Account/profile, Library, timeline | **Real** | show live, zeros when new |
| Progress/tracker, checklists, documents, memories | **Real** (existing models) | live per account |
| Concierge (`askMagical`) | **Real** when AI key set; **honest offline** otherwise | never fabricate a reply |
| Professional marketplace (vetted vendors) | **Real where vendors exist**; else "coming soon" | never a fake firm/match/credential |
| Institutional partners (banks, insurers, warranties, movers) | **Coming soon** | never implied before real |
| Live financial data (rates, market values) | **Not connected** | tools that need it are gated honestly |
| Calculators using member inputs | **Real** | state assumptions; label estimates |
| Email/SMS/push delivery | **Real where provider configured**; else honest | never claim undelivered as sent |

**Boundary principle:** every module works honestly in a "not-yet-integrated" state via its
empty state; nothing is faked to appear complete.

---

## 12. Safety & Trust Rules (inherited by every Estate)

1. **No fabrication — ever:** rates · approvals · eligibility · savings projections ·
   matched professionals · partner availability · vendor credentials · financial/legal/
   medical outcomes · construction guarantees.
2. **Neutral education:** explain trade-offs and fit; disclose when content is educational.
3. **Licensed-professional deferral:** financial, legal, mortgage, insurance, tax,
   construction, and medical specifics route to appropriately licensed professionals.
4. **Transparent tools:** calculators use the member's real inputs and **state their
   assumptions**; outputs are labeled estimates, never advice or promises.
5. **Privacy & permissions:** documents and sensitive data are owner-controlled,
   consent-gated, and permission-scoped (adults/teens/children; collaborators).
6. **Child safety:** age-appropriate tone and scope; guardian safeguards respected.
7. **Before / during / after:** every Estate serves all three or it isn't done.

These render as **Safety & Trust Notices** (§3.19) at the right moments — calm, clear,
never alarming.

---

## 13. Example Estate Walkthroughs

**A) 🏡 Home — "buying my first home" (flagship).**
Welcome → Goal: *buying* → Stage: *just started* → Learn (FHA vs. VA vs. Conventional by
fit; closing costs) → Plan ("your path to keys in hand") → Checklist (pre-approval,
budget, agent) → Tools (affordability, honest loan comparison — assumptions stated;
**no invented rates**) → Documents (pre-approval letter) → Professionals (a **real vetted**
lender/realtor, or honest "coming soon") → Progress + State: *In Progress* → Milestone:
*offer accepted* (celebrate + capture) → Milestone: *keys in hand* (celebrate) →
Preserve to Library/timeline → Long-term: home maintenance & seasonal reminders →
**Cross-Estate:** offer Financial (equity) and Family.

**B) 💍 Wedding — "planning our wedding."**
Welcome → Goal: *full planning* → Stage: *just engaged* → Learn (budgeting, timeline) →
Plan → Checklist (venue, vendors, invitations) → Documents (contracts) → Tools (budget) →
Professionals (real vetted vendors) → Family (invite partner + planners, each with own
concierge) → Milestones (venue booked, day-of) → Celebrate + Capture (galleries,
guestbook) → Preserve → **Cross-Estate:** honeymoon → Travel; newlywed home → Home.

**C) 👶 New Baby — "preparing for our baby."**
Welcome → Goal: *preparing* → Stage: *expecting* → Learn (gentle, non-medical; **defers to
providers**) → Plan → Checklist (nursery, registry) → Documents → Family (add caregivers) →
Milestones (arrival) → Celebrate + Capture → Preserve → Long-term → **Cross-Estate:**
Family · Financial (savings) · Education (future) · Health · Home.

Each walkthrough uses the **same** modules, lifecycle, states, concierge, and trust rules —
only the configuration differs.

---

## 14. What Home Will Inherit

Home, as the flagship built at Step 10, inherits **the entire framework unchanged**:

- The 16-step lifecycle and the 14-state machine.
- All 20 shared modules (Welcome, Concierge, Goal Discovery, Stage Assessment, Learning,
  Plan, Checklists, Vault, Tools, Professionals, Family, Progress, Milestones,
  Notifications, Memory, Celebration, Preservation, Long-Term, Safety Notices, Settings).
- The concierge engine + governance; cross-Estate continuity; the universal route shape;
  the configuration model; the visual shell; honest empty states; the trust rules.

Home proves the framework end to end; it authors *config + content*, not new architecture.

---

## 15. What Remains Unique to Home

Home's **configuration and content** — not its architecture:

- **Goal types:** buying · building · finding · renting · selling · owning · investing.
- **Stages:** e.g. curious → pre-approved → searching → under contract → closed → owning.
- **Learning paths:** mortgage types (FHA/VA/USDA/Conventional/Jumbo), construction-to-perm,
  refinancing/HELOC/equity, ARV/BRRRR, market & neighborhood education.
- **Tools/calculators:** affordability, loan comparison, closing costs, down-payment
  savings, ROI/cash-flow, ARV/holding costs (all input-driven; live-rate tools gated).
- **Document types:** pre-approval, purchase agreement, inspection, appraisal, closing docs.
- **Professional categories:** realtor, lender, inspector, appraiser, contractor,
  interior designer, insurer, property manager, mover.
- **Milestones:** pre-approved · offer accepted · under contract · cleared to close ·
  keys in hand · moved in.
- **Unique nuances:** construction-timeline tracking; **dual audience** (owner-occupier and
  investor); the deepest professional network and partner ecosystem.
- **Cross-Estate transitions:** Financial, Family, Travel (Airbnb-guest), Legacy.

Everything above is data the framework consumes — the wing is unique, the house is shared.

---

## 16. Recommended Next Step

With the framework defined, the natural Step 4 is **Define the Concierge Architecture** —
how the concierge engine delivers §5 across every Estate: context assembly (Estate + goal +
stage + member/family + history), the module-action interface (draft checklist, open tool,
suggest professional), memory/personalization growth, permission/age adaptation, and the
governance/safety routing — all on the existing `askMagical()` + `Concierge` foundation.

**This remains design-only.** Per your instruction: no product code, no schema, no routes,
no merge, no deploy — and **Step 4 does not begin until you approve Step 3.**

---

*Prepared for founder review as Step 3 of the approved 12-step build order. No product
code, schema, routes, UI, or deployment were created. The member Home remains on the
feature branch, unmerged and undeployed.*
