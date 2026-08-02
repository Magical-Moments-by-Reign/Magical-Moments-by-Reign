// ── Life Guidance Center ────────────────────────────────────────
// "Helping families navigate life's biggest milestones with confidence."
// A trusted EDUCATIONAL resource so families prepare for milestones before they
// happen — never overwhelming, always empowering. First center: Graduation
// Success. This is the PURE content + logic layer: the grade-by-grade timeline,
// graduation topics, plain-language guides, grade-based Ask Magical
// recommendations, and official-resource links.
//
// Guardrails: educational only — Magical Moments never guarantees admission,
// aid, or outcomes. Requirements differ by state and change over time, so we
// explain concepts in simple language and LINK TO OFFICIAL sources (federal +
// each state's Department of Education) rather than giving state-specific advice
// we can't keep current. Live per-state links + editable articles come from the
// CMS (GuideArticle) — until curated, state guidance is a guided pointer.

// ── Grade-by-grade timeline (prepare years in advance) ──────────
export type Grade = "8" | "9" | "10" | "11" | "12";

export const GRADE_TIMELINE: { grade: Grade; label: string; focus: string[] }[] = [
  { grade: "8", label: "8th Grade", focus: ["High school planning", "Honors opportunities", "Career exploration"] },
  { grade: "9", label: "9th Grade", focus: ["GPA planning", "Clubs", "Volunteer hours", "Early scholarship awareness"] },
  { grade: "10", label: "10th Grade", focus: ["Dual enrollment", "ACT/SAT planning", "College exploration"] },
  { grade: "11", label: "11th Grade", focus: ["FAFSA preparation", "College visits", "Scholarship applications", "Resume building"] },
  { grade: "12", label: "12th Grade", focus: ["Graduation requirements", "College acceptance", "Financial aid", "Housing", "Graduation celebrations"] },
];

export function timelineForGrade(grade: Grade) {
  return GRADE_TIMELINE.find((g) => g.grade === grade);
}

// ── Graduation Success Center topics ────────────────────────────
export type GradTopicGroup =
  | "acceleration" | "testing_applications" | "paying" | "pathways" | "planning_celebration";

export const GRAD_TOPIC_GROUPS: { id: GradTopicGroup; label: string }[] = [
  { id: "acceleration", label: "Academic Acceleration" },
  { id: "testing_applications", label: "Testing & Applications" },
  { id: "paying", label: "Paying for College" },
  { id: "pathways", label: "Pathways After High School" },
  { id: "planning_celebration", label: "Planning & Celebration" },
];

export const GRAD_TOPICS: { label: string; group: GradTopicGroup }[] = [
  { label: "Early graduation requirements", group: "acceleration" },
  { label: "Dual enrollment opportunities", group: "acceleration" },
  { label: "Advanced Placement (AP) courses", group: "acceleration" },
  { label: "Honors programs", group: "acceleration" },
  { label: "Career & Technical Education (CTE)", group: "acceleration" },
  { label: "ACT & SAT preparation", group: "testing_applications" },
  { label: "College applications", group: "testing_applications" },
  { label: "Resume preparation", group: "testing_applications" },
  { label: "College visit planning", group: "testing_applications" },
  { label: "FAFSA information", group: "paying" },
  { label: "Scholarships", group: "paying" },
  { label: "Grants", group: "paying" },
  { label: "Financial aid deadlines", group: "paying" },
  { label: "Trade schools", group: "pathways" },
  { label: "Military opportunities", group: "pathways" },
  { label: "Internship opportunities", group: "pathways" },
  { label: "Graduation checklist", group: "planning_celebration" },
  { label: "Senior timeline", group: "planning_celebration" },
  { label: "Cap & gown planning", group: "planning_celebration" },
  { label: "Graduation party planning", group: "planning_celebration" },
];

export function topicsInGroup(group: GradTopicGroup) {
  return GRAD_TOPICS.filter((t) => t.group === group);
}

// ── Plain-language guides (evergreen; official links for specifics) ──
export interface Guide {
  slug: string;
  question: string;   // customer-facing title
  answer: string;     // simple explanation (evergreen — no dated figures)
  learnMore?: string; // official resource key (see OFFICIAL_RESOURCES)
}

