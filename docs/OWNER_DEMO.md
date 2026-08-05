# Owner / Internal Demo Account

Everything needed to provision and operate the owner demo account
`info@magicalmomentsbyreign.com` — an internal account used to walk through the
whole product, with every built Journey and feature, without paying and without
touching any real customer's data.

> **Status:** The tooling is built and tested. The live account is **not yet
> created** — it exists only after you run the provisioning script (step 2)
> against the production database. Nothing here has been run against production.

---

## What gets provisioned

The account `info@magicalmomentsbyreign.com` is granted, all at once:

| Grant | How it's stored | Effect |
|---|---|---|
| **Owner** | `staffRoles` includes `"owner"` | Unlocks the Owner Demo Studio |
| **Super Admin** | `platformRole = "admin"` | Full staff access (admin console) |
| **Internal Demo** | `isDemo = true` | Flags this as a non-customer test account |
| **Full Lifetime** | `membershipTier = "magical"` | Every Journey unlocked, unlimited |
| **Payment bypass** | `billingExempt = true` | This account only — never customers |

Plus **one editable DRAFT per built Journey**, titled `Demo — [Journey]`, filled
with placeholder content you can immediately open and replace.

### Security & isolation

- Runs with the app's normal server-side DB credentials. **RLS is never touched,
  disabled, or weakened** — the policies from the RLS migration stay exactly as
  they are. Customer isolation is preserved.
- `billingExempt` is set **only** on this one internal account.
- Owner access is **never** granted to any other user.
- The tooling **sends nothing** — no email, invite, reminder, vendor request, or
  social post. Provisioning is silent.
- Fully **idempotent** — safe to run repeatedly; it never creates duplicate
  accounts, roles, or drafts, and never overwrites drafts you've edited.

---

## Files

| File | Purpose |
|---|---|
| `src/lib/owner-demo.ts` | Provisioning core (single source of truth) |
| `scripts/provision-owner-demo.ts` | CLI: the secure admin action to run after deploy |
| `src/app/dashboard/owner-demo/` | Owner Demo Studio page + server actions |
| `prisma/schema.prisma` | Adds `Account.isDemo`, `Account.billingExempt` |

---

## 1. Prerequisites

1. The branch is deployed (so the schema with `isDemo` / `billingExempt` is
   applied to production — the Netlify build runs `prisma db push`).
2. You have the production **Session-pooler** `DATABASE_URL`
   (`…pooler.supabase.com:5432/postgres`). Keep it secret — never commit or paste
   it anywhere public.

## 2. Provision (run once, after deployment)

From the project root, with the production URL in the environment:

```bash
DATABASE_URL="postgres://…pooler.supabase.com:5432/postgres" \
  npx tsx scripts/provision-owner-demo.ts
```

Optional environment variables:

| Var | Default | Meaning |
|---|---|---|
| `OWNER_DEMO_EMAIL` | `info@magicalmomentsbyreign.com` | Override the account email |
| `OWNER_DEMO_PASSWORD` | _(unset)_ | Set an initial password. If omitted and the account has none, use **Forgot password** at `/forgot-password` — no fake password is ever stored |

The script prints a summary (account id, roles, membership, how many drafts were
created vs. already present). The `DATABASE_URL` / password is **never** printed.

## 3. Sign in

- Go to `/login` and sign in as `info@magicalmomentsbyreign.com`.
- If the account was newly created without `OWNER_DEMO_PASSWORD`, use
  `/forgot-password` first to set a password.

## 4. Verify

- Visit **`/dashboard`** → an **Owner Demo Studio** link appears in the nav
  (owner-only).
- Open **`/dashboard/owner-demo`**. The status banner should read
  *"Owner demo account is provisioned"* and show: membership `magical`,
  internal demo **Yes**, billing bypass **Yes**, and `12/12` demo drafts created.
- Each Journey card shows a **DEMO** badge, its sub-occasions, and
  Preview / Publish controls.
- Use the **Visitor-view preview** to see any draft at desktop or phone width.

Or verify directly in the database:

```sql
select "membershipTier", "isDemo", "billingExempt", "staffRoles", "platformRole"
from "Account" a
join "CustomerEmail" e on e."accountId" = a.id
where e.canonical = 'info@magicalmomentsbyreign.com';
-- expect: magical | t | t | ["owner","super_admin"] | admin

select slug, status from "Experience" where slug like 'demo-%' order by slug;
-- expect 12 rows, status DRAFT
```

## 5. Re-sync / reset

- **Re-sync** (in the Studio → *Maintenance*, or re-run the script): recreates
  any missing drafts and re-applies roles. Never overwrites edited drafts.
- **Remove demo drafts** (Studio button, or `--reset`):

  ```bash
  DATABASE_URL="…" npx tsx scripts/provision-owner-demo.ts --reset
  ```

  Deletes **only** the `demo-*` drafts. It never deletes a customer Journey, and
  it leaves the owner account itself intact.

---

## Truthful feature inventory

### ✅ Built & working

Public homepage & brand story · Membership Builder & pricing · Get Started tour ·
Journeys catalog (`/experiences`, `/journeys`) · Sign up / Sign in / Verify /
Reset · Your Magical Space (member home) · Member dashboard · Experience pages +
design engine · Account / Security / Family / Billing settings · Notifications
center · Home Estate · Business edition · About / FAQs / Success Stories /
Contact · Admin console · Vendor portal · Owner Demo Studio.

### 🟡 Built but not fully connected (needs a key or provider)

| Feature | Depends on |
|---|---|
| Magical AI concierge | `QWEN_API_KEY` (honest offline fallback until set) |
| Checkout & payments | Square keys (owner account is billing-exempt for testing) |
| Transactional email | `RESEND_API_KEY` (this tooling sends no email regardless) |
| Social Studio & sharing | Connected social accounts |
| Family Vault & media uploads | Media storage backend |
| Gifts & registry | Per-experience gift settings |
| Custom domains & websites | Domain provider config |
| Housing Hub | Home Estate expansion |
| Share links | Finishing + RLS unlock (locked by default today) |

### 🔜 Coming Soon (not built — intentionally no link)

- Inline content editor (replace text, photos, videos & dates in-app). Today the
  placeholder content renders and the design can be regenerated on the page; the
  in-app rich editor is the next build.
- Each Journey as a full Life Estate (beyond the Home Estate).
- Milestone-level personalization pages within each Journey.
- Legacy & Memories page (awaiting your image + placement decision).
- Vendor marketplace booking & transactions.
- Mobile push notifications.

---

## Notes

- Demo drafts are `DRAFT` + `PRIVATE`; they are not public until you press
  **Publish** in the Studio.
- Every demo draft carries a `_demo` marker in its content and the **Demo —**
  title prefix, so it can never be mistaken for real customer content.
- Running `prisma db push` on every deploy is optional once the schema is
  synchronized — see the note at the bottom of `scripts/prepare-db.mjs`.
