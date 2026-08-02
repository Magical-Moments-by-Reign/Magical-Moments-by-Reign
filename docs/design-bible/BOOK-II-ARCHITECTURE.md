# Master Design Bible — Book II — Architecture & Build Status

> **Subordinate to Book I.** This book is the living record of how the platform
> is being built to serve the Founder's vision. Every item here is a
> **recommendation and/or work submitted for Founder review and acceptance** —
> nothing is "released" until the Founder accepts it. Pricing, branding, and
> business logic follow the Founder's prior direction and are not changed
> without approval.

Each entry maps to a Golden Rule (Book I, Ch. 9): reduce stress · save time ·
preserve memories · strengthen relationships · create joy.

---

## The Master Timeline (the spine)

Customers buy **Life Journeys**, and each becomes a connected chapter in one
**Family Legacy Timeline**:

> Proposal → Wedding → Honeymoon → First Home → Pregnancy → Baby → Birthdays →
> Vacations → Graduations → Anniversaries → Retirement → Legacy → Future Generations

Nothing is ever deleted. Nothing is ever lost. Every chapter stays connected.

---

## Build status (submitted for Founder acceptance)

| Capability | Status |
| --- | --- |
| Experiences engine (unique themed page per journey) | Built |
| Legacy Timeline + layered journeys | Built |
| Private custom share links (checklist, password, expiry, roles) | Built |
| **Guest Sharing & Public Experience Mode** (share the Moment, not the account) | **Domain layer built & tested (24 unit tests)** — granular view/interaction permissions, 5 link types, server-side `evaluateAccess`/`resolveCapabilities` (private denylist never exposed, no URL-tamper bypass), account-less guestbook/RSVP/uploads (moderated by default), verified-only attendance connect, account-conversion copy · schema: ShareLink extended + GuestbookEntry/GuestUpload/Rsvp · owner Share panel + Guest Experience View UI gated on auth + storage + notifications — see [standard](./STANDARD-guest-sharing.md) |
| **Magical Access Pass™** (recipient-bound private sharing) | **Domain layer built & tested (20 unit tests)** — recipient binding + masked destination, hashed opaque tokens, one-time code verification (rate-limited, timing-safe), duration/view-limit/status resolution (revocation every request), one-view grace, device controls (secondary to verification), Privacy Score™, watermark labels (originals untouched), versioned Sharing Acknowledgment, fail-closed access · schema: MagicalAccessPass + AccessPassVerification/Session/Audit + RecipientAgreement + SharingAcknowledgment · code delivery (email/SMS), Magical Access dashboard & recipient UI gated on auth + notifications + storage · honest about screenshot limits — see [standard](./STANDARD-magical-access-pass.md) |
| Media uploads + per-package limits | Built · needs Storage keys |
| Tributes: family messages + poems | Built |
| Custom domains + Legacy Protection | Built · needs registrar + scheduler |
| Commerce: cart, checkout, Square hooks, orders | Built · needs Square keys |
| Custom-website + Custom Concierge pipelines | Built |
| **White-Glove Concierge Experience** ($5,000 one-time, application-based) | **Built** — dedicated `/concierge` page (hero, full inclusions incl. white-glove setup checklist, AI personalization, launch day, two weeks of support, "then it becomes yours", lasting legacy) + `/pricing` summary card; CTA routes to the concierge **application/consultation** (`/contact?reason=concierge`), never a self-serve checkout — no payment faked |
| Social Studio (official platforms + coming-soon) | Built |
| Transactional email | Built · needs Resend key |
| Inspiration Gallery | Built |
| Mobile navigation | Built |
| SEO / metadata / structured data | Built |
| Wedding Journey planner (welcome → roadmap → checklist → budget) | Built (first slice) |
| AI Roadmap / concierge planner (other journeys) | In progress |
| Reminders / scheduled nudges | Planned · needs scheduler |
| Gifts & Registries (global standard) | **Built** (expanded — registry links, cash handles, individual gift items, charitable giving, occasion-specific wording on every experience type) · Square payments / guest reserve / thank-you tracker / notifications phased — see [standard](./STANDARD-gifts-registries.md) |
| Live Video Calls + Messaging (global) | Documented · needs video/SMS providers — see [standard](./STANDARD-communication.md) |
| Baby Journey (pregnancy companion) | Documented · phased — see [journey](./JOURNEY-baby.md) |
| New Home Journey (homeowner experience) | Documented · phased — see [journey](./JOURNEY-new-home.md) |
| Family Vault (Book III) | **Built** (first slice) · needs auth + secure storage — see [book III](./BOOK-III-family-vault.md) |
| **Purchase Concierge™** (new core platform) | **Built** (first slice — Purchase Center, Smart Order Tracking, wishlists, delivery reminders) · price compare/payments/in-app returns need merchant partners — see [standard](./STANDARD-purchase-concierge.md) |
| **App-First Architecture** (web · PWA · native) | **PWA installable** (manifest, service worker, offline, icons) · one backend/one DB confirmed · mobile Today Dashboard next — see [standard](./STANDARD-app-architecture.md) |
| Voice Notes & AI Transcription (global) | Documented · needs speech-to-text — see [standard](./STANDARD-voice-notes.md) |
| Digital Invitations & Event Management (RSVP, from real photos) | Documented · phased · needs auth + storage + notifications + AI — see [standard](./STANDARD-invitations.md) |
| **Magical AI (Ask Magical)** — floating concierge | **Built** (site-wide widget, Qwen-backed via OpenAI-compatible endpoint) · needs `QWEN_API_KEY` to go live; graceful offline reply — see [standard](./STANDARD-magical-ai.md) |
| **Life Guidance Center** (Graduation Success — educational) | **Built & tested (8 unit tests)** — grade 8–12 timeline, 20 graduation topics, plain-language guides w/ official links (FAFSA/College Board/BigFuture/ACT), 50-state + DC official-source pointers, grade-based Ask Magical recommendations · schema: GuideArticle CMS (+ GuideStatus) · `/life-guidance` page · admin CMS UI + per-state link curation + Ask Magical wiring gated on auth · educational only, never guarantees — see [standard](./STANDARD-life-guidance.md) |
| **Life After High School Ecosystem** (educational) | **Built & tested (12 unit tests)** — college search/filter/compare, scholarship command center (summary + deadlines), financial calculators (cost of attendance, remaining cost, amortized loan estimate), savings-goal math, 8 alternative pathways (equal respect), career fields, application/enrollment checklists · schema: CollegeFavorite/CollegeVisit/ScholarshipEntry/CollegeApplication/SavingsGoal(+Contribution) · college datasets, saved trackers, doc uploads, payments & UI gated on auth+data+storage+payments · educational only, nothing fabricated — see [standard](./STANDARD-life-after-highschool.md) |
| **Family Financial Foundation** (educational) | **Built & tested (7 unit tests)** — 14 age-appropriate milestones (incl. First Bank Account + badge), plain-language finance guides w/ official links (FDIC/CFPB/MyMoney/IRS/IdentityTheft/FSA), family savings goals (shared math), bank-appointment link-out model (never books on behalf), age-based Ask Magical · schema: FinancialMilestoneProgress + BankAppointment (+ shared SavingsGoal) · persistence, payments/529 resources, bank partnerships, UI gated on auth+payments · educational only — see [standard](./STANDARD-family-finance.md) |
| **Family Command Center** (private, no surveillance) | **Built & tested (10 unit tests)** — roles, owner-configurable permission-based access (children see only what's allowed), family messages, smart reminders, task manager, partner organizer, calendar, achievements, Ask Magical family digest, notification prefs · **privacy: no location tracking/monitoring/surveillance (locationTrackingAllowed=false)** · schema: FamilyMember permissions/notifyPrefs + FamilyMessage/Reminder/Task/CalendarEvent/Achievement · per-member logins, delivery & UI gated on auth+notifications — see [standard](./STANDARD-family-command.md) |
| Life Operating System (vision) | North-star — see [vision](./VISION-life-operating-system.md) |
| **Magical Moments Ecosystem** (integrations registry + "What do I need next?") | **Architecture built & tested (9 unit tests)** — provider-agnostic registry (8 groups, ~29 categories, native/api/embed/affiliate/guided connection types, connected/guided/coming-soon states — nothing hardcoded or faked) + per-occasion suggestions (`suggestionsForOccasion`/`whatDoINeedNext`) · real providers/keys/partnerships + in-context surfaces gated per category — see [vision](./VISION-ecosystem.md) |
| **"Everything Included" value section** (value-then-price on /pricing) | **Built** — grouped feature clusters (The Complete Toolkit · Magical Moments for Every Occasion · Sharing, Privacy & Preservation), value promise + "No Hidden Fees / No Feature Unlocks / Everything Included" badge, gold-foil medallions + album-corner hover, low-opacity logo watermark, then the "How Long Would You Like Us to Preserve Your Magical Moment?" pricing headline above the plan cards · customer-facing copy avoids "journey" (uses "Magical Moment") · built in the site's existing type system rather than the mockup's Fraunces/Karla for consistency (font swap is a follow-up if desired) |
| **Pricing Engine v1.0** (build-your-own membership) | **Built** (engine + Build-Your-Membership + Free Forever entry; Monthly term, 3/8/15 Lifetime recommendations, price ceiling) · amounts placeholder except Lifetime Collections · needs auth + Square for real checkout — see [standard](./STANDARD-pricing-engine.md) |
| **Admin Specials & Promotions Center** | **Built** (first slice — create/schedule/pause/end, Lifetime Value Protection, audit log) · analytics/email/SMS/test-preview phased — see [standard](./STANDARD-admin-specials.md) |
| Free Forever (required account · $0 entry) | **Built** (selection + $0.00 checkout → Family Vault) · real account persistence needs auth — see [standard](./STANDARD-pricing-engine.md) |
| Journey Experience (immersive per-Occasion tour) | **Built** (first slice — every Occasion: hero, AI welcome, timeline, sample, FAQ, pricing, 3-option CTA) · marketplace/AI Q&A phased — see [standard](./STANDARD-journey-experience.md) |
| **Magical Journey Preview™** (5-day premium trial) | **Built** (choice + transparent terms/checkout screen: picker, price, dates, limits, reminders) · real start needs auth + payment capture + billing scheduler — see [standard](./STANDARD-journey-preview.md) |
| **Housing Hub** (renames Home/New Home Journey) | **Built** (entry — 9 pathways + Build-a-Custom-Home live) · pathways/tools need data + auth + storage — see [Housing Hub](./HOUSING-HUB.md) |
| Sports Journey (athlete platform) | **Preview content built** (athlete-focused Preview Mode page) · full platform (game center, resume, recruiting, scholarships, NIL, coach portal) phased · needs auth + storage + AI — see [journey](./JOURNEY-sports.md) |
| New Home → Build-a-Home (Housing Hub pathway) | **Built** (first slice — intake → roadmap + 28-stage timeline) · data centers (floor plans, budget, build team) need auth + storage — see [journey](./JOURNEY-new-home.md) |
| Journey Protection™ (pause add-on) | Documented · pricing-model **resolved** (recurring + Free Forever approved) · needs billing/auth — see [standard](./STANDARD-journey-protection.md) |
| Legacy Guardian™ / Legacy Transfer™ (Lifetime benefit) | **Phase A built** (designate Primary/Secondary guardians in the Vault — data only) · verified ownership transfer needs auth + review — see [standard](./STANDARD-legacy-guardian.md) |
| **Vendor Marketplace** ("Become a Vendor") | **Built (first slice)** — pure domain (43-category catalog, profile shape, reviews + rating math, browse/filter, required Vendor Notice, disabled monetization tiers) + 11 tests; schema Vendor/VendorReview/VendorApplication (+ enums); `/vendors` marketplace (filters + honest empty state + categories + Become-a-Vendor) and `/vendors/apply` (live application → VendorApplication) · listings/reviews/Save/admin gated on auth + storage + notifications · vendors are independent — see [standard](./STANDARD-vendor-marketplace.md) |
| **Primary & Standby Vendor System** (Vendor Protection) | **State machine built & tested (16 unit tests)** — primary-only vs primary+standby, acceptance-gated confirmation, activate/release transitions with notification targets, timeline milestones, disclaimers · schema VendorBooking + VendorBookingEvent (+ enums) · customer/vendor dashboards & notification delivery gated on auth + live vendors — see [standard](./STANDARD-vendor-marketplace.md#primary--standby-vendor-system-vendor-protection) |
| **Vendor Quality Standards & Review Policy** (three-strike, verified) | **Policy engine built & tested (11 unit tests)** — verified-only negatives, graduated three-strike actions (search penalty → formal warning → removal), one-year probation + reinstatement (not guaranteed), immediate-suspension rights · schema: Vendor perf fields + VendorStatus REMOVED + VendorReview verification + VendorStrike/VendorPerformanceEvent · review-invite/admin-verification/search-ranking/notifications gated on auth + live bookings — see [standard](./STANDARD-vendor-marketplace.md#vendor-quality-standards--review-policy) |
| **Vendor Membership, Verification & Compliance** (no upfront fee) | **Engine built & tested (16 unit tests)** — annual verification checklist, compliance evaluation (missing/expired/expiring), auto in/out of marketplace, fee-from-first-booking + annual renewal (next booking → else direct payment), 90/60/30/14/7/day-of expiration reminders, independent-contractor + no-insurance + right-to-verify copy · schema: Vendor membership fields + VendorCredential + VendorMembershipEvent (+ VendorMembershipStatus enum) · fee deduction (Square), document uploads (storage), vendor/admin compliance dashboards + reminder delivery gated on auth + Square + storage + notifications — see [standard](./STANDARD-vendor-marketplace.md#vendor-membership-verification--compliance) |
| Vendor discovery + booking | Planned · needs 3rd-party APIs |
| AI venue/decor visualizer | Planned · needs image generation |
| **Magical+ Ecosystem** (wallet, credits, gifting, financing gateway) | **Architecture built** (pure domain + provider-agnostic Financing Gateway, no lending logic) · balances/payments/financing need auth + billing + providers — see [standard](./STANDARD-magical-plus.md) |
| **Platform Foundation** (Customer Accounts · Library · Tracker · Purchasing · AI) | **Foundation slice built** — see the identity row below + the Library/Tracker data models; the five systems are the operating system every Experience must plug into · UI/wiring gated on auth + billing + storage |
| **Customer Identity & Duplicate Prevention** (one person = one account) | **Domain layer built & tested (38 unit tests, `npm test`)** + full PostgreSQL data foundation (Account, AccountIdentity, CustomerEmail/Phone/Address, AccountRestriction, AccountRecoveryAttempt, AccountStatusHistory, DuplicateCandidate, AccountMergeRecord, CustomerAuditLog, LibraryEntry, MagicalTracker(+Stage), Balance, PaymentPlan, GiftPurchase, GiftRecipient, GroupContribution, CollaboratorPermission; 14 enums) — normalization, exact + weighted duplicate detection (shared address alone never matches), recovery decisions, balance-aware purchase gating, masking, safe merge planning, admin-review objects · verification (email/SMS), Square ids, encryption, admin review UI need auth + billing · **no lending/credit logic** — see [standard](./STANDARD-account-identity.md) |
| Accounts / auth + role-based family access | Planned (next: auth wiring onto the built Account foundation) |

---

## The Life Journey Standard (Volume II)

Every Life Journey must contain the **20 standard sections** defined in
[Volume II — The Life Journey Standard](./STANDARD-life-journey.md) (hero,
overview, roadmap, smart checklist, calendar, Magical AI, document vault,
gallery, voice notes, Purchase Concierge, marketplace, messaging, video calls,
sharing, registry & cash gifts, notifications, settings, final memory book,
celebration screen, Founder standard). That document holds the live per-section
compliance map and the foundation-first path to full compliance. No Journey is
submitted for Founder approval until all twenty are complete.

## Brand, account & commerce vision

Per the [Brand, Account & Commerce standard](./STANDARD-brand-and-account.md):
consistent **Magical\*** naming (Magical Moments Library, Magical Tracker™,
Magical AI, Magical Invitations, Magical Galleries; never "Legacy Timeline/
Library" — Project Legacy is separate), **one account per verified email** with
auto-sync of every purchase, **gifting + group contributions**, and a **payment
roadmap** (Square + Affirm/Klarna → Magical Pay™). Customer-facing "Legacy
Timeline" copy has been renamed to **Magical Moments Library**; the rest is
foundation-dependent (auth + billing + storage) and phased — nothing faked.

## Journey modules (per Founder specs)

- **Wedding Journey — "From Yes… to I Do." → "Our Marriage"**: welcome/stage,
  couple profile, AI roadmap (countdown, monthly/weekly checklist, budget),
  engagement, wedding party + portal, invitations/RSVP, registry + cash fund
  (handles only — we never hold funds), vendor discovery, guestbook,
  wedding-day live feed, after-the-wedding gallery, and the transition into
  married life.
- **Birthday Journey**: begins 6 months before by default (start today / remind
  me later / begin six months before); age-aware theme catalogs (1–5, 6–12,
  Teen, Adult); venue visualizer; vendor booking; budget.
- **Other journeys (same engine)**: Baby, Vacation, Graduation, New Home,
  Anniversary, Memorial, Military, Retirement, Sweet 16 / Prom / Grad, Custom.

---

## Phased roadmap (recommended — pending Founder approval)

- **Phase 1 — Foundation (built, pending acceptance):** experiences, galleries,
  inspiration, pricing/cart/checkout, dashboard, social, custom-website,
  domains, media, tributes, legacy timeline + sharing, SEO, mobile.
- **Phase 2 — Guided Journeys (in progress):** Wedding Journey planner shipped;
  birthday theme recommender next. Self-contained, no external services.
- **Phase 3 — Automation & money movement:** reminder scheduler, registry +
  cash-fund handles, RSVP + guest management.
- **Phase 4 — People & permissions:** accounts/auth, wedding-party invitations +
  private portal, role-based family access.
- **Phase 5 — Vendor concierge:** discovery + inquiry emails + booking where
  APIs allow; contract/deposit/balance tracking. *Requires vendor data + APIs.*
- **Phase 6 — AI Event Designer:** venue/decor visualizer with instant theme,
  color, floral, lighting, and layout swaps. *Requires AI image generation.*

**Guardrail:** Phases 5–6 depend on external services (vendor APIs, AI image
generation, payment rails). These are scaffolded as graceful seams (like
Square / Storage / Registrar today) and switched on only when their
credentials/partners exist — we never fake a booking, a price, or a rendered
venue.

---

## Process (from Governance)

1. Document the feature in the Design Bible (module + phase + what it needs).
2. Obtain Founder review + approval.
3. Build the smallest real, verifiable slice.
4. Gate external integrations behind env/seams; degrade gracefully.
5. Keep it on the Legacy Timeline — every journey connects to the family story.
6. Founder acceptance testing before a feature is considered released.
