# Supabase — Row Level Security posture

Magical Moments by Reign is pre-launch. There is **no live customer data** yet, so
the database is locked down by default and access is opened up **per feature**, as
each feature is finished — never just to "make the site work."

## How the app reaches the database

The application talks to Postgres **only through Prisma**, using the Supabase
**Session pooler** as the `postgres` role. That role **bypasses RLS**, so enabling
RLS does not change any server-side behavior.

The only Supabase *client* in the codebase is `src/lib/storage.ts`, and it uses the
**service-role key against Supabase Storage** (media buckets) — never the anon key,
and never for reading database tables. **Nothing in the app reads a table through
the `anon` or `authenticated` API roles.**

## What the migration does

`migrations/20260804000000_enable_rls_public_schema.sql`:

1. Enables RLS on **every** table in `public`.
2. Adds **no policies** → `anon` / `authenticated` get **zero rows** everywhere.
   Unfinished tables stay closed. `ShareLink` (share tokens) is locked immediately.
3. Installs an **event trigger** so any future table (including ones created by
   `prisma db push`) has RLS enabled automatically.

It uses `ENABLE` (not `FORCE`) so the `postgres`/`service_role` connection keeps
bypassing RLS. It does not drop, rename, or recreate anything.

## Applying it

- **Supabase Dashboard → SQL Editor** → paste the migration → **Run**, or
- `supabase db push` (Supabase CLI), or
- `npm run db:rls` (runs the file with `psql` against `$DATABASE_URL`).

Then **Dashboard → Advisors → Security Advisor → Rerun**. The verification query at
the bottom of the migration should return **zero** rows.

## Adding access later (per feature, only when wired to Supabase Auth)

Today the app authenticates with its own cookie sessions, so there is no
`auth.uid()` to scope rows to — that is why **no ownership policies exist yet**.
When a feature is genuinely connected to Supabase Auth, add a *narrow* policy for
just that table. Template:

```sql
-- Example: let a signed-in Supabase user read only their own rows.
-- Only add this once "Account" is keyed to Supabase Auth (auth.uid()).
create policy "owner can read own account"
  on public."Account"
  for select
  to authenticated
  using (auth.uid()::text = "authUserId");   -- column that stores the Supabase user id
```

Do **not** add `to anon` policies, and do **not** open a table just to unblock the
UI — the server already reads everything it needs through Prisma.
