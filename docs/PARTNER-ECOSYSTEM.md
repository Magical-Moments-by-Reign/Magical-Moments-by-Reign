# Partner Ecosystem — The Trusted Connection Layer
### Step 9 deliverable (final foundation) · Design & architecture only (no product code) · Founder Review

> We do not list vendors. We **educate → prepare → compare → connect → track → review** —
> never advertise → pressure → sell.
> The ecosystem must never become a paid directory disguised as guidance. Trust comes first.

**Governing references:** the constitution, framework, concierge, education, planning, Vault,
and progress designs (`PROGRESS-MILESTONE-ENGINE.md`, commit `c0a1cac`). This document
specifies the shared Partner Ecosystem every Estate inherits — the last foundation before
Home is built at Step 10. **Design only — no product code, schema, routes, or UI here.**

**Contents:** 1) Purpose · 2) Philosophy · 3) Partner types · 4) Categories by Estate · 5)
Status model · 6) Verification levels · 7) Onboarding · 8) Service areas · 9) Profiles · 10)
Credentials · 11) Insurance & compliance · 12) Membership · 13) Matching & discovery · 14)
Ranking & fairness · 15) Reviews · 16) Badges · 17) Primary/Standby · 18) Communication · 19)
Quotes & proposals · 20) Contracts · 21) Bookings · 22) Payments & payouts · 23) Concierge ·
24) Estate flows · 25) Member control · 26) Partner control · 27) Safety & trust · 28)
Complaints & disputes · 29) Admin governance · 30) Honest empty states · 31) Existing
foundations · 32) Example partner journeys · 33) What Home inherits · 34) What's unique to
Home · 35) Recommended Step 10 implementation sequence.

---

## 1. Ecosystem Purpose

Connect members with **real** professionals, companies, organizations, products, resources,
and services across every Estate — so Magical Moments is the intelligent engine behind life's
biggest decisions. Members can: understand what help they need · learn the right professional
category · compare options honestly · find verified professionals where available · understand
qualifications · request information · ask questions · save partners · connect securely · track
communications · manage bookings where connected · review completed experiences · understand
when Magical Moments is only **introducing** the parties · and **continue planning even when no
partner is available.**

---

## 2. Partner Philosophy

We educate first — what kind of professional may be needed · why · what credentials to look for
· what questions to ask · what documents to prepare · what pricing model is common · what
warning signs to avoid · what stays the member's responsibility vs. the partner's — **then**
connect real options where available.

**Standard: Educate → Prepare → Compare → Connect → Track → Review.** Never Advertise →
Pressure → Sell.

---

## 3. Partner Types

Reusable classes: vendor · licensed professional · financial institution · mortgage lender ·
bank · credit union · insurance provider · realtor · real-estate broker · contractor ·
inspector · appraiser · attorney · CPA · financial advisor · medical provider · mental-health
provider · funeral professional · educator · school counselor · college/university · trade
school · military/veteran organization · government agency · nonprofit · travel provider · retail
partner · technology provider · community resource · official-resource provider · affiliate
partner · internal Magical Moments service.

**Per-type capability matrix** (each type is configured for what it may do):

| Capability | Who may have it |
|------------|-----------------|
| Public profile | Vendors, licensed pros, institutions (not raw govt/official links) |
| Direct booking | Service pros with availability (contractors, inspectors, funeral, realtors) |
| Document access | Only with member-granted, scoped, expiring access (Vault §9) |
| Lead referrals | Approved, compliant partners |
| Reviews | Partners with completed engagements |
| Compliance requirements | License/insurance-bearing pros (contractors, lenders, agents) |
| Restricted/limited visibility | Government agencies, nonprofits, official resources (informational, no lead-selling) |

Government agencies, official-resource providers, and community resources are surfaced as
**informational** (no lead sale, no ranking-for-pay).

---

## 4. Partner Categories by Estate

