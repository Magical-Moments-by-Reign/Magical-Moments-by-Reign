import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import { Icon } from "@/components/dashboard/nav-config";
import "../get-started/get-started.css";
import "./magical-demo.css";

// Same example occasions the real dashboard shows (src/app/dashboard/page.tsx)
// — reused verbatim here for fidelity, not invented for the demo.
const DEMO_OCCASIONS = [
  { title: "Paris Birthday Trip", kind: "Birthday · Travel", date: "September 18–24, 2026", status: "In Planning", image: "/gallery/italy/03.jpg", progress: 68 },
  { title: "Karlie’s Graduation", kind: "Graduation", date: "May 22, 2027", status: "In Planning", image: "/story/graduation.jpg", progress: 42 },
  { title: "Christmas in New York", kind: "Holiday · Travel", date: "December 20–27, 2026", status: "Upcoming", image: "/story/newhome.jpg", progress: 76 },
  { title: "Maldives Escape", kind: "Anniversary · Travel", date: "February 10–18, 2027", status: "Dreaming", image: "/story/vacation.jpg", progress: 24 },
];

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "The Magical Demo — See What's Inside Before You Buy",
  description: "A real look inside Magical Moments by Reign — Journey Concierge booking a flight, a family website, Discovery's sports/music/TV, and getting tickets to the show everyone's talking about.",
};

