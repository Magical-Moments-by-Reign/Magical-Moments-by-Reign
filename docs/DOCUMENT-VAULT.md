# Document Vault — The Private Digital Safe
### Step 7 deliverable · Design & architecture only (no product code) · Founder Review

> A private digital safe inside the member's Magical Space.
> *"My important information is together. I know who can see it. I know what still
> needs attention. I will not lose this. I can find it when life gets complicated."*
> Not a file manager. Not a corporate document portal.

**Governing references:** the constitution, framework, concierge architecture, Education
Engine, and Planning & Checklist Engine (`PLANNING-CHECKLIST-ENGINE.md`, commit `a42d79a`).
This document specifies the shared Document Vault every Estate inherits. **Design only — no
product code, schema, routes, or UI are created here.**

**Contents:** 1) Purpose · 2) Philosophy · 3) Categories · 4) Document types · 5) Metadata ·
6) States · 7) Permissions · 8) Child/teen protections · 9) Professional access · 10)
Requests · 11) Upload · 12) Organization · 13) Versioning · 14) Signatures & acknowledgments
· 15) Expiration & renewal · 16) Verification · 17) Sensitive documents · 18) Concierge · 19)
AI access rules · 20) Document generation · 21) Secure sharing · 22) Search · 23) Retention &
deletion · 24) Estate completion & preservation · 25) Honest empty states · 26) Security &
compliance · 27) Admin governance · 28) Existing foundations · 29) Example flows · 30) What
Home inherits · 31) Recommended next step.

---

## 1. Vault Purpose

The trusted, secure, reusable place where members organize the documents connected to their
lives — mortgage documents, contracts, deeds, closing statements, leases, insurance
policies, warranties, school & scholarship records, acceptance letters, member-shared medical
records, funeral documents, obituary drafts, vendor contracts, licenses, business & tax
records, vehicle & travel documents, estate-planning documents, keepsakes, and (where
appropriate) photos/videos.

It helps members understand: what documents they may need · why each matters · who may access
it · when it expires · whether action is required · which Estate it belongs to · which
professional requested it · what to preserve long-term. It must feel **secure, calm,
organized, and luxurious** — never a file manager.

---

## 2. Vault Philosophy

