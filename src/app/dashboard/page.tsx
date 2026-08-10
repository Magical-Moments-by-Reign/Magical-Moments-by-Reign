import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { Icon } from "@/components/dashboard/nav-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Magical Moments Hub", robots: { index: false } };

const OCCASIONS = [
  { title: "Paris Birthday Trip", kind: "Birthday · Travel", date: "September 18–24, 2026", status: "In Planning", image: "/gallery/italy/03.jpg", progress: 68 },
  { title: "Karlie’s Graduation", kind: "Graduation", date: "May 22, 2027", status: "In Planning", image: "/story/graduation.jpg", progress: 42 },
  { title: "Christmas in New York", kind: "Holiday · Travel", date: "December 20–27, 2026", status: "Upcoming", image: "/story/newhome.jpg", progress: 76 },
  { title: "Maldives Escape", kind: "Anniversary · Travel", date: "February 10–18, 2027", status: "Dreaming", image: "/story/vacation.jpg", progress: 24 },
];

const UPCOMING = [
  { month: "AUG", day: "14", title: "Paris hotel deposit", meta: "Paris Birthday Trip · Payment due" },
  { month: "AUG", day: "21", title: "Graduation photographer call", meta: "Karlie’s Graduation · 2:00 PM" },
  { month: "SEP", day: "03", title: "Review New York itinerary", meta: "Christmas in New York · Family planning" },
];

const ACTIVITY = [
  { icon: "documents", title: "Itinerary updated", meta: "Paris Birthday Trip · 2 hours ago" },
  { icon: "family", title: "James joined your occasion", meta: "Christmas in New York · Yesterday" },
  { icon: "moments", title: "12 memories added", meta: "Karlie’s Graduation · August 5" },
];

export default async function DashboardPage() {
  const account = await requireAccount("/dashboard");
  const first = account.firstName || "there";

  return (
    <div className="hub">
      <header className="hub-welcome">
        <div className="hub-welcome__copy"><span className="hub-kicker">YOUR MAGICAL MOMENTS HUB</span><h1>Welcome back, {first}</h1><p>Everything you&rsquo;re planning, celebrating, and preserving—beautifully together.</p><Link href="/dashboard/create" className="hub-primary"><span>＋</span> Create an Occasion</Link></div>
        <div className="hub-welcome__piano" role="img" aria-label="A white grand piano bearing the Magical Moments name in an elegant, sunlit room" />
      </header>

      <section className="hub-stats" aria-label="Occasion summary">
        {[
          ["events", "4", "Upcoming Occasions"], ["projects", "3", "In Planning"],
          ["moments", "12", "Completed"], ["family", "18", "People Involved"],
        ].map(([icon, value, label]) => <div className="hub-stat" key={label}><span className="hub-stat__icon"><Icon name={icon} /></span><span><b>{value}</b><small>{label}</small></span></div>)}
      </section>

      <section className="hub-section">
        <div className="hub-section__head"><div><span className="hub-kicker">CELEBRATE EVERY CHAPTER</span><h2>Your Magical Occasions</h2></div><Link href="/dashboard/journeys">View all occasions <span>→</span></Link></div>
        <div className="hub-occasions">
          {OCCASIONS.map((occasion) => (
            <Link className="hub-occasion" href="/dashboard/journeys" key={occasion.title}>
              <div className="hub-occasion__image" style={{ backgroundImage: `url('${occasion.image}')` }}><span>{occasion.status}</span></div>
              <div className="hub-occasion__body"><small>{occasion.kind}</small><h3>{occasion.title}</h3><p><Icon name="events" />{occasion.date}</p><div className="hub-progress"><span style={{ width: `${occasion.progress}%` }} /></div><em>{occasion.progress}% planned</em></div>
            </Link>
          ))}
          <Link href="/dashboard/create" className="hub-create"><span className="hub-create__plus">＋</span><h3>Create a Magical Occasion</h3><p>Begin planning a celebration, milestone, trip, or meaningful life moment.</p><b>GET STARTED <span>→</span></b></Link>
        </div>
      </section>

      <section className="hub-journey">
        <div className="hub-journey__mark"><Icon name="star" /></div><div className="hub-journey__copy"><span className="hub-kicker">YOUR PERSONAL JOURNEY ASSISTANT</span><h2>What shall we make magical today?</h2><p>I can help with ideas, timelines, checklists, invitations, travel details, and all the thoughtful touches in between.</p></div><button type="button" className="hub-secondary">Ask Journey <span>→</span></button>
      </section>

      <section className="hub-journey">
        <div className="hub-journey__mark"><Icon name="favorites" /></div><div className="hub-journey__copy"><span className="hub-kicker">A DAILY REASON TO RETURN</span><h2>Magical Discovery</h2><p>Today&rsquo;s headlines, what to watch, what&rsquo;s hot in music, and what&rsquo;s happening near you — curated, never overwhelming.</p></div><Link href="/dashboard/discovery" className="hub-secondary">Explore Discovery <span>→</span></Link>
      </section>

      <div className="hub-panels">
        <section className="hub-panel"><div className="hub-panel__head"><h2>Upcoming in the Next 30 Days</h2><Link href="/dashboard/journeys">View calendar</Link></div>{UPCOMING.map((item) => <div className="hub-upcoming" key={item.title}><span className="hub-date"><b>{item.month}</b><em>{item.day}</em></span><span><strong>{item.title}</strong><small>{item.meta}</small></span><i>›</i></div>)}</section>
        <section className="hub-panel"><div className="hub-panel__head"><h2>Recent Activity</h2><Link href="/notifications">View all</Link></div>{ACTIVITY.map((item) => <div className="hub-activity" key={item.title}><span><Icon name={item.icon} /></span><div><strong>{item.title}</strong><small>{item.meta}</small></div></div>)}</section>
      </div>

      <section className="hub-quick"><div><span className="hub-kicker">A LITTLE SHORTCUT</span><h2>Quick Add</h2></div><div className="hub-quick__links"><Link href="/dashboard/create"><Icon name="events" />New Occasion</Link><Link href="/dashboard/family-vault"><Icon name="family" />Add a Person</Link><Link href="/dashboard/vault"><Icon name="moments" />Add a Memory</Link><Link href="/dashboard/messages"><Icon name="messages" />Send a Message</Link></div></section>
    </div>
  );
}
