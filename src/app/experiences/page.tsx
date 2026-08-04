import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import "../get-started/get-started.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Experiences — Magical Moments by Reign",
  description: "Take a guided tour of every Experience — from weddings and baby journeys to travel, new homes, and legacy.",
};

// Champagne chip icons (shared across experience feature lists).
const CHIP: Record<string, ReactElement> = {
  concierge: <><circle cx="12" cy="8" r="3.2" /><path d="M6 19a6 6 0 0 1 12 0" /></>,
  timeline: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>,
  website: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M6 7h.01M8.5 7h.01" /></>,
  registry: <><rect x="4" y="8" width="16" height="12" rx="1" /><path d="M4 12h16M12 8v12M12 8s-1.5-4-4-4-2 3 0 3 4 1 4 1M12 8s1.5-4 4-4 2 3 0 3-4 1-4 1" /></>,
  invitations: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M3.5 7 12 13 20.5 7" /></>,
  memories: <><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="3.2" /><path d="M8 7l1.5-2h5L16 7" /></>,
  guests: <><circle cx="9" cy="9" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 7a3 3 0 0 1 0 6M15 19a6 6 0 0 0-1-3.5" /></>,
  milestones: <><path d="M6 21V4h11l-2 3 2 3H6" /></>,
  photos: <><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="3.2" /><path d="M8 7l1.5-2h5L16 7" /></>,
  gallery: <><rect x="4" y="4" width="16" height="12" rx="2" /><path d="M4 13l4-3 3 2 4-4 5 5" /><path d="M4 20h16" /></>,
  itinerary: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  budget: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M16 12h.01M3 11h18" /></>,
  packing: <><path d="M5 5h14v15H5z" /><path d="M9 5V3h6v2M8 11l2.5 2.5L16 8" /></>,
  checklist: <><path d="M5 5h14v15H5z" /><path d="M8 10l2 2 4-4M8 15h6" /></>,
  documents: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 13h5M10 16h5" /></>,
  financials: <><path d="M4 20h16" /><path d="M6 16l4-5 3 3 5-7" /></>,
  growth: <><path d="M4 18l6-6 3 3 7-8" /><path d="M21 7v4M21 7h-4" /></>,
  dates: <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" />,
  vault: <><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M12 9v-.01M15 12h.01" /></>,
  familytree: <><circle cx="12" cy="5" r="2.2" /><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="19" r="2.2" /><path d="M12 7v5M12 12H6v4.8M12 12h6v4.8" /></>,
};

interface Exp { title: string; badge: string; desc: string; icon: ReactElement; chips: [string, string][] }