Luxury here = **clarity · privacy · control · organization · confidence · continuity · peace
of mind.** The Vault reassures ("your important information is together, and only who you
choose can see it"), surfaces what needs attention, and promises nothing is lost — without
ever pretending to hold or protect something it doesn't.

---

## 3. Categories

Reusable categories: Identity · Family · Home & Property · Mortgage & Lending · Construction ·
Insurance · Education · Career · Business · Financial · Taxes · Legal · Health · Memorial &
Legacy · Travel · Vehicles · Vendors & Contracts · Receipts & Purchases · Photos & Memories ·
Custom.

**One document may belong to multiple Estates/categories without duplicating the file** — a
single stored object with multiple associations (references), never copies.

---

## 4. Document Types

Estate-specific types plug into the shared Vault without rebuilding it.

- **Home:** preapproval letter · loan estimate · closing disclosure · purchase agreement ·
  inspection report · appraisal · deed · survey · construction contract · builder warranty ·
  permit · insurance declaration · repair invoice · lease · property-management agreement ·
  rental application · short-term-rental permit.
- **Education:** transcript · test score · recommendation letter · scholarship application ·
  FAFSA confirmation · acceptance letter · enrollment form · housing form · immunization
  record · financial-aid award.
- **Legacy:** obituary draft · funeral-home agreement · service program · death certificate ·
  insurance claim · will · trust · power of attorney · beneficiary document · memorial photos
  · family stories.

Types are **configuration** (per Estate config), inheriting the shared metadata, states, and
security below.

---

## 5. Metadata

Reusable metadata, each field tagged **member-entered** vs **system-derived**:

- *Descriptive (member-entered unless noted):* name · type · category · related Estate ·
  related plan · related task · related milestone · owner · requested by · effective date ·
  expiration date · review date · issuing organization · jurisdiction · notes · tags ·
  related professional · related family member.
- *System-derived:* uploaded by · created date · version · status · sensitivity level (with
  member override up) · access permissions · retention rule · verification status · signature
  status · original file name · file size · file format · storage location · integrity
  checksum · archive status.

The UI always distinguishes what the **member asserted** from what the **system computed**
(e.g. a member-entered expiration date vs. a professional-provided one, per the Planning
Engine's deadline sourcing).

---

## 6. Document States

| State | Interface | Concierge | Reminders | Permissions |
|-------|-----------|-----------|-----------|-------------|
| Requested | shown as "to provide" | explains why needed | on approach | requester-scoped |
| Missing | gently flagged on the plan | "let's add this" | on due date | — |
| Uploaded | stored, listed | can help name/organize | off | owner |
| Processing | "checking your file" | waits | off | owner |
| Needs Review | flagged for member/pro | prompts review | light | reviewer |
| Needs Signature | flagged | prepares (confirm to sign) | on due | signer |
| Needs Update | shown as outdated | offers to help | light | owner |
| Expiring Soon | countdown | reminds, sources date | escalating | owner |
| Expired | clearly marked invalid | "let's renew" | prompt | owner |
| Verified | badge (real record only) | may reference | off | per share |
| Rejected | reason shown | explains, offers redo | off | owner |
| Replaced / Superseded | prior version kept | notes new version | off | owner |
| Completed | final record | may celebrate milestone | off | per share |
| Archived | read-only | available on request | off | owner |
| Deleted Pending Recovery | in recovery window | warns of shared copies | off | owner |
| Permanently Deleted | gone (audited) | confirms it's gone | off | none |

---

## 7. Access & Permissions

**Capabilities** (each independently granted): view · upload · download · edit metadata ·
replace · share · request · approve · verify · sign · archive · delete · restore.

**Grant scopes:** private to member · shared with spouse/partner · with parent/guardian · with
selected family · with a named professional · with a vendor for one task · with an
administrator (reason + audit) · by link with expiration · Estate-specific · read-only ·
temporary.

**Hard rule:** **no family role automatically exposes every document.** Access is explicit,
scoped, and least-privilege — built on the existing account/family permission and
collaborator systems.

---

## 8. Child & Teen Protections

Minor documents (school records, IDs, medical forms, college applications, banking records,
driver documents, employment forms) carry **heightened protection.** Parents/guardians control
access per permissions and legal authority.

Teens may (per guardian settings): view selected documents · upload requested forms · track
missing items · add notes · share with **approved** counselors/professionals. The platform
**never bypasses guardian safeguards** (consistent with the Concierge & Planning designs).

---

## 9. Professional Access

Licensed professionals, vendors, schools, lenders, contractors, and partners access documents
only under strict controls: **member-controlled invitation · specific document/folder scope ·
read-only by default · expiration date · revocable · clear professional identity · audit
logged · no access to unrelated Estates · no browsing the full Vault · no onward sharing
without permission.**

A professional can **request** a document without gaining access to anything else. (Reuses the
Magical Access Pass verification/session/audit and vendor-credential patterns.)

---

## 10. Document Requests

A request may come from: member · concierge · planning template · licensed professional ·
vendor · administrator · family collaborator · official process.

**Every request shows:** who requested it · why it's needed · which Estate/task it supports ·
required vs. recommended · deadline source · accepted formats · privacy scope · what happens
after upload.

**Rule:** a document is **never labeled "required" unless the source is verified** (an official
or professional requirement, not an assumption) — mirroring the Planning Engine's deadline
sourcing.

---

## 11. Upload Experience (future; honest until connected)

Support: drag-and-drop · mobile camera scan · file selection · multi-file · replace version ·
upload-to-a-request · upload from email/cloud when connected · photo/video where appropriate.

Checks: file type · size · **malware scan** · duplicate · corruption · unsupported format.

**Rule:** **do not claim uploads work until secure storage and scanning are connected.** Until
then, upload UI is honestly gated ("secure uploads coming soon") and no file is implied stored.

---

## 12. Organization

Organize by: Estate · category · person · professional · task · milestone · date · expiration ·
status · sensitivity · custom folder · search & tags. **Members never need to understand the
underlying storage.** The concierge finds documents by plain language: *"Show me the paperwork
from my home closing," "Where is Karlie's college acceptance letter?," "Which insurance
documents expire this year?"* — always within the member's permissions.

---

## 13. Versioning

- Preserve prior versions · identify the current version · record who replaced it and when ·
  allow comparison metadata · **prevent silent overwrite** · preserve signatures & verification
  history · allow rollback where appropriate.
- Examples: updated insurance policy · revised construction contract · new lease · corrected
  transcript · updated obituary · renewed vendor license.

Replacing a document supersedes (never destroys) the prior version; verification/signature
history travels with the version it belongs to.

---

## 14. Signatures & Acknowledgments

Future support: electronic signature · initials · agreement acceptance · date/timestamp · IP/
device metadata where lawful · version accepted · witness/notarization status · decline ·
revocation where applicable.

**Rules:** a checkbox is **not presented as a legally binding signature unless the
implementation and jurisdiction support it.** Some documents need only **acknowledgment**, not
signature — the two are clearly distinguished. (Reuses the existing sharing-acknowledgment /
recipient-agreement models.)

---

## 15. Expiration & Renewal

Documents that expire (insurance · vendor/professional licenses · passports · driver licenses ·
permits · warranties · leases · certifications · domain records · membership documents) are
tracked. The engine: reminds before expiration · **shows the source of the expiration date** ·
allows renewal upload · preserves the old version · updates compliance status · suspends
marketplace visibility where policy requires (vendor licenses) · and **never falsely declares a
document valid.**

---

## 16. Verification

Verification types: member-confirmed · professional-confirmed · admin-reviewed · official-
source-verified · vendor-compliance-verified · signature-verified · not-verified ·
verification-expired.

**Rule:** the system **never shows a verification badge without a real verification action and
record.** Verification displays: who verified · what was verified · when · what evidence · when
it expires · any limitations. (Reuses vendor-compliance verification + access-pass audit
patterns.)

---

## 17. Sensitive Documents

Heightened protection for: SSNs · government IDs · financial-account info · tax records ·
medical info · legal records · estate-planning documents · minor records · banking documents ·
insurance claims · death certificates.

Requirements: strong encryption · least-privilege access · **no public links by default** ·
download controls · access logging · **session reauthentication for high-risk actions** ·
redaction support · retention controls · secure deletion · **no use in AI context without
explicit permission** (§19).

---

## 18. Concierge & Documents

The concierge may: explain why a document may be needed · create a document checklist ·
identify missing items · remind about expiration · help name/organize uploads · find a document
· summarize **non-sensitive** metadata · prepare questions for a professional · draft a document
worksheet · link a document to a task · celebrate a document milestone.

**It must confirm before:** sharing · sending · granting access · deleting · replacing ·
submitting · signing · using sensitive content in an AI response. It **never claims to have
reviewed legal validity** unless an authorized professional did (then it attributes them).

---

## 19. AI & Document Content (strict)

The AI **does not automatically read every uploaded document.** Access levels: metadata-only ·
member-selected document · specific page/excerpt · Estate folder with consent · **no AI
access.**

Members control whether AI may: extract dates · identify document type · summarize · find
missing fields · compare versions · prepare questions · search within content.

**Sensitive documents require explicit consent each time, or a clearly-managed standing
permission** the member can revoke. All AI output is **labeled as assistance, not professional
validation.**

---

## 20. Document Generation

Magical Moments may help generate **drafts** — obituary worksheet · invitation draft · vendor
question list · moving checklist · home-repair record · college document checklist · family
contact sheet · funeral-planning worksheet · appointment brief · property-comparison summary ·
memory-booklet draft.

**Always labeled:** Draft · Template · Member-provided information · Professional review
recommended · Not filed or submitted. **Never fabricate official forms or imitate government
documents.**

---

## 21. Secure Sharing

Methods: named account member · named professional · time-limited secure link · password-
protected link · view-only · download-allowed · single document · folder · Estate collection ·
watermarked copy · redacted copy.

Members always see: **who has access · what they can access · when access expires · last access
time (where supported) · a Revoke button.** (Reuses `ShareLink`, guest-sharing, and access-pass
session/audit foundations.)

---

## 22. Document Search

Search by: name · type · Estate · person · professional · date · expiration · status · issuer ·
tag · file content (where consented) · plain-language query — e.g. *"Find my closing
disclosure," "Show documents that expire next month," "Find every file the contractor
uploaded."* **Search always respects permissions and sensitivity** (content search only over
documents the member is allowed to see and has consented to index).

---

## 23. Retention & Deletion

Retention options: keep while Estate active · keep for a selected preservation term · keep
permanently where plan permits · archive · delete after completion · legal-hold exception ·
member-defined retention · professional-access expiration.

Deletion supports: **soft delete · recovery window · permanent-deletion confirmation · deletion
audit · shared-copy warning · retention-rule warning · minor-account safeguards.**

**Rule:** **do not promise permanent preservation unless the selected plan and storage policy
support it** — retention claims match real capability.

---

## 24. Estate Completion & Preservation

When an Estate completes, documents transition (not vanish): active working file · final record
· memory archive · long-term management · family-shared archive · professional access removed ·
sensitive records restricted · expiration reminders continue · moved into Legacy or another
Estate · preservation term begins.

- **Home purchase completes:** closing docs → final records; mortgage docs stay active;
  maintenance/warranty docs continue; the buying journey transitions to Home Ownership.
- **Graduation completes:** applications archive; acceptance/enrollment stay active; the
  education journey transitions to College/Career/Trade/Military.

Feeds the Framework's Memory Preservation + cross-Estate continuity.

---

## 25. Honest Empty & Failure States

Never pretend a document was saved, shared, signed, verified, or deleted when it wasn't:
- *Storage not connected:* "Secure uploads aren't available yet. You may continue your plan and
  return when storage is connected."
- *Upload fails / corrupted / too large / unsupported / malware detected:* say exactly what
  happened and the safe next step (malware → quarantined, not stored).
- *No documents:* "Your secure vault is ready for the first one."
- *No professional / verification unavailable / signature provider down:* honest, with the real
  alternative.
- *Search indexing delayed:* "Still organizing — try again shortly."
- *AI access disabled:* respected silently; no content used.
- *Shared link expired / lacks permission:* "You don't have permission to view this document."
- *Unverified file:* "This file couldn't be verified. It's stored, but no verification badge
  will appear."

---

## 26. Security & Compliance

Requirements: encryption in transit · encryption at rest · secure object storage · malware
scanning · access control · audit logs · rate limiting · session validation · reauthentication
for high-risk actions · backup & recovery · data minimization · secure deletion · key
management · incident response · privacy requests · breach-notification procedures · vendor
security review · regional storage considerations where applicable.

**Rule:** **do not claim formal compliance certifications until independently achieved.** The
Vault reuses the platform's existing session, rate-limit, and audit-log security primitives;
storage/scanning are honestly gated until connected.

---

## 27. Admin Governance (future workflow — no UI built)

Future admin workflow: document-type configuration · retention policies · verification rules ·
sensitive-classification rules · emergency access review · abuse reports · malware quarantine ·
failed-upload investigation · storage usage · professional-access review · legal-hold
management · audit review · deletion-request handling · incident response · restore request.

**Administrators do not casually browse member documents.** Admin access to a member's document
**requires a legitimate reason, permission, and an audit record** (reuses admin roles/access +
audit). **No admin UI is built in this step.**

---

## 28. Existing Foundations to Reuse

Build on what exists — don't rebuild security/sharing/permissions:
- **Upload & storage seams** — `MediaAsset`, `FamilyDocument`, `GuestUpload`, gallery-media.
- **Sharing acknowledgments & agreements** — `SharingAcknowledgment`, `RecipientAgreement`.
- **Guest sharing** — `ShareLink`, `guest-sharing.ts` → secure links (§21).
- **Account & family permissions** — access control (§7, §8).
- **Vendor credentials & compliance** — professional verification & license expiry (§15, §16).
- **Magical Access Pass** — `MagicalAccessPass`, `AccessPassVerification`, `AccessPassSession`,
  `AccessPassAudit` → scoped professional access + audit (§9).
- **Active sessions** — reauthentication for high-risk actions (§17).
- **Audit logs** — `CustomerAuditLog` → all consequential document actions (§27).
- **Notifications** — expiration & request reminders (§15).
- **Planning & Checklist Engine** — required-document links & requests (§10).
- **Concierge Architecture** — find/organize/confirm (§18); **Education Engine** — "why this
  document matters."
- **Journey & Experience models** — Estate association.
- **Preservation terms · Domain & membership systems** — retention & plan-based limits (§23).

---

## 29. Example Estate Document Flows

**A) 🏡 Home — buying:** request preapproval letter (from planning task, source: lender) → member
uploads (scanned) → stored, member-verified → linked to the "make an offer" task (unblocks it) →
lender granted **read-only, expiring** access to the preapproval only → inspection report
requested from inspector → closing docs uploaded → on completion, closing docs become **final
records**, mortgage stays active, warranty docs continue.

