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
| Media uploads + per-package limits | Built · needs Storage keys |
| Tributes: family messages + poems | Built |
| Custom domains + Legacy Protection | Built · needs registrar + scheduler |
| Commerce: cart, checkout, Square hooks, orders | Built · needs Square keys |
| Custom-website + Custom Concierge pipelines | Built |
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
| Life Operating System (vision) | North-star — see [vision](./VISION-life-operating-system.md) |
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
| Vendor discovery + booking | Planned · needs 3rd-party APIs |
| AI venue/decor visualizer | Planned · needs image generation |
| Accounts / auth + role-based family access | Planned |

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