const EXPERIENCES: Exp[] = [
  { title: "The Wedding Experience", badge: "Member Favorite", desc: "From the proposal to the last dance — the whole love story, beautifully kept.", icon: <><circle cx="9" cy="14" r="4" /><circle cx="15" cy="14" r="4" /><path d="M9 8l1.5-3M15 8l-1.5-3" /></>, chips: [["concierge", "AI Concierge"], ["timeline", "Timeline"], ["website", "Sample Website"], ["registry", "Registry"], ["invitations", "Invitations"], ["memories", "Memories"]] },
  { title: "The Birthday Experience", badge: "Popular Choice", desc: "Balloons, wishes, and every candle — a celebration that lives forever.", icon: <><path d="M4 21h16v-7H4z" /><path d="M4 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" /><path d="M12 6v4M12 4v.01" /></>, chips: [["concierge", "AI Concierge"], ["timeline", "Timeline"], ["website", "Sample Website"], ["guests", "Guest List"], ["invitations", "Invitations"], ["memories", "Memories"]] },
  { title: "The Baby Journey", badge: "Family Collection", desc: "From the first heartbeat onward — a living timeline that grows with your little one.", icon: <><path d="M3 8h11v9H3z" /><path d="M14 11h4l3 3v3h-3" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></>, chips: [["concierge", "AI Concierge"], ["timeline", "Timeline"], ["website", "Sample Website"], ["milestones", "Milestones"], ["photos", "Photo Albums"], ["memories", "Memories"]] },
  { title: "The Graduation Experience", badge: "Senior Collection", desc: "Countdowns, memories, blessings and registry — the whole senior story in one place.", icon: <><path d="M3 9l9-4 9 4-9 4z" /><path d="M7 11v5c0 1 5 3 5 3s5-2 5-3v-5" /></>, chips: [["concierge", "AI Concierge"], ["timeline", "Timeline"], ["website", "Sample Website"], ["gallery", "Gallery"], ["registry", "Registry"], ["memories", "Memories"]] },
  { title: "The Travel Experience", badge: "Adventure Awaits", desc: "Dream it. Plan it. Live it. Every adventure beautifully organized.", icon: <path d="M10 14 3 12l1.5-2 5 .5L14 6l2 .5-2 6 5 2-1 2-4-1-2 4-1.5-.5z" />, chips: [["concierge", "AI Concierge"], ["itinerary", "Itinerary"], ["website", "Sample Website"], ["budget", "Budget Plan"], ["packing", "Packing List"], ["memories", "Memories"]] },
  { title: "The New Home Experience", badge: "New Beginnings", desc: "From finding the perfect place to making it uniquely yours.", icon: <path d="M4 12 L12 5 L20 12 M6 11 V20 H18 V11" />, chips: [["concierge", "AI Concierge"], ["checklist", "Checklist"], ["website", "Sample Website"], ["budget", "Budget Plan"], ["documents", "Documents"], ["memories", "Memories"]] },
  { title: "The Business Experience", badge: "Business Edition", desc: "Powerful tools and planning to grow, manage, and scale your business.", icon: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" /></>, chips: [["concierge", "AI Concierge"], ["documents", "Business Plan"], ["website", "Sample Website"], ["financials", "Financials"], ["documents", "Documents"], ["growth", "Growth Tools"]] },
  { title: "The Relationship Experience", badge: "Love & Connection", desc: "Celebrate your love and every chapter you write together.", icon: <path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" />, chips: [["concierge", "AI Concierge"], ["dates", "Date Ideas"], ["website", "Sample Website"], ["milestones", "Milestones"], ["gallery", "Gallery"], ["memories", "Memories"]] },
  { title: "The Legacy Experience", badge: "Legacy Planning", desc: "Preserve your story, values, and memories for generations to come.", icon: <><path d="M12 21V11" /><path d="M12 11c-3-4-7-3-8.5-1M12 11c3-4 7-3 8.5-1" /></>, chips: [["concierge", "AI Concierge"], ["timeline", "Timeline"], ["website", "Sample Website"], ["vault", "Document Vault"], ["familytree", "Family Tree"], ["memories", "Memories"]] },
];

export default async function ExperiencesPage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <div className="gs">
      <PublicNav active="get-started" signedIn={signedIn} />
      <header className="gs-phead">
        <span className="gs-phead__eye">Explore Before You Decide</span>
        <h1 className="gs-phead__t">Take a guided tour of <i>every Experience</i></h1>
        <p className="gs-phead__s">Explore everything included in each Experience — the concierge guidance, planning timeline, and what you can create — before you ever create an account.</p>
      </header>

      <section className="gs-exp">
        <div className="gs-exp__grid">
          {EXPERIENCES.map((e) => (
            <Link key={e.title} href={signedIn ? "/journeys" : "/get-started"} className="gs-xc">
              <div className="gs-xc__top">
                <span className="gs-xc__badge">{e.badge}</span>
                <span className="gs-xc__ic"><svg viewBox="0 0 24 24" aria-hidden="true">{e.icon}</svg></span>
              </div>
              <div className="gs-xc__body">
                <h3 className="gs-xc__t">{e.title}</h3>
                <p className="gs-xc__s">{e.desc}</p>
                <div className="gs-xc__chips">
                  {e.chips.map(([k, label], i) => (
                    <span key={`${k}-${i}`} className="gs-xc__chip">
                      <svg viewBox="0 0 24 24" aria-hidden="true">{CHIP[k]}</svg>{label}
                    </span>
                  ))}
                </div>
                <span className="gs-xc__go">Explore Experience <span aria-hidden="true">→</span></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="gs-ai">
        <span className="gs-ai__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" /></svg></span>
        <h3 className="gs-ai__t">Not sure where to start? <i>Let Magical help you find the perfect Experiences for your life.</i></h3>
        <Link href={signedIn ? "/home" : "/get-started"} className="gs-ai__cta">Explore Experiences <span aria-hidden="true">→</span></Link>
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
