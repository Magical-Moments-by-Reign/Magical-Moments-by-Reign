# Magical Moments by Reign — Master Design Bible

**The single source of truth.** If documentation and code ever conflict, the
Bible governs — notify the Founder to confirm direction before continuing.

- **[Brand Language, Account & Commerce Vision](./design-bible/STANDARD-brand-and-account.md)** —
  *Founder Approved.* Magical* naming (Magical Tracker™, Magical Moments Library,
  Magical AI, Magical Invitations, Magical Galleries), account sync, gifting &
  group contributions, payment roadmap. *Avoid "Legacy Timeline/Library."*
- **[Magical+ Ecosystem](./design-bible/STANDARD-magical-plus.md)** —
  *Founder Approved.* Wallet, credits, gift contributions, payments, and a
  provider-agnostic **Financing Gateway** — **not a bank/lender, no lending
  logic.** *Architecture layer built; balances/payments foundation-gated.*
- **[Platform Foundation — Accounts · Auth · Permissions · Notifications](./design-bible/STANDARD-platform-foundation.md)** —
  *Founder Approved · the shared spine.* One account/role/permission/notification
  model that activates all eight ecosystems — scrypt auth + hashed sessions,
  recover-before-duplicate sign-up, canonical roles (delegating to existing
  permission sets), child safeguards, a provider-agnostic notification dispatcher
  (in-app always; email/SMS/push seams), and secure hashed-token invitations.
  *Service libraries + schema built & tested (17 tests); login/OAuth UI +
  providers + scheduler gated.*
- **[Customer Identity & Duplicate Prevention](./design-bible/STANDARD-account-identity.md)** —
  *Founder Approved · Platform Foundation.* One person = one account, one
  account = one Library, every purchase attaches to the verified account.
  Multi-signal duplicate detection (shared address alone never matches),
  recovery-before-duplicate, balance-aware purchase gating, safe merges — **no
  lending/credit logic.** *Domain layer built & tested (38 unit tests) + full
  PostgreSQL data foundation (Accounts · Library · Tracker · Purchasing · gifts
  · collaborators, 14 enums); verification/UI gated on auth + billing.*
- **[Founder Constitution — Volume I](./design-bible/CONSTITUTION.md)** —
  *the highest governing document* (mission, purpose, pricing philosophy,
  Lifetime Collections, Founder approval). Referenced before any major decision.
- **[Book I — The Foundation](./design-bible/BOOK-I-FOUNDATION.md)** —
  the Founder's canonical vision (Dream, Mission, Vision, Philosophy, Five
  Pillars, Promises, Golden Rules, Legacy). *Author: Tabitha Coetha Turner.*
- **[Development Governance](./design-bible/GOVERNANCE.md)** — Founder
  authority, the document-before-build process, change management, and
  project discipline.
- **[Book II — Architecture & Build Status](./design-bible/BOOK-II-ARCHITECTURE.md)**
  — the living technical record and phased roadmap, subordinate to Book I and
  submitted for Founder review and acceptance.
- **[Volume II — The Life Journey Standard](./design-bible/STANDARD-life-journey.md)**
  — *Founder Approved.* The 20 sections **every** Life Journey must contain, with
  a live compliance map. No Journey ships until all twenty are complete.

## Global standards & journeys (documented; build on Founder approval)

- **[Pricing Engine v1.0](./design-bible/STANDARD-pricing-engine.md)** —
  *Founder Approved · canonical.* Build-your-own membership (Occasions × Term),
  live cart, smart savings, Lifetime Collections, Pricing Protection, upgrade
  credit, Journey Protection, Free Forever. *Engine + Build-Your-Membership
  built (first slice).*
- **[Guest Sharing & Public Experience Mode](./design-bible/STANDARD-guest-sharing.md)** —
  *Founder Approved.* "Share the Moment — not the entire account." Granular
  per-link permissions, five link types, account-less guestbook/RSVP/uploads
  (moderated by default), **server-side enforcement** (a private denylist can
  never be exposed), optional account-conversion. *Domain layer built & tested
  (24 tests) + schema; owner Share panel & Guest View gated on auth + storage.*
