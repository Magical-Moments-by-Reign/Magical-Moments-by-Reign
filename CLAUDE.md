# Magical Moments — Permanent Development Rules

- **Owner:** Tabitha Turner
- **Product:** Magical Moments by Reign
- **Latest explicit Owner product decisions govern product behavior.**
- **Security, privacy, legal, and data-integrity protections remain mandatory** — no product decision ever weakens them.
- **No PR may be merged without explicit, PR-number-specific Owner approval.** See "PR & Merge Discipline" below — this is absolute, with no standing exception today.

These rules are permanent unless the Owner explicitly revises this file. They apply across the whole product, not just Sports — Sports is simply where most of them were first proven out.

---

## 1. Owner Product Decisions Override Old Product Assumptions

The Owner's latest explicit product requirement is authoritative. An older implementation decision, fallback restriction, code comment, temporary safety rule, or architectural assumption must not silently prevent a newer Owner-approved requirement.

When they conflict:
- preserve security, legal, privacy, and data-integrity protections (never negotiable — see §19);
- identify the old rule causing the conflict;
- update the architecture cleanly;
- implement the Owner's current requirement;
- **update the related code comments and technical docs to explain the new rule and why the old restriction was replaced.** Do not just delete historical reasoning — a future session needs to understand *why* the old restriction existed and *why* it no longer applies, or it may get silently reintroduced.

Do not repeatedly ask the Owner to reconfirm a decision she has already made.

## 2. Investigate Before Coding

Before changing code:
- trace the current implementation;
- identify the actual root cause;
- identify shared infrastructure already available;
- inspect relevant recent PRs;
- determine whether the requested behavior already partially exists.

Do not immediately create a new system when existing architecture can be extended safely (see §14, "Preserve Existing Architecture").

## 3. Owner Intent Over Literal Wording

Interpret requests in the context of the established Magical Moments product. If the Owner says "add the NBA preseason opener" and the officially announced opener is known, the intended behavior is to display the actual opener — not merely a date, because an old implementation only ever stored dates. When intent is clear and implementation is safe, fulfill the intended requirement. Ask questions only when genuine ambiguity materially affects the product.

## 4. Do Not Substitute a Reduced Feature

If the Owner requests "show the NBA preseason opener" and the system only shows "Preseason begins October 3," that requirement is **not complete**. A partial technical implementation must never be described as satisfying the approved product requirement — report the gap explicitly (see §6).

## 5. Temporary Restrictions Are Not Permanent Product Law

Comments, fallback policies, diagnostics, experimental gates, Owner-only gates, temporary provider limitations, and launch safeguards may represent a temporary implementation state, not permanent policy. Before using one of these to reject a later Owner requirement:
1. determine why the restriction originally existed;
2. determine whether that reason still applies;
3. preserve any genuine safety/data-integrity protection;
4. update the architecture if the product requirement has legitimately changed.

Do not treat an old comment as immutable product policy.

## 6. Never Silently Drop an Approved Requirement

If an approved feature cannot be implemented exactly as requested, **stop and report**:
- A. requested behavior
- B. exact blocker
- C. existing rule/code causing the blocker
- D. safe alternatives
- E. recommendation

Do not quietly implement a reduced version and present it as complete.

---

## 7. Do Not Fabricate Data

Never invent sports scores, schedules, rosters, statistics, rankings, business information, entertainment information, travel information, availability, prices, dates, biographies, or any other factual claim.

**Missing structured-provider data does not automatically mean the information is unavailable.** Use the approved source ladder before reporting "unavailable."

## 8. The Magical Moments Verified Information Ladder

For factual information that can legitimately be obtained publicly:

1. **Tier 1** — Primary structured provider/API
2. **Tier 2** — Approved secondary structured provider/API
3. **Tier 3** — OpenAI Verified Web Search, restricted to trusted authoritative sources for that domain
4. **Tier 4** — Owner-confirmed fact, verified against an authoritative source
5. **Tier 5** — Clearly marked unavailable/pending

**Complete the ladder.** Do not report "provider unavailable" after checking only Tier 1 when Tier 2/3/4 are appropriate for that domain. At the same time, do not call an expensive fallback tier when verified, fresh cached data already satisfies the request (see §18, Cost-Aware Fallbacks).

## 9. OpenAI Is a Platform-Wide Fallback

The shared OpenAI verified-search foundation (`src/lib/openai/*`) is not Sports-only. It may be used throughout Magical Moments — Travel, Events, Entertainment, Music, Places, and beyond — when a primary provider fails, an API lacks the requested information, newly announced information hasn't reached structured feeds yet, or reliable current public information is genuinely needed.

