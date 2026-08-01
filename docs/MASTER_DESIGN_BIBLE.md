# Magical Moments by Reign — Master Design Bible
### Directive #001 — "We are building the world's first AI Life Journey Platform."

This is the single source of truth for what Magical Moments by Reign is and
how it is built. **Every new feature is documented here before development
begins.**

---

## 1. Philosophy

We are not building a website, templates, or event pages. We are building a
**luxury, AI-powered Life Journey Platform** that grows with a family from one
generation to the next. Every customer should feel like they hired an entire
concierge team, not bought a website.

Every feature must do at least one of these — or it isn't built:
1. **Reduce stress.**  2. **Create joy.**  3. **Save time.**  4. **Preserve memories.**

Design targets: Disney (planning), Apple (craft), Tesla (automation),
Netflix (recommendation), Project Legacy (immersive world).

The AI should anticipate the next milestone and gently guide — never overwhelm.

---

## 2. The Master Timeline (the spine)

Customers don't buy pages — they buy **Life Journeys**, and each becomes a
connected chapter in one **Family Legacy Timeline**:

> Proposal → Wedding → Honeymoon → First Home → Pregnancy → Baby → Birthdays →
> Vacations → Graduations → Anniversaries → Retirement → Legacy → Future Generations

Nothing is ever deleted. Nothing is ever lost. Every chapter stays connected.

**Status: BUILT** — the Legacy Timeline lives on the dashboard; new journeys
layer in via "Start a New Journey"; private sharing curates exactly what's
shown (`/dashboard/shares`, `/share/[token]`).

---

## 3. Journey modules

Each occasion is a **Journey** — a guided, interactive experience, not a page.

### 3.1 Wedding Journey — "From Yes… to I Do." → "Our Marriage"
A guided planning experience from engagement through married life.
- **Welcome** — stage (Recently Engaged / Date Selected / Already Planning /
  Just Looking) → a personalized roadmap.  **[Phase 2 — first slice building now]**
- **Couple profile** — names, dates, city, style, guest count, budget, colors, theme.
- **AI roadmap** — countdown, monthly + weekly checklists, deadlines, budget
  tracker, suggested next steps.  **[Phase 2]**
- Engagement (gallery, proposal story/video, announcement) — *reuses experiences + tributes.*
- Wedding party invitations + private portal (schedule, attire, hotels).  **[Phase 4]**
- Guest management, invitations, RSVP + meal selection.  **[Phase 4]**
- Registry + cash fund (Venmo/CashApp/Zelle handles — we never hold funds).  **[Phase 3]**
- Vendor discovery + inquiry/booking (venue, florist, cake, catering, DJ,
  photo/video, hotels, transport, hair/makeup, planners).  **[Phase 5 — needs APIs]**
- Budget manager, guestbook, wedding-day live feed, after-the-wedding gallery.
- **Forever** — transitions into "Our Marriage" and keeps preserving milestones.

### 3.2 Birthday Journey
- Begins **6 months before** by default: "Start today / Remind me later /
  Begin six months before" → auto-scheduled reminders.  **[Phase 3]**
- **Age-aware theme suggestions** (1–5, 6–12, Teen, Adult catalogs).  **[Phase 2 — data ready]**
- Venue visualizer, vendor booking, budget.  **[Phase 5]**

### 3.3 Other journeys (same engine)
Baby, Vacation, Graduation, New Home, Anniversary, Memorial, Military,
Retirement, Sweet 16 / Prom / Grad (high-school events), Custom.

---

## 4. Cross-cutting systems

| System | Status |
| --- | --- |
| Experiences engine (unique themed pages per journey) | **Built** |
| Legacy Timeline + layered journeys | **Built** |
| Private custom share links (checklist, password, expiry, roles) | **Built** |
| Media uploads + per-package limits | **Built** (needs Storage keys) |
| Tributes: family messages + poems | **Built** |
| Custom domains + Legacy Protection | **Built** (needs registrar + scheduler) |
| Commerce: cart, checkout, Square hooks, orders | **Built** (needs Square keys) |
| Custom-website + Concierge pipelines | **Built** |
| Social Studio | **Built** |
| Transactional email | **Built** (needs Resend key) |
| **AI Roadmap / concierge planner** | **Phase 2 — building** |
| **Reminders / scheduled nudges** | **Phase 3 — needs scheduler** |
| **Vendor discovery + booking** | **Phase 5 — needs 3rd-party APIs** |
| **AI venue/decor visualizer** | **Phase 6 — needs image generation** |

---

## 5. Phased roadmap

- **Phase 1 — Foundation (DONE):** experiences, galleries, inspiration,
  pricing/cart/checkout, dashboard, social, custom-website, domains, media,
  tributes, legacy timeline + sharing, SEO, mobile.
- **Phase 2 — Guided Journeys (in progress):** Wedding Journey planner (welcome
  → roadmap → checklist → budget); birthday theme recommender. Self-contained,
  no external services.
- **Phase 3 — Automation & money movement:** reminder scheduler, registry +
  cash-fund handles, RSVP + guest management.
- **Phase 4 — People & permissions:** accounts/auth, wedding-party invitations
  + private portal, role-based family access (roles already stored on shares).
- **Phase 5 — Vendor concierge:** discovery + inquiry emails + booking where
  APIs allow; contract/deposit/balance tracking. *Requires vendor data + APIs.*
- **Phase 6 — AI Event Designer:** venue/decor visualizer with instant theme,
  color, floral, lighting, layout swaps. *Requires AI image generation.*

**Guardrail:** Phases 5–6 depend on external services (vendor APIs, AI image
generation, payment rails). We scaffold them as graceful seams (like Square /
Storage / Registrar today) and turn each on when its credentials/partners exist
— we never fake a booking, a price, or a rendered venue.

---

## 6. Process
1. Document the feature here (module + phase + what it needs).
2. Build the smallest real, verifiable slice.
3. Gate external integrations behind env/seams; degrade gracefully.
4. Keep it on the Legacy Timeline — every journey connects to the family story.