- **[Magical Access Pass™](./design-bible/STANDARD-magical-access-pass.md)** —
  *Founder Approved.* Recipient-bound private sharing: a one-time code to the
  owner-specified email/phone (forwarded links are useless), one-view/expiry/
  device controls, Privacy Score™, recipient watermarks, and a **versioned
  Sharing Acknowledgment**. Honest about screenshot limits — never overstated.
  *Domain layer built & tested (20 tests) + schema; code delivery, dashboard &
  recipient UI gated on auth + email/SMS + storage.*
- **[Vendor Marketplace](./design-bible/STANDARD-vendor-marketplace.md)** —
  *Founder Approved.* "Become a Vendor" — trusted **independent** businesses
  discovered by families. 43-category catalog, browse/filter, reviews, required
  **Vendor Notice**, disabled future monetization tiers. *Domain layer built &
  tested (11 tests) + schema + `/vendors` & `/vendors/apply` (live application);
  listings/reviews/admin gated on auth + storage + notifications.*
- **[Journey Experience & Preview](./design-bible/STANDARD-journey-experience.md)** —
  *Founder Approved.* An immersive guided per-Occasion page (hero → Magical AI
  welcome → what's included → timeline → sample → FAQ → pricing → add to cart)
  shown before checkout. *Built (first slice — every Occasion).*
- **[Magical Preview Pass](./design-bible/STANDARD-trial-membership.md)** —
  *Founder Approved · billing NOT live until fully verified.* A transparent trial
  that converts to a paid monthly membership unless canceled — exact price/date/
  length shown, never-pre-checked consent, easy online cancellation, one trial
  per customer. *Domain layer built & tested (18 tests) + schema + `/trial`
  page; card capture, Square recurring, reminders & conversion gated on auth +
  Square + email + legal review.*
- **[Magical Journey Preview™](./design-bible/STANDARD-journey-preview.md)** — *Founder
  Approved.* A hands-on **5-day premium trial** (one of three choices on the
  Journey Experience page). *Choice + transparent terms screen built; real
  billing gated on auth/payment.*
- **[Housing Hub](./design-bible/HOUSING-HUB.md)** — *Founder Approved · replaces
  the Home/New Home Journey.* The complete housing ecosystem (9 pathways +
  shared tools). *Entry + Build-a-Custom-Home built; rest phased.*
- **[Digital Invitations & Event Management](./design-bible/STANDARD-invitations.md)** —
  *Founder Approved · phased.* Built-in invitations + RSVP for every event,
  built from the customer's **real photos** (never replace people). *Needs
  auth/storage/notifications/AI.*
- **[Magical AI (Ask Magical)](./design-bible/STANDARD-magical-ai.md)** —
  *Founder Approved.* Floating site-wide AI concierge, Qwen-backed. *Built —
  needs `QWEN_API_KEY` to go live.*
- **[Admin Specials & Promotions](./design-bible/STANDARD-admin-specials.md)** —
  *Founder Approved.* Run promotions without code, with unbreakable Lifetime
  Value Protection + audit log. *Built (first slice).*
- **[Purchase Concierge™](./design-bible/STANDARD-purchase-concierge.md)** —
  *Founder Approved · new core platform.* Organize, track & manage purchases
  across every Journey (we never replace the merchant). *Built (first slice).*
- **[App-First Architecture](./design-bible/STANDARD-app-architecture.md)** —
  *Founder Approved · cross-cutting.* One backend, one DB, reusable APIs for web,
  PWA, and future native apps. *PWA installable now.*
- **[Book III — The Family Vault](./design-bible/BOOK-III-family-vault.md)** —
  the secure command center for everything a family protects and accesses.
- **[Gifts & Registries](./design-bible/STANDARD-gifts-registries.md)** — *built (first slice).*
- **[Live Video Calls + Messaging](./design-bible/STANDARD-communication.md)**
- **[Voice Notes & AI Transcription](./design-bible/STANDARD-voice-notes.md)**
- **[Baby Journey](./design-bible/JOURNEY-baby.md)** — pregnancy companion.
- **[New Home Journey](./design-bible/JOURNEY-new-home.md)** — homeowner experience.
- **[Sports Journey](./design-bible/JOURNEY-sports.md)** — *Founder Approved · phased.*
  The complete athlete platform (profile, game center, recruiting, scholarships,
  NIL education, resume) — educational only, never guarantees. *Preview content built.*
- **[Life Guidance Center](./design-bible/STANDARD-life-guidance.md)** —
  *Founder Approved · educational only.* Helps families prepare for milestones
  before they happen. Graduation Success Center: grade-by-grade timeline,
  plain-language guides, official resources, state-specific pointers, grade-based
  Ask Magical. *Domain + CMS schema + `/life-guidance` built & tested (8 tests);
  admin CMS + state-link curation gated.*
- **[Life After High School Ecosystem](./design-bible/STANDARD-life-after-highschool.md)** —
  *Founder Approved · educational only.* College discovery/compare, scholarship
  command center, financial calculators, savings goals, **every pathway with
  equal respect** (college/military/trade/apprenticeship/entrepreneurship/
  workforce/gap year), career exploration, application & enrollment checklists.
  *Domain + trackers schema built & tested (12 tests); datasets/UI/payments gated.*
- **[Family Financial Foundation](./design-bible/STANDARD-family-finance.md)** —
  *Founder Approved · educational only.* Age-appropriate financial milestones
  (incl. "My First Bank Account" badge), plain-language guides with official
  links (FDIC/CFPB/IRS), family savings goals, bank-appointment link-outs,
  age-based Ask Magical. *Domain + schema built & tested (7 tests); persistence/
  payments/bank links gated.*
- **[Family Birthday & Celebration Network](./design-bible/STANDARD-celebration-network.md)** —
  *Founder Approved.* A living family calendar that auto-repeats yearly (leap-year
  aware), monthly view, smart reminders (14/7/2/morning), group prefs, manual
  non-member entries, one-touch birthday actions, Ask Magical digest — privacy:
  only shared celebrations appear. *Domain + schema built & tested (12 tests).*
- **[Family Connections](./design-bible/STANDARD-family-connections.md)** —
  *Founder Approved.* One membership → the whole family participates; the Host
  invites guests (free to join), with host-controlled permissions, graceful
  premium-preview locks (Magical Preview Pass), shared timeline, private feed,
  video gatherings, and an opt-in **general-location** Family Map (never live
  tracking). Per-moment privacy. *Domain + schema built & tested (8 tests);
  video/storage/UI gated.*
- **[Family Command Center](./design-bible/STANDARD-family-command.md)** —
  *Founder Approved.* Private family communication & organization — roles,
  configurable permissions, messages, reminders, tasks, calendar, achievements,
  Ask Magical digest. **No location tracking / monitoring / surveillance, ever.**
  *Domain + schema built & tested (10 tests); logins/delivery/UI gated on auth.*
- **[The Life Operating System](./design-bible/VISION-life-operating-system.md)** — north-star vision.
- **[The Magical Moments Ecosystem](./design-bible/VISION-ecosystem.md)** —
  *Founder Vision.* A complete Life Celebration Ecosystem — "We've got you." /
  "Everything I needed was right here." Provider-agnostic **integrations
  registry** (8 groups, ~29 categories, connected/guided/coming-soon states,
  nothing faked) + per-occasion **"What do I need next?"** suggestions.
  *Architecture built & tested (9 tests); real providers register per category.*
- **[Journey Protection™](./design-bible/STANDARD-journey-protection.md)** — pause add-on *(pricing-model decision resolved by the [Pricing Engine](./design-bible/STANDARD-pricing-engine.md); recurring + Free Forever approved).*
- **[Legacy Guardian™ / Legacy Transfer™](./design-bible/STANDARD-legacy-guardian.md)** — account continuity & the Lifetime ownership-transfer benefit. *Phase A built (designate guardians in the Vault).*

Companion operational docs: `docs/COMMERCE.md`, `docs/DOMAINS.md`,
`docs/CUSTOM_WEBSITES.md`, `docs/SOCIAL_STUDIO.md`, `DEPLOY.md`.
