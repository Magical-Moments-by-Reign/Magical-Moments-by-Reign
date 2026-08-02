# Legal — Magical Moments by Reign

> **This folder is preparation material, not legal advice.** Nothing here is a
> legal opinion, and it is not a substitute for a licensed attorney. It exists
> so counsel can review the platform efficiently: it states what the product
> actually does today and lists the specific questions to bring to a lawyer
> before launch. Do not treat any item here as "cleared."

Contents:

- **[LEGAL-REVIEW-CHECKLIST.md](./LEGAL-REVIEW-CHECKLIST.md)** — the priority
  items to review with counsel (children's privacy, biometric privacy,
  marketplace facilitator tax & 1099s, Lifetime/term representations, entity
  structure, money movement, TOS/Privacy, vendor liability), each written as
  *what we do · why it's flagged · questions for counsel*.

How the build supports this: money movement is gated behind the Square seam
(`src/lib/square.ts`), the Magical+ Financing Gateway holds **no lending
logic** (`src/lib/magical-plus.ts`), vendors are **independent** with a required
Vendor Notice (`src/lib/vendors.ts`), and gift/registry funds are **handles
only** — the platform never holds guest funds. These are engineering guardrails,
not legal conclusions; counsel still decides what may launch.