Estate-specific categories plug into the shared marketplace without rebuilding it.
- **Home:** realtors · mortgage lenders · banks · credit unions · construction lenders ·
  builders · general contractors · inspectors · appraisers · insurance agents · real-estate
  attorneys · property managers · interior designers · movers · cleaners · landscapers · repair
  pros · Airbnb consultants · short-term-rental managers · tax professionals · hard-money
  lenders · renovation lenders · home-staging pros.
- **Education:** school counselors · college admissions · test-prep providers · scholarship
  organizations · tutors · financial-aid advisors · trade schools · military recruiters · career
  coaches · internship providers · banks offering student accounts.
- **Celebration of Life:** funeral homes · cemeteries · cremation providers · florists ·
  caterers · program printers · obituary services · grief-support organizations · attorneys ·
  insurance professionals · clergy/officiants (on request) · memorial-product providers.

Categories are **Estate configuration**, not new code.

---

## 5. Partner Status Model

Statuses: Applicant · Submitted · Under Review · Additional Information Required · Approved ·
Active · Temporarily Inactive · Compliance Hold · Probation · Suspended · Removed ·
Reapplication Eligible · Reapplication Pending · Reinstated · Archived.

| Status | Visibility | Leads | Booking | Profile edit | Reviews | Payment |
|--------|-----------|-------|---------|--------------|---------|---------|
| Approved / Active | visible | yes | yes | yes | yes | yes |
| Under Review / Additional Info | hidden | no | no | limited | no | no |
| Compliance Hold / Probation | hidden or flagged | no | existing only | limited | frozen | held |
| Suspended / Removed | hidden | no | no | no | frozen | held/settled |
| Reinstated | visible | yes | yes | yes | yes | yes |
| Archived | hidden | no | no | read-only | read-only | settled |

Status is source-bounded (per Progress Engine): "Approved/Active" appear only from a real
admin/compliance action. (Reuses `Vendor` status + `VendorMembershipEvent`.)

---

## 6. Verification Levels

Levels: identity confirmed · business information confirmed · license reviewed · insurance
reviewed · professional credential reviewed · background-check reviewed (where lawful) ·
service-area confirmed · membership active · agreement accepted · performance reviewed · not
verified.

**No verification badge without a real verification record.** Verification shows: what was
verified · who verified it · when · expiration · limitations · current status. (Same
badge-integrity rule as the Vault; reuses `VendorCredential` + `VendorBadgeAudit`.)

---

## 7. Partner Onboarding

Reusable process: 1) create account → 2) select partner type → 3) submit business info → 4)
select categories → 5) add service areas → 6) add contact info → 7) add website/social → 8)
submit credentials → 9) submit insurance → 10) accept agreements → 11) set availability → 12)
add profile info → 13) submit for review → 14) respond to additional-info request → 15) receive
approval → 16) activate membership → 17) enter marketplace.

**Uploads are honestly gated until secure storage is connected; document receipt and
verification are never faked.** (Reuses `VendorApplication` + the existing vendor portal flow.)

---

## 8. Service Areas

Support: ZIP · city · county · state · multi-state · radius · nationwide · virtual · travel ·
remote consultation · location exclusions · emergency area · seasonal area.

**Availability is never fabricated.** A member sees exactly: *Serves your area · May serve your
area · Virtual only · Travel available · Not currently available · No verified partners
available.*

---

## 9. Partner Profiles

Reusable public profile: business name · partner type · categories · description · service areas
· years in business · credentials · license status · insurance status · membership status ·
verification level · badge · reviews · completed Magical Moments engagements · languages ·
accessibility · availability · website · social · portfolio · packages · pricing approach ·
contact preferences · response time · policies · cancellation terms · payment terms ·
Primary/Standby eligibility.

**Every claim is clearly attributed:** partner-provided claims · Magical Moments verified
information · member reviews · sponsored placement · editorial content — never blended so a
partner claim looks platform-verified.

---

## 10. Professional Credentials

Handled for: business license · professional license · general-liability insurance · workers'
comp · certifications · bonding · permits · tax registration · accreditation · membership
organizations · background checks (where lawful) · continuing education · jurisdiction-specific
requirements.

