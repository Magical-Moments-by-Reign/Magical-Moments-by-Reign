# Architecture — The One Master Application

> **The single most important rule:** Magical by Reign is **not** a website
> generator that spins up a new app per customer. It is **one** application that
> hosts unlimited unique customer *experiences*. Everything below serves that
> rule.

---

## The mental model

Think of it as a **luxury digital publishing platform**:

```
                    ┌───────────────────────────────────┐
                    │     ONE MASTER APPLICATION         │
                    │  (built once, serves everyone)     │
                    │                                     │
   Customer  ──▶    │  Login · Dashboard · Create ·      │
                    │  Page Builder · Media · Payments ·  │
                    │  Admin · Publishing Engine          │
                    └──────────────┬────────────────────┘
                                   │  creates rows, not apps
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                      ▼
   /smithwedding           /karlie2027              /babyolivia
   (wedding)               (birthday)               (baby journey)
   unique theme            unique theme             unique theme
   unique layout           unique layout            unique layout
```

Every customer page is a **database row**, dynamically rendered by **one**
renderer through **one** master markup. No two look alike — but there is only
ever one codebase to build and maintain.

---

## How one app produces unlimited unique pages

There are three moving parts. Understanding these three explains the whole
system.

### 1. The Master Markup — *the architecture every page inherits*
`src/components/experience/`

One set of reusable, themeable **sections** — `Hero`, `Story`, `Gallery`,
`Timeline`, `Quote`, `Details`, `Guestbook`, `Footer` — plus one
`ExperienceRenderer` that assembles them. This is the single page architecture
the blueprint calls for. It is written **once**.

### 2. The Design Engine — *what makes each page unique*
`src/lib/design-engine.ts`

Given an experience's **type** and a stable **seed**, it deterministically
composes a complete `DesignSpec`:

| It chooses…      | From…                                                    |
| ---------------- | -------------------------------------------------------- |
| Palette          | Curated families biased by event type (romantic, twilight, garden…) |
| Fonts            | Curated Google-Font pairings                             |
| Section order    | Shuffled (hero always first, footer last)               |
| Layout variant   | Per section (e.g. gallery: masonry / mosaic / carousel) |
| Animation        | elegant / gentle / lively / cinematic                   |
| Background       | aurora / gradient / starfield / linen / spotlight       |
| Corner radius, mood | seeded selection                                     |

Because it is **seeded**, the same experience always looks the same (stable,
regenerable) — yet different experiences diverge completely. That is the
technical guarantee behind *"no two customer experiences ever look identical."*

> **The AI seam.** `generateDesignSpec()` is the single public entry point.
> Today it delegates to the deterministic engine. When `ANTHROPIC_API_KEY` is
> set, that function is where a real model is asked for a bespoke spec from the
> customer's own words/preferences, validated against the `DesignSpec` shape,
> and falls back to the deterministic engine on any failure. **Nothing else in
> the app changes** — the renderer only ever consumes a `DesignSpec`.

### 3. The Renderer — *paints a page from a spec*
`src/components/experience/ExperienceRenderer.tsx`

Takes `(DesignSpec + content)`, injects the palette/fonts as CSS variables,
applies animation + background classes, and lays out the sections in the
engine's chosen order. It has no idea *how* the spec was produced — deterministic
or AI. This decoupling is what lets us upgrade the intelligence later without
touching rendering.

---

## Request lifecycle

**Creating an experience** (`/create` → `createExperienceAction`):
```
1. ensureUniqueSlug()      → reserves the public URL (e.g. /smithwedding)
2. generateDesignSpec()    → composes the unique look
3. buildDefaultContent()   → seeds a type-appropriate story structure
4. prisma.experience.create→ one DB row (URL, theme, layout, story, media root)
5. redirect(/<slug>)       → the page is instantly live
```

**Viewing an experience** (`/<slug>`):
```
1. getExperienceBySlug()   → load + hydrate the row
2. notFound() if missing   → graceful 404
3. <ExperienceRenderer>    → dynamic, themed render of the master markup
```

