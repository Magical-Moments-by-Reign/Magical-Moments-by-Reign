# Master Design Bible — The Magical Moments Ecosystem

**Status:** Founder Vision · north-star. Governs how features are prioritized and
connected. Subordinate to Book I and the [Constitution](./CONSTITUTION.md).

Magical Moments by Reign is **not simply a digital memory platform — it is a
complete Life Celebration Ecosystem.** Customers should never feel they must
leave Magical Moments to finish planning one of life's most meaningful moments.

---

## The customer promise

When someone visits, they should immediately feel: **"We've got you."**

A wedding · a new baby · a graduation · a new home · a vacation · a birthday · a
retirement · a memorial · a family reunion · or something completely unique —
you shouldn't have to search dozens of websites. Everything is brought together
into **one trusted place**: one place to plan, celebrate, remember, and preserve.

## The brand promise

We don't simply build websites. We help families **celebrate, remember, stay
organized, preserve their legacy, find trusted professionals, and create
unforgettable experiences** — so families can enjoy the moment instead of
worrying about everything around it.

## Design philosophy — "What do I need next?"

Every page should answer one question before the customer asks it: **"What do I
need next?"** The platform anticipates needs, guides naturally, reduces stress,
and builds confidence at every stage. If there's a trusted, secure, appropriate
way to help a customer accomplish something **without leaving Magical Moments**,
design for that whenever practical. Every interaction should leave one lasting
feeling: ✨ **"Everything I needed was right here."** — Safe · Simple · Beautiful
· Trusted.

---

## The integrations architecture (built today)

The ecosystem grows by **thoughtfully integrating trusted third-party services**
— secure APIs, embeds, affiliate/guided connections — while the customer always
feels they're still inside Magical Moments. The goal is not to replace every
company; it's to be the trusted place every meaningful moment **begins, grows,
and is preserved.**

`src/lib/integrations.ts` + `integrations.test.ts` (**9 tests**, part of the
176-test `npm test` suite) — the **provider-agnostic registry** (same discipline
as the Magical+ Financing Gateway: nothing hardcoded, nothing faked):

- **Category catalog** (`INTEGRATION_CATEGORIES`, 8 groups) covering registries &
  gifts, travel & stay, food & flowers, invitations & media, live/music/maps,
  logistics & home, life resources, and payments & communication — expandable
  ("including but not limited to").
- **Connection types** — `native` (built in), `api`, `embed`, `affiliate`,
  `guided` — so each service connects the right way.
- **Provider registry** — `registerIntegrationProvider`, `providersFor`,
  `integrationState` → `connected` (a real provider exists) / `guided`
  (educational, no provider needed) / `coming_soon`. **A category never shows a
  fabricated live integration** — no booking, price, or availability is invented
  until a real provider is registered.
- **"What do I need next?"** — `suggestionsForOccasion` and `whatDoINeedNext`
  map each occasion to the most relevant services in order (e.g. wedding →
  invitations, registry, hotels, flowers, cake, photography, music,
  transportation, live streaming…), powering the anticipatory design philosophy.
- **Brand feeling copy** — `CUSTOMER_PROMISE`, `ECOSYSTEM_FEELING`,
  `ECOSYSTEM_VALUES`.

**Where the ecosystem already lives natively:** photography/video/rentals/
transportation/home & pet services → the **Vendor Marketplace**; registries,
cash gifts & charity → **Gifts & Registries**; invitations & RSVP → **Digital
Invitations**; payments → the **Square** seam; email/SMS → the notification
seams; mortgage/college/funeral → **guided** resources (Housing Hub, Sports,
Memorial). External categories (travel, hotels, flights, flowers, gift cards,
calendar, maps, weather, live streaming, music) activate when an approved
provider is registered.

## Needs (foundation seams — never faked)

Real API keys / partnerships / affiliate agreements per category, plus the
surfaces that render suggestions in context (occasion pages, dashboard "What's
next?"). Until a provider is registered, a category is `guided` or `coming_soon`
— we never simulate a third-party booking or price.

**Guardrail:** be the trusted hub, not a fake storefront — no hardcoded
providers, no fabricated bookings/prices/availability, secure connections only,
and the customer always feels they're still inside Magical Moments.