**A credential is never claimed valid without review and current evidence** (with an expiration
and a review record). Reuses `VendorCredential`.

---

## 11. Insurance & Compliance

Partners may be required to maintain: general liability · workers' comp (where applicable) ·
professional liability (where applicable) · commercial auto (where applicable) · business
license · professional license · required permits · tax registration · marketplace membership ·
signed agreements.

**Policy direction:** no upfront marketplace-membership charge before work is received ·
membership fee may be deducted from the first completed & paid Magical Moments contract · annual
renewal aligns with insurance/license review · expired/missing compliance may temporarily remove
a partner from marketplace visibility · existing obligations and confirmed bookings are handled
per policy · **no partner remains publicly active without required current credentials.** Clear
**exception and appeal** processes exist. (Reuses vendor compliance + `VendorMembershipEvent`.)

---

## 12. Partner Membership

Model: **no upfront cost before first completed paid engagement** · fee deducted from first
eligible payment · annual renewal · renewal linked to current credentials · clear fee disclosure
· no hidden deductions · **no charge when no qualifying work is received** · suspension rules ·
reinstatement rules · refund rules · membership history · audit trail.

**Language rule:** the membership is **not described as insurance** if it isn't an insurance
product — accurate marketplace-membership language only.

---

## 13. Matching & Discovery

Inputs: Estate · goal · stage · location · service area · timeline · budget range · accessibility
· language · credentials · availability · review history · badge · partner type · Primary/Standby
capability · member preferences.

**The engine never claims "we found the best partner"** without a transparent, supportable
standard. Preferred language: *"Partners matching your selected criteria," "Verified
professionals serving your area," "Options you may want to review."* **Every result explains why
it appears.**

---

## 14. Ranking & Fairness

Ranking may consider: service-area fit · category fit · current compliance · availability ·
response history · verified reviews · completed engagements · badge level · member preference ·
accessibility/language · distance.

**Ranking must not secretly favor** higher-paying partners, sponsored listings, affiliates, or
internal relationships. **If sponsored placement exists, it is clearly labeled** and separated
from earned ranking.

**Verified-negative-review policy:**
1. **First** verified negative review → remains active, lower ranking, courtesy notice.
2. **Second** → formal warning, lower ranking.
3. **Third** → removal and one-year probation.
4. Reapplication after one year is **reviewed, not guaranteed.**
5. **Immediate suspension** remains possible for fraud, illegality, harassment, discrimination,
   safety concerns, or serious misconduct.
(Reuses `VendorStrike` + vendor-quality rules.)

---

## 15. Reviews

Categories: communication · professionalism · quality · timeliness · value · overall experience ·
would-recommend · written feedback · photos (where consented).

Requirements: **completed-engagement eligibility** · verified-review status · fraud/retaliation
review · partner response · admin moderation · strike rules · appeal process · privacy
protections · **no pay-to-remove reviews** · **no fake testimonials** · clear difference between
verified and unverified feedback. Reuses `VendorReview`.

---

## 16. Badges

Reuses the existing badge system. Badges: **New · Trusted · Family Favorite · Verified · Elite.**

Defined per badge: qualification thresholds · completed-engagement requirements · complaint rules
· compliance requirements · admin approval · downgrade · suspension · override · audit history ·
customer-facing meaning.

**Badges never imply government approval or professional licensure** unless specifically stated
and verified. Reuses `vendor-badges` + `VendorBadgeAudit`.

---

## 17. Primary & Standby Partners

Reuses the existing Primary/Standby state machine (`vendor-protection.ts`). Members choose whether
they want a Standby. Requirements: Primary accepts · Standby accepts · both know their role ·
Standby does not interfere with the Primary · clear activation rules · member controls whether
Standby is used · every status change recorded · **no duplicate payment · no hidden booking.**

Applicable to weddings, parties, home services, funerals, transportation, and other
time-sensitive services where appropriate.

---

