// ── Family Financial Foundation ─────────────────────────────────
// Help families build strong financial habits during life's milestones —
// from a child's first savings account through adulthood. EDUCATIONAL only:
// we do not replace financial institutions or advisors. We educate, organize,
// remind, and connect families with trusted, official resources at the right
// time. We never provide financial advice, and we never book on behalf of a
// bank unless a future official integration supports it.
//
// PURE content + logic: age-appropriate milestones, the First Bank Account
// flow, plain-language finance guides (with official links), the bank-
// appointment link-out model, and age-based Ask Magical prompts. Savings-goal
// math is shared with the Life After High School ecosystem.

export { savingsGoalProgress } from "@/lib/life-after-hs";

// ── Financial milestones (age-appropriate) ──────────────────────
export interface FinancialMilestone {
  id: string;
  label: string;
  ageHint: string;       // guidance, not a hard rule
  description: string;
  checklist: string[];
}

export const FINANCIAL_MILESTONES: FinancialMilestone[] = [
  { id: "first_savings", label: "First Savings Account", ageHint: "Childhood", description: "Opening a savings account early builds the habit of setting money aside.", checklist: ["Compare kid-friendly savings accounts", "Gather required documents", "Visit the bank together", "Set a first savings goal"] },
  { id: "first_checking", label: "First Checking Account", ageHint: "Teen", description: "A first checking account teaches everyday money management.", checklist: ["Compare student/teen checking", "Understand fees & minimums", "Set up the account", "Practice tracking balances"] },
  { id: "first_debit", label: "First Debit Card", ageHint: "Teen", description: "A debit card teaches spending within a real balance.", checklist: ["Set spending expectations", "Learn PIN safety", "Review statements together"] },
  { id: "first_budget", label: "First Budget", ageHint: "Teen", description: "A simple budget turns money into a plan.", checklist: ["List income & expenses", "Choose a simple method", "Track for one month", "Adjust together"] },
  { id: "first_job", label: "First Job", ageHint: "Teen", description: "A first job brings income — and new responsibilities.", checklist: ["Prepare a resume", "Understand a paystub", "Set a savings split"] },
  { id: "first_paycheck", label: "First Paycheck", ageHint: "Teen", description: "Understanding a paycheck (gross vs. net, taxes) builds confidence.", checklist: ["Read the paystub", "Learn about withholding", "Decide save/spend/give"] },
  { id: "first_tax_return", label: "First Tax Return", ageHint: "Teen/Young adult", description: "Filing a first return is a milestone — many resources are free.", checklist: ["Gather W-2/1099", "Use official free-file resources", "Keep records"] },
  { id: "building_credit", label: "Building Credit Responsibly", ageHint: "Young adult", description: "Credit is a tool — used responsibly it opens doors.", checklist: ["Learn how credit scores work", "Understand on-time payments", "Keep balances low"] },
  { id: "college_savings", label: "College Savings Planning", ageHint: "Childhood–Teen", description: "Saving early for education eases future costs.", checklist: ["Set a college savings goal", "Explore 529 education resources", "Automate contributions"] },
  { id: "student_banking", label: "Student Banking", ageHint: "College-bound", description: "Student accounts often have lower fees and helpful features.", checklist: ["Compare student banking options", "Understand campus banking", "Set up direct deposit"] },
  { id: "emergency_fund", label: "Emergency Fund Goals", ageHint: "Young adult", description: "An emergency fund is a cushion for the unexpected.", checklist: ["Set a starter goal", "Automate savings", "Keep it separate"] },
  { id: "first_apartment", label: "First Apartment Budget", ageHint: "Young adult", description: "Renting brings rent, utilities, and deposits to plan for.", checklist: ["Estimate monthly costs", "Budget for deposits", "Plan for utilities & renters insurance"] },
  { id: "homeownership_prep", label: "Homeownership Preparation", ageHint: "Adult", description: "Preparing early makes homeownership more attainable.", checklist: ["Learn the buying process", "Understand credit & savings needs", "Explore trusted mortgage resources"] },
  { id: "retirement_resources", label: "Retirement Planning Resources", ageHint: "Adult", description: "Starting early makes a big difference over time.", checklist: ["Learn about employer plans", "Understand compounding", "Consult a qualified professional"] },
];

export function financialMilestone(id: string): FinancialMilestone | undefined {
  return FINANCIAL_MILESTONES.find((m) => m.id === id);
}

// ── First Bank Account milestone (featured) ─────────────────────
export const FIRST_BANK_ACCOUNT = {
  badge: "My First Bank Account",
  steps: [
    "Learn why opening a savings account early can be beneficial.",
    "Compare participating financial institutions.",
    "Understand the documents commonly required.",
    "Schedule a banking appointment through participating bank links.",
    "Build a checklist before the appointment.",
    "Upload completed documents if desired.",
    "Celebrate the milestone once the account is opened.",
  ],
  commonDocuments: [
    "Government-issued ID (parent/guardian for a minor)",
    "Child's Social Security number",
    "Proof of address",
    "Initial deposit (varies by bank)",
    "Parent/guardian present for a minor account",
  ],
} as const;

// ── Financial education guides (plain-language, official links) ──
export interface FinanceGuide { slug: string; question: string; answer: string; learnMore?: string; }

