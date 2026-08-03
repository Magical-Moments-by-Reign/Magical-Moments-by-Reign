# Magical Moments by Reign — Master Architecture Blueprint
### The Life Estate Platform · Founder Review Draft

> *Design the city before we build the first mansion.*

This is the master plan for turning Magical Moments from a set of pages into a
**complete luxury life platform**. It defines the whole ecosystem, the shared
framework every Life Estate inherits, all fourteen estates, what makes each one
unique, the concierge's role, and the trust rules that protect the brand. Nothing
here is built yet — this is the architecture to approve **before** Home becomes the
flagship every other estate follows.

---

## 1. North Star

**We are the engine.** Magical Moments educates, guides, connects, organizes,
celebrates, and preserves — walking beside a family **before, during, and after**
every meaningful chapter of life. The standard is simple:

> If a customer still has to leave Magical Moments to figure out what to do next,
> that Life Estate is not finished.

Four beliefs shape every decision:

1. **Experience, not pages.** A customer never "visits a page." They walk into a
   room of their private estate where a team already knows their situation and the
   next step. (Disney: you're inside a story. Apple: it just works. Four Seasons:
   you're cared for. Amazon: everything, one place.)
2. **Luxury is a feeling** — peace, belonging, possibility, "I'm not doing this
   alone." Delivered through calm, space, and warmth, not noise.
3. **Trust is the product.** Education is neutral and honest; connections are real;
   the concierge guides and never sells. The moment we fake a partner, a rate, or a
   "you qualify," we become the thing we're replacing.
4. **One identity, many expressions.** The brand and the concierge are constant;
   their presentation adapts to each room and each person.

---

## 2. The Platform Model

Three layers, one continuous experience:

```
  PUBLIC WORLD                YOUR MAGICAL SPACE                THE LIFE ESTATES
  (invitation)                (the private home)                (the ecosystems)
  ───────────                 ─────────────────                 ────────────────
  Homepage / marketing   →    Home dashboard              →     Home · Wedding · Family
  Pricing / How it works      Welcome + Concierge               Education · Career · Business
  Sign in / Get started       "What matters today"              Health · Travel · Celebrations
  Full-color logo             Champagne-gold logo               Financial · Vehicles · Pets
  Warmth, joy, celebration    Calm, refined, private            Retirement · Legacy
```

- **Public World** — the colorful, welcoming front door (existing marketing site).
  Its job is recognition and invitation. *Not in scope to change until Home is locked.*
- **Your Magical Space** — the member Home (already prototyped): a warm estate that
  greets you, hosts your named concierge, and answers "what matters in your life
  today," with quiet links into each Life Estate. This is the hub.
- **The Life Estates** — fourteen complete ecosystems. Each is a *destination you
  live in over time*, not a checklist you complete once.

**How estates map to the business model.** A Life Estate is the mature evolution of
today's **Journey / Experience**. Membership already grants a number of Journeys
(Free Forever $0; Lifetime Legacy $2,499 / 5; Lifetime Reign $4,999 / 10; Lifetime
Magical Moments $9,999 / all + custom; 5-day Preview). Going forward, **a Journey
becomes a Life Estate** — the customer "opens" an estate the way they buy a Journey
today, and it unlocks that ecosystem inside their Magical Space.

---

## 3. The Shared Life Estate Framework

Every estate inherits the **same thirteen systems**. Build once, reuse fourteen
times. This is the single most important part of the blueprint: it is why we design
the framework before any estate. Each system below lists *what it is*, *how it
works*, *the honesty rule*, and *the concierge's role*.

### 3.1 Welcome Experience
- **What:** The first arrival into an estate — a warm, personal introduction that
  orients, never overwhelms. Mirrors the concierge naming moment.
- **How:** A short, photographic welcome that names where the customer is in their
  journey ("just exploring" vs. "mid-renovation") and offers 2–3 next steps.
- **Honesty:** Reflects the customer's real state; no fake progress.
- **Concierge:** Greets by name and by situation ("I see you're comparing mortgages…").
- **Reuses:** the Home welcome pattern + `Concierge` model already built.

### 3.2 Concierge Interactions
- **What:** The named personal advisor, present in every estate, aware of context.
- **How:** Estate-scoped prompts feed the concierge so it can educate and suggest
  next steps relevant to *this* room; conversation lives in one place across estates.
- **Honesty:** Educate, organize, encourage, explain — **never pressure or sell**;
  always defer legal/financial/medical/construction specifics to a licensed pro.
- **Reuses:** `askMagical()` seam + governance (Constitution Article V) already in code.

### 3.3 Education
- **What:** Neutral, genuinely useful learning — the "understand, don't just list"
  mandate (e.g. FHA vs. VA vs. Conventional explained by fit, not brand).
- **How:** Structured **learning paths** (guided sequences) + a library of articles.
- **Honesty:** No invented figures; explain trade-offs; cite when a licensed pro is
  the right source.
- **Reuses:** `GuideArticle` model + `/life-guidance`.

### 3.4 Planning
- **What:** Turns understanding into a plan — timelines, budgets, comparisons.
- **How:** Estate-specific planners and comparison tools (loan comparison, renovation
  budget, trip itinerary) that compute from the customer's own inputs.
- **Honesty:** Calculators are transparent and input-driven; results are estimates,
  clearly labeled, never a promise or an approval.

### 3.5 Checklists
- **What:** The "you never wonder what's next" backbone — living, ordered steps.
- **How:** Templated per estate/sub-journey, personalized, checkable, concierge-aware.
- **Honesty:** Real state persisted per account; no pre-checked theater.
- **Reuses:** `FamilyTask` / reminder patterns.

### 3.6 Documents
- **What:** A secure home for the paperwork of a chapter (pre-approval letter, lease,
  floor plan, inspection report, contract).
- **How:** Per-estate document vault with categories and reminders.
- **Honesty & privacy:** Encrypted-at-rest posture, owner-controlled, never shared
  without consent. Sensitive docs are a trust boundary.
- **Reuses:** `FamilyDocument`, `MediaAsset`, the Vault (`/dashboard/vault`).

### 3.7 Professional Connections
- **What:** The "Our Partners" layer — realtors, lenders, inspectors, contractors,
  designers, attorneys, advisors, property managers, movers, cleaners.
- **How:** Connections flow through the **existing vetted Vendor marketplace**
  (applications, compliance, credentials, bookings, reviews) — a real, accountable
  system, not a directory.
- **Honesty (non-negotiable):** We show **real vetted vendors** where they exist and
  an honest "connections coming soon" where they don't. **No fabricated firms, no
  fake "3 professionals matched," no invented rates.** Matching explains *why*.
- **Reuses:** `Vendor`, `VendorApplication`, `VendorBooking`, `VendorReview`, compliance.

### 3.8 Financial Tools
- **What:** Honest calculators and readiness aids (affordability, ROI, cash flow,
  down-payment savings, closing costs, ARV/holding costs for flips).
- **How:** Input-driven, transparent formulas; savings goals with real progress.
- **Honesty:** Educational estimates only; never financial advice; always "confirm
  with a licensed professional." No credit decisions, no rate quotes we don't have.
- **Reuses:** `SavingsGoal`, `SavingsContribution`, `FinancialMilestoneProgress`,
  `BankAppointment`.

### 3.9 Progress Tracking
- **What:** Where the customer *is* in the estate, at a glance and in depth.
- **How:** A per-estate tracker with stages and completion, surfaced on Home.
- **Honesty:** Reflects real activity; zeros for new members.
- **Reuses:** `MagicalTracker` + `MagicalTrackerStage`.

### 3.10 Milestones
- **What:** The meaningful markers — "pre-approved," "offer accepted," "keys in hand,"
  "moved in" — celebrated, not just logged.
- **How:** Estate-defined milestone sets; reaching one triggers a warm moment + a
  memory capture prompt.
- **Reuses:** `FinancialMilestoneProgress`, `FamilyAchievement`, tracker stages.

### 3.11 Memory Preservation
- **What:** The "after" — every chapter becomes a preserved story in the Library.
- **How:** Photos, documents, and milestones from an estate gather into the Magical
  Moments Library and the family timeline.
- **Honesty:** Nothing lost; owner-controlled; permanent account.
- **Reuses:** `LibraryEntry`, `FamilyTimelineEntry`, galleries.

### 3.12 Celebration
- **What:** Marking the joy — move-in day, graduation, anniversary — with the family.
- **How:** Celebration moments, invitations, shared galleries, guestbooks.
- **Reuses:** `CelebrationEntry`, `Invitation`, `ShareLink`, guestbook models.

### 3.13 Long-term Management
- **What:** Estates don't "end." Home becomes maintenance + seasonal reminders;
  Financial becomes ongoing planning; Legacy is lifelong.
- **How:** Recurring reminders, seasonal nudges, annual reviews, ongoing tracking.
- **Reuses:** reminders, notifications, calendar events.

**Framework summary:** these thirteen systems are the "luxury foundation every estate
inherits." An estate is defined by *which systems it emphasizes* and *what unique
content and journeys it adds* — never by re-inventing the foundation.

---

## 4. The Fourteen Life Estates

Each estate below: **purpose**, its **rooms/journeys**, **what makes it unique**, and
**existing seeds** in the codebase. Home is specified in most depth as the flagship.

### 4.1 🏛 Home Life Estate — *the flagship*
- **Purpose:** Everything about a home — from first curiosity to lifelong ownership.
- **Rooms (sub-journeys):** Buying · Building · Finding · Renting · Selling ·
  Renovations · Repairs · Rental-Property Investing · Airbnb (host **and** guest) ·
  House Flipping.
- **Unique:** The deepest education layer (mortgage types, construction-to-perm,
  ARV/BRRRR, cash flow), the richest professional network (lenders, realtors,
  inspectors, contractors, PMs), construction-timeline tracking, and dual audiences
  (owner-occupier **and** investor).
- **Seeds:** `/housing-hub`, `housing-hub.ts`, `/journey/new-home`, journeys engine.
- **Standard set here:** Home is where we prove all thirteen framework systems.

### 4.2 💍 Wedding Life Estate
- **Purpose:** Engagement → wedding → married life.
- **Rooms:** Budget & vision, venue, vendors, guest list & invitations, registry,
  timeline, day-of, honeymoon hand-off (→ Travel).
- **Unique:** Guest/RSVP + invitations + galleries are central; heavy vendor
  coordination; strong celebration + memory layers.
- **Seeds:** `/journey/wedding`, `Rsvp`, `Invitation`, `GuestbookEntry`, galleries.

### 4.3 👨‍👩‍👧 Family Life Estate
- **Purpose:** The shared life of the household across time.
- **Rooms:** Family command center, calendar, tasks, messages, documents, timeline,
  achievements, gatherings, connected members (each with their **own** concierge).
- **Unique:** Multi-member by nature; guardianship & child-safety; the connective
  tissue that links other estates for a family.
- **Seeds:** `Family*` models (Message, Reminder, Task, CalendarEvent, Achievement,
  TimelineEntry, Gathering, MapLocation), `family-command.ts`, `/account/family`.

### 4.4 🎓 Education Life Estate
- **Purpose:** School → college → funding → beyond.
- **Rooms:** College search & visits, applications, scholarships, savings (529-style
  goals), decision support.
- **Unique:** Already has real data models; strong financial-tools overlap.
- **Seeds:** `CollegeFavorite`, `CollegeVisit`, `CollegeApplication`, `ScholarshipEntry`.

### 4.5 💼 Career Life Estate
- **Purpose:** Job search, growth, transitions, retirement hand-off (→ Retirement).
- **Rooms:** Resume/portfolio, opportunity tracking, interview prep, skill paths,
  compensation understanding.
- **Unique:** Education-heavy, document-heavy (resumes, offers); professional
  connections = coaches/recruiters.

### 4.6 🏢 Business Life Estate
- **Purpose:** Start, run, and grow a business or side venture.
- **Rooms:** Idea → formation, planning, finances, compliance, growth.
- **Unique:** Connects to the **Vendor/partner** side of the platform; heavy on
  documents, financial tools, professional (attorney/accountant) connections.

### 4.7 🌿 Health & Wellness Life Estate
- **Purpose:** Physical, mental, and family wellbeing over time.
- **Rooms:** Goals & habits, appointments, records, wellness planning.
- **Unique:** **Highest sensitivity.** Strict privacy; the concierge *never*
  diagnoses or advises medically — it organizes and points to licensed professionals.

### 4.8 ✈️ Travel Life Estate
- **Purpose:** Dream → plan → experience → remember a trip.
- **Rooms:** Inspiration, itinerary & budget, bookings, packing checklists, memories.
- **Unique:** Strong "during" (live itinerary) and "after" (galleries); ties to
  Airbnb-guest from the Home estate.

### 4.9 🎉 Celebrations Life Estate
- **Purpose:** Birthdays, anniversaries, graduations, holidays, memorials.
- **Rooms:** Occasion planning, invitations, registries/gifts, galleries, reminders.
- **Unique:** The recurring-celebration engine already exists.
- **Seeds:** `CelebrationEntry`, `CelebrationReminderPref`, `celebration-network.ts`,
  gift models.

### 4.10 💰 Financial Planning Life Estate
- **Purpose:** Budget, save, plan, build wealth responsibly.
- **Rooms:** Goals, savings, milestones, planning tools, advisor connections.
- **Unique:** The financial-tools framework "home base"; feeds every other estate's
  calculators. **Educational only — never financial advice.**
- **Seeds:** `SavingsGoal`, `SavingsContribution`, `FinancialMilestoneProgress`,
  `BankAppointment`.

### 4.11 🚗 Vehicles Life Estate
- **Purpose:** Buy, finance, insure, maintain, sell vehicles.
- **Rooms:** Research & compare, financing, maintenance tracking, records.
- **Unique:** Maintenance/seasonal reminders + documents (title, insurance).

### 4.12 🐾 Pets Life Estate
- **Purpose:** The life of a family's pets.
- **Rooms:** Adoption/onboarding, vet records, reminders, care planning, memories.
- **Unique:** Warm, memory-rich; light financial layer; privacy on health records.

### 4.13 🌅 Retirement Life Estate
- **Purpose:** Prepare for and live retirement well.
- **Rooms:** Readiness education, savings/income planning, healthcare, lifestyle,
  legacy hand-off (→ Legacy).
- **Unique:** Long-horizon planning + strong professional (advisor) connections.

### 4.14 🕊 Legacy Life Estate
- **Purpose:** Preserve and pass on what matters — the lifelong estate.
- **Rooms:** Memories, important documents, wishes, tributes, memorials.
- **Unique:** The estate that never closes; deepest memory-preservation; highest
  sensitivity and privacy. (Note: keep distinct from "Project Legacy," a separate
  company — brand-naming guardrail already in code.)

---

## 5. The Concierge as Life Advisor

The concierge is the thread through every estate.

- **One relationship, everywhere.** The customer's named concierge (Journey, Grace,
  Atlas…) appears in every estate; each family member has their own. Context changes
  room to room; the relationship is constant.
