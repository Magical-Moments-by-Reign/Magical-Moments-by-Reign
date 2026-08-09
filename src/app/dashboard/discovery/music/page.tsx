import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getMusicChart } from "@/lib/discovery/service";
import type { MusicGenre } from "@/lib/discovery/providers/music";
import DiscoveryNav from "../_nav";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Music — Magical Discovery", robots: { index: false } };

const GENRES: { id: MusicGenre; label: string }[] = [
  { id: "top", label: "Top Songs" }, { id: "rnb", label: "R&B" }, { id: "hip-hop", label: "Hip-Hop/Rap" },
  { id: "pop", label: "Pop" }, { id: "country", label: "Country" }, { id: "gospel", label: "Gospel" },
  { id: "afrobeats", label: "Afrobeats" },
];

export default async function MusicPage({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  await requireAccount("/dashboard/discovery/music");
  const { genre: raw } = await searchParams;
  const genre = (GENRES.some((g) => g.id === raw) ? raw : "top") as MusicGenre;
  const chart = await getMusicChart(genre);

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Music — Top Songs &amp; Charts</h1>
        <p className="pg-sub">What&rsquo;s hot in music today, by genre.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/music" />

      <div className="disc-filters">
        {GENRES.map((g) => (
          <a key={g.id} href={`/dashboard/discovery/music?genre=${g.id}`} aria-current={genre === g.id ? "true" : undefined}>{g.label}</a>
        ))}
      </div>

      {chart.entries.length ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".8rem" }}>
            <h2 style={{ fontFamily: "var(--font-display, Georgia, serif)", color: "var(--espresso)", fontSize: "1.1rem", margin: 0 }}>{chart.chartTitle}</h2>
            <span className={`disc-badge ${chart.isOfficial ? "disc-badge--live" : "disc-badge--manual"}`}>
              {chart.isOfficial ? "Official Chart" : "Magical Moments Chart"}
            </span>
          </div>
          <div className="disc-chart">
            {chart.entries.map((e) => (
              <div className="disc-chart__row" key={e.rank}>
                <span className="disc-chart__rank">{e.rank}</span>
                <div className="disc-chart__art" style={e.artworkUrl ? { backgroundImage: `url(${e.artworkUrl})` } : undefined} />
                <div className="disc-chart__song"><b>{e.song}</b><span>{e.artist}</span></div>
                {e.listenUrl && <a className="btn btn--sm btn--ghost" href={e.listenUrl} target="_blank" rel="noopener noreferrer">Listen →</a>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="disc-pending">
          <b>No chart connected yet.</b>
          Once a music chart provider is configured this genre will update automatically — or the Owner can feature a Magical Moments Chart from the Discovery Content Center.
        </div>
      )}
    </div>
  );
}
