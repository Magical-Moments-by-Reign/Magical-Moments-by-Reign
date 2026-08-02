# Legal Review Checklist — Questions for Counsel

> **Not legal advice.** This is a preparation document for a licensed attorney.
> Each item states *what the platform does today*, *why it's flagged*, and
> *questions for counsel*. Nothing here is "cleared" until a lawyer says so.
> Brand name is **Magical Moments by Reign** throughout — unchanged.

## Priority 1 — review before launch

### 1. Children's privacy (COPPA and state equivalents)
- **What we do:** Baby, gender-reveal, and shower experiences center on infants
  and children; the *account holder is an adult* while the *data subject* is
  often a child. Photos/videos of minors are stored and shared.
- **Why flagged:** COPPA and several state laws impose specific consent,
  disclosure, and retention rules around children's data.
- **Questions for counsel:** Who is the legal "user" vs. "data subject"? What
  consent language and age-gating do we need? Retention/deletion obligations for
  a child's images? Any special handling for sharing a child's media publicly?

### 2. Biometric privacy (BIPA / CCPA and similar)
- **What we do:** "AI Highlight Video" / AI media features may perform face
  detection or grouping on uploaded photos/videos.
- **Why flagged:** Biometric statutes (e.g., Illinois BIPA) can carry
  per-violation statutory damages with a private right of action.
- **Questions for counsel:** Does our AI pipeline create "biometric
  identifiers"? What written consent/notice and retention schedule are required?
  Should biometric features be disabled in specific states until compliant?

### 3. Marketplace facilitator tax & 1099 reporting
- **What we do:** The Vendor Marketplace connects customers with independent
  vendors. (Today the platform takes no vendor payments and holds no funds — see
  the money-movement item.)
- **Why flagged:** If/when transactions flow through the platform, marketplace
  facilitator sales-tax collection and 1099-K reporting can attach automatically
  from the first transaction, by state.
- **Questions for counsel:** At what point do we become a "marketplace
  facilitator"? Which states, thresholds, and filings apply? 1099 obligations to
  vendors? What must be true *before* we route any vendor payment?

### 4. Lifetime / "forever" vs. term representations
- **What we do:** Plans include a **Lifetime Legacy** tier and "preserve
  forever" language, alongside 1/5/10-year terms. `LIFETIME_LEGAL` already
  qualifies "lifetime of the service, subject to Terms, fair use, storage, and
  availability."
- **Why flagged:** "Forever" claims can conflict with a service that may change
  or end; consumer-protection exposure if representations outrun reality.
- **Questions for counsel:** Is the current Lifetime disclaimer sufficient? How
  should we phrase durability claims? What happens to Lifetime data if the
  service winds down, and how must that be disclosed at purchase?

### 5. Entity structure & liability
- **What we do:** A nationwide platform that (in future phases) may route funds
  and today hosts children's images.
- **Why flagged:** Personal/other-business liability if not properly separated;
  insurance and structure questions.
- **Questions for counsel:** Correct entity (LLC/corp) and separation from any
  other business (e.g., an accounting practice)? Liability insurance
  (cyber, E&O, media)? Indemnification posture toward vendors and customers?

## Priority 2 — money movement (parallel with processor discovery)

### 6. Money transmission / holding funds
- **What we do today:** The platform holds **no** customer or guest funds. Gift
  contributions and registries are **handles/links only** — guests are routed to
  the customer's own payment apps. Plan checkout runs through **Square**
  (`src/lib/square.ts`, gated by keys). The Magical+ Financing Gateway contains
  **no lending logic** and no hardcoded provider.
- **Why flagged:** The moment the platform *holds, pools, or routes* funds
  (e.g., group gift pools that collect money, or vendor payouts), money
  transmission / money services rules can attach.
- **Questions for counsel (and Square):** Which flows, if any, make us a money
  transmitter? What can Square support under its terms, and what requires a
  different arrangement? Advise on money transmission *in the alternative* so
  legal and processor discovery run in parallel. What must be resolved before
  enabling (a) collected group-gift pools and (b) vendor payouts?

### 7. Payment processor choice
- **Current:** Square is integrated as a gated seam for one-time plan checkout.
- **Consideration (not advice):** Square is sufficient for the current model
  (one-time plan purchases; no vendor payouts; gifts are handles only). If the
  marketplace later collects from customers and **pays out** to vendors,
  a marketplace/Connect-style processor is worth evaluating **after** counsel
  addresses items 3 and 6. The provider abstraction keeps switching/adding cheap.
- **Questions for counsel:** Any contractual/regulatory constraints on the
  processor for our model? Requirements before onboarding vendors for payouts?

## Priority 3 — policies & terms

### 8. Terms of Service, Privacy Policy, Vendor Agreement, Review Policy
- **What we do:** Accounts, sharing, a vendor marketplace with reviews and a
  three-strike quality policy, and a required Vendor Notice (vendors are
  independent; we don't employ/endorse/guarantee them).
- **Questions for counsel:** TOS + Privacy Policy suited to children's data,
  media hosting, and AI features; a Vendor Agreement; a review/defamation policy
  (verification, dismissal of fraudulent/retaliatory reviews, vendor removal +
  probation); breach-notification obligations; data-retention & deletion; AI
  usage disclosures. Which need to be live *at launch*?

## Deferral posture

Where counsel advises a program is not launch-ready, the intent is to **defer or
abandon** that program rather than launch on internal judgment. Items 1–2 and 6
in particular should not go live against counsel's caution.

---
*Prepared as engineering-side preparation for legal review. Consult a licensed
attorney in the relevant jurisdictions before relying on anything above.*
