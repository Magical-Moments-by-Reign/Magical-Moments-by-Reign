# Master Design Bible — App-First Architecture

**Status:** Founder Approved (canonical, cross-cutting mandate). Subordinate to
Book I. The Founder retains final approval over architecture, design, features,
and release readiness (as with Project Legacy).

**Done today:** the platform is now **installable as a Progressive Web App**
(manifest, service worker with offline fallback, maskable icons, standalone
display, theme color, iOS web-app meta). This is the required PWA milestone
**before native mobile development begins.**

---

## The mandate

Magical Moments by Reign is designed **app-first**. Do **not** trap features
inside individual pages. Build a **shared backend and reusable APIs** that serve:

1. the responsive website,
2. a Progressive Web App,
3. a future native iPhone app,
4. a future native Android app.

The **same** customer account, Family Vault, Life Journeys, messages, reminders,
purchases, documents, permissions, and subscriptions must work across every
device. **One database. One customer account.** No web/mobile data forks, no
duplicate accounts, no desktop-only features.

## How today's build already satisfies this

- **One backend, one database:** a single Next.js app over one Prisma/Postgres
  database. Every feature (Experiences, Family Vault, Purchases, Gifts, Tributes,
  Domains, Social, Pricing) reads/writes the same models — no per-surface stores.
- **Reusable data layer:** business logic lives in `src/lib/*` (e.g. `family.ts`,
  `purchases.ts`, `pricing-engine.ts`) behind server actions + route handlers
  (`/api/*`), so web, PWA, and future native clients call the **same** logic.
- **Server-authoritative:** totals, permissions, and mutations are validated on
  the server; clients never hold private truth. Native apps inherit this for free.
- **Responsive by default:** every page is built mobile-first and tested at
  phone/tablet/desktop widths.

## PWA (shipped)

`public/manifest.webmanifest` (name, icons 192/512 + maskable, standalone,
theme/background color, `start_url:/dashboard`, app shortcuts), a conservative
service worker (`public/sw.js` — static stale-while-revalidate, network-first
navigations, `/offline` fallback; never caches `/api`, `/dashboard`, `/admin`),
registered via `RegisterSW`, plus iOS web-app + theme-color meta in the root
layout. Installable on phone, tablet, and desktop.

## First mobile experience — priority surfaces

Prioritize, in this order, for phone: **Today Dashboard · Magical AI · Family
Calendar · Grocery Lists · Appointments · Voice-to-Text Notes · Camera Uploads ·
Journey Updates · Family Vault · Emergency Mode · Messages · Video Calls ·
Purchase Tracking · Push Notifications · "What Am I Forgetting?" quick action.**

*Status:* Family Vault and Purchase Tracking are live; the rest are on the
roadmap (several — push notifications, video calls, voice-to-text, Magical AI —
depend on services gated behind env/seams). A dedicated mobile **Today
Dashboard** with the "What Am I Forgetting?" quick action is the recommended next
app-first slice.

## Test matrix (required)

Every feature is tested for **phone, tablet, and computer**. No feature is
"done" until it works and looks right on all three.

## Recommended build phasing

- **Phase A (done):** PWA installability + confirm the shared-backend/one-DB
  architecture and responsive baseline.
- **Phase B:** the mobile **Today Dashboard** + quick actions (calendar, grocery,
  appointments, camera upload, voice notes) over the existing shared APIs.
- **Phase C:** push notifications, offline capture/queue, and native iOS/Android
  shells consuming the same APIs. *(Needs push service + app-store pipelines.)*

**Guardrail:** never fork data or accounts across surfaces; never ship a
desktop-only feature; gate device/native capabilities (push, camera, video)
behind capability checks and env/seams; the Founder approves release readiness.