Feature-specific adapters may exist per domain, but shared evidence validation, provenance, trusted-source handling, caching, and search transport belong in the shared platform layer. Never use OpenAI to fabricate a missing fact — it resolves and cites; it never guesses.

## 10. Authoritative Sources Are Valid Fallback Evidence — Only Through an Explicit Domain Policy

When a league, organization, business, venue, government agency, artist, event organizer, or other authoritative entity publicly publishes a fact, Magical Moments may use it as verified fallback evidence — but only through an **explicit, reviewable, per-domain trusted-source policy**. "Looks credible" is never sufficient on its own.

Maintain an explicit trusted-domain list per feature area, e.g.:
- **Sports:** approved league, team, competition, and provider domains.
- **Travel:** approved airline, hotel, tourism-authority, government, reservation, and provider domains.
- **Events:** approved venue, organizer, performer, ticketing, and provider domains.
- **Entertainment:** approved studio, network, distributor, artist, platform, and provider domains.

A new trusted source may be added only after its authority and intended use are understood — never on a guess. A structured API does not automatically outrank reality when it's simply delayed or incomplete. Preserve provenance.

## 11. Structured Providers Remain Authoritative for Live Data

For rapidly changing information — live scores, play-by-play, real-time availability, fantasy scoring — prefer approved structured providers. OpenAI/web search should never replace an appropriate live-data feed merely because it's convenient.

## 12. Owner-Confirmed Facts Are Not "Guesses"

When the Owner supplies a factual requirement, **verify it against an authoritative source before storing or presenting it as a verified factual fallback.** Every Owner-confirmed factual fallback must retain provenance sufficient to identify the supporting source. If authoritative verification cannot be obtained, do not present the fact as verified production data — say so plainly.

Do not repeatedly reject an Owner-confirmed public fact solely because a third-party API hasn't returned it yet.

## 13. Fallback Data Must Self-Heal

When fallback data is used and a higher-priority structured provider later supplies the same entity/event: reconcile identities, enrich/update the existing record, prevent duplicates, let the higher-priority source take over, and preserve provenance where appropriate. Never show a duplicate event because two sources supplied the same real-world fact.

---

## 14. Preserve Existing Architecture

Before creating another database, authentication system, OpenAI client, caching system, notification system, provider abstraction, or payment abstraction — prove the existing shared system can't appropriately support the requirement. Prefer extension over duplication.

## 15. Build Shared Solutions, Not One-Off Patches

If a bug affects a shared concept — team identity, provider identity, payments, caching, authentication, search, notifications, provenance, booking, media — fix the shared layer whenever reasonably possible. Do not hardcode one team, one restaurant, one user, or one isolated example unless the underlying fact itself genuinely requires a curated exception.

## 16. Do Not Rebuild Work That Already Exists

Search the repository and recent PR history first. Reuse and extend existing working systems. Do not replace functioning architecture merely because a fresh implementation would be easier to write.

## 17. Do Not Turn Diagnostics Into Permanent Product Features

Temporary Owner-only diagnostics are allowed for investigation. Once the issue is resolved: remove them, disable them, or deliberately convert them into supported administrative tooling. Do not let debugging UI accumulate in production.

## 18. Cost-Aware Fallbacks

Do not call paid AI/web-search/provider services unnecessarily. Use caching, whole-job resolution instead of per-item calls, deduplication, sensible TTLs, and stale verified data when the domain allows it. Reliability comes first, but architecture should avoid waste.

---

## 19. Security, Privacy & Data Integrity Are Never Negotiable

Product rules may evolve. **Security, privacy, legal, payment-security, authentication, authorization, and secret-management protections must never be weakened merely because a product requirement changes.** If an Owner request conflicts with one of these protections, explain the conflict and propose a safe implementation — never silently comply, never silently refuse without explanation.

- **No secret exposure.** API keys, tokens, payment credentials, database secrets, and webhook secrets stay server-side. Never log them, return them to the client, commit them, or include them in diagnostics — not even redacted names of unrelated secrets nobody asked about.
- **Production data must fail honestly.** If trustworthy information can't be obtained, show a clear unavailable/pending state. Never fill the UI with plausible-looking invented information merely to avoid an empty section.
- **Cache with provenance.** Cached factual information should retain enough metadata to determine source, verification time, fetch time, freshness, and resolver/provider. Stale *verified* data may be preferable to an empty screen during a temporary outage, when the domain allows it (never for live scores/odds/availability — see §11).

---

## Testing & PR Discipline

### Test the actual user experience
Unit tests passing is not sufficient for a user-facing change. Where feasible, verify: correct data displays, navigation works, mobile/desktop behavior, loading/error/empty states, fallback behavior, duplicate prevention, permissions, and caching behavior. Clearly identify anything that still needs Owner live verification.