- **Situationally aware.** It reads the customer's real state ("comparing mortgage
  offers," "planning a renovation") and offers the honest next step, a checklist, or
  a relevant professional — proactively, calmly.
- **Governed.** Educate, organize, encourage, explain. **Never** pressure, sell,
  diagnose, quote a rate, or promise an outcome; **always** defer specialist matters
  to a licensed professional. (This governance already exists in `ask-magical.ts`.)
- **Grows over time.** Preferences, family, dates, and history make it more personal
  the longer a family stays (the `Concierge` model already reserves room for this).

---

## 6. Data & Technical Architecture (how the blueprint becomes real)

The framework is buildable on top of what exists. Proposed shape:

- **`LifeEstate` (catalog)** — the definition of an estate (key, name, rooms,
  milestone sets, checklist templates, learning paths). Config-driven so estates are
  data, not bespoke code.
- **`EstateInstance` / progress** — a customer opening an estate; reuses
  `MagicalTracker` + stages for progress and milestones.
- **Shared-system services** — Education (`GuideArticle` + learning paths),
  Checklists (task templates), Documents (vault), Financial tools (calculators +
  `SavingsGoal`), Progress (`MagicalTracker`), Memory (`LibraryEntry` + timeline),
  Celebration (`CelebrationEntry` + invitations), Connections (`Vendor` marketplace).
