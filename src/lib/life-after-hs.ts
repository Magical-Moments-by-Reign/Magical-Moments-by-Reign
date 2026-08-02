// ── Life After High School Ecosystem ────────────────────────────
// Graduation is one of the biggest life transitions a family experiences.
// This guides students & families through every major decision before
// graduation and supports them after. EDUCATIONAL only — we never replace
// counselors, financial advisors, recruiters, or admissions offices, and we
// present every path (college, military, trade, apprenticeship, entrepreneurship,
// workforce, gap year) with equal respect.
//
// PURE domain + content: college search/compare model, scholarship tracking,
// financial calculators, savings-goal math, alternative pathways, career
// exploration, and application/enrollment checklists. College datasets, saved
// lists/visits/applications, and payments are foundation seams — nothing is
// faked (an empty college list yields no results; no dollar figure is invented).

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── College discovery (search facets + filter) ──────────────────
export const COLLEGE_SEARCH_FACETS = [
  "State", "Major", "Career interest", "Tuition", "Distance from home",
  "Public / private", "Campus size", "Athletic opportunities", "HBCUs",
  "Technical colleges", "Community colleges", "Veterinary schools",
] as const;

export interface College {
  id: string;
  name: string;
  state: string;
  type: "public" | "private" | "community" | "technical";
  hbcu?: boolean;
  majors?: string[];
  annualTuitionCents?: number;
  distanceMiles?: number;    // from the family's home, when known
  campusSize?: "small" | "medium" | "large";
  athletics?: boolean;
  veterinary?: boolean;
}

export interface CollegeFilter {
  state?: string;
  major?: string;
  type?: College["type"];
  maxTuitionCents?: number;
  maxDistanceMiles?: number;
  campusSize?: College["campusSize"];
  athletics?: boolean;
  hbcu?: boolean;
  veterinary?: boolean;
  query?: string;
}

