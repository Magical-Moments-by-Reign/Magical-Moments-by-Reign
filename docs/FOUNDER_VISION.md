# Magical Moments by Reign — Founder Vision & Product Architecture

> **Status: PERMANENT.** These are founder-level product requirements from
> Tabitha Turner. They define the long-term architecture of Magical Moments
> and are **not one-time feature requests**. Every feature we build should be
> checked against this document. When in doubt, this is the north star.

---

## Core Philosophy

**Magical Moments is NOT a booking website.** It is an **AI Luxury Concierge
Platform** that removes stress *before, during, and after* every celebration
and every trip.

Journey's guiding principle is always:

> **"What does the member need next?"**

The member should never have to think about the next step, because Journey
already has. **Booking is only the beginning of the experience.**

Luxury Services is **not** Expedia, Booking.com, or Groupon. It coordinates
every detail of a Magical Moment before, during, and after.

**Founder design rules**
- Journey should never stop helping after booking. It always asks *"What comes next?"*
- If something normally requires transportation → **ask**.
- If something usually needs reservations → **ask**.
- If something can be arranged before arrival → **offer it**.
- Every feature removes work from the member.
- Every screen answers the next question before they ask it.
- Every trip feels effortless. Every Magical Moment feels truly magical.

---

## 1. Magical Live

Every occasion includes **Go Live Now** and **Schedule a Live**. Members never
copy Zoom-style links. Magical Moments automatically:
- Creates the secure room
- Sends invitations
- Sends reminders
- Tracks attendance
- Supports replay when enabled

## 2. My Magical Family™ (permanent relationship manager)

Save permanently: First Name, Last Name, Email, Mobile, Relationship,
Favorite, Groups, Invitation Preference.

**Groups:** Family, Friends, Church, School, Cheer, Military, Business, and
custom groups.

**Requirements**
- Alphabetical, searchable, expandable
- **Select Entire Group** and **Expand Group**
- **Uncheck one member for a single event** without removing them from the
  permanent group
- Never require members to re-enter contact information

> Example — `Family (42)`: Mom, Dad, Karlie, Jeremy, Daria, Grandma are
> checked; **Uncle Bob is unchecked for THIS EVENT only** and remains
> permanently inside Family.

## 3. Invitation Preferences

Each contact stores: Email · Text · Both · **Ask Me Every Time**.

When both email + mobile exist, ask: *"How would you like to invite
Jennifer?"* — Text / Email / Both, with **"Remember this preference."**

**Invitation tracking:** Queued · Sent · Delivered · Opened (where supported)
· Joined · Failed.

## 4. Concierge Personality

Every member chooses a **Concierge Name** and **Concierge Voice**. The chosen
voice becomes their concierge everywhere: travel updates, occasion narration,
trip reminders, Journey conversations, and Live notifications.

## 5. Luxury Preferences (permanent)

Members create permanent preferences for: Hotels, Flights, Transportation,
Restaurants, Cruises, Vacation Homes, Accessibility, Payment, Travel Style.

Every search loads **"Using Your Luxury Preferences"** and allows **"Customize
This Trip."** Trip changes **never overwrite** permanent settings unless the
member chooses to.

**Future trip profiles:** Anniversary, Family Vacation, Business Travel, Cheer
Travel, Weekend Getaway, College Visits.

## 6. Luxury Transportation (replaces "Flights")

"Flights" becomes **Luxury Transportation** — everything transportation lives
here: Commercial Flights, Private Jets, Cruises, Rental Cars, Luxury Vehicles,
Helicopters, Trains, Buses, Airport Transfers, Hotel Shuttles, Private
Drivers, Limousines, Yachts, Ferries, Scooters, Motorcycles, Accessible
Transportation.

Journey first asks **"How are you traveling?"** then customizes the workflow.

## 7. Vacation Packages → Journey Collections™

Curated travel experiences. **Goal: 20 rotating packages every day.** Each
package can include Flights, Hotels, Cruises, Transportation, Restaurants,
Excursions, Entertainment. Members may also **Build Your Own Package**.

## 8. Journey Protect™ (proactive mistake prevention)

Journey proactively prevents travel mistakes: cruise departures, international
travel, border restrictions, entry requirements, flight delays, transportation
gaps, hotel sellouts. A sold-out hotel immediately suggests similar
alternatives. **Never leave members at a dead end.**

## 9. Cruise Intelligence

Every cruise automatically asks: Flying? Driving? Hotel night before?
Transportation to port? Transportation after cruise? Airport transfer? Hotel
transfer? Rental car? Private driver? Cruise-line transportation? **Never
assume transportation — always ask.**

## 10. Airport Intelligence

Journey assists with: TSA PreCheck, CLEAR, Global Entry, airport wait times
(when available), recommended departure time, terminal guidance, checkpoint
recommendations, airport maps, CLEAR/TSA locations, lounge recommendations,
layover planning, flight monitoring, baggage-claim estimates, hotel-shuttle
instructions, international customs guidance, arrival estimates.

## 11. Hotel Concierge

Immediately after booking, ask: *"Would you like us to prepare your stay?"*
Requests: extra pillows/blankets/towels, medical refrigerator, microwave,
quiet room, high floor, connecting rooms, accessible room, early check-in,
late check-out, hotel restaurant reservations, celebration notice,
accessibility requests. Where supported, Journey submits requests before
arrival.

