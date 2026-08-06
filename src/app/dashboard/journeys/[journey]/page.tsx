import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getWorld, getArea, WORKSPACE_TABS, WORLD_HERO } from "@/lib/journeys/worlds";
import JourneyActions from "@/components/journeys/JourneyActions";
import "@/components/journeys/journeys.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Journey", robots: { index: false } };

// Reusable Journey WORLD workspace. Explore-first: a member can wander the areas,
// look at ideas, and save inspiration without being pushed into dates, budgets,
// or forms. Selecting an area keeps every other area visible (dimmed, still
// clickable) and never deletes anything — switching is just navigation.
export default async function JourneyWorldPage({
  params, searchParams,
}: { params: Promise<{ journey: string }>; searchParams: Promise<{ area?: string; tab?: string }> }) {
  await requireAccount("/dashboard/journeys");
  const { journey } = await params;
  const { area: areaSlug, tab: tabId } = await searchParams;
  const world = getWorld(journey);
  if (!world) notFound();

  const area = getArea(world, areaSlug);
  const tab = WORKSPACE_TABS.find((t) => t.id === tabId) ?? WORKSPACE_TABS[0];
  const base = `/dashboard/journeys/${world.slug}`;

  return (
    <div className="jw">
      <p className="jw-back"><Link href="/dashboard/journeys">← All Journeys</Link></p>

      {/* Constant branded hero — same on every world; only the occasions change */}
      <section className="jw-heroimg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={WORLD_HERO} alt="Magical Moments by Reign" />
      </section>

      {/* Workspace tabs */}
      <nav className="jw-tabs" aria-label="Journey workspace">
        {WORKSPACE_TABS.map((t) => (
          <Link key={t.id} href={`${base}?${new URLSearchParams({ ...(areaSlug ? { area: areaSlug } : {}), tab: t.id })}`} className={`jw-tab${t.id === tab.id ? " is-on" : ""}`}>
            {t.label}{!t.live && <span className="jw-tab__soon">Soon</span>}
          </Link>
        ))}
      </nav>

      {tab.live ? (
        <>
          {/* Currently exploring + switch */}
          {area ? (
            <div className="jw-active-bar">
              <span className="jw-active-bar__label">Currently exploring: <b>{area.label}</b></span>
              <Link href={base} className="jw-change">Explore another {world.momentNoun}</Link>
            </div>
          ) : (
            <p className="jw-choose">Choose where to begin — or just browse. Everything stays saved as you look around.</p>
          )}

          {/* Sub-occasion selector: active stays full-colour, others dim but clickable */}
          <div className={`jw-areas${area ? " has-active" : ""}`}>
            {world.areas.map((ar) => {
              const active = area?.slug === ar.slug;
              return (
                <Link
                  key={ar.slug}
                  href={`${base}?area=${ar.slug}`}
                  className={`jw-area${active ? " is-active" : ""}${area && !active ? " is-dim" : ""}`}
                  style={ar.image ? { backgroundImage: `linear-gradient(180deg, rgba(28,19,12,.12), rgba(28,19,12,.8)), url(${ar.image})` } : undefined}
                  data-plain={ar.image ? undefined : ""}
                >
                  {active && <span className="jw-area__active">Active</span>}
                  <span className="jw-area__title">{ar.label}</span>
                  {ar.tagline && <span className="jw-area__tag">{ar.tagline}</span>}
                </Link>
              );
            })}
          </div>

          {/* Area detail — idea-first */}
          {area && (
            <section className="jw-detail">
              <h2 className="jw-detail__t">Explore {area.label}</h2>
              <p className="jw-detail__s">{area.tagline || "Browse ideas and save the ones that feel like you."}</p>

              {area.ideas?.length ? (
                <div className="jw-ideas">
                  {area.ideas.map((idea) => <span key={idea} className="jw-idea">{idea}</span>)}
                </div>
              ) : (
                <p className="note">Curated ideas for {area.label} are being gathered. In the meantime, ask Journey or your Concierge for inspiration below.</p>
              )}

              <div className="jw-gallery">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="jw-gallery__tile" style={area.image ? { backgroundImage: `linear-gradient(180deg, rgba(28,19,12,.1), rgba(28,19,12,.5)), url(${area.image})` } : undefined}>
                    <span className="jw-gallery__soon">Inspiration Gallery · Coming Soon</span>
                  </div>
                ))}
              </div>

              <JourneyActions worldLabel={world.label} areaLabel={area.label} />
            </section>
          )}
        </>
      ) : (
        <div className="jw-soon">
          <h2>{tab.label}</h2>
          <p className="note">{tab.label} for your {world.label} Journey is coming soon. Your saved ideas, boards, plans, memories, vendors, and deliveries will live here — nothing is a placeholder for something we haven&rsquo;t built. For now, explore ideas and ask Journey or your Concierge for help.</p>
          <Link href={`${base}`} className="btn btn--gold">Back to Explore</Link>
        </div>
      )}
    </div>
  );
}
