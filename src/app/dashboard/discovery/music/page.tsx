import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getMusicChart } from "@/lib/discovery/service";
import type { MusicGenre } from "@/lib/discovery/providers/music";
import { appleMusicConfigured } from "@/lib/apple-music/token";
import { searchCatalog as searchAppleMusicCatalog } from "@/lib/apple-music/catalog";
import { getAlbumsAndPlaylistsCharts } from "@/lib/apple-music/charts";
import DiscoveryNav from "../_nav";
import { AppleMusicKitProvider } from "@/components/apple-music/AppleMusicKitProvider";
import ConnectAppleMusicButton from "@/components/apple-music/ConnectAppleMusicButton";
import PlaySongButton from "@/components/apple-music/PlaySongButton";
import NowPlayingBar from "@/components/apple-music/NowPlayingBar";
import AppleMusicBrowse from "@/components/apple-music/AppleMusicBrowse";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Music — Magical Discovery", robots: { index: false } };

const GENRES: { id: MusicGenre; label: string }[] = [
  { id: "top", label: "Top Songs" }, { id: "rnb", label: "R&B" }, { id: "hip-hop", label: "Hip-Hop/Rap" },
  { id: "pop", label: "Pop" }, { id: "country", label: "Country" }, { id: "gospel", label: "Gospel" },
  { id: "afrobeats", label: "Afrobeats" },
];

export default async function MusicPage({ searchParams }: { searchParams: Promise<{ genre?: string; q?: string }> }) {
  await requireAccount("/dashboard/discovery/music");
  const { genre: raw, q } = await searchParams;
  const genre = (GENRES.some((g) => g.id === raw) ? raw : "top") as MusicGenre;
  const chart = await getMusicChart(genre);
  const query = q?.trim() ?? "";

  const appleConfigured = appleMusicConfigured();
  const appleResults = appleConfigured && query ? await searchAppleMusicCatalog(query) : null;
  const featuredCharts = appleConfigured && !query ? await getAlbumsAndPlaylistsCharts() : null;

  return (
    <AppleMusicKitProvider>
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Music — Top Songs &amp; Charts</h1>
        <p className="pg-sub">What&rsquo;s hot in music today, by genre.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/music" />

      <div className="disc-section">
        <div className="disc-music__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="Magical Moments by Reign" width={34} height={34} />
          <div>
            <h2>Search the Catalog</h2>
            <p>Search artists, albums, and tracks — right inside Magical Moments.</p>
          </div>
        </div>

        {appleConfigured && (
          <div className="disc-music__search-row">
            <form className="disc-form disc-form--compact" method="get">
              <input type="hidden" name="genre" value={genre} />
              <input type="text" name="q" placeholder="Search artists, albums, or tracks" defaultValue={query} aria-label="Search Apple Music" />
              <button type="submit" className="btn btn--gold">Search</button>
            </form>
          </div>
        )}

        {appleConfigured ? (
          <>
            {query && <ConnectAppleMusicButton />}

            {!query && (
              <AppleMusicBrowse
                topSongsTitle={chart.chartTitle}
                topSongs={chart.entries}
                albumsTitle={featuredCharts?.albumsTitle ?? "New Releases"}
                albums={featuredCharts?.albums ?? []}
                playlistsTitle={featuredCharts?.playlistsTitle ?? "Playlists For You"}
                playlists={featuredCharts?.playlists ?? []}
                genre={genre}
                genres={GENRES}
              />
            )}

            {query && !appleResults && <p className="disc-empty">Apple Music is temporarily unavailable. Please try again shortly.</p>}

            {appleResults && (
              <>
                {appleResults.artists.length === 0 && appleResults.albums.length === 0 && appleResults.songs.length === 0 && (
                  <p className="disc-empty">No Apple Music results for &ldquo;{query}&rdquo;.</p>
                )}
                {appleResults.artists.length > 0 && (
                  <>
                    <h3 style={{ fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)", margin: "1rem 0 .6rem" }}>Artists</h3>
                    <div className="disc-grid">
                      {appleResults.artists.map((a) => {
                        const body = <>
                          <div className="disc-card__img" style={a.artworkUrl ? { backgroundImage: `url(${a.artworkUrl})` } : undefined} />
                          <div className="disc-card__body"><span className="disc-card__eyebrow">Apple Music</span><h3>{a.name}</h3>{a.url && <p className="disc-card__cta">Open in Apple Music →</p>}</div>
                        </>;
                        return a.url
                          ? <a key={a.id} className="disc-card" href={a.url} target="_blank" rel="noopener noreferrer">{body}</a>
                          : <div key={a.id} className="disc-card">{body}</div>;
                      })}
                    </div>
                  </>
                )}
                {appleResults.albums.length > 0 && (
                  <>
                    <h3 style={{ fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)", margin: "1rem 0 .6rem" }}>Albums</h3>
                    <div className="disc-grid">
                      {appleResults.albums.map((a) => {
                        const body = <>
                          <div className="disc-card__img" style={a.artworkUrl ? { backgroundImage: `url(${a.artworkUrl})` } : undefined} />
                          <div className="disc-card__body"><span className="disc-card__eyebrow">Apple Music</span><h3>{a.name}</h3><p>{a.artistName}</p>{a.url && <p className="disc-card__cta">Open in Apple Music →</p>}</div>
                        </>;
                        return a.url
                          ? <a key={a.id} className="disc-card" href={a.url} target="_blank" rel="noopener noreferrer">{body}</a>
                          : <div key={a.id} className="disc-card">{body}</div>;
                      })}
                    </div>
                  </>
                )}
                {appleResults.songs.length > 0 && (
                  <>
                    <h3 style={{ fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)", margin: "1rem 0 .6rem" }}>Tracks</h3>
                    <div className="disc-chart">
                      {appleResults.songs.map((t) => (
                        <div className="disc-chart__row" key={t.id}>
                          <div className="disc-chart__art" style={t.artworkUrl ? { backgroundImage: `url(${t.artworkUrl})` } : undefined} />
                          <div className="disc-chart__song"><b>{t.name}</b><span>{t.artistName}{t.albumName ? ` · ${t.albumName}` : ""}</span></div>
                          <PlaySongButton song={{ id: t.id, name: t.name, artistName: t.artistName, albumName: t.albumName, artworkUrl: t.artworkUrl, previewUrl: t.previewUrl }} />
                          {t.url && <a className="btn btn--sm btn--ghost" href={t.url} target="_blank" rel="noopener noreferrer">Open in Apple Music →</a>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <p className="disc-empty" style={{ marginTop: ".8rem" }}>Artwork and results provided by Apple Music. Playback happens in Apple Music, not inside Magical Moments.</p>
              </>
            )}
          </>
        ) : (
          <p className="disc-empty">Apple Music search isn&rsquo;t connected yet.</p>
        )}
      </div>
    </div>
    <NowPlayingBar />
    </AppleMusicKitProvider>
  );
}
