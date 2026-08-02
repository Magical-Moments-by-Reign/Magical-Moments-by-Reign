# Master Design Bible — Journey Experience & Preview

**Status:** Founder Approved (canonical). Consolidates two Founder directives —
**Journey Experience Preview™** and the **Life Journey Experience** landing page
— into one standard, since both describe the same thing: an immersive, guided
per-Occasion page a customer explores **before** buying. Subordinate to Book I.

**Built today:** the immersive preview for **every Occasion** at `/journeys/[type]`
plus the guided occasions gallery at `/journeys` (now the "Experiences" front
door). Marketplace partners, real customer stories, and live AI Q&A are seams
for later phases.

*(™ appears in customer-facing UI only once the trademark process completes.)*

---

## Principle

Customers should **never wonder "what exactly am I buying?"** Every Occasion is a
**guided tour, not a product page.** Clicking an Occasion does **not** drop the
customer straight into the cart — it opens a Journey Experience page where
Magical AI welcomes them and walks them through everything included. When they
reach checkout they are **completely confident** because they already know
exactly what they're getting. The experience is immersive, educational,
transparent, and exciting.

## The page (every Journey has its own)

1. **Hero** — full-width image representing the emotion of that Journey (the
   Journey's cover).
2. **Magical AI welcome** — immediately below the hero, a warm AI introduction
   inviting the customer to explore at their own pace.
3. **Journey overview** — what this Journey is and when it begins.
4. **What's included** — features, plus (later) optional upgrades, suggested
   add-ons, membership requirements, estimated planning timeline, storage & AI
   features included, sharing options.
5. **Planning timeline** — the milestones, in order (e.g. Wedding: Month 12
   choose your date → Month 11 book venue → … → Wedding Day → anniversaries).
6. **Gallery & videos** — a peek at real imagery.
7. **Sample website / interactive demo** — a fully functional sample the
   customer can explore (menus, photos, timeline, gallery, registry, RSVP,
   guestbook, videos, messages). *Today: links to a seeded sample experience
   where one exists; a click-through demo of the tools is a later phase.*
8. **Journey Marketplace** — the trusted professionals/partners this Journey
   connects to (e.g. Vacation: flights, hotels, cruises, car rentals, insurance,
   excursions…). *Partners & member savings = later phase.*
9. **FAQ** — answers to the real questions ("What happens after the event?" ·
   "Can I invite guests?" · "Can I upload videos?" · "Can I transfer ownership?"
   · "Can I make this private?"). *Live conversational AI Q&A = later phase.*
10. **Pricing** — this Occasion priced by term via the Pricing Engine, the Free
    Forever note, and the Lifetime option (Pricing Protection applies).
11. **Ready to begin — the Unlock Panel** — *"Ready to Begin? Unlock this
    Journey today."* with **Start One-Year ($249) · Five-Year ($799) · Ten-Year
    ($1,499) · Lifetime ($2,499)** (Most Popular / Best Legacy Value badges),
    an **Already a Legacy Family?** discounted-pricing note, and secondary
    *Start with Free Forever* / *Try a 5-day Magical Journey Preview* links.
12. **Continue Your Story** — related next-chapter Journeys with preview images.

### Preview Mode (explore as if owned)
The tour is framed as **Preview Mode** — a "✦ Preview Mode" badge on the hero
and a Journey duration line. Customers scroll every section, the Journey Guide
(Magical AI concierge) speaks, and premium interactive areas appear as blurred
**"Available when you unlock this Journey"** tiles (AI Journey Guide, Create
Invitations, Upload Photos, Create Registry, Guest Messages, Memory Timeline,
Planning Dashboard, Highlight Videos) — visible but inactive. Nothing feels like
a sales page; customers are invited into the next chapter, never sold to.

**Legacy Family** pricing (discount when a customer already owns a Journey) and
the real unlock/purchase both need **accounts/auth + billing** — shown as an
honest note today, wired when those foundations land. Single-Journey unlock
prices are final ($249 / $799 / $1,499 / $2,499); the multi-occasion build-your-
own engine remains on the [/membership] builder.

## Compare Occasions

Customers can compare Journeys (e.g. Wedding vs Proposal vs Anniversary) and
Magical AI explains which best fits their needs. *(First slice: the gallery lets
customers move between previews; side-by-side AI comparison is a later phase.)*

## Marketplace & travel partners (later phase)

Each Journey has its own marketplace. Where partnerships exist, show member
price, regular price, amount saved, reward points, and partner benefits. **If no
partnership exists, present available options clearly without implying exclusive
discounts.** Vacation includes a **Smart Trip Builder** (flights, hotel, cruise,
car, excursions, transfers, insurance, dining, packing list, documents, budget →
one itinerary). *(All of this needs travel/vendor APIs and partner agreements —
gated seams; we never imply a discount or partner that doesn't exist.)*

## Recommended build phasing

- **Phase A (now):** immersive preview for every Occasion (hero, AI welcome,
  overview, what's-included, timeline, gallery, sample-website link, marketplace
  preview, FAQ, pricing, add-to-cart) + guided occasions gallery. Self-contained.
- **Phase B:** click-through interactive tool demos, side-by-side compare, and
  richer per-Occasion sample websites.
- **Phase C:** live conversational Magical AI, real customer stories, and the
  Journey Marketplaces + travel partners + Smart Trip Builder + member savings.
  *(Needs AI, content, vendor/travel data & partnerships.)*

**Guardrail:** never imply a partner, discount, or capability that doesn't exist;
pricing shows placeholder amounts as non-final (Lifetime Collections are set);
sample websites are clearly samples.