export const GUIDE_ARTICLES: Guide[] = [
  { slug: "what-is-dual-enrollment", question: "What is dual enrollment?", answer: "Dual enrollment lets a high schooler take college courses and earn college credit before they graduate — often at little or no cost through a local college. It can shorten time (and cost) in college later. Availability and rules vary by state and school, so check with your school counselor.", learnMore: "state_doe" },
  { slug: "what-are-ap-classes", question: "What are AP classes?", answer: "Advanced Placement (AP) classes are college-level courses offered in high school. A strong score on the end-of-year AP exam can earn college credit or advanced placement at many colleges. They also strengthen a college application.", learnMore: "collegeboard" },
  { slug: "can-my-child-graduate-early", question: "Can my child graduate early?", answer: "In many states, yes — by meeting all required credits sooner, sometimes with summer courses, dual enrollment, or credit-by-exam. Early graduation rules are set by your state and district, so confirm the specific requirements with your counselor first.", learnMore: "state_doe" },
  { slug: "earn-college-credit-in-high-school", question: "How can high school students earn college credit?", answer: "Common ways: dual enrollment, AP exams, CLEP exams, and some CTE programs. Earning credit early can save time and money — ask which options your school offers.", learnMore: "state_doe" },
  { slug: "what-is-fafsa", question: "What is FAFSA?", answer: "The FAFSA (Free Application for Federal Student Aid) is the form families complete to apply for federal grants, work-study, and loans — and many state and college aid programs use it too. It's free to file at the official site, studentaid.gov.", learnMore: "fafsa" },
  { slug: "when-to-apply-for-scholarships", question: "When should we start applying for scholarships?", answer: "Earlier than most families expect. Some scholarships open in the freshman and sophomore years, and many have junior- and senior-year deadlines. Building a habit of applying steadily beats scrambling senior year.", learnMore: "studentaid_scholarships" },
  { slug: "how-college-visits-work", question: "How do college visits work?", answer: "Most colleges offer campus tours, information sessions, and sometimes overnight or virtual visits. Registering ahead through the college's admissions site is best. Visits help a student picture themselves there and can strengthen their application interest.", learnMore: "bigfuture" },
  { slug: "what-juniors-should-do-now", question: "What should juniors be doing right now?", answer: "Juniors should prepare for the ACT/SAT, keep grades strong, start college visits, build a resume of activities and volunteering, research scholarships, and get ready to file the FAFSA. A little each month prevents a senior-year rush.", learnMore: "bigfuture" },
];

export function guide(slug: string): Guide | undefined {
  return GUIDE_ARTICLES.find((g) => g.slug === slug);
}

// ── Official resources (real, stable federal/national links) ────
export const OFFICIAL_RESOURCES: Record<string, { label: string; url: string }> = {
  fafsa: { label: "Federal Student Aid (FAFSA) — studentaid.gov", url: "https://studentaid.gov/h/apply-for-aid/fafsa" },
  studentaid_scholarships: { label: "Finding scholarships — studentaid.gov", url: "https://studentaid.gov/understand-aid/types/scholarships" },
  ed_gov: { label: "U.S. Department of Education", url: "https://www.ed.gov/" },
  collegeboard: { label: "College Board (AP, SAT, BigFuture)", url: "https://www.collegeboard.org/" },
  bigfuture: { label: "BigFuture college planning", url: "https://bigfuture.collegeboard.org/" },
  act: { label: "The ACT test", url: "https://www.act.org/" },
  // Per-state Department of Education links are curated in the CMS; until then
  // this points families to find their official state resource.
  state_doe: { label: "Your state's Department of Education", url: "" },
};

export function officialResource(key?: string) {
  return key ? OFFICIAL_RESOURCES[key] : undefined;
}

// ── State-specific guidance (link to official sources) ──────────
export const US_STATES: { code: string; name: string }[] = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],
  ["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],
  ["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],
  ["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],
  ["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],
  ["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],
  ["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],
  ["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],["DC","District of Columbia"],
].map(([code, name]) => ({ code, name }));

// Curated official per-state links live in the CMS (empty until added) — we link
// to official sources, never invent state-specific requirements.
const STATE_LINKS: Record<string, string> = {};

export interface StateResource {
  configured: boolean;
  label: string;
  url: string | null;
  note: string;
}

/** An official link for a state's education resources, or a guided pointer. */
export function stateResource(stateCode: string): StateResource {
  const name = US_STATES.find((s) => s.code === stateCode)?.name ?? stateCode;
  const url = STATE_LINKS[stateCode];
  if (url) return { configured: true, label: `${name} Department of Education`, url, note: "" };
  return {
    configured: false,
    label: `${name} Department of Education`,
    url: null,
    note: `Education requirements differ by state. We link to ${name}'s official Department of Education for the most current, accurate guidance.`,
  };
}

// ── Ask Magical — proactive, grade-based recommendations ────────
export interface GradeRecommendation {
  grade: Grade;
  message: string;      // warm, non-overwhelming prompt
  suggestedTopics: string[];
}

/** What Ask Magical proactively surfaces for a student's grade level. */
export function recommendForGrade(grade: Grade): GradeRecommendation {
  const t = timelineForGrade(grade);
  const focus = t ? t.focus : [];
  const messages: Record<Grade, string> = {
    "8": "Your child is starting high school soon — a great time to look at honors options and simple career exploration. Want a quick planning guide?",
    "9": "Freshman year is perfect for building a strong GPA and starting volunteer hours. Would you like early scholarship-awareness tips?",
    "10": "I noticed your child is entering 10th grade. Would you like to learn about dual enrollment opportunities that may let them earn college credit before graduating high school?",
    "11": "Junior year is a big one — FAFSA prep, college visits, and scholarships. Want a month-by-month junior checklist?",
    "12": "Senior year is here! Let's stay on top of graduation requirements, financial aid, and celebrating the moment. Want your senior timeline?",
  };
  return { grade, message: messages[grade], suggestedTopics: focus };
}

// ── Mission copy ────────────────────────────────────────────────
export const LIFE_GUIDANCE = {
  name: "Life Guidance Center",
  tagline: "Helping families navigate life's biggest milestones with confidence.",
  philosophy: "Many families miss valuable opportunities simply because they didn't know they existed. Our goal is never to overwhelm — it's to empower, with educational resources, planning guides, trusted checklists, and current, official information.",
  mission: "No family should ever have to say, “We didn't know that was an option.”",
} as const;
