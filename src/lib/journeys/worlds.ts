// ── Journey worlds registry ─────────────────────────────────────
// Every main Journey is its own WORLD (a dedicated workspace). A world holds
// sub-occasion AREAS, and an area can offer idea-first EXPLORATION lists before
// any planning. This is the single source of truth so the reusable workspace,
// the Journeys hub, and navigation all agree. Content changes per world; the
// architecture stays identical (explore → select → plan → remember).
//
// status: "live" = the workspace is explorable now.  "soon" = the world is
// visible but its deeper content is still being crafted (honest Coming Soon).

export interface JourneyArea {
  slug: string;
  label: string;
  tagline?: string;
  image?: string;      // /story/*.jpg where we have real photography
  ideas?: string[];    // idea-first exploration prompts (shown before planning)
  status?: "explore" | "soon";
}

export interface JourneyWorld {
  slug: string;
  label: string;        // "Relationship"
  eyebrow: string;      // "Relationship Journey"
  tagline: string;
  hero?: string;        // banner image
  momentNoun: string;   // used by the switch button: "Relationship Moment"
  status: "live" | "soon";
  areas: JourneyArea[];
}

// Reusable workspace sections. "explore" is live; the rest are honestly labelled
// Coming Soon until their data models are connected — no dead features.
export const WORKSPACE_TABS: { id: string; label: string; live?: boolean }[] = [
  { id: "explore", label: "Explore Ideas", live: true },
  { id: "saved", label: "Saved Ideas" },
  { id: "boards", label: "Idea Boards" },
  { id: "planning", label: "Planning Tools" },
  { id: "memories", label: "Memories" },
  { id: "vendors", label: "Vendors" },
  { id: "deliveries", label: "Deliveries" },
  { id: "messages", label: "Messages" },
  { id: "settings", label: "Settings" },
];

// The actions every area offers. Ask Magical / Ask Concierge are live; the rest
// are Coming Soon until saved-ideas, boards, and planning are connected.
export const AREA_ACTIONS: { id: string; label: string; live?: boolean; kind?: "magical" | "concierge" }[] = [
  { id: "explore", label: "Explore Ideas", live: true },
  { id: "gallery", label: "Inspiration Gallery" },
  { id: "save", label: "Save" },
  { id: "favorite", label: "Favorite" },
  { id: "board", label: "Add to Idea Board" },
  { id: "ask-magical", label: "Ask Magical", live: true, kind: "magical" },
  { id: "ask-concierge", label: "Ask Concierge", live: true, kind: "concierge" },
  { id: "plan", label: "Start Planning This" },
  { id: "create", label: "Create This Journey" },
];

