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

export interface NavEntry { id: string; label: string; href: string; icon: string }

// Sidebar menu. Housing is a SINGLE entry — the whole home world (Buy, Build,
// Rent, Renovate, Vacation, Invest, Move, Maintain, Concierge) lives INSIDE the
// Housing page as tiles, not as separate sidebar links. Everything else here is
// an app-level utility, not a housing sub-area.
export const SIDE_NAV: NavEntry[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { id: "housing", label: "Housing", href: "/dashboard/journeys/home", icon: "home" },
  { id: "create", label: "Events & Celebrations", href: "/dashboard/create", icon: "events" },
  { id: "media", label: "My Moments", href: "/dashboard/media", icon: "moments" },
  { id: "documents", label: "Documents", href: "/dashboard/explore/documents", icon: "documents" },
  { id: "messages", label: "Messages", href: "/dashboard/messages", icon: "messages" },
  { id: "active-projects", label: "Active Projects", href: "/dashboard/explore/active-projects", icon: "projects" },
  { id: "favorites", label: "Favorites", href: "/dashboard/explore/favorites", icon: "favorites" },
  { id: "resources", label: "Resources", href: "/dashboard/explore/resources", icon: "resources" },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export const OWNER_NAV: NavEntry = { id: "owner-demo", label: "Owner Demo Studio", href: "/dashboard/owner-demo", icon: "star" };

export interface JourneyTile {
  id: string; title: string; tagline: string; icon: string; href: string;
  image?: string; status: "live" | "soon";
}

// The 8 "Your Magical Journeys" tiles on the overview.
export const JOURNEY_TILES: JourneyTile[] = [
  { id: "buy-a-home", title: "Buy a Home", tagline: "Find the one that feels like you.", icon: "home", href: "/dashboard/explore/buy-a-home", image: "/hero/home-poster.jpg", status: "soon" },
  { id: "build-a-home", title: "Build a Home", tagline: "From land to legacy. Let's build it.", icon: "build", href: "/dashboard/explore/build-a-home", image: "/story/newhome.jpg", status: "soon" },
  { id: "vacation-homes", title: "Vacation Homes", tagline: "Your escape. Your place.", icon: "palm", href: "/dashboard/explore/vacation-homes", image: "/story/vacation.jpg", status: "soon" },
  { id: "renovation", title: "Renovation", tagline: "Reimagine the home you already love.", icon: "key", href: "/dashboard/explore/renovation", status: "soon" },
  { id: "investment-property", title: "Investment Property", tagline: "Build wealth. Create freedom.", icon: "invest", href: "/dashboard/explore/investment-property", status: "soon" },
  { id: "moving", title: "Moving", tagline: "A smooth move to what's next.", icon: "moving", href: "/dashboard/explore/moving", status: "soon" },
  { id: "home-maintenance", title: "Home Maintenance", tagline: "Keep your home at its best.", icon: "maintenance", href: "/dashboard/explore/home-maintenance", status: "soon" },
  { id: "concierge", title: "Lifestyle Concierge", tagline: "We handle the details. You enjoy the life.", icon: "concierge", href: "/dashboard/concierge", status: "live" },
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
