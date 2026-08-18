import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAccount, isOwnerAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { getTodayStories, getWatchItems, getMovieItems, getMusicChart, getTrendingItems, getCuratedForYou } from "@/lib/discovery/service";
import { getMyTrackedPlayers } from "@/lib/discovery/sports/tracked-players";
import { sdioConfigured, sdioCommercialMode } from "@/lib/discovery/providers/sportsdata";
import type { NewsStory } from "@/lib/discovery/providers/news";
import type { MovieItem, WatchItem } from "@/lib/discovery/providers/tmdb";
import DiscoveryNav from "./_nav";
import "./discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Magical Discovery", robots: { index: false } };

type Feature = { label: string; title: string; description?: string; image?: string; href: string; external?: boolean; logo?: boolean };

function Artwork({ src, alt, sizes }: { src?: string; alt: string; sizes: string }) {
  return src ? <Image src={src} alt={alt} fill sizes={sizes} quality={90} className="disc-lux__image" /> : <div className="disc-lux__placeholder" aria-hidden="true">✦</div>;
}

// Image on top (fixed height, so it stays recognizable instead of being
// stretched to fill the card), title/description in a separate solid box
// below — never printed over the artwork. Team logos (`logo: true`, e.g. a
// Sports matchup) get a contained, padded treatment instead of a full-bleed
// photo crop — cropping a small logo into a wide box distorts it.
function FeatureCard({ item }: { item: Feature }) {
  const body = (
    <>
      <div className={`disc-dark__card-art${item.logo ? " disc-dark__card-art--logo" : ""}`}><Artwork src={item.image} alt={`${item.title} artwork`} sizes="(max-width: 700px) 86vw, (max-width: 1100px) 44vw, 20vw" /></div>
      <div className="disc-dark__card-body">
        <span className="disc-lux__label">{item.label}</span>
        <h2>{item.title}</h2>
        {item.description && <p>{item.description}</p>}
        <span className="disc-lux__explore">Explore <span aria-hidden="true">→</span></span>
      </div>
    </>
  );
  return item.external ? <a className="disc-dark__card" href={item.href} target="_blank" rel="noopener noreferrer">{body}</a> : <Link className="disc-dark__card" href={item.href}>{body}</Link>;
}

function SectionHeader({ title, subtitle, href, action }: { title: string; subtitle?: string; href: string; action: string }) {
  return <div className="disc-lux__section-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><Link href={href}>{action} <span aria-hidden="true">→</span></Link></div>;
}

function WatchCard({ item }: { item: WatchItem }) {
  return <Link className="disc-dark__card" href={`/dashboard/discovery/watch/${item.id}`}>
    <div className="disc-dark__card-art"><Artwork src={item.backdropUrl ?? item.posterUrl} alt={`${item.title} artwork`} sizes="(max-width: 700px) 86vw, 31vw" /></div>
    <div className="disc-dark__card-body"><span className="disc-lux__label">Watch</span><h3>{item.title}</h3>{item.firstAirDate && <p>{item.firstAirDate.slice(0, 4)}</p>}</div>
  </Link>;
}

function MovieCard({ item }: { item: MovieItem }) {
  return <Link className="disc-dark__card" href={`/dashboard/discovery/movies/${item.id}`}>
    <div className="disc-dark__card-art"><Artwork src={item.posterUrl ?? item.backdropUrl} alt={`${item.title} poster`} sizes="(max-width: 700px) 48vw, 18vw" /></div>
    <div className="disc-dark__card-body"><span className="disc-lux__label">Movie</span><h3>{item.title}</h3>{item.releaseDate && <p>{item.releaseDate.slice(0, 4)}</p>}</div>
  </Link>;
}

function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="disc-lux__empty"><span aria-hidden="true">✦</span><div><h3>{title}</h3><p>{children}</p></div></div>;
}