const RELATIONSHIP: JourneyWorld = {
  slug: "relationship",
  label: "Relationship",
  eyebrow: "Relationship Journey",
  tagline: "Every chapter of your love story — explore freely, plan when you're ready.",
  hero: "/story/proposal.jpg",
  momentNoun: "Relationship Moment",
  status: "live",
  areas: [
    { slug: "dating", label: "Dating", tagline: "Fresh ways to spend time together.", image: "/journeys/relationship/dating.jpg", status: "explore" },
    { slug: "date-night-ideas", label: "Date Night Ideas", tagline: "From cozy to unforgettable.", image: "/journeys/relationship/date-night.jpg", status: "explore" },
    {
      slug: "proposal-ideas", label: "Proposal Ideas", tagline: "Explore the perfect way to ask.", image: "/story/proposal.jpg", status: "explore",
      ideas: [
        "At-home proposals", "Destination proposals", "Luxury proposals", "Intimate proposals",
        "Surprise proposals", "Family-involved proposals", "Seasonal proposals", "Proposal photography",
        "Ring presentation ideas", "Proposal wording", "Proposal checklists",
      ],
    },
    { slug: "engagement", label: "Engagement", tagline: "Celebrate the yes.", image: "/journeys/relationship/engagement.jpg", status: "explore" },
    { slug: "wedding", label: "Wedding", tagline: "Your day, your way.", image: "/story/wedding.jpg", status: "explore",
      ideas: ["Ceremony styles", "Reception themes", "Color palettes", "Venue types", "Wedding photography", "Vows & readings", "Guest experience", "Wedding checklists"] },
    { slug: "elopement", label: "Elopement", tagline: "Just the two of you.", image: "/journeys/relationship/elopement.jpg", status: "explore" },
    { slug: "bridal-shower", label: "Bridal Shower", tagline: "Shower her with love.", image: "/story/bridalshower.jpg", status: "explore" },
    { slug: "bachelor-bachelorette", label: "Bachelor or Bachelorette", tagline: "One last adventure.", image: "/journeys/relationship/bachelor-bachelorette.jpg", status: "explore" },
    { slug: "rehearsal-dinner", label: "Rehearsal Dinner", tagline: "The night before the vows.", image: "/journeys/relationship/rehearsal-dinner.jpg", status: "explore" },
    { slug: "honeymoon", label: "Honeymoon", tagline: "Begin forever, somewhere beautiful.", image: "/story/vacation.jpg", status: "explore" },
    { slug: "anniversary", label: "Anniversary", tagline: "Celebrate the years.", image: "/story/anniversary.jpg", status: "explore",
      ideas: ["Milestone anniversaries", "Romantic getaways", "At-home celebrations", "Gift by year", "Renewing traditions", "Anniversary photography"] },
    { slug: "vow-renewal", label: "Vow Renewal", tagline: "Say it again.", status: "explore" },
    { slug: "couples-travel", label: "Couples Travel", tagline: "See the world together.", image: "/story/vacation.jpg", status: "explore" },
    { slug: "love-letters", label: "Love Letters", tagline: "Words to keep forever.", image: "/journeys/relationship/love-letters.jpg", status: "explore" },
    { slug: "our-story", label: "Our Story", tagline: "How it all began.", image: "/journeys/relationship/our-story.jpg", status: "explore" },
    { slug: "relationship-milestones", label: "Relationship Milestones", tagline: "Mark every meaningful moment.", image: "/journeys/relationship/relationship-milestones.jpg", status: "explore" },
    { slug: "relationship-memories", label: "Relationship Memories", tagline: "Keep your moments close.", image: "/journeys/relationship/relationship-memories.jpg", status: "explore" },
    { slug: "romantic-gifts", label: "Romantic Gifts", tagline: "Thoughtful, from the heart.", image: "/journeys/relationship/romantic-gifts.jpg", status: "explore" },
    { slug: "romantic-experiences", label: "Romantic Experiences", tagline: "Make memories, not just plans.", image: "/journeys/relationship/romantic-experiences.jpg", status: "explore" },
    { slug: "custom-relationship-moment", label: "Custom Relationship Moment", tagline: "Something all your own.", image: "/story/custom.jpg", status: "explore" },
  ],
};

const HOME: JourneyWorld = {
  slug: "home",
  label: "Housing",
  eyebrow: "Housing",
  tagline: "Every home chapter — buying, building, renting, renovating, and beyond.",
  hero: "/hero/home-poster.jpg",
  momentNoun: "Housing area",
  status: "live",
  areas: [
    { slug: "buy-a-home", label: "Buy a Home", tagline: "Find the one that feels like you.", image: "/hero/home-poster.jpg", status: "explore" },
    { slug: "build-a-home", label: "Build a Home", tagline: "From land to legacy. Let's build it.", image: "/story/newhome.jpg", status: "explore" },
    { slug: "apartment-rental", label: "Apartment Rental", tagline: "Find the right apartment to call home.", image: "/journeys/home/apartment.jpg", status: "explore",
      ideas: ["Luxury apartments", "Pet-friendly rentals", "Short-term & furnished", "By neighborhood", "Amenities that matter", "Lease & tour checklists", "Move-in ready"] },
    { slug: "vacation-homes", label: "Vacation Homes", tagline: "Your escape. Your place.", image: "/journeys/home/vacation.jpg", status: "explore" },
    { slug: "renovation", label: "Renovation", tagline: "Reimagine the home you already love.", image: "/journeys/home/renovation.jpg", status: "explore" },
    { slug: "investment-property", label: "Investment Property", tagline: "Build wealth. Create freedom.", image: "/journeys/home/investment.jpg", status: "explore" },
    { slug: "moving", label: "Moving", tagline: "A smooth move to what's next.", image: "/journeys/home/moving.jpg", status: "explore" },
    { slug: "home-maintenance", label: "Home Maintenance", tagline: "Keep your home at its best.", image: "/journeys/home/maintenance.jpg", status: "explore" },
    { slug: "lifestyle-concierge", label: "Lifestyle Concierge", tagline: "We handle the details. You enjoy the life.", image: "/journeys/home/concierge.jpg", status: "explore" },
  ],
};

