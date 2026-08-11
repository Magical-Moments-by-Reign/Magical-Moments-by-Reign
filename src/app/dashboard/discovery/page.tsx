import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getTodayStories, getWatchItems, getMovieItems, getMusicChart, getTrendingItems } from "@/lib/discovery/service";
import type { NewsStory } from "@/lib/discovery/providers/news";
import type { MovieItem, WatchItem } from "@/lib/discovery/providers/tmdb";
import DiscoveryNav from "./_nav";
import "./discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Magical Discovery", robots: { index: false } };

type Feature = { label: string; title: string; description?: string; image?: string; href: string; external?: boolean };

function Artwork({ src, alt, sizes }: { src?: string; alt: string; sizes: string }) {
  return src ? <Image src={src} alt={alt} fill sizes={sizes} className="disc-lux__image" /> : <div className="disc-lux__placeholder" aria-hidden="true">✦</div>;
}

function FeatureCard({ item, large = false }: { item: Feature; large?: boolean }) {
  const body = (
    <>
      <Artwork src={item.image} alt={`${item.title} artwork`} sizes={large ? "(max-width: 800px) 100vw, 55vw" : "(max-width: 800px) 100vw, 30vw"} />
      <div className="disc-lux__shade" />
      <div className="disc-lux__feature-copy">
        <span className="disc-lux__label">{item.label}</span>
        <h2>{item.title}</h2>
        {large && item.description && <p>{item.description}</p>}
        <span className="disc-lux__explore">Explore <span aria-hidden="true">→</span></span>
      </div>
    </>
  );
  const classes = `disc-lux__feature${large ? " disc-lux__feature--large" : ""}`;
  return item.external ? <a className={classes} href={item.href} target="_blank" rel="noopener noreferrer">{body}</a> : <Link className={classes} href={item.href}>{body}</Link>;
}

function SectionHeader({ title, subtitle, href, action }: { title: string; subtitle?: string; href: string; action: string }) {
  return <div className="disc-lux__section-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><Link href={href}>{action} <span aria-hidden="true">→</span></Link></div>;
}

function WatchCard({ item }: { item: WatchItem }) {
  return <Link className="disc-lux__landscape" href={`/dashboard/discovery/watch/${item.id}`}>
    <Artwork src={item.backdropUrl ?? item.posterUrl} alt={`${item.title} artwork`} sizes="(max-width: 700px) 78vw, 24vw" />
    <div className="disc-lux__shade" /><div className="disc-lux__overlay-copy"><h3>{item.title}</h3>{item.firstAirDate && <span>{item.firstAirDate.slice(0, 4)}</span>}</div>
  </Link>;
}

function MovieCard({ item }: { item: MovieItem }) {
  return <Link className="disc-lux__portrait" href={`/dashboard/discovery/movies/${item.id}`}>
    <div className="disc-lux__portrait-art"><Artwork src={item.posterUrl ?? item.backdropUrl} alt={`${item.title} poster`} sizes="(max-width: 700px) 48vw, 18vw" /><div className="disc-lux__shade" /></div>
    <div className="disc-lux__portrait-copy"><h3>{item.title}</h3>{item.releaseDate && <span>{item.releaseDate.slice(0, 4)}</span>}</div>
  </Link>;
}

function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="disc-lux__empty"><span aria-hidden="true">✦</span><div><h3>{title}</h3><p>{children}</p></div></div>;
}