## 18. Inquiries & Communication

Secure member↔partner messaging: inquiry · request for information · availability request · quote
request · consultation request · booking request · document request · message thread · appointment
confirmation · status update · cancellation · dispute.

**Neither party must expose private contact information before they choose to.** Defined: message
retention · moderation · blocking · escalation. Reuses the `Inquiry` model.

---

## 19. Quotes & Proposals

Partners may provide: estimate · quote · proposal · package · scope of work · timeline · deposit
requirement · payment schedule · cancellation policy · expiration date · exclusions ·
license/insurance details.

**Clearly distinguished:** estimate vs. binding quote vs. proposal vs. contract. **Magical
Moments does not rewrite partner pricing or guarantee the quoted amount.**

---

## 20. Contracts & Agreements

Versioned agreements: marketplace agreement · member-partner service contract · Primary/Standby
acknowledgment · cancellation agreement · document-access acknowledgment · payment authorization ·
membership agreement · partner code of conduct.

Each: version · acceptance · timestamp · parties · terms · expiration · signature/acknowledgment
type · storage · audit · decline · superseded version. **Magical Moments clearly states when it
is not a party to the service contract.** (Reuses agreements + the Vault's signature/acknowledgment
model.)

---

## 21. Bookings & Appointments

Booking types: consultation · service appointment · event service · inspection · showing · tour ·
professional meeting · repair visit · vendor engagement · virtual consultation.

**Booking is never claimed confirmed until both the system and the partner confirm it.** States:
Requested · Pending · Accepted · Declined · Reschedule Requested · Confirmed · Completed ·
Cancelled · No Show · Disputed. Reuses `VendorBooking` + `VendorBookingEvent`.

---

## 22. Payments & Payouts (future; honest until connected)

Potential flows: member pays partner directly · member pays through Magical Moments · deposit ·
final payment · milestone payment · membership deduction · platform fee · refund · dispute ·
partner payout · chargeback · tax reporting.

**Square remains the intended payment seam where applicable.** **Payment is not presented as
active until connected and tested.** **Every deduction is disclosed before payment
authorization.**

---

## 23. Concierge & Partners

The concierge may: explain which professional type may help · prepare questions · suggest criteria
· show verified options · explain credentials · compare member-selected profiles · help draft an
inquiry · summarize quotes · highlight differences · track responses · remind about appointments ·
explain next steps · suggest a Standby option · help prepare for a dispute.

**It must confirm before:** contacting a partner · sharing documents · sending a message ·
requesting a quote · booking · cancelling · paying · accepting a contract · activating a Standby.
**It never claims a professional relationship exists before the partner accepts.**

---

## 24. Estate-Specific Partner Flows

- **Home:** education → mortgage readiness → lender criteria → verified lenders → inquiry →
  quote/loan discussion (outside or via supported integration) → progress tracking.
- **Wedding:** planning → vendor categories → availability → Primary/Standby → contracts →
  booking → event completion → review.
- **Celebration of Life:** immediate guidance → funeral-professional category → verified local
  options → family-selected contact → arrangements → document & service coordination → **restrained
  review request later.**
- **Education:** learning path → counselor/school resource → meeting prep → appointment → document
  checklist → progress update.

The partner experience **adapts to the seriousness and urgency of the Estate** (urgent = fewer
steps, gentler tone; sensitive = restrained, no upsell).

---

## 25. Member Control

Members control: whether they connect · which partner · what information is shared · whether
documents are shared · whether location is shared · whether they request a quote · whether they
book · whether they use a Standby · whether they leave a review · whether they save a partner ·
whether the concierge assists. **No partner gains access automatically.**

---

## 26. Partner Control

Partners control: profile info · categories · service areas · availability · contact preferences ·
packages · portfolio · inquiry acceptance · booking acceptance · Primary/Standby acceptance ·
credentials · insurance · membership renewal · notification preferences. **Sensitive changes may
require admin approval before publication** (e.g. license claims, category expansion).

---

## 27. Safety & Trust

