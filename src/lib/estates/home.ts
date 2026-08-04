// ── Home Life Estate — configuration & content ──────────────────
// The flagship Estate: every housing decision, from dream to completion. This is
// DATA the shared framework renders (see docs/LIFE-ESTATE-FRAMEWORK.md §4.1,
// PARTNER-ECOSYSTEM.md §33-34). Nav label is simply "Home"; "Life Estate" is
// internal. Honesty: module status reflects what genuinely works today — no
// module is marked "live" until it truly is, and no figures are invented.

import type { EstateConfig } from "./types";

export const HOME_ESTATE: EstateConfig = {
  key: "home",
  name: "Home",
  icon: "🏡",
  tagline: "Every home decision, from dream to completion.",
  welcomeTitle: "Welcome to your Home journey",
  welcomeBody:
    "Not a real estate website — your own advisor, educator, planner, and concierge for " +
    "every housing decision. We'll educate first, compare honestly, connect trusted " +
    "professionals, and stay beside you until the journey is complete.",

  // Goal Discovery — the housing journeys, grouped (framework §3 / Blueprint §4.1).
  goals: [
    { id: "buy-first", label: "Buy my first home", description: "From affordability to keys in hand.", group: "Buying" },
    { id: "buy-existing", label: "Buy an existing home", description: "Search, offer, inspect, close.", group: "Buying" },
    { id: "build", label: "Build a custom home", description: "Land, construction financing, move-in.", group: "Building" },
    { id: "land", label: "Purchase land", description: "Find and buy the right lot.", group: "Building" },
    { id: "find", label: "Find & compare homes", description: "Neighborhoods, market, showings.", group: "Finding" },
    { id: "rent", label: "Rent a home", description: "Search, leases, move-in, utilities.", group: "Renting" },
    { id: "sell", label: "Sell my home", description: "Value, prep, list, close, equity.", group: "Selling" },
    { id: "own", label: "Own & maintain", description: "Renovations, repairs, insurance, refinancing.", group: "Owning" },
    { id: "invest", label: "Invest in real estate", description: "Rentals, Airbnb, flipping, portfolios.", group: "Investing" },
  ],

  // Stage Assessment — where the member is (framework §3.4). First = default.
  stages: [
    { id: "exploring", label: "Just exploring" },
    { id: "preparing", label: "Getting ready" },
    { id: "active", label: "Actively in it" },
    { id: "under-contract", label: "Under contract" },
    { id: "owning", label: "Settled / owning" },
  ],

  // The twelve universal modules. Status is HONEST: only what truly works now is
  // "live". The rest are elegant, honest placeholders until their engines wire in.
  modules: [
    { key: "learn", label: "Learn", description: "Understand your options before you decide — plainly and neutrally.", status: "live", icon: "📚" },
    { key: "plan", label: "Plan", description: "A personalized, step-by-step path to your goal.", status: "soon", icon: "🗺" },
    { key: "tasks", label: "Checklists", description: "Clear next steps, so you never wonder what's next.", status: "soon", icon: "✅" },
    { key: "documents", label: "Documents", description: "A secure home for your paperwork.", status: "soon", icon: "🗄️" },
    { key: "tools", label: "Tools", description: "Honest calculators that use your own numbers.", status: "soon", icon: "🧮" },
    { key: "professionals", label: "Professionals", description: "Connect with vetted, real professionals when it helps.", status: "soon", icon: "🤝" },
    { key: "progress", label: "Progress", description: "See where you are and what's next.", status: "soon", icon: "📈" },
    { key: "milestones", label: "Milestones", description: "Celebrate the moments that matter.", status: "soon", icon: "🎉" },
    { key: "memories", label: "Memories", description: "Preserve your home's story forever.", status: "soon", icon: "📖" },
    { key: "settings", label: "Settings", description: "Your preferences for this journey.", status: "soon", icon: "⚙️" },
  ],

  milestones: [
    { id: "preapproved", name: "Pre-approved", meaning: "A lender has reviewed and pre-approved you." },
    { id: "offer-accepted", name: "Offer accepted", meaning: "Your offer on a home was accepted." },
    { id: "cleared-to-close", name: "Cleared to close", meaning: "Financing is finalized and closing is set." },
    { id: "keys-in-hand", name: "Keys in hand", meaning: "The home is yours — welcome home." },
    { id: "moved-in", name: "Moved in", meaning: "You've settled into your new home." },
  ],

  professionalCategories: [
    { id: "realtor", label: "Realtor®" },
    { id: "lender", label: "Mortgage lender" },
    { id: "inspector", label: "Home inspector" },
    { id: "appraiser", label: "Appraiser" },
    { id: "contractor", label: "Contractor" },
    { id: "insurer", label: "Insurance agent" },
    { id: "attorney", label: "Real estate attorney" },
    { id: "property-manager", label: "Property manager" },
    { id: "designer", label: "Interior designer" },
    { id: "mover", label: "Moving company" },
  ],

  // Neutral, educational topic list (real content authored under the Education
  // Engine's rules — no invented rates or figures; jurisdiction-aware later).
  learningTopics: [
    { id: "affordability", title: "How much home can you afford?", summary: "What lenders look at, and how to think about a budget that fits your life — using your own numbers, not a promise." },
    { id: "loan-types", title: "Understanding loan types", summary: "FHA, VA, USDA, Conventional, and Jumbo — explained by who they fit, not by which is 'best'." },
    { id: "credit-readiness", title: "Getting credit-ready", summary: "What affects your readiness and simple steps to prepare before you apply." },
    { id: "preapproval", title: "What pre-approval really means", summary: "How pre-approval works, what documents you'll gather, and why it comes before making an offer." },
    { id: "rent-vs-buy", title: "Renting vs. buying", summary: "An honest look at the trade-offs — costs, flexibility, and what fits your season of life." },
    { id: "construction", title: "Building a home & construction loans", summary: "How land, construction financing, and converting to a permanent mortgage fit together." },
    { id: "closing-costs", title: "Closing costs & the closing process", summary: "What closing costs cover and what to expect on the day you get your keys." },
    { id: "inspection", title: "Home inspections", summary: "Why they matter, what inspectors check, and how to prepare for the results." },
  ],

  crossEstate: [
    { estate: "financial", reason: "Plan savings, budgets, and equity." },
    { estate: "family", reason: "Bring your family into the journey." },
    { estate: "travel", reason: "Airbnb hosting or your next trip." },
    { estate: "legacy", reason: "Protect and pass on what you build." },
  ],
};
