# Master Design Bible — Global Platform Standard
## Gifts & Registries

**Status:** **Built (expanded slice)** — a reusable module on **every** experience
type. Subordinate to Book I. Governs every Journey.

**Built:** enable/disable per Journey; multiple external registry links; cash /
contribution handles (Venmo, Cash App, PayPal deep links; Zelle display);
**individual gift items** (name, store, price, purchase link, priority,
mark-as-purchased); **charitable giving** (name, cause, goal, raised, donate
link); **occasion-specific wording** (Wedding → "Registry & Wedding Gifts", Baby
→ "Baby Registry", Graduation → "Celebrate the Graduate", New Home →
"Housewarming Registry", Memorial → "Honor Their Memory", etc.); visibility
controls; public themed section with elegant gift cards.

**Phased (need services):** direct contributions via **Square** (server-side,
idempotent, confirm-before-complete), **guest self-serve reserve** with email
(prevent duplicate purchases, anonymous gifting), **Thank-You Tracker** (with
Ask Magical draft), **notifications** (email/dashboard/SMS), and **gift-image
uploads** (secure Storage). We never hold funds for external links, never store
bank credentials, and never display a home address unless the customer opts in.

---

## The rule

Every Journey created within Magical Moments by Reign must include an
**optional** Gift & Registry section. This is **never required**.

During Journey setup the platform always asks:

> "Would you like to receive gifts, cash gifts, or create a registry for this
> Journey?"

The customer may choose one or more of:

- ☐ No Gifts
- ☐ Traditional Gift Registry
- ☐ Cash Gifts
- ☐ Both Registry & Cash Gifts
- ☐ Add Later

---

## Traditional Gift Registry

Customers may create one or multiple registries. Supported examples: Amazon,
Target, Walmart, Babylist, Pottery Barn, Williams Sonoma, Macy's, Crate &
Barrel, and any custom registry URL.

Guests click the registry button and are taken directly to the selected
registry.

---

## Cash Gifts

Customers may safely accept monetary gifts via: Cash App, Venmo, Zelle, PayPal
(and future: Apple Cash, Google Pay, Bank Transfer).

Customers enter **their own** payment information. **Magical Moments by Reign
never stores or processes these funds** — payments go directly to the customer
through their chosen platform.

---

## Display options (owner-controlled visibility)

- Everyone can contribute
- Only invited guests
- Only family
- Hide until invitations are sent
- Disable at any time

---

## Personal message

Customers may include a personal message, e.g.:

- "Your presence is the greatest gift, but if you'd like to bless us, we've
  included a few options below."
- "We're saving for our honeymoon and appreciate your love and support."
- "We're preparing for Baby Olivia's arrival. Thank you for helping us welcome her."

---

## Thank-you experience

The registry page encourages gratitude. After the event, the platform asks the
owner: "Would you like us to help you thank everyone who celebrated with you?"

- Personalized thank-you emails
- Printed thank-you card list
- Gift tracking
- Registry completion tracking
- Cash gift acknowledgment list

---

## Supported Journeys

Available for every Journey where it makes sense: Proposal (optional celebration
gifts), Engagement, Bridal Shower, Wedding, Housewarming, Baby Announcement,
Gender Reveal, Baby Shower, Sip & See, Birthdays, Graduations, Retirement,
Anniversary, Vacation Fund, New Business Launch, Memorial Donations, and Custom
Journeys.

---

## Founder philosophy

Magical Moments should never assume a customer wants gifts. The platform
politely offers the option during Journey setup and lets the customer enable,
disable, or modify it at any time.

---

## Recommended first build slice (for Founder approval)

1. **Setup question** on Journey creation (No Gifts / Registry / Cash / Both /
   Add Later) — never required.
2. **Data model** per Journey: mode, registries (label + URL), cash methods
   (platform + handle — **handles only, never funds**), personal message,
   visibility, enabled flag.
3. **Experience display**: an elegant "Gifts & Registry" section — registry
   buttons that open the retailer, cash-gift buttons that deep-link to the
   customer's own Venmo/Cash App/PayPal (or show the Zelle handle), and the
   personal message — shown according to the chosen visibility.
4. **Owner controls** in the dashboard to edit/disable anytime.

Deferred to a later phase: the post-event thank-you suite (emails, tracking,
acknowledgment lists) and additional cash rails (Apple Cash, Google Pay, bank
transfer).

**Guardrail:** we never touch the money — only store the customer's public
handles/links and route guests to the customer's own payment app.