Next.js **dynamic routing** (`src/app/[slug]/page.tsx`) is what lets one route
serve every customer URL. Static routes (`/dashboard`, `/create`, `/api/*`) take
precedence; a reserved-slug list prevents collisions.

---

## Tech stack

| Concern         | Choice                            | Notes                                      |
| --------------- | --------------------------------- | ------------------------------------------ |
| Framework       | **Next.js 15** (App Router, RSC)  | One codebase: UI + server + API            |
| Language        | **TypeScript**                    | Strict mode                                |
| Database        | **Prisma ORM**                    | SQLite in dev, **Postgres in prod**        |
| Rendering       | React Server Components + Server Actions | No client JS needed for core flows  |
| Styling         | Master CSS + engine-driven CSS variables | `experience.css` + per-page tokens  |
| Media           | S3-compatible object storage *(Phase 1)* | `MediaAsset` model + folders in place |
| Payments        | Stripe *(Phase 3)*                | env seam ready                             |
| AI layer        | Anthropic (Claude) *(Phase 1)*    | `generateDesignSpec()` seam ready          |

### Dev → Prod database switch
The schema uses SQLite for **zero-setup local development**. For production,
change one line in `prisma/schema.prisma` (`provider = "postgresql"`) and point
`DATABASE_URL` at Postgres. JSON-shaped fields are stored as `TEXT` so the data
layer is identical across both.

---

## Data model (`prisma/schema.prisma`)

- **User** — accounts (role `USER` | `ADMIN` for the admin dashboard).
- **Experience** — the heart. One row = one live, themed page. Holds `slug`
  (URL), `type`, `title`, `seed`, the `designSpec` + `content` JSON, and
  visibility/permission fields.
- **MediaAsset** — uploaded images/videos, organized into per-experience
  `folder`s, cascade-deleted with their experience.

---

## Mapping the blueprint's "Master Application" to code

| Blueprint capability   | Status in this skeleton                                        |
| ---------------------- | ------------------------------------------------------------- |
| Publishing Engine      | ✅ Create → unique URL → live render (`experiences.ts`, `[slug]`) |
| Page architecture      | ✅ Master markup + renderer (`components/experience/`)         |
| AI customization       | ✅ Design engine w/ AI seam (`design-engine.ts`)              |
| Dashboard              | ✅ Lists all experiences (`/dashboard`)                        |
| Create flow / builder  | ✅ Guided create (`/create`); rich editor is Phase 1          |
| Media Library          | 🟡 Data model ready; upload UI + storage in Phase 1          |
| Login / Accounts       | 🟡 `User` model ready; auth in Phase 1                        |
| Payments               | 🟡 Env seam ready; Stripe in Phase 3                          |
| Admin Dashboard        | 🟡 `ADMIN` role ready; admin UI in a later phase             |
| AI Video Integration   | 🟡 Env seam ready; Phase 3                                    |

✅ = working now · 🟡 = architected, not yet built

---

## Where things live

```
src/
├── app/
│   ├── page.tsx              # Marketing landing (the platform's own site)
│   ├── dashboard/page.tsx    # All experiences, one place
│   ├── create/page.tsx       # Guided create flow
│   ├── [slug]/page.tsx       # ⭐ Dynamic renderer for EVERY customer URL
│   ├── api/experiences/      # Programmatic create/list
│   ├── actions.ts            # Server actions (create, regenerate design)
│   ├── globals.css           # Platform chrome styling
│   └── experience.css        # ⭐ Master experience stylesheet
├── components/experience/    # ⭐ Master markup: sections + renderer
├── lib/
│   ├── design-engine.ts      # ⭐ Uniqueness engine (+ AI seam)
│   ├── experiences.ts        # Create/fetch service
│   ├── experience-types.ts   # Catalog of moment types
│   ├── content.ts            # Default story scaffolding
│   ├── slug.ts               # Unique URL generation
│   ├── serialize.ts          # JSON hydration
│   └── db.ts                 # Prisma singleton
├── types.ts                  # DesignSpec, content shapes
└── prisma/                   # schema + seed
```

⭐ = the files that embody the "one app, unlimited unique pages" architecture.
