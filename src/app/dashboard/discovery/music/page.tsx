import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getMusicChart } from "@/lib/discovery/service";
import type { MusicGenre } from "@/lib/discovery/providers/music";
import { appleMusicConfigured } from "@/lib/apple-music/token";
import { searchCatalog as searchAppleMusicCatalog } from "@/lib/apple-music/catalog";
import { getAlbumsAndPlaylistsCharts } from "@/lib/apple-music/charts";
import DiscoveryNav from "../_nav";
import { DiscoveryEmptyState, DiscoveryPageHeader } from "../_components";
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
  const accessToken = spotify.connected && query ? await getValidAccessToken(account.id) : null;
  const searchResults = accessToken ? await searchCatalog(accessToken, query) : null;
  const spotifyStatusMessage = spotifyStatus ? SPOTIFY_STATUS_MESSAGES[spotifyStatus] : undefined;

  const appleConfigured = appleMusicConfigured();
  const appleResults = appleConfigured && query ? await searchAppleMusicCatalog(query) : null;
  const featuredCharts = appleConfigured && !query ? await getAlbumsAndPlaylistsCharts() : null;

  return (
    <AppleMusicKitProvider>
    <div className="disc">
      <DiscoveryPageHeader title="Music" description={<>What&rsquo;s hot in music today — charts, artists, albums, and tracks by genre.</>} />
      <DiscoveryNav active="/dashboard/discovery/music" />

      <div className="disc-filters">
        {GENRES.map((g) => (
          <a key={g.id} href={`/dashboard/discovery/music?genre=${g.id}`} aria-current={genre === g.id ? "true" : undefined}>{g.label}</a>
        ))}
      </div>

      {spotifyStatusMessage && (
      {spotifyStatus && SPOTIFY_STATUS_MESSAGES[spotifyStatus] && (
        <div className={`disc-pending`} style={{ marginBottom: "1.4rem" }}>
          <b>{spotifyStatusMessage}</b>
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

          {searchResults && (
            <>
              {searchResults.artists.length === 0 && searchResults.albums.length === 0 && searchResults.tracks.length === 0 && (
                <p className="disc-empty">No Spotify results for &ldquo;{query}&rdquo;.</p>
              )}
              {searchResults.artists.length > 0 && (
                <>
                  <h3 style={{ fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)", margin: "1rem 0 .6rem" }}>Artists</h3>
                  <div className="disc-grid">
                    {searchResults.artists.map((a) => (
                      <a key={a.id} className="disc-card disc-card--square" href={a.externalUrl} target="_blank" rel="noopener noreferrer">
                        <div className="disc-card__img" style={a.imageUrl ? { backgroundImage: `url(${a.imageUrl})` } : undefined} />
                        <div className="disc-card__body"><h3>{a.name}</h3><p>Open in Spotify →</p></div>
                      </a>
                    ))}
                  </div>
                </>
              )}
              {searchResults.albums.length > 0 && (
                <>
                  <h3 style={{ fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)", margin: "1rem 0 .6rem" }}>Albums</h3>
                  <div className="disc-grid">
                    {searchResults.albums.map((a) => (
                      <a key={a.id} className="disc-card disc-card--square" href={a.externalUrl} target="_blank" rel="noopener noreferrer">
                        <div className="disc-card__img" style={a.imageUrl ? { backgroundImage: `url(${a.imageUrl})` } : undefined} />
                        <div className="disc-card__body"><h3>{a.name}</h3><p>{a.artistNames}</p></div>
                      </a>
                    ))}
                  </div>
                </>
              )}
              {searchResults.tracks.length > 0 && (
                <>
                  <h3 style={{ fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)", margin: "1rem 0 .6rem" }}>Tracks</h3>
                  <div className="disc-chart">
                    {searchResults.tracks.map((t) => (
                      <div className="disc-chart__row" key={t.id}>
                        <div className="disc-chart__art" style={t.imageUrl ? { backgroundImage: `url(${t.imageUrl})` } : undefined} />
                        <div className="disc-chart__song"><b>{t.name}</b><span>{t.artistNames} · {t.albumName}</span></div>
                        <a className="btn btn--sm btn--ghost" href={t.externalUrl} target="_blank" rel="noopener noreferrer">Open in Spotify →</a>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <p className="disc-empty" style={{ marginTop: ".8rem" }}>Artwork and results provided by Spotify. Playback happens in Spotify, not inside Magical Moments.</p>
            </>
          )}
        </div>
      )}

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
        <DiscoveryEmptyState title="No chart connected yet.">Once a music chart provider is configured this genre will update automatically — or the Owner can feature a Magical Moments Chart from the Discovery Content Center.</DiscoveryEmptyState>
      )}
    </div>
    <NowPlayingBar />
    </AppleMusicKitProvider>
  );
}
