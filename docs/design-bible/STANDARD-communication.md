# Master Design Bible — Global Communication Standard
## Live Video Calls + Messaging

**Status:** Documented — pending Founder approval to build.
**External services required:** real-time video (e.g. WebRTC / Daily / Twilio Video),
SMS (e.g. Twilio), email (Resend, already wired), optional recording storage.
Subordinate to Book I. Available in **every** Journey.

Magical Moments must become the central communication hub for every Journey —
so families never manage planning across scattered emails, texts, and call apps.

---

## Live video calls

Every Journey includes **"Start a Video Call."** Journey-specific purposes,
e.g. Wedding: couple + planner, venue rep, bridal party, vendor consult, cake
tasting follow-up, florist, rehearsal. Baby: family announcement, shower
planning, virtual gender reveal. New Home: builder, realtor, designer,
contractor walkthrough, family reveal. Graduation: family planning,
photographer, venue, celebration planning.

**Who can join** (owner chooses per call): account holders, Family Circle
members, wedding party, planner, vendor, venue, guest by email, guest by SMS,
or a secure share link. **Guests never need a full account** — they join via a
secure, time-limited link: `magicalmomentsbyreign.com/call/<secure-token>`,
entering a display name, optional email confirmation, and optional access code.

**Security (every call link):** unique · time-limited · revocable · secure
token · restricted to the scheduled call · invalid after expiration.
**Optional controls:** waiting room, host approval, passcode, max participants,
mute on entry, disable guest screen share, disable recording, record only with
consent, remove participant, lock meeting.

**Privacy rule:** a call link grants access to the *call only* — never private
Journey content. The owner separately chooses what any person can access.

**Creation flow:** Start now/Schedule → purpose → participants → date → time →
duration → video/audio → screen-share allowed? → recording allowed? → which
Journey files may be shared. Platform then: generates the secure link, sends
email/SMS invites, adds to calendars, sends reminders, shows the call in the
dashboard.

**Reminders:** 24h, 1h, 10m before (host-adjustable). Each contains: title,
date/time, join button, participants, reschedule, cancel, contact organizer.

**Call records (dashboard):** upcoming, completed, missed, canceled, with
participants, notes, shared files, follow-up tasks. Recordings saved only with
all-participant consent, owner-controlled viewers, deletable, storage-limited,
**never recorded secretly.**

---

## Messaging Center

Every Journey includes a secure Message Center. Conversation types: direct,
group, wedding-party chat, Family Circle chat, vendor, venue, planner, support.

**Wedding channels (example):** Couple + Planner / Venue / Caterer / Florist /
Photographer / Videographer / Cake Designer / DJ or Band / Bridal Party /
Groomsmen / Rehearsal Dinner Team / Family Planning Group — all in one place.

**Vendor & venue messaging:** if the vendor has an account, message, schedule
calls, send quotes/contracts/invoices, share availability, confirm
appointments in-platform. If not, send to their email with a secure reply link
so they can respond without an account — replies saved into the Journey Message
Center for one continuous history.

**Message features:** text, voice notes, photos, videos, PDFs, contracts,
quotes, invoices, mood boards, venue images, design concepts, checklists,
calendar invites, links. Per conversation: sent time, read status, participant
list, search, pin, mark important, archive, mute, report.

**Action items from messages:** turn a message into a task, appointment, budget
item, payment reminder, vendor follow-up, timeline milestone, document request,
or approval request. (e.g. "We can hold Oct 15 for 48 hours" → "Create
Deadline" → *Venue deposit deadline: Oct 17, 5:00 PM*.)

**Follow-up automation:** if no reply within the configured window → notify the
customer; offer Send Follow-Up / Call Venue / View Website / Find Another
Vendor. (e.g. "Still waiting for a response from Rosewood Manor.")

---

## Recommended build phasing

- **Phase A (no video infra):** Message Center with in-platform threads +
  email bridge for account-less vendors (reply link), action-items, and
  follow-up automation. Reuses existing email seam.
- **Phase B:** Appointment scheduling + calendar invites + reminders.
- **Phase C:** Live video via a vetted provider (WebRTC/Twilio/Daily), secure
  join links, host controls, and consent-based recording.

**Guardrail:** all external providers are gated behind env/seams and gracefully
degrade until credentials exist; we never expose private Journey content via a
call link.
