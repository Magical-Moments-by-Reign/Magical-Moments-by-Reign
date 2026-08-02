# Master Design Bible — Admin Specials & Promotions Center

**Status:** Founder Approved. Subordinate to the [Constitution](./CONSTITUTION.md)
and Book I. Lets the Founder create, schedule, manage, pause, and review
promotions **without changing code** — while the approved pricing model and the
Lifetime Collections stay protected at all times.

**Built today (first slice):** admin-gated `/admin/specials` — create specials
(percent/fixed/preview-extension/custom), schedule (start/end), **Lifetime Value
Protection** enforced on create + publish, approve/publish, pause/resume/end
(emergency controls), a status dashboard, and an **append-only audit log**.

**Needs (later phases):** customer email/SMS + banners, per-customer/geo
eligibility + stacking enforcement at checkout, redemption/revenue/conversion
analytics, and a test-customer preview flow. Also full multi-role admin auth
(today: single-operator admin gate).

---

## Access & audit
Only authenticated admins reach the Center (today: the shared admin gate; roles —
Founder · Super Admin · Pricing Admin · Marketing Admin · Read-Only — arrive with
multi-user auth). **The Founder retains final authority.** Every action is
written to an append-only audit log (created · edited · approved · published ·
paused · resumed · ended · blocked); records are never silently overwritten or
deleted (draft specials may be deleted; published ones are *ended*, not erased).

## Create a special
Offer types: percentage discount · fixed-dollar discount · Journey Preview
extension · custom (plus the documented catalog: free first month, discounted
first year, multi-Journey savings, upgrade-credit bonus, returning-customer,
referral, holiday/birthday/launch, journey- or term-specific, add-on). Settings
(first slice): name · internal note · customer-facing description · code or
auto-apply · start/end · scope (all / recurring / term / lifetime / journey) +
scope value · audience (all / new / existing / upgrade) · max redemptions ·
per-customer cap · min purchase · stackable · public/private. *(Banners, email,
SMS, geo, terms text = later phase.)*

## Lifetime Value Protection (non-negotiable)
Before a special can be created or published, the engine compares it against the
Lifetime Collections — **Lifetime Legacy $2,499 (≤5)** · **Lifetime Reign $4,999
(≤10)** · **Lifetime Magical Moments $9,999 (all + future + 1 Custom)**. **No
recurring/term plan, coupon, bundle, or stack may become a better long-term value
than the comparable Lifetime Collection.** The check tests the worst case — the
10-year build at each Collection's Journey cap — and if a discount would drop it
below that Collection's price it **blocks publication**, explains the conflict,
names the affected Collection, and shows the lowest permitted price. This
protection **cannot be overridden** by another admin.

## Lifetime specials (intentional)
The Founder may deliberately discount a Lifetime Collection (e.g. "Lifetime 30%
off today"). Those are allowed with: regular price, promo price, savings, a clear
expiration, **preserved upgrade-credit math**, and Founder approval before
publication. A discount on recurring plans does not require a Lifetime discount
unless it would otherwise undermine Lifetime value.

## Upgrade credits
Promotions compose with **Previous Investment Credits** (customers never lose
money invested): `Lifetime price − previous investment credit − approved promo =
amount due`, each line shown clearly.

## Dashboard, scheduling & emergency controls
Dashboard groups specials by **active / scheduled / draft / paused / ended**
(with redemption counts; revenue/conversion analytics later). Specials begin and
end automatically by their window (holiday/seasonal campaigns); at expiration
pricing returns to the approved standard. The Founder can **pause immediately,
end early, or remove** at any time.

## Final rule
The Center gives flexibility to reward customers and run campaigns — it does
**not** grant permission to alter the core pricing model. No special is active
until it passes **Lifetime Value Protection · upgrade-credit validity ·
eligibility · Founder approval** (checkout testing arrives with the test-customer
flow).
