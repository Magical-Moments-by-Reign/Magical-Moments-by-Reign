import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getMusicChart } from "@/lib/discovery/service";
import type { MusicGenre } from "@/lib/discovery/providers/music";
import { getConnectionView, getValidAccessToken } from "@/lib/spotify/connection";
import { searchCatalog as searchSpotifyCatalog } from "@/lib/spotify/catalog";
import { appleMusicConfigured } from "@/lib/apple-music/token";
import { searchCatalog as searchAppleMusicCatalog } from "@/lib/apple-music/catalog";
import { getAlbumsAndPlaylistsCharts } from "@/lib/apple-music/charts";
import { disconnectSpotifyAction } from "./actions";
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

type MusicSource = "apple_music" | "spotify";
const SOURCES: { id: MusicSource; label: string }[] = [
  { id: "apple_music", label: "Apple Music" },
  { id: "spotify", label: "Spotify" },
];

const SPOTIFY_STATUS_MESSAGES: Record<string, string> = {
  connected: "Spotify connected.",
  denied: "Spotify connection was cancelled.",
  invalid_state: "Spotify connection failed a security check — please try connecting again.",
  exchange_failed: "Spotify couldn’t confirm the connection — please try again.",
  profile_failed: "Connected to Spotify, but couldn’t read the profile — please try again.",
  not_configured: "Spotify isn’t configured yet.",
  save_failed: "Spotify is temporarily unavailable — please try connecting again in a moment.",
  configuration_error: "Spotify is temporarily unavailable — please try connecting again in a moment.",
};

export default async function MusicPage({ searchParams }: { searchParams: Promise<{ genre?: string; spotify?: string; q?: string; source?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/music");
  const { genre: raw, spotify: spotifyStatus, q, source: rawSource } = await searchParams;
  const genre = (GENRES.some((g) => g.id === raw) ? raw : "top") as MusicGenre;
  const chart = await getMusicChart(genre);
  const source = (SOURCES.some((s) => s.id === rawSource) ? rawSource : "apple_music") as MusicSource;

  const spotify = await getConnectionView(account.id);
  const query = q?.trim() ?? "";

  const spotifyAccessToken = source === "spotify" && spotify.connected && query ? await getValidAccessToken(account.id) : null;
  const spotifyResults = spotifyAccessToken ? await searchSpotifyCatalog(spotifyAccessToken, query) : null;

  const appleConfigured = appleMusicConfigured();
  const appleResults = source === "apple_music" && appleConfigured && query ? await searchAppleMusicCatalog(query) : null;
  const featuredCharts = source === "apple_music" && appleConfigured && !query ? await getAlbumsAndPlaylistsCharts() : null;

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
            <p>Apple Music and Spotify, both inside Magical Moments.</p>
          </div>
        </div>

        <div className="disc-filters" role="group" aria-label="Choose a music provider">
          {SOURCES.map((s) => (
            <a key={s.id} href={`/dashboard/discovery/music?genre=${genre}&source=${s.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`} aria-current={source === s.id ? "true" : undefined}>{s.label}</a>
          ))}
        </div>

        {source === "apple_music" && (
          <>
            {appleConfigured ? (
              <>
                <form className="disc-form" method="get">
                  <input type="hidden" name="genre" value={genre} />
                  <input type="hidden" name="source" value="apple_music" />
                  <input type="text" name="q" placeholder="Search artists, albums, or tracks" defaultValue={query} aria-label="Search Apple Music" />
                  <button type="submit" className="btn btn--gold">Search</button>
                </form>

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
          </>
        )}

        {source === "spotify" && spotify.connected && (
          <>
            <form className="disc-form" method="get">
              <input type="hidden" name="genre" value={genre} />
              <input type="hidden" name="source" value="spotify" />
              <input type="text" name="q" placeholder="Search artists, albums, or tracks" defaultValue={query} aria-label="Search Spotify" />
              <button type="submit" className="btn btn--gold">Search</button>
            </form>

            {query && !spotifyResults && <p className="disc-empty">Spotify search is temporarily unavailable — please try again.</p>}

            {spotifyResults && (
              <>
                {spotifyResults.artists.length === 0 && spotifyResults.albums.length === 0 && spotifyResults.tracks.length === 0 && (
                  <p className="disc-empty">No Spotify results for &ldquo;{query}&rdquo;.</p>
                )}
                {spotifyResults.artists.length > 0 && (
                  <>
                    <h3 style={{ fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)", margin: "1rem 0 .6rem" }}>Artists</h3>
                    <div className="disc-grid">
                      {spotifyResults.artists.map((a) => (
                        <a key={a.id} className="disc-card" href={a.externalUrl} target="_blank" rel="noopener noreferrer">
                          <div className="disc-card__img" style={a.imageUrl ? { backgroundImage: `url(${a.imageUrl})` } : undefined} />
                          <div className="disc-card__body"><span className="disc-card__eyebrow">Spotify</span><h3>{a.name}</h3><p className="disc-card__cta">Open in Spotify →</p></div>
                        </a>
                      ))}
                    </div>
                  </>
                )}
                {spotifyResults.albums.length > 0 && (
                  <>
                    <h3 style={{ fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)", margin: "1rem 0 .6rem" }}>Albums</h3>
                    <div className="disc-grid">
                      {spotifyResults.albums.map((a) => (
                        <a key={a.id} className="disc-card" href={a.externalUrl} target="_blank" rel="noopener noreferrer">
                          <div className="disc-card__img" style={a.imageUrl ? { backgroundImage: `url(${a.imageUrl})` } : undefined} />
                          <div className="disc-card__body"><span className="disc-card__eyebrow">Spotify</span><h3>{a.name}</h3><p>{a.artistNames}</p></div>
                        </a>
                      ))}
                    </div>
                  </>
                )}
                {spotifyResults.tracks.length > 0 && (
                  <>
                    <h3 style={{ fontSize: ".85rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-soft)", margin: "1rem 0 .6rem" }}>Tracks</h3>
                    <div className="disc-chart">
                      {spotifyResults.tracks.map((t) => (
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
          </>
        )}

        {source === "spotify" && !spotify.connected && (
          <p className="disc-empty">Connect Spotify below to search artists, albums, and tracks.</p>
        )}
      </div>

      {spotifyStatus && SPOTIFY_STATUS_MESSAGES[spotifyStatus] && (
        <div className={`disc-pending`} style={{ marginBottom: "1.4rem" }}>
          <b>{SPOTIFY_STATUS_MESSAGES[spotifyStatus]}</b>
        </div>
      )}

      <div className="disc-connect" style={{ marginBottom: "1.4rem" }}>
        <div>
          <h2>Spotify</h2>
          <p>{spotify.connected ? `Connected as ${spotify.displayName ?? "your Spotify account"}.` : "Connect your Spotify account to search artists, albums, and tracks, and to personalize Magical Discovery Music."}</p>
        </div>
        {spotify.connected ? (
          <form action={disconnectSpotifyAction}>
            <button type="submit" className="btn btn--sm btn--warn">Disconnect Spotify</button>
          </form>
        ) : (
          <a href="/api/spotify/authorize" className="btn btn--sm btn--gold">Connect Spotify</a>
        )}
      </div>

      {source === "spotify" && (
        <>
          <div className="disc-filters">
            {GENRES.map((g) => (
              <a key={g.id} href={`/dashboard/discovery/music?genre=${g.id}&source=spotify`} aria-current={genre === g.id ? "true" : undefined}>{g.label}</a>
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
        </>
      )}
    </div>
    <NowPlayingBar />
    </AppleMusicKitProvider>
  );
}
