// ── Dashboard navigation + Journey tile config ──────────────────
// One source of truth for the sidebar menu, the overview "Magical Journeys"
// tiles, and the Coming-Soon category pages. Every entry points to a REAL route:
// features that aren't built yet route to /dashboard/explore/[slug], an honest
// "coming soon" page — never a dead link.

import type { ReactNode } from "react";

// Stroke icons (viewBox 0 0 24 24). The CSS applies stroke/fill.
const P: Record<string, ReactNode> = {
  dashboard: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>,
  home: <path d="M4 12 12 5 20 12 M6 11V19H18V11" />,
  relationship: <><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></>,
  baby: <><circle cx="12" cy="8" r="4" /><path d="M10 7.5h.01M14 7.5h.01" /><path d="M6 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /></>,
  birthday: <><path d="M4 20h16M5 20v-6h14v6" /><path d="M6 14v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" /><path d="M12 8V5" /><circle cx="12" cy="4" r="1" /></>,
  graduation: <><path d="M12 4 2 9l10 5 10-5z" /><path d="M6 11v5c0 1 2.7 2 6 2s6-1 6-2v-5" /></>,
  travel: <path d="M21 3 11 13M21 3l-6 18-4-8-8-4z" />,
  military: <><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  sports: <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></>,
  family: <><circle cx="8.5" cy="8" r="2.6" /><circle cx="16" cy="9.5" r="2.2" /><path d="M3.5 20a5 5 0 0 1 10 0" /><path d="M13 20a4.5 4.5 0 0 1 8-2.4" /></>,
  career: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5.5A2 2 0 0 1 10 3.5h4a2 2 0 0 1 2 2V7M3 12h18" /></>,
  celebration: <path d="M12 20s-7-4.4-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.6 12 20 12 20Z" />,
  build: <><path d="M4 20h16" /><path d="M6 20v-7l6-4 6 4v7" /><path d="M9 20v-4h6v4" /></>,
  palm: <><path d="M12 21V10" /><path d="M12 10c-3-3-7-2-8 0 3-1 5 0 8 0Z" /><path d="M12 10c3-3 7-2 8 0-3-1-5 0-8 0Z" /><circle cx="12" cy="7" r="2" /></>,
  key: <><circle cx="8" cy="8" r="4" /><path d="M11 11 20 20M17 17l2-2M15 15l2-2" /></>,
  invest: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  moving: <><path d="M2 8h11v9H2z" /><path d="M13 11h4l4 3v3h-3" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></>,
  maintenance: <><path d="M14 7a3.5 3.5 0 0 0-4.6 4.6L4 17l3 3 5.4-5.4A3.5 3.5 0 0 0 17 10l-2 2-2-2 2-2a3.5 3.5 0 0 0-1-.9Z" /></>,
  concierge: <><path d="M4 19h16" /><path d="M6 19a6 6 0 0 1 12 0" /><path d="M12 7V5" /><circle cx="12" cy="4" r="1" /></>,
  events: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /><path d="m12 12 1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 14.3l2-.3z" /></>,
  moments: <path d="M12 20s-7-4.4-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.6 12 20 12 20Z" />,
  documents: <path d="M6 3h8l4 4v14H6z M14 3v4h4" />,
  messages: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M3.5 7 12 13 20.5 7" /></>,
  projects: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v16M3 9h5M3 14h5" /></>,
  favorites: <path d="M12 4 14.3 9 20 9.5 15.7 13.4 17 19 12 16 7 19 8.3 13.4 4 9.5 9.7 9z" />,
  resources: <><path d="M5 4h10a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" /><path d="M17 6h2v14H7" /></>,
  settings: <><circle cx="12" cy="12" r="3.3" /><path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M7.2 7.2 5.7 5.7M18.3 18.3 16.8 16.8M7.2 16.8 5.7 18.3M18.3 5.7 16.8 7.2" /></>,
  star: <path d="M12 4 14.3 9 20 9.5 15.7 13.4 17 19 12 16 7 19 8.3 13.4 4 9.5 9.7 9z" />,
};

export function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{P[name] ?? P.dashboard}</svg>;
}

// Per-world default icon for occasion tiles.
const WORLD_ICON: Record<string, string> = {
  home: "home", relationship: "relationship", baby: "baby", birthday: "birthday",
  graduation: "graduation", travel: "travel", military: "military", sports: "sports",
  family: "family", career: "career", "celebration-of-life": "celebration", "legacy-and-memories": "documents",
  custom: "star",
};

// Icon for a specific occasion tile. Housing gets distinct per-area icons (its the
// showcase); everything else falls back to its world icon, then a gold star.
const AREA_ICON: Record<string, string> = {
  "buy-a-home": "home", "build-a-home": "build", "apartment-rental": "key", "vacation-homes": "palm",
  renovation: "maintenance", "investment-property": "invest", moving: "moving",
  "home-maintenance": "maintenance", "lifestyle-concierge": "concierge",
};

export function areaIcon(worldSlug: string, areaSlug: string): string {
  return AREA_ICON[areaSlug] || WORLD_ICON[worldSlug] || "star";
}

export interface NavEntry { id: string; label: string; href: string; icon: string }