## 12. Vacation Home Concierge

Offer: private chef, private driver, airport pickup, airport grocery stop,
grocery delivery, celebration cake, flowers, decorations, massage, yoga,
photographer, dinner planning, restaurant reservations, transportation every
night, housekeeping, laundry, excursion planning. **Never schedule excursions
without discussing transportation.**

## 13. Hotel & Vacation Dining

If a hotel has restaurants, ask *"Would you like me to reserve dinner before
you arrive?"* If yes, reserve; on landing, notify: *"Your dinner reservation
is tonight at 7:00 PM. Need to change it?"* Journey handles adjustments.
Vacation homes: offer private chef, restaurant reservations, dinner planning,
transportation every evening.

## 14. Travel Companion

Ask every traveler: *"Would you like Journey to stay with you during your
trip?"* — Keep me updated throughout / Notify only on important changes / No
notifications. Journey becomes their travel companion.

## 15. Event Travel

When purchasing concerts, sports, Broadway, or festivals, automatically ask to
arrange: Flights, Hotel, Transportation, Parking, Restaurants, Vacation
Extension — **Book Now** or **Remind Me Later**.

## 16. Trip Timeline

Every reservation becomes **one intelligent itinerary**: Flight →
Transportation → Hotel → Dinner → Activities → Cruise → Excursions → Airport →
Return Transportation → Flight Home. Everything connects.

---

## Current implementation status (living map)

Checked against the codebase as of this document's creation. Updated as work
merges. "PR #NN" = built but not yet merged to `main`.

| Vision pillar | Status | Where |
|---|---|---|
| Magical Live — Go Live / Schedule / secure room / invitations / reminders | **Built** (reminders currently manual; replay gated) | PR #78 |
| My Magical Family — save contacts (all fields), favorite, preferred method, alphabetical, searchable | **Built** | PR #78 |
| My Magical Family — named group presets, Select-Entire-Group, expand, per-event uncheck-without-removing | **Partial** (groups are free-text; the group-select UX is not yet built) | — |
| Invitation preferences — Email/Text/Both/Ask + "remember" + per-contact prompt | **Built** (delivery-review step) | PR #78 |
| Invitation tracking — Queued/Sent/Delivered/Opened/Joined/Failed | **Built** (Delivered/Opened via provider webhooks, secret-gated) | PR #78 |
| Real Email (Resend) + Real SMS (Twilio) + U.S. opt-out (STOP/START) | **Built** (email live when `RESEND_API_KEY` set; SMS live when `TWILIO_*` set) | PR #78 |
| Concierge Name + Concierge Voice (used across the platform) | **Built** (earlier work) | `main` |
| Luxury Preferences — Hotels/Flights/Restaurants/Rental Cars/Vacation Homes/Payment | **Built** | PR #81 |
| Luxury Preferences — add Transportation, Cruises, Accessibility, Travel Style | **Partial** (missing categories) | — |
| Luxury Preferences — trip profiles (Anniversary/Family/Business/Cheer/Weekend/College) | **Not started** | — |
| Luxury Transportation (replaces Flights) + "How are you traveling?" workflow | **Not started** (catalog still "Flights") | — |
| Journey Collections™ (20 rotating packages/day) + Build Your Own | **Not started** (static "Vacation Packages") | — |
| Journey Protect™ (proactive prevention, sold-out alternatives) | **Not started** | — |
| Cruise Intelligence (always ask transportation) | **Not started** | — |
| Airport Intelligence (TSA/CLEAR/Global Entry, wait times, maps…) | **Not started** | — |
| Hotel Concierge (prepare-your-stay requests) | **Not started** | — |
| Vacation Home Concierge (chef/driver/grocery/excursions…) | **Not started** | — |
| Hotel & Vacation Dining (reserve before arrival, landing notice) | **Not started** | — |
| Travel Companion (opt-in trip updates) | **Not started** | — |
| Event Travel (auto-offer flights/hotel/transport on tickets) | **Not started** | — |
| Trip Timeline (one connected itinerary) | **Not started** | — |

### Honesty guardrails (permanent)
Consistent with the platform's honesty-first architecture: we never fabricate
prices, availability, confirmations, delivery states, or replay links. A
capability that needs a provider we haven't connected shows an honest
"not connected yet" state and activates only when its real provider/credentials
exist. Every booking passes through Purchase Review before any charge.

---

## Proposed build sequence (for prioritization — not yet committed)

1. **Finish the relationship layer** — My Magical Family named groups + Select-
   Entire-Group + per-event uncheck; expand Luxury Preferences with
   Transportation/Cruises/Accessibility/Travel Style.
2. **Luxury Transportation** — rename + "How are you traveling?" router over the
   full transportation catalog.
3. **Trip Timeline** — the connective spine every later feature attaches to.
4. **Concierge intelligence, honestly gated** — Hotel Concierge, Cruise
   Intelligence, Airport Intelligence, Vacation Home Concierge, Dining,
   Travel Companion, Event Travel, Journey Protect — each real when its
   provider is connected, honest when not.
5. **Journey Collections™** — curated + Build-Your-Own packages.

The founder sets priority; this sequence is a recommendation.