export const FINANCE_OFFICIAL_RESOURCES: Record<string, { label: string; url: string }> = {
  fdic: { label: "FDIC — Money Smart", url: "https://www.fdic.gov/resources/consumers/money-smart/" },
  cfpb: { label: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/" },
  mymoney: { label: "MyMoney.gov (federal financial education)", url: "https://www.mymoney.gov/" },
  irs_free: { label: "IRS Free File", url: "https://www.irs.gov/filing/free-file-do-your-taxes-for-free" },
  identitytheft: { label: "IdentityTheft.gov (FTC)", url: "https://www.identitytheft.gov/" },
  studentaid: { label: "Federal Student Aid", url: "https://studentaid.gov/" },
};

export const FINANCE_GUIDES: FinanceGuide[] = [
  { slug: "saving-money", question: "How can we teach saving money?", answer: "Start small and make it visible — a clear jar or a savings account, a simple goal, and regular deposits. Celebrating progress builds the habit far better than pressure.", learnMore: "mymoney" },
  { slug: "budgeting-basics", question: "What are budgeting basics?", answer: "A budget is just a plan for money: list what comes in, list what goes out, and give every dollar a job. A simple 'save / spend / give' split works well for kids and teens.", learnMore: "cfpb" },
  { slug: "checking-vs-savings", question: "What's the difference between checking and savings?", answer: "Checking is for everyday spending (debit card, bills); savings is for money you're setting aside and want to grow. Many families use both together.", learnMore: "fdic" },
  { slug: "debit-cards", question: "How do debit cards work?", answer: "A debit card spends money you already have in your checking account — no borrowing. It's a great first tool for learning to spend within a real balance.", learnMore: "cfpb" },
  { slug: "responsible-credit", question: "What is responsible credit use?", answer: "Credit lets you borrow and repay. Used responsibly — small purchases paid off on time and in full — it builds a positive history without debt.", learnMore: "cfpb" },
  { slug: "building-credit", question: "How is credit built?", answer: "Credit scores reward on-time payments, low balances, and time. Starting responsibly as a young adult (e.g., a student card paid in full) helps build a strong history.", learnMore: "cfpb" },
  { slug: "avoiding-scams", question: "How do we avoid financial scams?", answer: "Be cautious of urgency, requests for gift cards or wire transfers, and 'too good to be true' offers. Never share passwords or one-time codes. Verify directly with the real company.", learnMore: "identitytheft" },
  { slug: "student-banking", question: "What is student banking?", answer: "Many banks offer student checking/savings with lower fees and helpful features. Compare options and understand any campus banking before signing up.", learnMore: "fdic" },
  { slug: "identity-protection", question: "How do we protect our identity?", answer: "Guard Social Security numbers, use strong unique passwords, watch statements, and freeze a child's credit if appropriate. If something happens, IdentityTheft.gov walks you through recovery.", learnMore: "identitytheft" },
  { slug: "college-financial-planning", question: "How do we plan for college costs?", answer: "Start saving early, learn about the FAFSA and aid, compare true costs, and use the education calculators — always alongside official resources and qualified professionals.", learnMore: "studentaid" },
];

export function financeGuide(slug: string): FinanceGuide | undefined {
  return FINANCE_GUIDES.find((g) => g.slug === slug);
}
export function financeResource(key?: string) {
  return key ? FINANCE_OFFICIAL_RESOURCES[key] : undefined;
}

export const FINANCE_DISCLAIMER =
  "Content is educational only and does not constitute financial advice. For 529 plans, UTMA/UGMA, trusts, and personal decisions, consult qualified financial and legal professionals.";

// ── Family savings goals ────────────────────────────────────────
export const SAVINGS_PURPOSES = [
  { id: "college", label: "College" },
  { id: "car", label: "First Car" },
  { id: "graduation", label: "Graduation" },
  { id: "study_abroad", label: "Study Abroad" },
  { id: "wedding", label: "Wedding" },
  { id: "home", label: "First Home" },
  { id: "emergency", label: "Emergency Savings" },
] as const;

// ── Bank Appointment Center (link-out only) ─────────────────────
// We connect families to participating institutions' OFFICIAL scheduling pages.
// We never book on a bank's behalf unless a future official integration supports it.
export const BANK_APPOINTMENT_ACTIONS = [
  "Find nearby participating banks or credit unions",
  "Compare banking options",
  "Schedule appointments through official links",
  "Add appointments to the Magical Moments calendar",
  "Receive reminders",
  "Store appointment notes",
] as const;

export const BANK_APPOINTMENT_GUARDRAIL =
  "Magical Moments does not book appointments on behalf of banks unless a future official integration supports that functionality — we link you to each institution's own scheduling page.";

// ── Ask Magical — age/context-based prompts ─────────────────────
export interface FinanceRecommendation { message: string; milestoneId?: string; }

/** Proactive, gentle financial guidance based on a child's age (and context). */
export function recommendForAge(age: number, context?: "college_offer"): FinanceRecommendation {
  if (context === "college_offer") {
    return { message: "Your student accepted a college offer. Would you like to compare student banking options?", milestoneId: "student_banking" };
  }
  if (age >= 16 && age < 18) return { message: "Your child is turning 16. Would you like information about opening their first checking account?", milestoneId: "first_checking" };
  if (age >= 18) return { message: "Now's a great time to learn about building credit responsibly. Want a simple starter guide?", milestoneId: "building_credit" };
  if (age >= 13) return { message: "A first budget and debit card can build great habits. Want a simple money guide for teens?", milestoneId: "first_budget" };
  return { message: "Opening a first savings account early builds a lifelong habit. Would you like to explore how?", milestoneId: "first_savings" };
}

export const FAMILY_FINANCE = {
  name: "Family Financial Foundation",
  mission: "Help families feel informed, organized, and empowered — one step ahead, because Magical Moments guided them at the right time.",
} as const;