The Partner Ecosystem must **never:** invent a partner · invent availability · invent credentials ·
invent reviews · invent completed engagements · claim someone is licensed without verification ·
hide sponsored placement · guarantee service quality · guarantee outcome · make a member contact a
partner · share member information without permission · keep an expired partner publicly active
when credentials are required · falsely claim Magical Moments is responsible for independent
service execution.

**Required member-facing notice (verbatim):**
> Magical Moments by Reign carefully curates its marketplace and values customer feedback. While
> we help connect families with independent partners, all services, contracts, pricing,
> communication, scheduling, and execution remain solely between the customer and the selected
> partner unless a separate written agreement states otherwise.

---

## 28. Complaints, Disputes & Incidents

Supports: complaint · quality concern · non-performance · late arrival · cancellation · pricing
dispute · harassment · discrimination · fraud · safety concern · property damage · document misuse
· payment dispute · review dispute.

Workflow: intake · evidence · partner response · member response · admin investigation ·
immediate-suspension criteria · strike determination · appeal · resolution · audit ·
external-authority referral where required. **Magical Moments does not pretend to act as a court
or regulator** — it curates, mediates within policy, and refers out when appropriate.

---

## 29. Admin Governance (future workflow — no UI built)

Future admin workflow: application review · additional-info request · approval · rejection ·
compliance review · credential verification · insurance review · profile-change approval ·
membership status · booking review · badge approval · review moderation · strike management ·
suspension · reactivation · reapplication · complaint handling · finance review · audit review ·
partner analytics · category management · service-area management · emergency disable.

Role-based access follows the approved staff permissions: **Owner · Support · Compliance ·
Marketplace · Finance · Content · Trust · Auditor.** Reuses admin roles/access + audit. **No admin
UI is built in this step.**

---

## 30. Honest Empty & Failure States

- *No verified partner / none serves the area:* "No verified professionals are currently available
  in your selected area." (+ continue-planning path)
- *Partner unavailable / category not launched:* say so; offer to save & notify.
- *Storage / payment / booking / quote not connected:* "Online booking isn't connected yet. You may
  save this partner and contact them when booking becomes available."
- *Credential under review:* "This partner's credentials are being reviewed and the profile is
  temporarily unavailable."
- *Partner suspended / declines / no response:* honest status, with next options.
- *Member lacks permission / service legally restricted:* stated plainly.

**Never fabricate fallback options.** A member can always keep planning without a partner.

---

## 31. Existing Foundations to Reuse

Do **not** rebuild the marketplace — reuse:
`Vendor` · `VendorApplication` · `VendorReview` · `VendorStrike` · `VendorBadgeAudit` ·
`VendorCredential` · `VendorMembershipEvent` · `VendorPerformanceEvent` · `VendorBooking` ·
`VendorBookingEvent` · vendor membership logic · `vendor-badges` · `vendor-quality` · vendor
protection / Primary-Standby (`vendor-protection.ts`) · the vendor portal design · admin role
permissions · Account & `mmr_session` · notifications · audit logs · the Document Vault · Planning
Engine · Education Engine · Progress Engine · Concierge Architecture · the Square payment seam ·
the storage seam.

The Partner Ecosystem is largely **composition and configuration** over the existing vendor
system, extended per Estate with categories, credential requirements, and flows.

---

## 32. Example Partner Journeys

**A) 🏡 Home — connecting a lender.** Member learns loan types (Education) → concierge prepares
lender questions → member reviews *verified lenders serving your area* (or honest "none yet") →
sends an inquiry (private contact protected) → receives a **quote** (clearly not a binding
approval) → grants the lender **scoped, expiring** access to only the preapproval document →
progress shows "Waiting on Professional" (never member-behind) → engagement completed → verified
review. Membership fee deducted from the first completed & paid engagement only.

**B) 💍 Wedding — Primary/Standby caterer.** Compare vendors → choose Primary + optional Standby →
both accept → contracts acknowledged → booking Confirmed only when both confirm → event Completed →
review. No duplicate payment; Standby never interferes.

