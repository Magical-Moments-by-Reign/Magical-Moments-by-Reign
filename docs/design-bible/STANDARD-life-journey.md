# Magical Moments by Reign — Volume II — The Life Journey Standard

**Status:** Founder Approved. The **official standard for every Life Journey.**
Subordinate to the [Constitution](./CONSTITUTION.md) (Volume I) and Book I; it
governs [Book II](./BOOK-II-ARCHITECTURE.md) build work. **No Life Journey may be
built differently without Founder approval, and none is submitted for approval
until all twenty sections are complete.** Every Journey delivers the same premium
experience while allowing Journey-specific features.

*Preserved as the Founder's canonical text.*

---

## The twenty required sections

1. **Hero Experience** — full-width hero image · Journey title · subtitle · AI
   welcome message.
2. **Journey Overview** — what it is · who it's for · estimated timeline ·
   estimated budget (when applicable) · planning level · benefits.
3. **Journey Roadmap** — every milestone with **Upcoming · Completed · Overdue ·
   Optional**; the customer always knows exactly where they are.
4. **Smart Checklist** — complete · edit · assign · share · print · customize.
5. **Calendar** — appointments · deadlines · reminders · countdowns · sync.
6. **Magical AI** — personalized guidance · recommendations · planning help ·
   Q&A · Journey reminders.
7. **Document Vault** — contracts · receipts · forms · photos · videos · voice
   recordings · scans · notes.
8. **Photo & Video Gallery** — albums · slideshows · private sharing · timeline
   organization.
9. **Voice Notes** — recording · speech-to-text · store recording + transcript
   together when available.
10. **Purchase Concierge™** — purchase tracking · receipts · shipping · returns ·
    warranty · order history.
11. **Journey Marketplace** — only businesses related to that specific Journey
    (Wedding, Baby, Housing, Vacation, Graduation, Business…).
12. **Messaging** — family · vendor · private · group conversations.
13. **Video Calls** — scheduled meetings with approved participants when available.
14. **Sharing** — everything private until shared; Private Links · Guest · Family ·
    Administrator access; the customer decides exactly what others can view.
15. **Registry & Cash Gifts** — traditional registry · cash registry · custom wish
    list (when appropriate).
16. **Notifications** — email · text · push · in-app.
17. **Journey Settings** — privacy · permissions · Legacy Guardian™ · billing ·
    archive · Journey management.
18. **Final Memory Book** — on completion, auto-create a timeline, photos, videos,
    stories, key documents, and highlights; download · print · share · order a
    printed keepsake (future).
19. **Celebration Screen** — on completion: highlights · favorite photos · thank-you ·
    AI congratulations · suggested next Journey (Wedding → Baby, Graduation →
    College, New Home → Renovation, Vacation → Anniversary Trip).
20. **Founder Standard** — every Journey must reduce stress, save time, keep
    customers organized, preserve memories, guide every step, and feel premium.

---

## Compliance map (current build status)

Honest status of each section across the platform today. "Seam" = scaffolded and
gated behind a credential/foundation (per Book II's graceful-degradation rule).

| # | Section | Status | Where / needs |
| --- | --- | --- | --- |
| 1 | Hero Experience | **Built** | Journey Experience page (hero + AI welcome) |
| 2 | Journey Overview | **Built** | Journey Experience (overview, what's-included, timeline); budget/planning-level per Journey to extend |
| 3 | Journey Roadmap | **Partial** | Wedding roadmap + Build-a-Home 28-stage timeline; Upcoming/Overdue needs dates + accounts |
| 4 | Smart Checklist | **Partial** | Wedding checklist (complete/progress); edit/assign/share/print need accounts |
| 5 | Calendar | **Seam** | needs reminder scheduler + accounts |
| 6 | Magical AI | **Built** | Ask Magical (Qwen); per-Journey context = next phase |
| 7 | Document Vault | **Built** | Family Vault documents; per-Journey scoping + secure file Storage keys |
| 8 | Photo & Video Gallery | **Built** | galleries live; uploads need Storage keys; albums/slideshows to extend |
| 9 | Voice Notes | **Documented** | needs speech-to-text — see [standard](./STANDARD-voice-notes.md) |
| 10 | Purchase Concierge™ | **Built** | first slice — see [standard](./STANDARD-purchase-concierge.md) |
| 11 | Journey Marketplace | **Partial** | per-Journey categories shown; real vendors need data/partners |
| 12 | Messaging | **Seam** | needs SMS/realtime + accounts — see [communication standard](./STANDARD-communication.md) |
| 13 | Video Calls | **Seam** | needs a video provider — see [communication standard](./STANDARD-communication.md) |
| 14 | Sharing | **Built** | private custom share links (password, expiry, roles); finer role granularity to extend |
| 15 | Registry & Cash Gifts | **Built** | Gifts engine — see [standard](./STANDARD-gifts-registries.md) |
| 16 | Notifications | **Partial** | email needs Resend; push has PWA groundwork; text/in-app = seam |
| 17 | Journey Settings | **Partial** | privacy/visibility built; Legacy Guardian Phase A built; billing needs Square + accounts |
| 18 | Final Memory Book | **Planned** | auto-compiled book on completion; printed keepsake = add-on (future) |
| 19 | Celebration Screen | **Planned** | self-contained; suggested-next-Journey mapping is ready to build |
| 20 | Founder Standard | **Always applied** | the acceptance test for every Journey |

---

## Path to full compliance (recommended)

Most remaining sections unlock from a small number of foundations, so build those
first, then bring each Journey up to the 20-section standard one at a time.

- **Foundation A — Accounts / auth + roles.** Unlocks Roadmap (per-customer
  state), Smart Checklist (assign/edit), Journey Settings (permissions/billing),
  finer Sharing, and per-Journey Document Vault scoping.
- **Foundation B — Secure Storage + reminder scheduler.** Unlocks real uploads
  (gallery, document vault, voice notes) and the Calendar + Notifications.
- **Foundation C — Messaging/Video + Marketplace data + speech-to-text + Square
  billing.** Unlocks sections 11–13, 16 (text), 17 (billing), and 9.
- **Self-contained now:** Celebration Screen (incl. suggested-next-Journey) and
  the Final Memory Book compile step can be built against existing content ahead
  of the foundations.

**Reference Journeys:** the **Wedding Journey** (planner: roadmap/checklist/
budget) and **Housing Hub → Build-a-Home** (intake → roadmap → 28-stage timeline)
are the current best-aligned examples; new Journeys follow this standard, and
existing ones are brought to full compliance as the foundations land.

**Guardrail:** no Journey is submitted for Founder approval until all twenty
sections are genuinely complete; gated sections are never presented to customers
as finished (Book II graceful-degradation rule).
