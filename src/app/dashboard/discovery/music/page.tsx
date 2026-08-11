import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { getMusicChart } from "@/lib/discovery/service";
import type { MusicGenre } from "@/lib/discovery/providers/music";
import { getConnectionView, getValidAccessToken } from "@/lib/spotify/connection";
import { searchCatalog } from "@/lib/spotify/catalog";
import { disconnectSpotifyAction } from "./actions";
import DiscoveryNav from "../_nav";
import "../discovery.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Music — Magical Discovery", robots: { index: false } };

const GENRES: { id: MusicGenre; label: string }[] = [
  { id: "top", label: "Top Songs" }, { id: "rnb", label: "R&B" }, { id: "hip-hop", label: "Hip-Hop/Rap" },
  { id: "pop", label: "Pop" }, { id: "country", label: "Country" }, { id: "gospel", label: "Gospel" },
  { id: "afrobeats", label: "Afrobeats" },
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

export default async function MusicPage({ searchParams }: { searchParams: Promise<{ genre?: string; spotify?: string; q?: string }> }) {
  const account = await requireAccount("/dashboard/discovery/music");
  const { genre: raw, spotify: spotifyStatus, q } = await searchParams;
  const genre = (GENRES.some((g) => g.id === raw) ? raw : "top") as MusicGenre;
  const chart = await getMusicChart(genre);

  const spotify = await getConnectionView(account.id);
  const query = q?.trim() ?? "";
  const accessToken = spotify.connected && query ? await getValidAccessToken(account.id) : null;
  const searchResults = accessToken ? await searchCatalog(accessToken, query) : null;

  return (
    <div className="disc">
      <div className="pg-head">
        <span className="pg-eyebrow">Magical Discovery</span>
        <h1 className="pg-title">Music — Top Songs &amp; Charts</h1>
        <p className="pg-sub">What&rsquo;s hot in music today, by genre.</p>
      </div>
      <DiscoveryNav active="/dashboard/discovery/music" />

      {spotify.connected && (
        <div className="disc-section">
          <form className="disc-form" method="get">
            <input type="hidden" name="genre" value={genre} />
            <input type="text" name="q" placeholder="Search artists, albums, or tracks" defaultValue={query} aria-label="Search Spotify" />
            <button type="submit" className="btn btn--gold">Search</button>
          </form>

          {query && !searchResults && <p className="disc-empty">Spotify search is temporarily unavailable — please try again.</p>}

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
                      <a key={a.id} className="disc-card" href={a.externalUrl} target="_blank" rel="noopener noreferrer">
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
                      <a key={a.id} className="disc-card" href={a.externalUrl} target="_blank" rel="noopener noreferrer">
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