export default async function DiscoveryPage() {
  const account = await requireAccount("/dashboard/discovery");
  const primaryAddress = await prisma.customerAddress.findFirst({ where: { accountId: account.id, isPrimary: true }, select: { city: true, state: true } }).catch(() => null);
  const location = primaryAddress ? `${primaryAddress.city}, ${primaryAddress.state}` : undefined;

  // SportsDataIO is still on a free trial known to return scrambled values
  // for some fields — this widget stays owner-only until
  // SPORTSDATAIO_COMMERCIAL_DATA flips on. See sdioCommercialMode's doc
  // comment (lib/discovery/providers/sportsdata.ts).
  const showSdio = sdioConfigured() && (sdioCommercialMode() || await isOwnerAccount(account.id));

  const [today, watch, movies, music, trending, curated, trackedPlayers] = await Promise.all([
    getTodayStories("top"), getWatchItems("trending"), getMovieItems("now_playing"), getMusicChart("top"), getTrendingItems(), getCuratedForYou({ location }),
    showSdio ? getMyTrackedPlayers(account.id) : Promise.resolve([]),
  ]);

  const primary: Feature | undefined = watch.items[0] ? {
    label: "Featured Discovery", title: watch.items[0].title, description: watch.items[0].overview,
    image: watch.items[0].backdropUrl ?? watch.items[0].posterUrl, href: `/dashboard/discovery/watch/${watch.items[0].id}`,
  } : movies.items[0] ? {
    label: "Featured Discovery", title: movies.items[0].title, description: movies.items[0].overview,
    image: movies.items[0].backdropUrl ?? movies.items[0].posterUrl, href: `/dashboard/discovery/movies/${movies.items[0].id}`,
  } : today.items[0] ? {
    label: "Featured Discovery", title: today.items[0].headline, description: today.items[0].snippet,
    image: today.items[0].imageUrl, href: today.items[0].url, external: true,
  } : undefined;

  const curatedFeatures: Feature[] = curated.map((c) => ({ label: c.category, title: c.title, description: c.description, image: c.image, href: c.href, external: c.external, logo: c.category === "Sports" }));

  return <main className="disc disc-lux disc-dark">
    <DiscoveryNav active="/dashboard/discovery" />

    <header className="disc-dark__hero">
      {primary?.image && <Image src={primary.image} alt="" fill priority quality={90} sizes="(max-width: 800px) 100vw, 80vw" className="disc-dark__hero-image" />}
      <div className="disc-dark__hero-shade" />
      <div className="disc-dark__hero-copy">
        <span className="disc-lux__kicker">✦ &nbsp; Magical Discovery &nbsp; ✦</span>
        <h1>Discover Something<br /><em>Magical Today</em></h1>
        <p>A curated look at what&rsquo;s happening, what to watch, what to hear, where to go, and what&rsquo;s worth discovering.</p>
        <div className="disc-dark__hero-actions"><Link className="btn btn--gold" href={primary?.href ?? "/dashboard/discovery/trending"}>✦ &nbsp; Explore Now</Link><Link className="btn btn--ghost" href="/dashboard/discovery/trending">See What&rsquo;s Trending</Link></div>
      </div>
    </header>

    <nav className="disc-dark__category-bar" aria-label="Explore Discovery">
      <Link href="/dashboard/discovery/watch"><b>▣</b><span><strong>Watch</strong><small>Top shows &amp; streaming</small></span></Link>
      <Link href="/dashboard/discovery/movies"><b>▤</b><span><strong>Movies</strong><small>In theaters &amp; more</small></span></Link>
      <Link href="/dashboard/discovery/music"><b>♫</b><span><strong>Music</strong><small>Top songs &amp; albums</small></span></Link>
      <Link href="/dashboard/discovery/near-you"><b>✦</b><span><strong>Events</strong><small>Concerts &amp; experiences</small></span></Link>
      <Link href="/dashboard/discovery/sports"><b>◉</b><span><strong>Sports</strong><small>Live games &amp; scores</small></span></Link>
      <Link href="/dashboard/discovery/trending"><b>↗</b><span><strong>Trending</strong><small>What&rsquo;s hot now</small></span></Link>
    </nav>

    <section className="disc-lux__section">
      <SectionHeader title="Curated For You" subtitle="A little of everything, chosen for your day." href="/dashboard/discovery/trending" action="View All" />
      {curatedFeatures.length ? <div className="disc-lux__curated">{curatedFeatures.map((item) => <FeatureCard key={`${item.label}-${item.title}`} item={item} />)}</div> : <EmptyState title="Your edit is taking shape">Connected, real-time recommendations will appear here when available.</EmptyState>}
    </section>

    {trackedPlayers.length > 0 && (
      <section className="disc-lux__mini-section">
        {!sdioCommercialMode() && <div className="disc-admin-badge">Admin Preview — not shown to members</div>}
        <SectionHeader title="My Tracked Players" subtitle="Live status across every sport you follow." href="/dashboard/discovery/sports" action="Manage" />
        <div className="disc-lux__compact-list">
          {trackedPlayers.slice(0, 6).map((t) => (
            <Link key={t.id} href="/dashboard/discovery/sports">
              <div>
                <h3>{t.playerName}</h3>
                <p>{t.league.toUpperCase()} · {[t.position, t.team].filter(Boolean).join(" · ") || "Team unavailable"}{t.live?.status ? ` · ${t.live.status}` : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    )}

    <section className="disc-lux__section">
      <SectionHeader title="Watch Tonight" href="/dashboard/discovery/watch" action="Explore Watch" />
      {watch.items.length ? <div className="disc-lux__rail">{watch.items.slice(0, 6).map((item) => <WatchCard key={item.id} item={item} />)}</div> : <EmptyState title="The screen is waiting">Watch recommendations are currently unavailable. Please check back soon.</EmptyState>}
    </section>

    <section className="disc-lux__section">
      <SectionHeader title="Now in Theaters" href="/dashboard/discovery/movies" action="Explore Movies" />
      {movies.items.length ? <div className="disc-lux__movie-rail">{movies.items.slice(0, 6).map((item) => <MovieCard key={item.id} item={item} />)}</div> : <EmptyState title="The curtain will rise soon">Current theatrical releases are unavailable right now.</EmptyState>}
    </section>

    <div className="disc-lux__triptych">
      <section className="disc-lux__mini-section">
        <SectionHeader title="The Sound of Right Now" href="/dashboard/discovery/music" action="Explore Music" />
        {music.entries.length ? <div className="disc-lux__music">{music.entries.slice(0, 4).map((entry) => <div className="disc-lux__music-item" key={`${entry.rank}-${entry.song}`}><div className="disc-lux__music-art"><Artwork src={entry.artworkUrl} alt={`${entry.song} artwork`} sizes="90px" /></div><h3>{entry.song}</h3><p>{entry.artist}</p></div>)}</div> : <EmptyState title="Music is coming online">Your music edit will appear here when a legitimate music source is available.</EmptyState>}
      </section>
      <section className="disc-lux__mini-section disc-lux__near">
        <SectionHeader title="Worth Stepping Out For" href="/dashboard/discovery/near-you" action="Explore Near You" />
        <Link href={location ? `/dashboard/discovery/near-you?location=${encodeURIComponent(location)}` : "/dashboard/discovery/near-you"} className="disc-lux__near-entry">
          <span>Events &amp; experiences</span>
          <strong>{location ? `Discover what&rsquo;s happening in ${location}` : "Discover what is happening near you"}</strong>
          <small>{location ? "Based on the address on your account" : "Use your location to explore real listings"}</small>
        </Link>
      </section>
      <section className="disc-lux__mini-section"><SectionHeader title="Everyone&rsquo;s Talking About" href="/dashboard/discovery/trending" action="Explore Trending" />
        {trending.length ? <div className="disc-lux__compact-list">{trending.slice(0, 3).map((item) => { const content = <><div className="disc-lux__compact-art"><Artwork src={item.imageUrl ?? undefined} alt={`${item.title} artwork`} sizes="90px" /></div><div><h3>{item.title}</h3>{item.category && <p>{item.category}</p>}</div></>; return item.externalUrl ? <a key={item.id} href={item.externalUrl} target="_blank" rel="noopener noreferrer">{content}</a> : <Link key={item.id} href="/dashboard/discovery/trending">{content}</Link>; })}</div> : <EmptyState title="The conversation is quiet">Curated, verified trends will appear here when available.</EmptyState>}
      </section>
    </div>

    <section className="disc-lux__section disc-lux__news">
      <SectionHeader title="Worth Knowing Today" href="/dashboard/discovery/today" action="View All News" />
      {today.items.length ? <div className="disc-lux__news-grid">{today.items.slice(0, 3).map((story: NewsStory) => <a key={story.id} href={story.url} target="_blank" rel="noopener noreferrer"><div className="disc-lux__news-art"><Artwork src={story.imageUrl} alt={`Image for ${story.headline}`} sizes="180px" /></div><div><h3>{story.headline}</h3><p>{story.source}{story.publishedAt ? ` · ${new Date(story.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</p></div></a>)}</div> : <EmptyState title="Today&rsquo;s briefing is on its way">Live news is currently unavailable. No placeholder stories have been substituted.</EmptyState>}
    </section>
  </main>;
}
