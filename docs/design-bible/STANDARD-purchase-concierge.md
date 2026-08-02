# Master Design Bible — Purchase Concierge™

**Status:** Founder Approved (canonical). A new **core platform**. Subordinate to
Book I. *(™ appears in customer-facing UI only once the trademark completes.)*

**Built today (first slice):** the Purchase Center, Smart Order Tracking,
wishlists, and delivery-reminder groundwork at `/dashboard/purchases` (DB-backed,
per-Family). Price comparison, payment-method display, in-app returns, and
merchant order-connect are documented seams that unlock through future partner
integrations.

**Needs (later phases):** trusted-merchant partner integrations (order connect,
tracking feeds, price/payment data, eligible in-app returns) and accounts/auth
for real per-customer isolation.

---

## Purpose

Help customers **organize, monitor, and manage purchases** made throughout every
Life Journey. **Magical Moments does not replace the merchant** — customers buy
on the merchant's site; Purchase Concierge is the central place to stay organized
before, during, and after the purchase, connected to the Journey it belongs to.

## How it works

When a customer selects a recommended product/service, they're directed to the
merchant's website/checkout. After purchasing, they **connect or add the order**
so it appears inside their Journey and here in the Purchase Center.

## Purchase Center

Displays per order: product · store · order date · estimated delivery · tracking
number (when available) · purchase price · warranty · return window · order
status · notes. *(Built.)*

## Smart Order Tracking

Status states: Order Confirmed → Preparing Shipment → Shipped → Out for Delivery
→ Delivered → Delayed → Return Initiated → Completed. Customers always know where
purchases stand. *(Built — customer sets status now; automatic tracking feeds are
a partner-integration seam.)*

## Purchase Timeline

Every purchase becomes part of the Journey timeline (e.g. Wedding: dress ordered
→ invitations delivered → flowers confirmed → cake paid → wedding day).
*(Groundwork: purchases link to a Journey; timeline weave-in is a later slice.)*

## Reminders

"Your baby crib arrives tomorrow." · "Your wedding invitations were delivered
today." · "Your flooring is expected next Tuesday." · "Your passport expires
before your vacation." *(Groundwork: `arrivingSoon()` flags near-term deliveries;
scheduled notifications need the reminder scheduler.)*

## Return & cancellation assistance

Quick access to merchant contact, order details, return policy, and cancellation
options. Where supported through future partner integrations, begin eligible
requests directly in Magical Moments; **otherwise guide the customer to the
merchant's official process.** *(Seam — no in-app returns until partners exist.)*

## Price comparison *(later phase)*

Before purchase, compare pricing from participating merchants when possible:
store · price · estimated shipping · delivery time · member savings · special
offers. **Always encourage customers to verify final pricing before buying.**
*(Needs merchant data/partners — never shown as final or exclusive without one.)*

## Payment options *(later phase)*

During supported merchant checkouts, display the payment methods that merchant
actually accepts (Apple Pay, Google Pay, PayPal, Venmo, Cash App Pay, Klarna,
Afterpay, Affirm, Shop Pay, major cards). **Only ever show methods truly
available for that merchant.**

## Wishlists *(built)*

Save products before purchasing (Wedding, Baby, New Home, Vacation, Graduation,
General…). Compare products, prices, and availability before deciding.

## Founder philosophy

Customers should never have to remember every order, delivery, warranty, or
return deadline. Purchase Concierge keeps purchase information connected to the
Life Journey where it belongs — so Magical Moments becomes the place customers
return to because they **trust it to help them stay ahead.**

## Guardrail

We never process the merchant's payment, ship goods, imply an exclusive discount
or a partner that doesn't exist, or show a payment method a merchant doesn't
accept. Placeholder amounts and partner features are labeled until real
integrations exist; customers verify final pricing, warranty, and return terms
with the merchant.
