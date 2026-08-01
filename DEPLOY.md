# Deploying Magical by Reign to Netlify

This app is a **full Next.js application** (server pages, API routes,
server actions, a database) — not a static site. That's why a plain
Netlify deploy showed "Page not found": Netlify was serving an empty
branch with no built app.

Follow these steps once and your site goes live. Later deploys are
automatic on every push.

---

## What you need (all free)

1. A **GitHub** repo (you have it).
2. A **Netlify** account (you have it — `magical-m.netlify.app`).
3. A **Postgres database** — a free [Neon](https://neon.tech) database
   (~3 minutes). The app can't use a local file database on Netlify.

---

## Step 1 — Create the database

Use **Supabase** (you already use it) or Neon. Either is free Postgres.

> **Recommended: a SEPARATE Supabase project for Magical by Reign** — not
> the same one as Lean On Me. This app creates its own tables (`User`,
> `Experience`, …), and a separate project keeps the two apps from
> colliding.

### Using Supabase

1. Supabase → **New project** → name it `magical-by-reign`, set a
   database password (save it).
2. Go to **Project Settings → Database → Connection string → URI**, and
   open the **Session pooler** tab. Copy that URI and replace
   `[YOUR-PASSWORD]` with your password. It looks like:
   ```
   postgresql://postgres.abcxyz:PASSWORD@aws-0-us-east-2.pooler.supabase.com:5432/postgres
   ```
   **This** is your `DATABASE_URL`.

> ⚠️ **Important:** Prisma needs the Postgres **connection string** above
> — *not* the `SUPABASE_URL` / `VITE_SUPABASE_URL` / anon key you may have
> seen. Those are for Supabase's JavaScript client and won't work here.
> This app talks to Postgres directly.

### Using Neon (alternative)

1. Go to **neon.tech**, create a project `magical-by-reign`.
2. Copy the **Pooled connection string** (host contains `-pooler`):
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   That's your `DATABASE_URL`.

## Step 2 — Create the tables + demo data

From your computer (or ask me to run it), with that URL:

```bash
# one-time: point at your Neon database
export DATABASE_URL="postgresql://…your neon pooled URL…"

npx prisma db push     # creates all the tables
npm run db:seed        # adds the sample experiences (optional)
```

## Step 3 — Connect Netlify to the repo

> ⚠️ **Use the Magical by Reign Netlify site** (`magical-m.netlify.app`) —
> **not** your `caregiving-lean-on-me` site. Each app is a separate
> Netlify project with its own environment variables. Double-check the
> project name at the top of the Netlify page before adding anything.


1. In Netlify: **Add new site → Import an existing project → GitHub**,
   and pick this repository.
2. Set the **production branch** to **`main`** (after the PR is merged),
   or to the working branch if you prefer.
3. Build settings are read automatically from `netlify.toml`
   (build command `npm run build`; the Next.js runtime is auto-installed).
   Don't set a "publish directory" manually — the Next.js runtime handles it.

## Step 4 — Add environment variables

In Netlify → **Site settings → Environment variables**, add:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | your Neon **pooled** connection string |
| `SOCIAL_TOKEN_KEY` | run `openssl rand -hex 32` and paste the result |
| `NEXT_PUBLIC_BASE_URL` | your live URL, e.g. `https://magical-m.netlify.app` |

> `SOCIAL_TOKEN_KEY` encrypts social access tokens. Keep it secret and
> **don't change it** once set, or existing connections can't be read.

## Step 5 — Deploy

Trigger a deploy (Netlify does this automatically on push, or click
**Deploy site**). When it finishes, your site is live.

---

## What works immediately vs. after the database

- **Immediately (even before the DB):** the marketing homepage `/`
  (with the video hero) and the pricing page `/pricing` — these are
  fully static.
- **After Step 1–2 (database):** the dashboard, live experience pages
  (`/your-slug`), checkout, and Magical Social Studio.

## Custom domain

Once live, add your real domain (e.g. `magicalmomentsbyreign.com`) in
Netlify → **Domain settings**, and update `NEXT_PUBLIC_BASE_URL` to
match.

## Notes

- **Social Studio** stays in sandbox mode until you add each platform's
  real OAuth credentials (see `docs/SOCIAL_STUDIO.md`). The site works
  fine without them.
- **Payments** (Stripe) are a later phase; checkout currently captures
  the selection + acknowledgment without charging.
- Prisma is configured with the `rhel-openssl-3.0.x` engine target that
  Netlify's serverless functions require — no action needed.
