import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import { EXPERIENCES } from "@/lib/membership-builder";
import "../get-started/get-started.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Journeys — Magical Moments by Reign",
  description: "Take a guided tour of every Journey — Relationship, Baby, Birthday, Graduation, Home, Travel, Military, Sports, Family, Career, Celebration of Life, and Custom.",
};

// The Journeys tour — sourced directly from the official 12-Journey catalog so
// the homepage, Get Started, pricing, and builder never drift. Each card shows
// the Journey's photo, description, and a few of the moments that live inside it.
export default async function ExperiencesPage() {
  const signedIn = Boolean(await currentAccount());
  const href = signedIn ? "/membership" : "/get-started";

  return (
    <div className="gs">
      <PublicNav active="get-started" signedIn={signedIn} />
      <header className="gs-phead">
        <span className="gs-phead__eye">Explore Before You Decide</span>
        <h1 className="gs-phead__t">Take a guided tour of <i>every Journey</i></h1>
        <p className="gs-phead__s">Twelve beautifully designed Journeys — each holding the moments, milestones, and memories that live inside it. Explore before you ever create an account.</p>
      </header>

      <section className="gs-exp">
        <div className="gs-exp__grid">
          {EXPERIENCES.map((j) => (
            <Link key={j.id} href={href} className="gs-xc">
              <div className={`gs-xc__top${j.photo ? " gs-xc__top--photo" : ""}`} style={j.photo ? { backgroundImage: `url(${j.photo})` } : undefined}>
                <span className="gs-xc__badge">{j.milestones.length > 0 ? `${j.milestones.length} moments` : "Make it yours"}</span>
              </div>
              <div className="gs-xc__body">
                <h3 className="gs-xc__t">{j.label}</h3>
                <p className="gs-xc__s">{j.blurb}</p>
                <div className="gs-xc__chips gs-xc__chips--tags">
                  {j.milestones.slice(0, 6).map((ms) => (
                    <span key={ms.id} className="gs-xc__chip gs-xc__chip--tag">{ms.label}</span>
                  ))}
                  {j.milestones.length > 6 && (
                    <span className="gs-xc__chip gs-xc__chip--tag gs-xc__chip--more">+{j.milestones.length - 6} more</span>
                  )}
                  {j.milestones.length === 0 && (
                    <span className="gs-xc__chip gs-xc__chip--tag">Any occasion you can imagine</span>
                  )}
                </div>
                <span className="gs-xc__go">Explore Journey <span aria-hidden="true">→</span></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="gs-ai">
        <span className="gs-ai__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" /></svg></span>
        <h3 className="gs-ai__t">Not sure where to start? <i>Let Magical help you find the perfect Journey for your life.</i></h3>
        <Link href={signedIn ? "/home" : "/get-started"} className="gs-ai__cta">Explore Journeys <span aria-hidden="true">→</span></Link>
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
