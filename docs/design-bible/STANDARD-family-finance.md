# Master Design Bible — Family Financial Foundation

**Status:** Founder Approved · **educational only.** Subordinate to Book I, the
[Constitution](./CONSTITUTION.md), and the [Life Guidance Center](./STANDARD-life-guidance.md).

Help families build strong financial habits during life's major milestones —
from a child's first savings account through adulthood. We **educate, organize,
remind, and connect** families with trusted, official financial resources at the
right time. We do **not** replace financial institutions or advisors, we never
give financial advice, and we never book on a bank's behalf.

---

## Built today (real & verifiable)

`src/lib/family-finance.ts` + `family-finance.test.ts` (**7 tests**, part of the
203-test `npm test` suite):

- **Age-appropriate milestones** (`FINANCIAL_MILESTONES`, 14) — first savings /
  checking / debit / budget / job / paycheck / tax return, building credit,
  college savings, student banking, emergency fund, first apartment,
  homeownership prep, retirement resources — each with a checklist.
- **First Bank Account** (`FIRST_BANK_ACCOUNT`) — the featured milestone: steps,
  commonly-required documents, and the **"My First Bank Account"** badge.
- **Plain-language finance guides** (`FINANCE_GUIDES`) — saving, budgeting,
  checking vs. savings, debit cards, responsible credit, building credit,
  avoiding scams, student banking, identity protection, college planning — with
  **official learn-more links** (FDIC, CFPB, MyMoney.gov, IRS Free File,
  IdentityTheft.gov, Federal Student Aid).
- **Family savings goals** (`SAVINGS_PURPOSES` + shared `savingsGoalProgress`) —
  college, car, graduation, study abroad, wedding, home, emergency; loved ones
  may contribute when the owner enables it.
- **Bank Appointment Center** (`BANK_APPOINTMENT_ACTIONS`) — **link-out only** to
  each institution's official scheduling page (`BANK_APPOINTMENT_GUARDRAIL`).
- **Ask Magical** (`recommendForAge`) — gentle, age/context-based prompts
  (turning 16 → first checking; college offer → student banking; 18+ → building
  credit).

`prisma/schema.prisma` — `FinancialMilestoneProgress` (per-family completion +
badges) and `BankAppointment` (official link-out records); family savings reuse
the generic `SavingsGoal` + `SavingsContribution`.

## Needs (foundation seams — never faked)

Auth (per-family milestone progress, savings persistence), **payment providers**
for family contributions & future 529/UTMA/UGMA educational integrations,
participating **bank partnerships/links** (appointment center), calendar +
notification delivery, and the in-context UI. No balance, rate, or dollar figure
is fabricated; every specific routes to an official source or a qualified
professional.

**Guardrail:** educational only — never financial advice; never books on a
bank's behalf; encourages consulting qualified financial & legal professionals
for 529/UTMA/UGMA/trusts; links to official sources; no fabricated figures.
