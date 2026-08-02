// ── Build-a-Home ─────────────────────────────────────────────────
// Data for the New Home Journey → "Build a Home" first slice: the intake
// questionnaire, the 28-stage construction timeline (with what each stage
// captures), and a personalized-roadmap generator. Self-contained and
// informational — organizational & educational assistance only, NOT
// mortgage, legal, engineering, or construction advice. See
// docs/design-bible/JOURNEY-new-home.md.

export interface IntakeQuestion {
  id: keyof IntakeAnswers;
  label: string;
  kind: "choice" | "text" | "date";
  options?: string[];
  placeholder?: string;
}

export interface IntakeAnswers {
  land?: string;
  builder?: string;
  plans?: string;
  financing?: string;
  budget?: string;
  location?: string;
  completion?: string;
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  { id: "land", label: "Do you already own the land?", kind: "choice", options: ["Yes, we own it", "Under contract", "Still searching"] },
  { id: "builder", label: "Have you selected a builder?", kind: "choice", options: ["Yes, chosen", "Interviewing builders", "Not yet"] },
  { id: "plans", label: "Do you have architectural plans?", kind: "choice", options: ["Final plans", "Draft plans", "No plans yet"] },
  { id: "financing", label: "Do you have financing or construction-loan approval?", kind: "choice", options: ["Approved", "In progress", "Paying cash", "Not started"] },
  { id: "budget", label: "What is your target budget?", kind: "text", placeholder: "e.g. $450,000" },
  { id: "location", label: "What city & state are you building in?", kind: "text", placeholder: "e.g. Austin, TX" },
  { id: "completion", label: "What is your desired completion date?", kind: "date" },
];

export interface BuildStage {
  n: number;
  title: string;
  phase: "Plan & Finance" | "Site & Structure" | "Systems & Interior" | "Finish & Close";
  captures: string[];
}

// What every stage supports (Founder spec): dates, photos/videos, documents,
// costs, payments, notes, approvals, delays, inspection results, contacts,
// next steps. `captures` highlights what matters most at that stage.
export const BUILD_STAGES: BuildStage[] = [
  { n: 1, title: "Budget & financing", phase: "Plan & Finance", captures: ["Target budget", "Loan approval", "Draw schedule"] },
  { n: 2, title: "Land search or purchase", phase: "Plan & Finance", captures: ["Lot details", "Purchase docs", "Land cost"] },
  { n: 3, title: "Survey & soil testing", phase: "Plan & Finance", captures: ["Survey", "Soil report", "Assigned contacts"] },
  { n: 4, title: "Floor-plan approval", phase: "Plan & Finance", captures: ["Plan versions", "Approvals", "Notes"] },
  { n: 5, title: "Permits", phase: "Plan & Finance", captures: ["Permit documents", "Fees", "Dates"] },
  { n: 6, title: "Site preparation", phase: "Site & Structure", captures: ["Clearing/grading photos", "Costs", "Delays"] },
  { n: 7, title: "Foundation", phase: "Site & Structure", captures: ["Pour date", "Photos", "Inspection results"] },
  { n: 8, title: "Framing", phase: "Site & Structure", captures: ["Progress photos", "Payments", "Inspection"] },
  { n: 9, title: "Roofing", phase: "Site & Structure", captures: ["Materials", "Photos", "Warranty"] },
  { n: 10, title: "Windows & exterior doors", phase: "Site & Structure", captures: ["Selections", "Costs", "Photos"] },
  { n: 11, title: "Plumbing rough-in", phase: "Systems & Interior", captures: ["Inspection", "Contacts", "Notes"] },
  { n: 12, title: "Electrical rough-in", phase: "Systems & Interior", captures: ["Inspection", "Change orders", "Notes"] },
  { n: 13, title: "HVAC", phase: "Systems & Interior", captures: ["System specs", "Costs", "Warranty"] },
  { n: 14, title: "Insulation", phase: "Systems & Interior", captures: ["Inspection", "Photos", "Dates"] },
  { n: 15, title: "Drywall", phase: "Systems & Interior", captures: ["Progress photos", "Payments", "Notes"] },
  { n: 16, title: "Cabinets & countertops", phase: "Systems & Interior", captures: ["Selections", "Pricing", "Photos"] },
  { n: 17, title: "Flooring", phase: "Systems & Interior", captures: ["Materials", "Costs", "Photos"] },
  { n: 18, title: "Painting", phase: "Systems & Interior", captures: ["Paint colors", "Rooms", "Photos"] },
  { n: 19, title: "Fixtures & appliances", phase: "Finish & Close", captures: ["Selections", "Manuals", "Warranty"] },
  { n: 20, title: "Exterior finishes", phase: "Finish & Close", captures: ["Siding/stone", "Photos", "Costs"] },
  { n: 21, title: "Landscaping", phase: "Finish & Close", captures: ["Plans", "Photos", "Payments"] },
  { n: 22, title: "Inspections", phase: "Finish & Close", captures: ["Reports", "Assigned repairs", "Approvals"] },
  { n: 23, title: "Punch list", phase: "Finish & Close", captures: ["Open items", "Due dates", "Completed repairs"] },
  { n: 24, title: "Final walkthrough", phase: "Finish & Close", captures: ["Checklist", "Concerns", "Sign-off"] },
  { n: 25, title: "Certificate of occupancy", phase: "Finish & Close", captures: ["CO document", "Date", "Contacts"] },
  { n: 26, title: "Closing", phase: "Finish & Close", captures: ["Closing disclosure", "Funds", "Keys & codes"] },
  { n: 27, title: "Move-in", phase: "Finish & Close", captures: ["First-night photos", "Utilities", "Inventory"] },
  { n: 28, title: "Housewarming", phase: "Finish & Close", captures: ["Guest list", "Registry", "Gallery"] },
];

export const BUILD_PHASES = [
  "Plan & Finance",
  "Site & Structure",
  "Systems & Interior",
  "Finish & Close",
] as const;

/** Personalized next-steps roadmap from intake answers. */
export function roadmapFrom(a: IntakeAnswers): string[] {
  const steps: string[] = [];
  if (a.land === "Still searching") steps.push("Find and secure your lot — compare location, size, utilities, and soil.");
  else if (a.land === "Under contract") steps.push("Complete your land purchase and order a survey & soil test.");
  else steps.push("Confirm your survey, soil test, and setbacks are on file.");

  if (a.financing === "Not started") steps.push("Start construction-loan pre-approval so your budget is confirmed before you build.");
  else if (a.financing === "In progress") steps.push("Finish loan approval and set up your draw schedule.");
  else if (a.financing === "Paying cash") steps.push("Plan your payment schedule against each construction stage.");
  else steps.push("Review your draw schedule so payments line up with each stage.");

  if (a.plans === "No plans yet") steps.push("Work with an architect or your builder on floor plans — we'll version every draft.");
  else if (a.plans === "Draft plans") steps.push("Finalize and approve your floor plans (older versions are always kept).");
  else steps.push("Upload your final plans to the Floor Plan Center and share with your team.");

  if (a.builder === "Not yet") steps.push("Interview builders and add your favorites to the Build Team.");
  else if (a.builder === "Interviewing builders") steps.push("Choose your builder and store the contract in your Build Team.");
  else steps.push("Confirm your builder contract, allowances, and timeline.");

  steps.push("Pull permits, then track every construction stage with photos, costs, and approvals.");
  return steps;
}
