# Magical by Reign ✨

> **One master application. Unlimited unique experiences.**
>
> An AI-powered platform that transforms life's biggest moments into beautiful,
> interactive digital experiences that grow with families over time.

**We don't build webpages. We preserve memories.**

Founded by **Tabitha Turner**.

---

## The core idea

Magical by Reign is **not** a website generator that creates a new app per
customer. It is **one** application that hosts unlimited customer *experiences* —
weddings, birthdays, memorials, vacations and more — each living at its own
address like `magicalbyreign.com/smithwedding`, each **uniquely designed** so no
two ever look alike.

One codebase. One master markup. A design engine that makes every page feel
custom-built. See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for how it works, and
**[BLUEPRINT.md](./BLUEPRINT.md)** for the vision and roadmap.

---

## Tech stack

Next.js 15 (App Router) · TypeScript · Prisma (SQLite in dev → Postgres in prod)
· React Server Components. AI, payments, and media-storage seams are in place for
later phases.

## Run it locally

```bash
# 1. Install
npm install

# 2. Set up env (SQLite needs zero config)
cp .env.example .env

# 3. Create the database + seed example experiences
npm run setup

# 4. Start
npm run dev
```

Then open **http://localhost:3000**:

| Route              | What it is                                                |
| ------------------ | -------------------------------------------------------- |
| `/`                | The platform's own marketing site                       |
| `/create`          | Create a new experience (pick occasion → instant page)  |
| `/dashboard`       | Every experience, in one place                          |
| `/smithwedding`    | A live, uniquely-themed sample experience               |
| `/karlie2027`, `/babyolivia`, `/italy2026`, `/reignlaunch`, `/rememberinggrandpajoe` | more samples — each a different look |

Try **"↻ Regenerate design"** on any experience to watch the engine compose a
fresh, unique look for the same content.

### Handy scripts
```bash
npm run dev        # local dev server
npm run build      # production build (type-checks everything)
npm run db:seed    # (re)seed example experiences
npm run db:reset   # wipe + reseed the local database
```

---

## Design principles

- Never use cookie-cutter templates.
- Beauty always comes before speed.
- Simplicity always wins.
- Every feature must make preserving memories easier and more magical.

---

*Preserving life's biggest moments, one magical experience at a time.*
