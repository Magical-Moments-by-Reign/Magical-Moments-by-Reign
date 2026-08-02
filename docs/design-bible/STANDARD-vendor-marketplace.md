# Master Design Bible — Vendor Marketplace

**Status:** Founder Approved. Subordinate to the [Constitution](./CONSTITUTION.md)
and Book I.

**"Connect with families celebrating life's biggest moments."** A permanent
**Become a Vendor** area where trusted, independent businesses are discovered by
customers planning weddings, showers, birthdays, graduations, memorials,
vacations, and every milestone. Built to expand over time.

**Core guardrail — vendors are independent.** Magical Moments never employs,
supervises, endorses, warrants, or guarantees any vendor, and is not
financially responsible for vendor performance, cancellations, damages, or
disputes. This is surfaced via a **required Vendor Notice** before any contact
or quote. No payments run through the marketplace today.

---

## Built today (real & verifiable)

`src/lib/vendors.ts` + `vendors.test.ts` (**11 tests**, part of the 93-test
`npm test` suite):

- **Category catalog** — 43 launch categories, slugified + lookupable
  (`VENDOR_CATEGORIES`, `vendorCategory`); more added over time.
- **Vendor profile** shape + `isPublicVendor` (only **approved, non-hidden**
  vendors are ever shown).
- **Reviews** — six categories (`REVIEW_CATEGORIES`), `averageRating`,
  `recommendRate` (clamped 1–5, 0 when none).
- **Browse/filter** — `filterVendors` (category / city / state / min-rating /
  query; excludes non-public; featured-first then rating). Empty in → empty out
  (**no invented vendors**).
- **Required Vendor Notice** — `VENDOR_NOTICE`, `canContactVendor`.
- **Become-a-Vendor copy** (`BECOME_A_VENDOR`).
- **Future monetization** — `VENDOR_TIERS` (Free / Premium / Featured /
  Sponsored / Verified) all **disabled** (`activeVendorTiers()` → `[]`).

`src/lib/vendor-service.ts` — `createVendorApplication` writes a real
`VendorApplication` row (mirrors the Custom Website request pattern; no approval
faked).

`prisma/schema.prisma` — `Vendor`, `VendorReview`, `VendorApplication`
(+ `VendorStatus`, `VendorApplicationStatus` enums).

Pages: **`/vendors`** (hero, browse filters, honest "launching soon" empty
state, full category grid, Become-a-Vendor section, Vendor Notice) and
**`/vendors/apply`** (application form → server action → `VendorApplication`,
with the required Vendor Notice acknowledgment and success state). A **Vendors**
link is now in the site nav.

## Needs (foundation seams — never faked)

Approved vendor **listings & profiles** (real vendor data), **storage** for
logo/gallery/video uploads, **auth** (vendor + customer accounts, Save Vendor,
customer reviews), **notifications** (quote requests, review invites), and the
**admin** approve/reject/suspend/feature/hide + analytics + category/review
management. Until then the marketplace shows an honest empty state and only the
application flow is live.

---

## Vendor profile fields

Business name · logo · description · owner · location · service area · phone ·
email · website · socials · hours · gallery · videos · services · pricing
(optional) · languages · years in business · licenses (optional) · insurance
(optional) · availability calendar (future) · Request Quote · Save Vendor.

## Customer experience

Browse · search · filter by category / city / state / rating · save favorites ·
share · contact · request quote · visit website · view gallery · watch videos ·
read reviews. **Every contact/quote requires accepting the Vendor Notice first.**

## Become a Vendor

Landing headline *"Grow Your Business with Magical Moments by Reign"* + body +
**Become a Vendor Today**. Application collects: business name, owner, business
email, phone, website, category, description, years in business, city, state,
business license (optional), insurance (optional), social media, logo upload,
gallery upload, references (optional), agree to terms. (Logo/gallery upload is
added post-approval once storage exists.)

## Customer reviews

After an event, invite reviews across Communication · Professionalism · Quality
· Value · Punctuality · Overall Experience, plus a written review, photos,
recommend flag, and an overall rating. Reviews influence marketplace quality and
future participation.

## Admin

Approve · reject · suspend · feature · hide vendors · respond to reports · view
analytics · manage categories · manage reviews. (Admin UI is a seam on auth.)

## Future monetization (built to add later; disabled today)

Free Listing · Premium Listing · Featured Vendor · Sponsored Vendor · Verified
Vendor. The `tier` field + `VENDOR_TIERS` exist so plans can be enabled without
rebuilding — **left disabled** until implemented.

**Guardrail:** vendors are independent; the Vendor Notice is required before
contact/quote; only approved, non-hidden vendors appear; no vendors are
invented before real listings exist; no payments run through the marketplace;
monetization tiers stay disabled until built.