export default async function DiscoveryPage() {
  await requireAccount("/dashboard/discovery");
  const [today, watch, movies, music, trending] = await Promise.all([
    getTodayStories("top"), getWatchItems("trending"), getMovieItems("now_playing"), getMusicChart("top"), getTrendingItems(),
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
  const secondary: Feature[] = [
    watch.items[1] && { label: "Tonight's Watch", title: watch.items[1].title, image: watch.items[1].backdropUrl ?? watch.items[1].posterUrl, href: `/dashboard/discovery/watch/${watch.items[1].id}` },
    trending[0] && { label: "Trending Now", title: trending[0].title, description: trending[0].description ?? undefined, image: trending[0].imageUrl ?? undefined, href: trending[0].externalUrl ?? "/dashboard/discovery/trending", external: Boolean(trending[0].externalUrl) },
  ].filter(Boolean) as Feature[];

  const curated: Feature[] = [
    watch.items[2] && { label: "Watch", title: watch.items[2].title, description: watch.items[2].overview, image: watch.items[2].backdropUrl ?? watch.items[2].posterUrl, href: `/dashboard/discovery/watch/${watch.items[2].id}` },
    movies.items[1] && { label: "Movie", title: movies.items[1].title, description: movies.items[1].overview, image: movies.items[1].backdropUrl ?? movies.items[1].posterUrl, href: `/dashboard/discovery/movies/${movies.items[1].id}` },
    trending[1] && { label: "Trending", title: trending[1].title, description: trending[1].description ?? undefined, image: trending[1].imageUrl ?? undefined, href: trending[1].externalUrl ?? "/dashboard/discovery/trending", external: Boolean(trending[1].externalUrl) },
    today.items[1] && { label: "Today", title: today.items[1].headline, description: today.items[1].snippet, image: today.items[1].imageUrl, href: today.items[1].url, external: true },
  ].filter(Boolean) as Feature[];

  return <main className="disc disc-lux">
    <header className="disc-lux__intro">
      <span className="disc-lux__kicker">Magical Discovery</span>
      <h1>Discover Something<br />Magical Today <em aria-hidden="true">✦</em></h1>
      <p>A curated look at what&rsquo;s happening, what to watch, what to hear, where to go, and what&rsquo;s worth discovering.</p>
    </header>

    {primary ? <section className="disc-lux__hero" aria-label="Featured discoveries">
      <FeatureCard item={primary} large />
      <div className="disc-lux__hero-side">
        {secondary.map((item) => <FeatureCard key={`${item.label}-${item.title}`} item={item} />)}
        {secondary.length < 2 && <div className="disc-lux__feature disc-lux__feature--quiet"><span>More discoveries are being curated.</span></div>}
      </div>
    </section> : <EmptyState title="Today’s edit is being curated">Real discoveries will appear here as soon as the connected providers return them.</EmptyState>}

    <DiscoveryNav active="" />

    <section className="disc-lux__section">
      <SectionHeader title="Curated For You" subtitle="A little of everything, chosen for your day." href="/dashboard/discovery/trending" action="View All" />
      {curated.length ? <div className="disc-lux__curated">{curated.map((item) => <FeatureCard key={`${item.label}-${item.title}`} item={item} />)}</div> : <EmptyState title="Your edit is taking shape">Connected, real-time recommendations will appear here when available.</EmptyState>}
    </section>

    <section className="disc-lux__section">
      <SectionHeader title="Watch Tonight" href="/dashboard/discovery/watch" action="Explore Watch" />
      {watch.items.length ? <div className="disc-lux__rail">{watch.items.slice(0, 6).map((item) => <WatchCard key={item.id} item={item} />)}</div> : <EmptyState title="The screen is waiting">Watch recommendations are currently unavailable. Please check back soon.</EmptyState>}
    </section>

    <section className="disc-lux__section">
      <SectionHeader title="Now in Theaters" href="/dashboard/discovery/movies" action="Explore Movies" />
      {movies.items.length ? <div className="disc-lux__movie-rail">{movies.items.slice(0, 6).map((item) => <MovieCard key={item.id} item={item} />)}</div> : <EmptyState title="The curtain will rise soon">Current theatrical releases are unavailable right now.</EmptyState>}
    </section>

    <div className="disc-lux__triptych">
      <section className="disc-lux__mini-section"><SectionHeader title="The Sound of Right Now" href="/dashboard/discovery/music" action="Explore Music" />
        {music.entries.length ? <div className="disc-lux__music">{music.entries.slice(0, 4).map((entry) => <div className="disc-lux__music-item" key={`${entry.rank}-${entry.song}`}><div className="disc-lux__music-art"><Artwork src={entry.artworkUrl} alt={`${entry.song} artwork`} sizes="90px" /></div><h3>{entry.song}</h3><p>{entry.artist}</p></div>)}</div> : <EmptyState title="Music is coming online">Your music edit will appear here when a legitimate music source is available.</EmptyState>}
      </section>
      <section className="disc-lux__mini-section"><SectionHeader title="Worth Stepping Out For" href="/dashboard/discovery/near-you" action="Explore Near You" /><EmptyState title="Where should we look?">Share your city in Near You to discover real concerts, festivals, and experiences nearby.</EmptyState></section>
      <section className="disc-lux__mini-section"><SectionHeader title="Everyone’s Talking About" href="/dashboard/discovery/trending" action="Explore Trending" />
        {trending.length ? <div className="disc-lux__compact-list">{trending.slice(0, 3).map((item) => { const content = <><div className="disc-lux__compact-art"><Artwork src={item.imageUrl ?? undefined} alt={`${item.title} artwork`} sizes="90px" /></div><div><h3>{item.title}</h3>{item.category && <p>{item.category}</p>}</div></>; return item.externalUrl ? <a key={item.id} href={item.externalUrl} target="_blank" rel="noopener noreferrer">{content}</a> : <Link key={item.id} href="/dashboard/discovery/trending">{content}</Link>; })}</div> : <EmptyState title="The conversation is quiet">Curated, verified trends will appear here when available.</EmptyState>}
      </section>
    </div>

    <section className="disc-lux__section disc-lux__news">
      <SectionHeader title="Worth Knowing Today" href="/dashboard/discovery/today" action="View All News" />
      {today.items.length ? <div className="disc-lux__news-grid">{today.items.slice(0, 3).map((story: NewsStory) => <a key={story.id} href={story.url} target="_blank" rel="noopener noreferrer"><div className="disc-lux__news-art"><Artwork src={story.imageUrl} alt={`Image for ${story.headline}`} sizes="180px" /></div><div><h3>{story.headline}</h3><p>{story.source}{story.publishedAt ? ` · ${new Date(story.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</p></div></a>)}</div> : <EmptyState title="Today’s briefing is on its way">Live news is currently unavailable. No placeholder stories have been substituted.</EmptyState>}
    </section>
  </main>;
}
