# Master Design Bible — Digital Invitations & Event Management

**Status:** Founder Approved — **documented, phased build.** A reusable platform
module for **every** Journey (Life Journey Standard §5, §12, §16). Subordinate to
the [Constitution](./CONSTITUTION.md) and Book I.

**Needs (foundations):** accounts/auth (hosts + guests), secure media Storage,
email/SMS + push notifications, an RSVP data model, the reminder scheduler, and —
for photo enhancement/creative styles — AI image processing. These are graceful
seams; nothing fake is shipped (no pretend "sent" invitation or RSVP).

---

## Principle
Every Journey with an event includes **built-in digital invitations** — the
customer never leaves Magical Moments to create or manage them. The engine is
**shared across all Journeys**, each customizing appearance, wording, RSVP
options, and event-specific features.

## Invitations are built from the customer's REAL photos (guardrail)
Invitations use the customer's **uploaded, original photographs by default.**
**Do NOT recreate, redraw, replace, or alter the people in a photo** unless the
customer explicitly chooses an artistic transformation. Preserve facial
features, expressions, hair, clothing, skin tone, family members, and (when
appropriate) background memories.

- **AI enhancement (identity-preserving only):** upscale, lighting/color
  correction, de-blur/sharpen, remove distracting background objects, extend the
  canvas for text, improve composition, minor retouch — **the person's true
  appearance is always preserved.**
- **Optional creative styles (opt-in only):** watercolor, oil painting,
  storybook, vintage, elegant portrait, fairytale, cartoon, anime, fantasy,
  holiday. Always show: *"Your original image will remain unchanged unless you
  choose a creative style."*
- **Magical AI Designer:** after upload — *"I've created three invitation
  concepts using your original photograph. Which one would you like to
  personalize?"* — then the customer previews/edits before sending.

This guardrail binds Magical AI everywhere: **never replace real people in a
family's photos.**

## Per-event invitations (Baby Journey, included)
Available from the Journey timeline: Pregnancy Announcement · Gender Reveal ·
Baby Shower · Welcome Home Baby · Sip & See · Baby Dedication/Christening
(optional) · First → Fifth Birthday · Kindergarten Celebration.

## Invitation builder
Choose a premium template; customize colors/fonts; add photos/videos, event
details, maps & directions, parking, dress code, gift registry, RSVP deadline;
schedule automatic sending; reminders before; thank-yous after. Support
full-bleed photography, elegant typography, luxury layouts, animated & video
invitations, music, RSVP, countdown, maps, registry links, QR codes, guest
messaging. Event-specific style suggestions per Journey (Baby = soft pastels /
nursery / florals; Sweet 16 = glam/neon/minimal; Graduation = school colors /
editorial; Wedding = luxury/timeless/romantic; Retirement = travel-inspired;
Celebration of Life = peaceful/warm/respectful).

## Guest experience & the Magical Moments app
Guests can Accept / Decline / Maybe, set headcount, leave a message, ask
questions, view updates, and add the event to their calendar — **no account
required to RSVP on the web.** After RSVP, invite them to create a **free**
account; then the event appears under **"Events I'm Attending,"** with reminders,
photo/video uploads (if the host allows), guestbook signing, and updates.
Accepting auto-adds the event to an existing account.

## Host dashboard (live)
Invitations sent · accepted · declined · pending · guests bringing children ·
meal selections · registry activity · guest messages · photo & video uploads.

## Automatic reminders (Magical AI)
Invitation received · RSVP reminder · one week before · one day before · starts
in one hour · thank-you for attending · photos/videos uploaded · leave a memory.

## After the event (auto-created)
Event Gallery · Guestbook · Highlight Reel · Memory Timeline · Thank-You
Tracker. Guests are notified: *"Your memories from Emma's First Birthday are now
available."*

## Journey continuation
When one event ends, the Journey prepares the next — *"What a beautiful
celebration! Next up is Emma's Second Birthday. Would you like to begin
planning?"* — so families never start over.

## Reuse across Journeys
Weddings · Sweet 16 · Graduations · Family Reunions · Retirement · Housewarming ·
Military Homecomings · Anniversaries · Celebration of Life · Custom Events — one
shared engine, per-Journey customization.

## Recommended build phasing
- **Phase A — foundations:** accounts/auth (host + guest), RSVP data model,
  media Storage, email/notification seam, reminder scheduler.
- **Phase B — builder + RSVP:** template builder around the customer's real
  photo (identity-preserving enhancement), send/schedule, guest RSVP (no-account
  web + account link), live host dashboard.
- **Phase C — automation & AI:** AI Designer concepts, optional creative styles,
  reminders, after-event auto gallery/highlight reel/thank-you tracker, and
  Journey continuation prompts.

**Guardrail:** never fake a sent invitation or an RSVP; never replace real people
in photos; creative transformations are opt-in and clearly labeled; guest data
and photos follow the customer's privacy/sharing settings.
