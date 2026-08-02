// ── Housing Hub ──────────────────────────────────────────────────
// The complete housing ecosystem inside Magical Moments (formerly the
// Home / New Home Journey). Customers should never search multiple
// websites to complete a housing project. See
// docs/design-bible/HOUSING-HUB.md.
//
// Only "Build a Custom Home" ships today (the Build-a-Home slice at
// /journey/new-home). The other pathways and shared tools are honest
// "in development" seams — most need external data (real-estate
// listings, marketplace vendors, lease generation) that arrives in later
// approved phases. We never fake a listing, a partner, or a document.

export interface HousingPathway {
  id: string;
  label: string;
  icon: string; // OccasionIcon key
  blurb: string;
  href?: string; // set when the pathway is live
  status: "live" | "soon";
}

export const HOUSING_PATHWAYS: HousingPathway[] = [
  { id: "land", label: "Search for Land", icon: "tree", blurb: "Find the right lot by location, acreage, utilities, zoning & schools — save favorites and compare.", status: "soon" },
  { id: "buy", label: "Purchase an Existing Home", icon: "home", blurb: "From pre-approval to move-in — showings, offers, inspection, appraisal, and closing, guided.", status: "soon" },
  { id: "newconstruction", label: "Purchase New Construction", icon: "home", blurb: "Buy a builder's new home with selections, walkthroughs, and closing organized in one place.", status: "soon" },
  { id: "build", label: "Build a Custom Home", icon: "home", blurb: "Blueprint to front-door key — intake, roadmap, and a 28-stage construction timeline.", href: "/journey/new-home", status: "live" },
  { id: "renovate", label: "Renovate a Home", icon: "star", blurb: "Plan, budget, and track a renovation — quotes, contractors, permits, and before/after galleries.", status: "soon" },
  { id: "sell", label: "Sell a Home", icon: "gift", blurb: "Prep, stage, price, list, and close — every step to a successful sale.", status: "soon" },
  { id: "lease", label: "Lease a Home", icon: "home", blurb: "For landlords and tenants — leases, applications, rent tracking, and maintenance.", status: "soon" },
  { id: "commercial", label: "Lease Commercial Property", icon: "trophy", blurb: "Commercial leasing organized — terms, documents, and communication in one place.", status: "soon" },
  { id: "management", label: "Property Management", icon: "crown", blurb: "For homeowners & investors — properties, tenants, rent, maintenance, expenses, and documents.", status: "soon" },
];

export interface HousingTool {
  id: string;
  label: string;
  blurb: string;
}

export const HOUSING_TOOLS: HousingTool[] = [
  { id: "design-studio", label: "Home Design Studio", blurb: "Design every room — flooring, paint, cabinets, lighting & more — with saved design boards." },
  { id: "selection-center", label: "Selection Center", blurb: "Track every material selection: brand, price, allowance, upgrade cost, approval & delivery." },
  { id: "builder-assistant", label: "Builder Assistant", blurb: "Prepare for every builder meeting — questions, decisions, change orders, and contracts." },
  { id: "lease-generator", label: "Lease Generator", blurb: "Generate customizable leases (review with a qualified attorney before use)." },
  { id: "moving-center", label: "Moving Center", blurb: "Packing, utilities, mail forwarding, address changes, movers & a move-in checklist." },
  { id: "document-vault", label: "Home Document Vault", blurb: "Mortgage, title, survey, permits, warranties, insurance & receipts — safe and searchable." },
  { id: "marketplace", label: "Housing Marketplace", blurb: "Trusted realtors, lenders, builders, inspectors & trades — profiles, messages & appointments." },
  { id: "magical-ai", label: "Magical AI concierge", blurb: "\"You need insurance before closing.\" \"Your inspection is tomorrow.\" Your housing concierge." },
];