// Hub-level navigation only. Occasion categories (birthday, graduation, travel,
// and the other Journey worlds) belong inside Magical Occasions rather than in
// the permanent application chrome.
export const SIDE_NAV: NavEntry[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { id: "occasions", label: "Magical Occasions", href: "/dashboard/journeys", icon: "events" },
  { id: "luxury-services", label: "Luxury Services", href: "/dashboard/luxury-services", icon: "concierge" },
  { id: "family", label: "My Magical Family", href: "/dashboard/family-vault", icon: "family" },
  { id: "journey", label: "Journey", href: "/dashboard/home", icon: "travel" },
  { id: "memories", label: "Memories Vault", href: "/dashboard/vault", icon: "moments" },
  { id: "messages", label: "Messages", href: "/dashboard/messages", icon: "messages" },
  { id: "notifications", label: "Notifications", href: "/notifications", icon: "birthday" },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export const OWNER_NAV: NavEntry = { id: "owner-demo", label: "Owner Demo Studio", href: "/dashboard/owner-demo", icon: "star" };

export interface JourneyTile {
  id: string; title: string; tagline: string; icon: string; href: string;
  image?: string; status: "live" | "soon";
}

// The "Your Magical Journeys" tiles on the overview — the TWELVE top-level
// Journeys, matching the left sidebar. Each opens its Journey world (whose
// sub-occasions live inside that world's page, not on the dashboard). Order and
// slugs mirror SIDE_NAV so the dashboard and sidebar always agree.
export const JOURNEY_TILES: JourneyTile[] = [
  { id: "housing", title: "Housing", tagline: "Every chapter of finding & creating a home.", icon: "home", href: "/dashboard/journeys/home", image: "/story/newhome.jpg", status: "live" },
  { id: "relationship", title: "Relationship", tagline: "Every chapter of your love story.", icon: "relationship", href: "/dashboard/journeys/relationship", image: "/story/proposal.jpg", status: "live" },
  { id: "baby", title: "Baby", tagline: "The story of a brand-new life.", icon: "baby", href: "/dashboard/journeys/baby", image: "/story/baby.jpg", status: "live" },
  { id: "birthday", title: "Birthday", tagline: "Another year worth celebrating.", icon: "birthday", href: "/dashboard/journeys/birthday", image: "/story/birthday.jpg", status: "live" },
  { id: "graduation", title: "Graduation", tagline: "The milestone that started everything.", icon: "graduation", href: "/dashboard/journeys/graduation", image: "/story/graduation.jpg", status: "live" },
  { id: "travel", title: "Travel", tagline: "Every memorable trip, kept forever.", icon: "travel", href: "/dashboard/journeys/travel", image: "/story/vacation.jpg", status: "live" },
  { id: "military", title: "Military", tagline: "Service, homecoming, and honor.", icon: "military", href: "/dashboard/journeys/military", image: "/story/military.jpg", status: "live" },
  { id: "sports", title: "Sports", tagline: "Every season, every win.", icon: "sports", href: "/dashboard/journeys/sports", image: "/story/sports.jpg", status: "live" },
  { id: "family", title: "Family", tagline: "Everyone, together again.", icon: "family", href: "/dashboard/journeys/family", image: "/story/reunion.jpg", status: "live" },
  { id: "career", title: "Career", tagline: "A life's work, honored.", icon: "career", href: "/dashboard/journeys/career", image: "/story/career.jpg", status: "live" },
  { id: "celebration-of-life", title: "Celebration of Life", tagline: "A life remembered with love.", icon: "celebration", href: "/dashboard/journeys/celebration-of-life", image: "/story/memorial.jpg", status: "live" },
  { id: "custom", title: "Custom", tagline: "Your one-of-a-kind moment.", icon: "star", href: "/dashboard/journeys/custom", image: "/story/custom.jpg", status: "live" },
];

// Metadata for the Coming-Soon category pages (/dashboard/explore/[slug]).
export const COMING_SOON: Record<string, { title: string; tagline: string; icon: string; image?: string }> = {
  "buy-a-home": { title: "Buy a Home", tagline: "Find the one that feels like you.", icon: "home", image: "/hero/home-poster.jpg" },
  "build-a-home": { title: "Build a Home", tagline: "From land to legacy — let's build it.", icon: "build", image: "/story/newhome.jpg" },
  "vacation-homes": { title: "Vacation Homes", tagline: "Your escape. Your place.", icon: "palm", image: "/story/vacation.jpg" },
  "renovation": { title: "Renovation", tagline: "Reimagine the home you already love.", icon: "key" },
  "investment-property": { title: "Investment Property", tagline: "Build wealth. Create freedom.", icon: "invest" },
  "moving": { title: "Moving", tagline: "A smooth move to what's next.", icon: "moving" },
  "home-maintenance": { title: "Home Maintenance", tagline: "Keep your home at its best.", icon: "maintenance" },
  "documents": { title: "Documents", tagline: "Your important files, safe and organized.", icon: "documents" },
  "active-projects": { title: "Active Projects", tagline: "Track every project from start to finish.", icon: "projects" },
  "favorites": { title: "Favorites", tagline: "Everything you've saved, in one place.", icon: "favorites" },
  "resources": { title: "Resources", tagline: "Guides and tools for every journey.", icon: "resources" },
  "search": { title: "Search", tagline: "Search across your entire Magical Space.", icon: "dashboard" },
  "privacy": { title: "Privacy Policy", tagline: "How we protect and respect your information.", icon: "documents" },
  "terms": { title: "Terms of Service", tagline: "The terms that guide our work together.", icon: "documents" },
};