// Lighter worlds — visible and explorable at the world level, with a starter set
// of areas. Their deeper idea lists are still being crafted (honest Coming Soon).
function world(slug: string, label: string, eyebrow: string, tagline: string, hero: string, moment: string, areas: JourneyArea[], status: "live" | "soon" = "soon"): JourneyWorld {
  return { slug, label, eyebrow, tagline, hero, momentNoun: moment, status, areas };
}
const a = (slug: string, label: string, tagline?: string, image?: string): JourneyArea => ({ slug, label, tagline, image, status: "explore" });

const OTHERS: JourneyWorld[] = [
  world("baby", "Baby", "Baby Journey", "From the first announcement to first steps.", "/story/baby.jpg", "Baby Moment", [
    a("pregnancy-announcement", "Pregnancy Announcement", "Baby coming soon.", "/journeys/baby/pregnancy-announcement.jpg"),
    a("gender-reveal", "Gender Reveal", "The biggest surprise is on the way!", "/journeys/baby/gender-reveal.jpg"),
    a("baby-shower", "Baby Shower", "A little one is on the way!", "/journeys/baby/baby-shower.jpg"),
    a("nursery", "Nursery Setup & Reveal", "A beautiful new space for your little one.", "/journeys/baby/nursery.jpg"),
    a("welcome-baby", "Welcome Baby", "You are so loved already.", "/journeys/baby/welcome-baby.jpg"),
    a("birth-story", "Birth Story", "Every moment. Every breath. Our greatest miracle.", "/journeys/baby/birth-story.jpg"),
    a("milestones", "Baby Milestones", "Every first, remembered.", "/journeys/baby/milestones.jpg"),
    a("first-holidays", "Baby's First Holidays", "Making memories that last a lifetime.", "/journeys/baby/first-holidays.jpg"),
    a("first-birthday", "First Birthday", "One big year.", "/journeys/baby/first-birthday.jpg"),
    a("baby-memories", "Baby Memories", "Little moments, big love.", "/journeys/baby/baby-memories.jpg"),
  ], "live"),
  world("birthday", "Birthday", "Birthday Journey", "Every candle, every wish, every year.", "/story/birthday.jpg", "Birthday Moment", [
    a("kids-birthday", "Kids Birthday", "Big fun for little ones.", "/story/birthday.jpg"), a("milestone-birthday", "Milestone Birthday", "30, 40, 50 & beyond."),
    a("sweet-16", "Sweet 16", "A milestone to remember.", "/story/sweet16.jpg"), a("quinceanera", "Quinceañera", "A grand celebration.", "/story/quinceanera.jpg"),
    a("adult-birthday", "Adult Birthday", "Celebrate you."), a("surprise-party", "Surprise Party", "Shh — it's a secret."),
  ]),
  world("graduation", "Graduation", "Graduation Journey", "Honor the achievement and what's next.", "/story/graduation.jpg", "Graduation Moment", [
    a("grad-party", "Graduation Party", "Celebrate the milestone.", "/story/graduation.jpg"), a("prom", "Prom", "A night to remember.", "/story/prom.jpg"),
    a("open-house", "Open House", "Family & friends drop by."), a("grad-gifts", "Graduation Gifts", "Mark the moment."),
  ]),
  world("travel", "Travel", "Travel Journey", "Dream it, explore it, remember it.", "/story/vacation.jpg", "Travel Moment", [
    a("getaways", "Getaways", "A little escape.", "/story/vacation.jpg"), a("family-trips", "Family Trips", "Memories in motion."),
    a("luxury-travel", "Luxury Travel", "Travel, elevated."), a("group-travel", "Group Travel", "Better together."), a("travel-memories", "Travel Memories", "Every journey, kept."),
  ]),
  world("military", "Military", "Military Journey", "Honor service, homecomings, and family.", "/story/military.jpg", "Military Moment", [
    a("homecoming", "Homecoming", "Welcome them home.", "/story/military.jpg"), a("deployment", "Deployment Send-off", "With love and pride."),
    a("promotion", "Promotion & Retirement", "Recognize the service."), a("military-memories", "Military Memories", "A legacy of service."),
  ]),
  world("sports", "Sports", "Sports Journey", "Celebrate the team, the season, the win.", "/story/sports.jpg", "Sports Moment", [
    a("team-events", "Team Events", "Rally the crew.", "/story/sports.jpg"), a("championships", "Championships", "Celebrate the title."),
    a("signing-day", "Signing Day", "A big commitment."), a("sports-memories", "Sports Memories", "Keep the highlights."),
  ]),
  world("family", "Family", "Family Journey", "Reunions, traditions, and everyday togetherness.", "/story/reunion.jpg", "Family Moment", [
    a("reunion", "Family Reunion", "Bring everyone together.", "/story/reunion.jpg"), a("traditions", "Traditions", "Carry them forward."),
    a("holidays", "Holidays", "Season by season."), a("family-memories", "Family Memories", "The whole story."),
  ]),
  world("career", "Career", "Career Journey", "Milestones, moves, and moments of pride.", "/story/career.jpg", "Career Moment", [
    a("new-job", "New Job", "A fresh start.", "/story/career.jpg"), a("promotion", "Promotion", "Celebrate the climb."),
    a("retirement", "Retirement", "A well-earned chapter.", "/story/retirement.jpg"), a("achievements", "Achievements", "Honor the work."),
  ]),
  world("celebration-of-life", "Celebration of Life", "Celebration of Life Journey", "Honor a life with love, grace, and memory.", "/story/memorial.jpg", "Celebration of Life", [
    a("memorial", "Memorial", "A gentle tribute.", "/story/memorial.jpg"), a("tribute", "Tribute & Eulogy", "Words that honor."),
    a("remembrance", "Remembrance", "Keep them near."), a("life-story", "Life Story", "A life, remembered."),
  ]),
  world("legacy-and-memories", "Legacy and Memories", "Legacy Journey", "Preserve the stories that outlast us.", "/story/legacy.jpg", "Legacy Moment", [
    a("family-history", "Family History", "Roots and branches.", "/story/legacy.jpg"), a("time-capsule", "Time Capsule", "For the future."),
    a("memory-keeper", "Memory Keeper", "Photos, letters, voices."), a("life-lessons", "Life Lessons", "Wisdom to pass on."),
  ]),
  world("custom", "Custom", "Custom Journey", "If it matters to you, it belongs here.", "/story/custom.jpg", "Custom Moment", [
    a("custom-moment", "Custom Moment", "Design it your way.", "/story/custom.jpg"), a("just-because", "Just Because", "No reason needed."),
  ], "live"),
];

export const WORLDS: JourneyWorld[] = [HOME, RELATIONSHIP, ...OTHERS];

export function getWorld(slug: string): JourneyWorld | undefined {
  return WORLDS.find((w) => w.slug === slug);
}
export function getArea(world: JourneyWorld, slug: string | undefined): JourneyArea | undefined {
  if (!slug) return undefined;
  return world.areas.find((x) => x.slug === slug);
}