**B) 🎓 Education — graduation:** transcript + test scores uploaded (minor account,
guardian-controlled) → shared **read-only** with an approved counselor for one application →
acceptance letter arrives (milestone → celebrate) → applications archive on completion; enrollment
records stay active.

**C) 🕊 Legacy — after a loss:** death certificate uploaded (**sensitive**: encrypted, least-
privilege, reauth to download) → unlocks dependent tasks → will/trust stored (no AI access
without explicit consent) → obituary **draft** generated and clearly labeled → service documents
shared with selected family via expiring links → everything preserved into the Legacy archive.

All three use the **same** Vault, metadata, states, permissions, and security — only
configuration/content differ.

---

## 30. What Home Will Inherit

Home inherits the entire Vault unchanged: categories, the shared metadata/state model,
permissions, child/teen protections, professional access, requests, upload, organization,
versioning, signatures/acknowledgments, expiration/renewal, verification, sensitive-document
handling, concierge & AI rules, generation, sharing, search, retention/deletion, completion/
preservation, empty states, security, and admin governance.

**Home authors its content/config:** its document types (preapproval, purchase agreement,
inspection, appraisal, deed, closing disclosure, construction contract, permits, lease…), its
required-document requests wired to planning tasks, its professional-access scopes (lender,
inspector, contractor), and its completion transitions (buying → ownership) — all consuming the
shared Vault.

---

## 31. Recommended Next Step

The natural **Step 8 is the Progress & Milestone Engine** — how progress and milestones are
modeled across Estates, how tasks/documents/education completion roll up into an honest progress
view and Home's at-a-glance state, how milestones trigger celebration and memory capture, and how
none of it fabricates a success probability (reusing `MagicalTracker` + stages, `FamilyAchievement`,
and the celebration network).

**This remains design-only.** Per your instruction: no product code, no schema, no routes, no
merge, no deploy — and **Step 8 does not begin until you approve Step 7.**

---

*Prepared for founder review as Step 7 of the approved 12-step build order. No product code,
schema, routes, UI, or deployment were created. The member Home remains on the feature branch,
unmerged and undeployed.*