/** Filter a college dataset (empty in → empty out; no colleges are invented). */
export function filterColleges(colleges: College[], f: CollegeFilter): College[] {
  const q = (f.query ?? "").trim().toLowerCase();
  const major = (f.major ?? "").trim().toLowerCase();
  return colleges.filter((c) => {
    if (f.state && c.state !== f.state) return false;
    if (f.type && c.type !== f.type) return false;
    if (f.hbcu && !c.hbcu) return false;
    if (f.veterinary && !c.veterinary) return false;
    if (f.athletics && !c.athletics) return false;
    if (f.campusSize && c.campusSize !== f.campusSize) return false;
    if (f.maxTuitionCents != null && (c.annualTuitionCents ?? Infinity) > f.maxTuitionCents) return false;
    if (f.maxDistanceMiles != null && (c.distanceMiles ?? Infinity) > f.maxDistanceMiles) return false;
    if (major && !(c.majors ?? []).some((m) => m.toLowerCase().includes(major))) return false;
    if (q && !c.name.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Pick a subset of colleges to compare side by side. */
export function compareColleges(colleges: College[], ids: string[]): College[] {
  const want = new Set(ids);
  return colleges.filter((c) => want.has(c.id));
}

// ── Scholarship Command Center ──────────────────────────────────
export type ScholarshipStatus = "applied" | "awarded" | "pending" | "declined";

export interface Scholarship {
  id: string;
  name: string;
  status: ScholarshipStatus;
  amountCents: number;       // award (or potential) amount
  deadline?: string;         // ISO
}

export interface ScholarshipSummary {
  appliedFor: number;
  awarded: number;
  pending: number;
  totalEarnedCents: number;  // sum of awarded amounts
}

export function scholarshipSummary(items: Scholarship[]): ScholarshipSummary {
  let appliedFor = 0, awarded = 0, pending = 0, totalEarnedCents = 0;
  for (const s of items) {
    if (s.status !== "declined") appliedFor++;
    if (s.status === "awarded") { awarded++; totalEarnedCents += Math.max(0, s.amountCents); }
    if (s.status === "pending") pending++;
  }
  return { appliedFor, awarded, pending, totalEarnedCents };
}

/** Scholarship deadlines within `withinDays`, soonest first. */
export function upcomingDeadlines(items: Scholarship[], nowISO: string, withinDays = 30): Scholarship[] {
  const now = new Date(nowISO).getTime();
  const horizon = now + withinDays * 86400000;
  return items
    .filter((s) => s.deadline && new Date(s.deadline).getTime() >= now && new Date(s.deadline).getTime() <= horizon)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
}

// ── Financial calculators (educational only) ────────────────────
export interface CostOfAttendance {
  tuitionCents: number; housingCents: number; mealsCents: number;
  booksCents: number; transportationCents: number;
}

export function costOfAttendance(c: CostOfAttendance): number {
  return Math.max(0, c.tuitionCents + c.housingCents + c.mealsCents + c.booksCents + c.transportationCents);
}

/** Remaining out-of-pocket after grants + scholarships (never below zero). */
export function remainingCollegeCost(totalCostCents: number, grantsCents: number, scholarshipsCents: number): number {
  return Math.max(0, totalCostCents - Math.max(0, grantsCents) - Math.max(0, scholarshipsCents));
}

export interface LoanEstimate {
  monthlyPaymentCents: number;
  totalPaidCents: number;
  totalInterestCents: number;
}

/**
 * Standard amortized loan estimate — EDUCATIONAL. Not an offer, quote, or
 * financial advice; actual terms come from a lender.
 */
export function loanEstimate(principalCents: number, annualRatePct: number, years: number): LoanEstimate {
  const p = Math.max(0, principalCents);
  const n = Math.max(1, Math.round(years * 12));
  const r = Math.max(0, annualRatePct) / 100 / 12;
  const monthly = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
  const monthlyPaymentCents = Math.round(monthly);
  const totalPaidCents = monthlyPaymentCents * n;
  return { monthlyPaymentCents, totalPaidCents, totalInterestCents: Math.max(0, totalPaidCents - p) };
}

export const FINANCIAL_TOOLS_DISCLAIMER =
  "These calculators are educational estimates only and do not constitute financial advice. Actual costs, aid, and loan terms vary — consult qualified financial professionals and official sources.";

// ── College savings goal ────────────────────────────────────────
export interface SavingsInputs {
  targetCents: number;
  savedCents: number;
  giftsCents?: number;
  scholarshipsCents?: number;
  contributionsCents?: number;
}
export interface SavingsProgress {
  totalCents: number; targetCents: number; remainingCents: number; pct: number; reached: boolean;
}

/** Progress toward a savings goal from all sources (pct capped 0–100). */
export function savingsGoalProgress(i: SavingsInputs): SavingsProgress {
  const total = Math.max(0, (i.savedCents || 0) + (i.giftsCents || 0) + (i.scholarshipsCents || 0) + (i.contributionsCents || 0));
  const target = Math.max(0, i.targetCents);
  const remaining = Math.max(0, target - total);
  const pct = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;
  return { totalCents: round2(total), targetCents: target, remainingCents: remaining, pct, reached: target > 0 && total >= target };
}

// ── Alternative pathways (equal respect) ────────────────────────
export interface Pathway {
  id: string;
  label: string;
  benefits: string[];
  considerations: string[];
  careerOutlook: string;
  checklist: string[];
  timeline: string;
}

export const PATHWAYS: Pathway[] = [
  { id: "college", label: "College / University", benefits: ["Degree pathways", "Campus experience", "Research & networks"], considerations: ["Cost & debt", "Time commitment"], careerOutlook: "Broad — varies widely by field and degree.", checklist: ["Build a college list", "Apply for FAFSA & scholarships", "Submit applications", "Compare aid offers", "Plan enrollment"], timeline: "Begin exploring in 9th–10th grade; apply in 11th–12th." },
  { id: "military", label: "Military Service", benefits: ["Training & discipline", "Education benefits (GI Bill)", "Steady income & benefits"], considerations: ["Service commitment", "Relocation"], careerOutlook: "Skills transfer to many civilian careers.", checklist: ["Research branches", "Speak with a recruiter", "Prepare for the ASVAB", "Understand the commitment"], timeline: "Explore junior year; enlist senior year or after." },
  { id: "trade_school", label: "Trade School", benefits: ["Hands-on skills", "Shorter programs", "Strong demand"], considerations: ["Physical work", "Licensing where required"], careerOutlook: "High demand for skilled trades.", checklist: ["Choose a trade", "Find accredited programs", "Apply for aid", "Line up apprenticeship/work"], timeline: "Apply senior year or after graduation." },
  { id: "technical_certification", label: "Technical Certifications", benefits: ["Fast, focused credentials", "Lower cost", "Stackable skills"], considerations: ["Field-specific", "May need renewal"], careerOutlook: "Growing in IT, healthcare, and skilled fields.", checklist: ["Pick a certification", "Choose a provider", "Prepare for the exam", "Add to resume"], timeline: "Any time — many are self-paced." },
  { id: "apprenticeship", label: "Apprenticeship", benefits: ["Earn while you learn", "Mentorship", "Job at completion"], considerations: ["Competitive entry", "Commitment"], careerOutlook: "Strong pay growth in the trades.", checklist: ["Find registered apprenticeships", "Apply", "Interview", "Begin on-the-job training"], timeline: "Apply senior year or after graduation." },
  { id: "entrepreneurship", label: "Entrepreneurship", benefits: ["Build your own path", "Flexibility", "Unlimited upside"], considerations: ["Risk & uncertainty", "Self-discipline"], careerOutlook: "Depends on the venture and market.", checklist: ["Validate an idea", "Write a simple plan", "Learn basics of business & taxes", "Start small"], timeline: "Any time — start with a side project." },
  { id: "workforce", label: "Workforce Entry", benefits: ["Immediate income", "On-the-job experience", "No tuition"], considerations: ["Growth may need credentials later", "Entry-level pay"], careerOutlook: "Advancement often ties to added skills.", checklist: ["Build a resume", "Practice interviewing", "Apply widely", "Keep learning"], timeline: "Apply in senior year for after graduation." },
  { id: "gap_year", label: "Gap Year", benefits: ["Time to grow & explore", "Travel/service/work", "Clarity of direction"], considerations: ["Structure matters", "Plan re-entry"], careerOutlook: "Depends on how the year is used.", checklist: ["Set clear goals", "Plan activities (work/service/travel)", "Budget", "Plan the next step"], timeline: "Plan senior year for the year after graduation." },
];

export function pathway(id: string): Pathway | undefined {
  return PATHWAYS.find((p) => p.id === id);
}

// ── Career exploration (salary is approximate) ──────────────────
export interface CareerField {
  id: string; label: string; description: string;
  typicalEducation: string; skills: string[]; outlook: string;
}
export const CAREER_FIELDS: CareerField[] = [
  { id: "healthcare", label: "Healthcare", description: "Caring for patients across many roles, from nursing to therapy.", typicalEducation: "Certificate to advanced degree, depending on role.", skills: ["Compassion", "Attention to detail", "Communication"], outlook: "Strong, sustained demand." },
  { id: "skilled_trades", label: "Skilled Trades", description: "Building and maintaining the physical world — electrical, plumbing, HVAC, and more.", typicalEducation: "Apprenticeship or trade school; licensing where required.", skills: ["Problem-solving", "Hands-on ability", "Safety"], outlook: "High demand for skilled workers." },
  { id: "technology", label: "Technology", description: "Building software, systems, and data solutions.", typicalEducation: "Certifications, bootcamps, or a degree.", skills: ["Logic", "Continuous learning", "Collaboration"], outlook: "Growing across many industries." },
  { id: "business", label: "Business & Finance", description: "Helping organizations operate, grow, and manage money.", typicalEducation: "Certificate to degree.", skills: ["Numeracy", "Communication", "Organization"], outlook: "Steady demand." },
  { id: "creative", label: "Creative & Media", description: "Design, media, writing, and the arts.", typicalEducation: "Portfolio-driven; degree optional.", skills: ["Creativity", "Craft", "Adaptability"], outlook: "Varies by specialty." },
];

export const SALARY_DISCLAIMER =
  "Salary information is approximate, comes from trusted public sources, and varies by location, employer, and experience.";

// ── Checklists ──────────────────────────────────────────────────
export const APPLICATION_CHECKLIST = [
  "Track applications", "Store transcripts", "Upload essays", "Track recommendations",
  "Track acceptance letters", "Track waitlists", "Track housing deadlines", "Track orientation",
  "Track registration",
] as const;

export const ENROLLMENT_CHECKLIST = [
  "Housing", "Orientation", "Class registration", "Financial aid", "Meal plans", "Campus IDs",
  "Parking", "Health forms", "Immunizations", "Move-in day", "Dorm checklist",
] as const;

// ── Ask Magical — proactive guidance examples ───────────────────
export const ASK_MAGICAL_EXAMPLES = [
  "Your daughter is entering 10th grade. Would you like to explore dual enrollment opportunities in your state?",
  "You've saved three colleges. Would you like to compare tuition, distance from home, and veterinary science programs?",
  "You have five scholarship deadlines coming up this month.",
  "You've reached your college savings milestone.",
  "Orientation registration opens next week.",
] as const;