- **Concierge context** — estate-scoped prompt context layered on the existing
  `askMagical()` seam + `Concierge` model.
- **Estates = evolved Journeys** — align to the existing Journey/Experience &
  membership model so purchasing/entitlement already works.

**Principle:** one reusable framework + per-estate *configuration and content*.
Adding an estate should be mostly data + content + a few unique tools — not a rebuild.

---

## 7. Trust & Compliance Layer (the non-negotiables)

These protect the brand and are wired into every estate from day one:

1. **No fabrication.** No invented partners, rates, approvals, matches, or numbers.
   Real data or an honest "coming soon."
2. **Education is neutral.** Explain trade-offs and fit; don't steer to a paid party.
3. **Licensed-professional deferral.** Legal, medical, financial, tax, insurance,
   and construction specifics always route to a qualified professional.
4. **Calculators are transparent** and input-driven; outputs are labeled estimates,
   never advice or promises.
5. **Privacy by default.** Documents and health/legacy data are owner-controlled,
   consent-gated, and never shared silently. Sensitive estates (Health, Legacy,
   Financial) get the strictest handling.
6. **Before / during / after.** Every estate must serve all three, or it isn't done.

---

## 8. Phasing — build Home to the gold standard, then inherit

1. **Phase 0 — Approve this blueprint.** (You are here.)
2. **Phase 1 — Lock the member Home** (apply your pending change notes to the
   already-built luxury Home). This is the hub every estate opens from.