export default async function MagicalDemoPage() {
  const signedIn = Boolean(await currentAccount());

  return (
    <div className="gs">
      <PublicNav active={null} signedIn={signedIn} />

      <header className="gs-phead">
        <span className="gs-phead__eye">The Magical Demo</span>
        <h1 className="gs-phead__t">See what&rsquo;s <i>Magical</i> inside — before you buy</h1>
        <p className="gs-phead__s">A real look at what&rsquo;s waiting for you: a concierge that books your flight, a beautiful website for your story, everything worth knowing today, and tickets to the show everyone&rsquo;s talking about — all in one Space.</p>
      </header>

      <div className="md">
        <p className="md-note"><b>Illustrative preview</b> — the screens below use example content. Your real Space connects to real flights, real Apple Music charts, real sports scores, real TV &amp; movie listings, and real Ticketmaster events.</p>

        <section className="md-primary">
          <div className="md-primary__copy">
            <span className="md-feature__eyebrow">Journey Concierge</span>
            <h2>Ask, and it&rsquo;s handled.</h2>
            <p>This is your Magical Space — your occasions, always in view — with your personal Concierge open right alongside it. Tell it what you have in mind, and it gets to work.</p>
            <ul className="md-feature__list">
              <li>Your occasions, front and center, the moment you arrive</li>
              <li>Concierge is always one click away, never in the way</li>
              <li>Ask a question or hand off a whole trip — it remembers the difference</li>
            </ul>
          </div>

          <div className="md-app-frame">
            <div className="md-app-frame__bar" aria-hidden="true">
              <span className="md-app-frame__dot" /><span className="md-app-frame__dot" /><span className="md-app-frame__dot" />
              <span className="md-app-frame__url">magicalmomentsbyreign.com/dashboard</span>
            </div>
            <div className="md-app-frame__stage">
              <div className="hub md-app-hub" aria-hidden="true">
                <div className="hub-stats">
                  {[["events", "4", "Upcoming Occasions"], ["moments", "12", "Completed"]].map(([icon, value, label]) => (
                    <div className="hub-stat" key={label}><span className="hub-stat__icon"><Icon name={icon} /></span><span><b>{value}</b><small>{label}</small></span></div>
                  ))}
                </div>
                <div className="hub-occasions">
                  {DEMO_OCCASIONS.slice(0, 4).map((occasion) => (
                    <div className="hub-occasion" key={occasion.title}>
                      <div className="hub-occasion__image" style={{ backgroundImage: `url('${occasion.image}')` }}><span>{occasion.status}</span></div>
                      <div className="hub-occasion__body">
                        <small>{occasion.kind}</small>
                        <h3>{occasion.title}</h3>
                        <p><Icon name="events" />{occasion.date}</p>
                        <div className="hub-progress"><span style={{ width: `${occasion.progress}%` }} /></div>
                        <em>{occasion.progress}% planned</em>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cc-panel md-cc-overlay" aria-hidden="true">
                <header className="cc-head">
                  <div className="cc-head__title">
                    <span className="cc-head__mark">✦</span>
                    <span>Magical <i>Concierge</i><small>Your personal luxury assistant</small></span>
                  </div>
                  <div className="cc-head__ctrls">
                    <button type="button" className="cc-ctrl" tabIndex={-1}>?</button>
                    <button type="button" className="cc-ctrl" tabIndex={-1}>–</button>
                    <button type="button" className="cc-ctrl" tabIndex={-1}>×</button>
                  </div>
                </header>
                <div className="cc-body">
                  <div className="cc-msg cc-msg--assistant"><span className="cc-ava">✦</span><div className="cc-bubble">Hi! I can see everything you have planned. What can I help with today?</div></div>
                  <div className="cc-msg cc-msg--user"><div className="cc-bubble">Can you help with our Paris trip?</div></div>
                  <div className="cc-msg cc-msg--assistant"><span className="cc-ava">✦</span><div className="cc-bubble">Of course — I can search flights, hold a hotel, and keep everyone in the loop. Want me to start with flights?</div></div>
                </div>
                <div className="cc-sugs">
                  <button type="button" className="cc-sug" tabIndex={-1}>Help me plan a trip</button>
                  <button type="button" className="cc-sug" tabIndex={-1}>Find ideas for my celebration</button>
                </div>
                <div className="cc-input">
                  <textarea rows={1} placeholder="Tell me what you&rsquo;re planning…" readOnly tabIndex={-1} />
                  <button type="button" className="cc-send" tabIndex={-1}>↑</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="md-feature">
          <div className="md-feature__copy">
            <span className="md-feature__eyebrow">Ask For Anything — Like a Flight</span>
            <h2>Say the word, and it searches for real.</h2>
            <p>Ask Concierge for a flight and it comes back with real prices from real airlines — not a placeholder, an actual fare it found for you to approve.</p>
            <ul className="md-feature__list">
              <li>Understands the whole trip, not just one flight</li>
              <li>Shows you real prices from real airlines</li>
              <li>Waits for your OK before anything is booked</li>
            </ul>
          </div>
          <div className="md-feature__visual">
            <div className="cc-panel md-chat-frame">
              <div className="cc-head">
                <div className="cc-head__title"><span className="cc-head__mark">✦</span><span>Magical <i>Concierge</i><small>Your personal luxury assistant</small></span></div>
              </div>
              <div className="cc-body">
                <div className="cc-msg cc-msg--user"><div className="cc-bubble">Book us a flight to Orlando for the Whitfield reunion, first week of December</div></div>
                <div className="cc-msg cc-msg--assistant"><span className="cc-ava">✦</span><div className="cc-bubble">Found it — nonstop Delta, morning departure, and under your usual budget. Want me to hold it for the family to review?</div></div>
                <div className="cc-msg cc-msg--user"><div className="cc-bubble">Yes, show me the best one</div></div>
              </div>
            </div>
            <div className="fl-card">
              <div className="fl-card__air">
                <span className="fl-card__ac">DL</span> Delta Air Lines
                <span className="fl-cabin">Main Cabin</span>
              </div>
              <div className="fl-card__legs">
                <div>
                  <div className="fl-leg__route">JFK <span>→</span> MCO</div>
                  <div className="fl-leg__time">8:05 AM – 10:58 AM</div>
                  <div className="fl-leg__meta">Nonstop · 2h 53m</div>
                </div>
              </div>
              <div className="fl-card__buy">
                <span className="fl-price">$284 <small>per person</small></span>
                <span className="fl-refund fl-refund--y">Refundable</span>
              </div>
            </div>
          </div>
        </section>

        <section className="md-feature md-feature--reverse">
          <div className="md-feature__copy">
            <span className="md-feature__eyebrow">Family Website</span>
            <h2>A beautiful page, just for your story.</h2>
            <p>Every occasion, milestone, and family legacy gets its own living website — real photos, real updates, and a link you can actually share with the people who matter.</p>
            <ul className="md-feature__list">
              <li>One page per occasion, or a family-wide legacy site</li>
              <li>Share it privately, or make it public when you&rsquo;re ready</li>
              <li>Grows with you — add photos and updates any time</li>
            </ul>
          </div>
          <div className="md-feature__visual">
            <div className="fw-grid">
              <div className="fw-card">
                <div className="fw-card__body">
                  <span className="fw-card__kicker">Wedding</span>
                  <h3 className="fw-card__title">Sarah &amp; James — Our Wedding Day</h3>
                  <p className="fw-card__sub">June 14, 2026 · Napa Valley</p>
                  <div className="fw-card__meta"><span className="fw-card__pill">248 photos</span><span className="fw-card__pill">Guestbook open</span></div>
                </div>
              </div>
              <div className="fw-card">
                <div className="fw-card__body">
                  <span className="fw-card__kicker">Family Legacy</span>
                  <h3 className="fw-card__title">The Whitfield Family Story</h3>
                  <p className="fw-card__sub">A living history, kept for generations</p>
                  <div className="fw-card__meta"><span className="fw-card__pill">4 generations</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="md-feature">
          <div className="md-feature__copy">
            <span className="md-feature__eyebrow">Magical Discovery</span>
            <h2>Sports, music, and tonight&rsquo;s watch — all in one place.</h2>
            <p>Your daily edit of what&rsquo;s worth knowing: real scores and standings for the teams you follow, real Apple Music charts, and what to watch tonight — no more switching between five different apps.</p>
          </div>
          <div className="md-feature__visual md-feature__visual--grid">
            <div className="sports-matchup">
              <div className="sports-matchup__meta"><span>NFL · Sunday</span><span>4:25 PM</span></div>
              <div className="sports-matchup__teams">
                <div className="sports-matchup__team"><div style={{ width: 44, height: 44, borderRadius: 8, background: "#efe6d5" }} /><span>Eagles</span></div>
                <span className="sports-matchup__vs">VS</span>
                <div className="sports-matchup__team"><div style={{ width: 44, height: 44, borderRadius: 8, background: "#efe6d5" }} /><span>Cowboys</span></div>
              </div>
              <div className="sports-matchup__vote">
                <div className="sports-matchup__vote-bar"><span style={{ width: "62%" }} /><span style={{ width: "38%" }} /></div>
                <div className="sports-matchup__vote-labels"><span>Eagles 62%</span><span>Cowboys 38%</span></div>
              </div>
            </div>
            <div className="disc-chart">
              <div className="disc-chart__row">
                <span className="disc-chart__rank">1</span>
                <div className="disc-chart__art" />
                <div className="disc-chart__song"><b>Golden Hour</b><span>Amara Reign</span></div>
              </div>
              <div className="disc-chart__row">
                <span className="disc-chart__rank">2</span>
                <div className="disc-chart__art" />
                <div className="disc-chart__song"><b>Still Yours</b><span>The Wildlight</span></div>
              </div>
            </div>
            <div className="disc-card">
              <div className="disc-card__img" />
              <div className="disc-card__body">
                <span className="disc-card__eyebrow">Now Streaming</span>
                <h3>Ted Lasso</h3>
                <p>New episode tonight — the whole season, ready when you are.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="md-feature md-feature--reverse">
          <div className="md-feature__copy">
            <span className="md-feature__eyebrow">Live Events</span>
            <h2>Tickets, the moment they matter.</h2>
            <p>Real Ticketmaster listings for concerts, festivals, and shows near you — see it, want it, get it, all without leaving Magical Moments.</p>
          </div>
          <div className="md-feature__visual">
            <div className="disc-card disc-card--event">
              <div className="disc-card__img" />
              <div className="disc-card__body">
                <span className="disc-badge">Concerts</span>
                <h3>Ed Sheeran — The Mathematics Tour</h3>
                <div className="disc-card__meta"><span>Aug 22 · 7:30 PM</span></div>
                <div className="disc-card__meta"><span>Amway Center, Orlando, FL</span></div>
                <span className="disc-card__cta">Get Tickets →</span>
              </div>
            </div>
          </div>
        </section>

        <section className="md-cta">
          <h2>Ready to make it real?</h2>
          <p>Everything you just saw is really inside your Magical Space. Create yours and start today.</p>
          <Link href="/signup" className="gs-g">Create Your Space →</Link>
        </section>
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
