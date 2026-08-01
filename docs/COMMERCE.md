# Cart, Checkout & Square Payments

A full cart → checkout → order flow with a Square-ready payment layer.

## How it works

- **Cart** (`src/components/cart/`) — a client context persisted to
  `localStorage` (survives refresh/navigation for guests). Holds the
  selected plan + add-ons with quantities. A cart icon in the nav shows
  a live count; the drawer slides in from the right.
- **Add-on shop** (`/pricing`) — every add-on is an interactive product
  card (add to cart, quantity, remove, selected state, "best with"
  suggestion, one-time/recurring + availability notes).
- **Checkout** (`/checkout`) — multi-step (Details → Billing → Review →
  Payment) with a sticky order summary. Shipping fields appear only when
  a physical add-on is in the cart.
- **Server-authoritative pricing** — the order total is **always**
  recomputed on the server from approved prices (`src/lib/commerce.ts`,
  `computeTotals`). The browser total is never trusted.
- **Orders** — created as `PENDING` via `POST /api/checkout`, with a
  `MMR-YYYYMMDD-####` number. Marked `PAID` only when Square confirms.
- **Confirmation** (`/checkout/confirmation?order=…`) — shows the order
  number, items, total, and next steps.

## Square setup (sandbox → production)

Card entry is handled entirely by **Square's Web Payments SDK** — card
numbers never touch Magical Moments forms or servers. The access token
is server-only.

### 1. Get sandbox credentials
Square Developer Dashboard → your app → **Sandbox**:
- Application ID → `NEXT_PUBLIC_SQUARE_APPLICATION_ID`
- Location ID → `NEXT_PUBLIC_SQUARE_LOCATION_ID`
- Access token → `SQUARE_ACCESS_TOKEN`
- Webhook signature key → `SQUARE_WEBHOOK_SIGNATURE_KEY`

### 2. Set environment variables (Netlify → Environment variables)
```
SQUARE_ENVIRONMENT=sandbox
NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sandbox-sq0idb-...
NEXT_PUBLIC_SQUARE_LOCATION_ID=...
SQUARE_ACCESS_TOKEN=EAAA...            # secret — never in the browser/git
SQUARE_WEBHOOK_SIGNATURE_KEY=...       # secret
```
Until these are set, checkout records **pending** orders and shows a
clear "payment not configured" state (no fake charges).

### 3. Webhook
Point a Square webhook at `https://<your-domain>/api/square/webhook`
(events: `payment.created`, `payment.updated`). Signatures are verified
with `SQUARE_WEBHOOK_SIGNATURE_KEY`.

### 4. Test (Square sandbox test cards)
- Success: `4111 1111 1111 1111`, any future expiry, any CVV, any ZIP.
- Decline: use Square's documented decline test values.

### 5. Go live
Swap all values to production (`SQUARE_ENVIRONMENT=production`,
`NEXT_PUBLIC_SQUARE_ENVIRONMENT=production`, production App/Location IDs,
production access token + webhook key). Never commit secrets.

## Server endpoints
- `POST /api/checkout` — create a pending order (server-validated total).
- `POST /api/square/pay` — charge a tokenized card for an order
  (idempotency key required; amount taken from the DB, not the client).
- `POST /api/square/webhook` — verified webhook receiver + reconciliation.

## Guarantees
- No paid order without Square confirmation.
- Idempotency keys prevent duplicate charges.
- Prices/totals validated server-side from approved data.
- Card data only in Square's hosted field.

## Still to wire (next passes)
- Admin Orders area (search/filter/refund/fulfil/export).
- Coupons UI + discount application.
- Receipt + admin-notification emails (record + number exist now).
- Signed-in cart persistence to the database.
