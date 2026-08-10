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

---

## Deploying a schema change to production

**Every ordinary deploy — every push to `main`, every PR preview —**
**never touches the database.** The build command is only
`prisma generate && next build`. This is deliberate: it means an
ordinary deploy can never exhaust Supabase's Session pooler connection
limit (`EMAXCONNSESSION`), and a code deploy can never accidentally
alter production data.

### When is this required?

Whenever `prisma/schema.prisma` changes — a new model, a new field, a
new index. Code that *reads* a new table (like a Discovery or Sports
page) will load fine even before the table exists — every read is
wrapped to degrade to an honest empty/"not connected" state rather than
crash — but nothing can be *written* (a Spotify connection saved, a
Sports pick recorded) until the table actually exists in production.

### What command runs

```
npm run db:deploy
```

Which is `RUN_DATABASE_PUSH=true node scripts/prepare-db.mjs`. That
script (see the file itself for full detail):

- Runs `prisma db push --skip-generate` — **additive schema sync**, not
  a destructive reset. It creates whatever's in `prisma/schema.prisma`
  that the database doesn't have yet; it does not drop or truncate
  anything that already exists.
- **Refuses to run** anything Prisma itself flags as a data-loss risk
  (e.g. a dropped column, a new required field with no default) — it
  stops and prints exactly what needs fixing, rather than silently
  running `--accept-data-loss`.
- Retries automatically on transient connection-pool errors, and never
  prints `DATABASE_URL` (with its password) anywhere in its output.
- Then runs a handful of idempotent, create-if-missing content fixes
  (seed data only when the database is empty, sample-content
  corrections, a Family slug backfill) — all safe to run repeatedly,
  none of which touch Sports/Spotify/Discovery data.

### How to trigger it (no terminal, no pasting `DATABASE_URL` anywhere)

A dedicated Netlify **deploy context** — `db-schema-deploy` — runs
`npm run db:deploy && npm run build` instead of the ordinary build
command. It is defined in `netlify.toml` and only activates for a
deploy whose branch is named exactly `db-schema-deploy` — never for
`main`, never for a PR preview, never for any other branch.

1. **One-time setup** (already done once this branch exists): create
   the branch — `git checkout -b db-schema-deploy && git push -u origin
   db-schema-deploy` — so Netlify has it in the repo.
2. **Whenever a schema change needs to reach production:** fast-forward
   that branch to the latest `main` and push it —
   ```
   git checkout db-schema-deploy
   git merge --ff-only main
   git push origin db-schema-deploy
   ```
3. In Netlify: **Deploys → Trigger deploy → Deploy branch →
   `db-schema-deploy`** (if the site doesn't already auto-build every
   pushed branch, do this manually). This reuses the site's existing
   `DATABASE_URL` — nothing new to configure.
4. Read that deploy's build log for `scripts/prepare-db.mjs`'s own
   output (prefixed `[db]`) — it reports exactly what it did.

> **If `DATABASE_URL` is scoped to "Production" only** in Netlify's
> environment variable settings, this branch deploy won't see it —
> `prepare-db.mjs` detects a missing `DATABASE_URL` and safely no-ops
> rather than failing destructively. If that happens, add "Branch
> deploys" to `DATABASE_URL`'s deploy contexts (Netlify → Site
> configuration → Environment variables → click the variable → Edit
> scopes).

### How to verify success

- The `db-schema-deploy` build log ends with `[db] Production database
  ready. ✦` on success.
- Owner-only diagnostic page (temporary, remove once no longer needed):
  `/dashboard/discovery/admin/diagnostics/spotify` — lists every recent
  new table (`SpotifyConnection`, `SportsFollow`, `SportsGame`,
  `SportsPick`, `SportsBadgeEarned`, `DiscoveryCache`,
  `DiscoveryFeatured`) as EXISTS/MISSING, checked live against
  production, never assumed.

### How to check Prisma schema status yourself

From a machine with production `DATABASE_URL` set:
```
npx prisma db pull --print   # shows what the DB actually has
npx prisma validate          # confirms schema.prisma itself is valid
```
Or, with no terminal at all, use the diagnostic page linked above — it
checks the same thing live, per table, from inside the deployed app.

### What NOT to run in production

- `prisma migrate reset` — wipes the database.
- `prisma db push --force-reset` — wipes the database (this repo's own
  `npm run db:reset` uses this flag; it's for local dev only).
- `prisma db push --accept-data-loss` — only ever run this by hand,
  after reading exactly what Prisma says it would drop, and confirming
  on real production data that the loss is acceptable. Never automate
  it.
- Anything that pipes untrusted input into a raw SQL client against
  `DATABASE_URL`.

### Recovery if a schema deploy fails

- **Transient connection error** (`EMAXCONNSESSION`, pool timeout): the
  script already retries automatically; if it still fails after 4
  attempts, wait a minute (let other connections close) and re-trigger
  the `db-schema-deploy` branch deploy.
- **Data-loss guard blocked it**: nothing was changed — the guard stops
  *before* applying anything destructive. Fix the schema change in
  `prisma/schema.prisma` to be additive (a new nullable/defaulted field
  instead of a required one, no dropped columns), commit, and re-run.
- **Wrong `DATABASE_URL` format**: the script prints which one it needs
  (`Session pooler`, not the direct or transaction-pooler URL) — fix it
  in Netlify's environment variables and re-trigger.