### Test and build before presenting a PR
Run relevant tests, TypeScript checks, and a production build before presenting work as done. Report pre-existing failures separately from newly introduced ones. Never describe work as complete if the build is broken because of the change.

### Focused PRs
Do not combine unrelated fixes merely because they were discussed in the same conversation. Do not leave obsolete PRs hanging indefinitely — if a newer change makes an older PR unnecessary, report it and close it after Owner approval.

### Owner Approval States — never conflate these

| State | What it authorizes |
|---|---|
| **INVESTIGATE** | Research only. No code. |
| **IMPLEMENT** | Code may be written, on a branch. No merge authorization implied. |
| **OPEN PR** | A PR may be created. No merge authorization implied. |
| **APPROVED TO MERGE** | The *only* state that authorizes merging into `main`. |

When Owner language is unclear, default to the **less destructive** state. Never infer merge authorization from urgency, frustration, "fix this," "get this done," approval of a different PR, approval of the general approach, or historical behavior.

### PR merge discipline — strict

**Creating or updating a PR does not authorize merging it.** Claude must never merge a PR into `main` unless the Owner has explicitly authorized *that specific PR number* to merge.

Valid authorization looks like: *"Merge PR #250," "You can merge #250," "PR #250 is approved to merge."*

**Not** authorization: frustration with a bug, approval to implement a fix, approval to open a PR, approval of the general approach, approval of a *different* PR, historical behavior, inferred intent, urgency, "fix this," "get this done."

There is currently **no standing merge authorization for any class of change** — not bug fixes, not documentation, not diagnostics, not tiny changes, not emergency-looking fixes, not test-only changes. If the Owner ever grants standing authorization for a specific class of change, it must be written explicitly into this file by Owner instruction — never assumed from context. The Owner controls production integration.

### Report what actually changed
After implementation, return: A. root cause, B. solution, C. files changed, D. architecture reused/extended, E. tests/build results, F. live verification still required, G. PR number/status, H. remaining related work. Do not bury an incomplete requirement inside a long summary.

---

## Where domain detail lives

This file states the permanent rules; it does not duplicate feature documentation. For implementation detail, see `/docs`:

- Sports data policy, provider config, grading, notifications → [`docs/DISCOVERY_SPORTS.md`](docs/DISCOVERY_SPORTS.md)
- Concierge/booking architecture → [`docs/CONCIERGE-ARCHITECTURE.md`](docs/CONCIERGE-ARCHITECTURE.md)
- Commerce → [`docs/COMMERCE.md`](docs/COMMERCE.md), [`docs/COMMERCE-LIFESTYLE-NETWORK.md`](docs/COMMERCE-LIFESTYLE-NETWORK.md)
- Custom websites → [`docs/CUSTOM_WEBSITES.md`](docs/CUSTOM_WEBSITES.md)
- Document Vault → [`docs/DOCUMENT-VAULT.md`](docs/DOCUMENT-VAULT.md)
- Domains → [`docs/DOMAINS.md`](docs/DOMAINS.md)
- Education Engine → [`docs/EDUCATION-ENGINE.md`](docs/EDUCATION-ENGINE.md)
- Life Estate → [`docs/LIFE-ESTATE-BLUEPRINT.md`](docs/LIFE-ESTATE-BLUEPRINT.md), [`docs/LIFE-ESTATE-FRAMEWORK.md`](docs/LIFE-ESTATE-FRAMEWORK.md)
- Luxury Experience System → [`docs/LUXURY-EXPERIENCE-SYSTEM.md`](docs/LUXURY-EXPERIENCE-SYSTEM.md)
- Design system → [`docs/MASTER_DESIGN_BIBLE.md`](docs/MASTER_DESIGN_BIBLE.md)
- Owner Demo → [`docs/OWNER_DEMO.md`](docs/OWNER_DEMO.md)
- Partner Ecosystem → [`docs/PARTNER-ECOSYSTEM.md`](docs/PARTNER-ECOSYSTEM.md)
- Planning/Progress engines → [`docs/PLANNING-CHECKLIST-ENGINE.md`](docs/PLANNING-CHECKLIST-ENGINE.md), [`docs/PROGRESS-MILESTONE-ENGINE.md`](docs/PROGRESS-MILESTONE-ENGINE.md)
- Social Studio → [`docs/SOCIAL_STUDIO.md`](docs/SOCIAL_STUDIO.md)
- TLYNQ Intelligence → [`docs/TLYNQ-INTELLIGENCE-ARCHITECTURE.md`](docs/TLYNQ-INTELLIGENCE-ARCHITECTURE.md)

`README.md` and `ARCHITECTURE.md` are known to be stale (they describe an early skeleton of the app, not its current state) — that's a tracked follow-up, not fixed by this file.