**C) 🕊 Legacy — funeral professional.** Restrained flow: verified local funeral homes → family
selects and contacts → arrangements & document coordination → **no upsell, no confetti** → a gentle
review request much later. The required member-facing marketplace notice is shown.

All three reuse the **same** ecosystem, statuses, verification, and safety rules — only categories,
credentials, and tone differ.

---

## 33. What Home Will Inherit

Home inherits the entire Partner Ecosystem unchanged: partner types & capabilities, the status
model, verification levels, onboarding, service areas, profiles, credentials, insurance/compliance,
membership, matching, ranking & fairness, reviews, badges, Primary/Standby, communication, quotes,
contracts, bookings, payments, concierge integration, member/partner control, safety, disputes,
admin governance, and honest empty states.

**Home authors its config:** its categories (realtor, lender, inspector, contractor, insurer, PM,
mover, designer, stager, hard-money/renovation lender…), each category's credential/insurance
requirements, its Primary/Standby-eligible services, and its flows (lender/realtor/inspector
connection) — all consuming the shared ecosystem.

---

## 34. What Remains Unique to Home

Configuration and content, not architecture:
- The **breadth** of housing categories (the largest professional network of any Estate).
- **Credential specificity:** mortgage-lender licensing, contractor bonding/permits,
  inspector/appraiser standards, real-estate-attorney and agent licensing — each with its own
  review requirements.
- **Dual audience:** owner-occupier pros vs. investor pros (hard-money lenders, PMs, STR managers).
- **Jurisdiction-sensitive** partner rules (contractor permits, landlord/STR regulations,
  homebuyer-assistance programs) tied to the Education Engine's jurisdiction handling.
- Home-specific flows where partners attach to planning milestones (preapproval → offer →
  inspection → closing).

Everything above is data the shared ecosystem consumes — the wing is unique, the marketplace is
shared.

---

## 35. Recommended Step 10 Implementation Sequence (Home flagship)

With all foundations designed (framework, concierge, education, planning, vault, progress,
partners), Home is built **on** them — configuration + content + a few unique tools, not new
architecture. Suggested order:

1. **Estate scaffolding** — the shared Estate shell + universal routes (`/estate/home/...`),
   inheriting the approved luxury visual language; Home configured (name 🏡, welcome, goals,
   stages).
2. **Home configuration & content** — goal types, stages, learning paths, checklist/plan templates,
   document types, professional categories, milestones, celebrations, cross-Estate transitions.
3. **Learning Center content** (real, neutral, jurisdiction-aware) for the core housing journeys.
4. **Planning & Checklist** wiring — templates → tasks → dependencies → progress/milestones.
5. **Document Vault** wiring — Home document types, requests tied to tasks, scoped professional
   access (honestly gated storage until connected).
6. **Progress & Milestones** — Home dimensions/sequence, Welcome Home celebration, honest states.
7. **Partner connections** — Home categories over the existing vendor marketplace; "no verified
   partners yet" honest states; concierge-assisted, confirm-before-contact.
8. **Concierge context** — Home-scoped prompts, actions, confirmations across all the above.
9. **Honest data + empty states** end to end; **schema additions only where a foundation truly
   needs them** (e.g. a `LifeEstate`/`EstateInstance` model), reviewed before any migration.
10. **Verify** — build, tests, and a private preview; founder review; **then** lock Home as the
    gold standard every future Estate inherits.

*(Sequence is a recommendation for Step 10; each item becomes real product work only after you
approve Step 9 and direct Step 10 to begin. Login/homepage remain on hold until Home is locked.)*

**This remains design-only.** No product code, schema, routes, UI, merge, or deploy were created —
and **Step 10 does not begin until you approve Step 9.**

---

*Prepared for founder review as Step 9 (final foundation) of the approved 12-step build order. No
product code, schema, routes, UI, or deployment were created. The member Home remains on the
feature branch, unmerged and undeployed.*
