-- ─────────────────────────────────────────────────────────────────────────────
-- Magical Moments by Reign — enable Row Level Security across the public schema
-- Pre-launch development hardening. No live customer data exists yet.
--
-- WHAT THIS MIGRATION DOES
--   1. Enables RLS on EVERY existing base/partitioned table in `public`.
--   2. Adds NO policies. With RLS enabled and no policy, the `anon` and
--      `authenticated` API roles receive ZERO rows — every table is locked by
--      default. This is intentional: the project is in development, so unfinished
--      tables stay closed until their real access rules are written.
--   3. Installs an event trigger so any table created in `public` in the future
--      (including by `prisma db push`) automatically gets RLS enabled.
--
-- WHY THE APP KEEPS WORKING
--   The application never touches Postgres through the Supabase anon/authenticated
--   client — it connects only through Prisma using the Supabase Session pooler as
--   the `postgres` role. `postgres` (and `service_role`) BYPASS RLS, so enabling
--   RLS does not restrict any server-side operation. We deliberately use ENABLE
--   (not FORCE) so those privileged roles continue to bypass RLS.
--
-- WHAT THIS MIGRATION DOES NOT DO
--   • It does not DROP, RENAME, or RECREATE any table.
--   • It does not add any broad/anonymous access policy.
--   • It does not add customer-ownership policies: nothing is wired to Supabase
--     Auth (`auth.uid()`) yet — the app uses its own cookie sessions — so there
--     is no authenticated identity to scope rows to. Ownership policies get added
--     per-feature, later, as each feature is connected to Supabase Auth.
--
-- SHARELINK
--   ShareLink holds public share tokens. With RLS enabled and no policy it is
--   locked immediately: the `anon`/`authenticated` roles cannot list or read its
--   `token` column at all. Token lookups happen server-side via Prisma only.
--
-- HOW TO RUN
--   • Supabase Dashboard → SQL Editor → paste this file → Run (runs as postgres), or
--   • supabase db push        (if you use the Supabase CLI), or
--   • psql "$DATABASE_URL" -f supabase/migrations/20260804000000_enable_rls_public_schema.sql
--
-- Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- 1) Enable RLS on every existing table in `public` (ordinary + partitioned).
--    Skips Prisma's bookkeeping table and anything that isn't a table.
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')          -- r = ordinary table, p = partitioned table
      and c.relname <> '_prisma_migrations'
  loop
    execute format('alter table public.%I enable row level security;', r.relname);
  end loop;
end
$$;

-- Explicit, so it is unmistakable that share tokens are locked immediately.
-- (Already covered by the loop above; kept here for clarity and safety.)
do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'ShareLink'
  ) then
    execute 'alter table public."ShareLink" enable row level security;';
  end if;
end
$$;

-- 2) Auto-enable RLS on any table created in `public` from now on, so no future
--    table can ship with RLS disabled (satisfies the "new tables inherit RLS"
--    requirement, including tables created by `prisma db push`).
-- Event-trigger function. It does NOT use SECURITY DEFINER: event triggers run
-- with the privileges of the role executing the DDL (migrations run as
-- postgres), so no elevation is needed — and avoiding SECURITY DEFINER keeps it
-- off the Security Advisor's "public can execute a SECURITY DEFINER function" list.
create or replace function public.tg_enable_rls_on_new_tables()
returns event_trigger
language plpgsql
set search_path = public
as $$
declare
  obj record;
begin
  for obj in
    select * from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE TABLE'
      and object_type = 'table'
  loop
    -- object_identity is schema-qualified and already correctly quoted.
    if split_part(obj.object_identity, '.', 1) in ('public', '"public"') then
      execute format('alter table %s enable row level security;', obj.object_identity);
    end if;
  end loop;
end
$$;

drop event trigger if exists enable_rls_on_new_public_tables;
create event trigger enable_rls_on_new_public_tables
  on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function public.tg_enable_rls_on_new_tables();

commit;

-- ── Verification (run separately; expects ZERO rows) ─────────────────────────
-- Any public table still missing RLS after this migration:
--
--   select c.relname
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public'
--     and c.relkind in ('r','p')
--     and c.relname <> '_prisma_migrations'
--     and c.relrowsecurity = false;
--
-- When that returns no rows, the Security Advisor "RLS Disabled in Public"
-- findings are cleared. Re-run: Supabase Dashboard → Advisors → Security Advisor
-- → Rerun (or `supabase inspect db`).