3. **Phase 2 — Build the reusable Life Estate framework** (the thirteen shared
   systems as real, config-driven services).
4. **Phase 3 — Build the Home Life Estate as the flagship** on that framework —
   the full ecosystem (buy/build/find/rent/sell/renovate/repair/invest/Airbnb/flip),
   proving all thirteen systems end to end. This becomes the reference every estate
   copies.
5. **Phase 4 — Roll out estates** in a deliberate order (suggested by existing data
   readiness + emotional pull): **Celebrations, Family, Education, Financial** (strong
   existing models) → **Wedding, Travel** → the rest. Each new estate is mostly
   configuration + content + a few unique tools.
6. **Ongoing — Public World** (homepage/login redesign) once Home is locked — on hold
   per your instruction until then.

**Definition of done, per estate:** all thirteen framework systems present; every
"next step" answered inside the platform; honesty rules satisfied; the concierge can
guide the whole arc; before/during/after all served.

---

## 9. What I need from you

1. **Approve or adjust this blueprint** — especially: the fourteen-estate list, the
   thirteen shared systems, the "estates = evolved Journeys" model, and the phasing.
2. **Your pending Home change notes** — you flagged the member Home "needs changes
   first." Tell me what to adjust; I'll revise and re-publish the private preview so
   Home is locked as the gold standard before we build the framework on it.

Once the blueprint is approved and Home is locked, Home becomes our first fully
realized Life Estate, and every future estate inherits the same luxury foundation.

---

*Prepared for founder review. No code was written for this blueprint; the current
member Home remains on the feature branch, unmerged and undeployed.*
