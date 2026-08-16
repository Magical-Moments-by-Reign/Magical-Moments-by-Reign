"use client";
// ── Apple Music — browse layout (CLIENT ONLY) ──────────────────────
// Renders the hero + curated rows for the default (no search query) Apple
// Music view. All data is passed in as props, fetched server-side from
// real Apple Music Catalog Charts — nothing here is fabricated. Apple's
// catalog API has no "artists" chart, so there's no Artists row here;
// artist discovery lives in the search box above this component.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppleMusicKit, type PlayableSong } from "./AppleMusicKitProvider";
import ConnectAppleMusicButton from "./ConnectAppleMusicButton";
import type { AppleMusicAlbumResult, AppleMusicPlaylistResult } from "@/lib/apple-music/types";
import type { MusicChartEntry, MusicGenre } from "@/lib/discovery/providers/music";

interface Props {
  topSongsTitle: string;
  topSongs: MusicChartEntry[];
  albumsTitle: string;
  albums: AppleMusicAlbumResult[];
  playlistsTitle: string;
  playlists: AppleMusicPlaylistResult[];
  genre: MusicGenre;
  genres: { id: MusicGenre; label: string }[];
}

type View = "all" | "songs" | "albums" | "artists" | "playlists";
type AlbumsPill = "new" | "albums";

interface ArtistTile {
  name: string;
  artworkUrl?: string;
}

function toPlayable(e: MusicChartEntry): PlayableSong {
  return { id: e.catalogId ?? "", name: e.song, artistName: e.artist, artworkUrl: e.artworkUrl, previewUrl: e.previewUrl };
}

// Apple's catalog API has no "artists chart" endpoint — this derives a
// real, honest list of artists from the real chart data already on the
// page (top songs + new releases), rather than fabricating one.
function deriveArtists(topSongs: MusicChartEntry[], albums: AppleMusicAlbumResult[]): ArtistTile[] {
  const byName = new Map<string, ArtistTile>();
  for (const s of topSongs) {
    if (s.artist && !byName.has(s.artist)) byName.set(s.artist, { name: s.artist, artworkUrl: s.artworkUrl });
  }
  for (const a of albums) {
    if (a.artistName && !byName.has(a.artistName)) byName.set(a.artistName, { name: a.artistName, artworkUrl: a.artworkUrl });
  }
  return Array.from(byName.values()).slice(0, 12);
}

export default function AppleMusicBrowse({ topSongsTitle, topSongs, albumsTitle, albums, playlistsTitle, playlists, genre, genres }: Props) {
  const router = useRouter();
  const { nowPlaying, isPlaying, playSong, playCollection } = useAppleMusicKit();
  const [view, setView] = useState<View>("all");
  const [albumsPill, setAlbumsPill] = useState<AlbumsPill>("new");

  const playableSongs = topSongs.filter((e) => e.catalogId);
  const queue = playableSongs.map(toPlayable);
  const artists = deriveArtists(topSongs, albums);
  const showSongs = (view === "all" || view === "songs") && playableSongs.length > 0;
  const showAlbums = (view === "all" || view === "albums") && albums.length > 0;
  const showArtists = (view === "all" || view === "artists") && artists.length > 0;
  const showPlaylists = (view === "all" || view === "playlists") && playlists.length > 0;

  function goToAlbums(pill: AlbumsPill) {
    setAlbumsPill(pill);
    setView("albums");
  }

  return (
    <>
      <div className="amk-hero">
        <div className="amk-hero__badge">
          <svg viewBox="0 0 170 170" width="26" height="26" aria-hidden="true" fill="currentColor">
            <path d="M150.7 130.6c-2.8 6.4-6.1 12.3-10 17.7-5.3 7.4-9.6 12.5-13 15.4-5.2 4.7-10.8 7.1-16.7 7.2-4.3 0-9.4-1.2-15.4-3.7-6-2.5-11.5-3.7-16.5-3.7-5.3 0-11 1.2-17.1 3.7-6.1 2.5-11 3.8-14.8 3.9-5.7.2-11.4-2.3-17.1-7.4-3.7-3.1-8.2-8.4-13.5-16-5.7-8-10.3-17.4-14-28-3.9-11.5-5.9-22.6-5.9-33.3 0-12.3 2.7-22.9 8-31.8 4.2-7.2 9.8-12.8 16.8-17 7-4.2 14.6-6.3 22.7-6.5 4.6 0 10.5 1.4 17.9 4.2 7.3 2.8 12 4.2 14 4.2 1.5 0 6.7-1.7 15.5-5 8.3-3.1 15.3-4.4 21-3.9 15.5 1.3 27.2 7.4 34.9 18.4-13.9 8.4-20.8 20.2-20.6 35.3.1 11.7 4.4 21.5 12.8 29.2 3.8 3.6 8.1 6.4 12.8 8.4-1 3-2.1 5.9-3.3 8.8zM119 5.3c0 9.2-3.4 17.8-10 25.7-8.1 9.4-17.9 14.8-28.5 13.9-.1-1.1-.2-2.3-.2-3.5 0-8.8 3.8-18.2 10.6-25.9 3.4-3.9 7.7-7.1 12.9-9.7 5.2-2.5 10.1-3.9 14.7-4.1.1 1.2.2 2.4.2 3.6z"/>
          </svg>
          <span>Apple Music</span>
        </div>
        <div className="amk-hero__body">
          <h1>Music that moves your moments.</h1>
          <p>Discover. Play. Feel. All inside Magical Moments.</p>
          <div className="amk-hero__actions">
            <ConnectAppleMusicButton compact />
            <a className="amk-hero__learn" href="#amk-rows">Explore <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>

      <div className="amk-pills" role="group" aria-label="Browse Apple Music">
        <button type="button" aria-current={view === "all" ? "true" : undefined} onClick={() => setView("all")}>All</button>
        {playableSongs.length > 0 && <button type="button" aria-current={view === "songs" ? "true" : undefined} onClick={() => setView("songs")}>Top Songs</button>}
        {albums.length > 0 && <button type="button" aria-current={view === "albums" && albumsPill === "new" ? "true" : undefined} onClick={() => goToAlbums("new")}>New Releases</button>}
        {albums.length > 0 && <button type="button" aria-current={view === "albums" && albumsPill === "albums" ? "true" : undefined} onClick={() => goToAlbums("albums")}>Albums</button>}
        {artists.length > 0 && <button type="button" aria-current={view === "artists" ? "true" : undefined} onClick={() => setView("artists")}>Artists</button>}
        {playlists.length > 0 && <button type="button" aria-current={view === "playlists" ? "true" : undefined} onClick={() => setView("playlists")}>Playlists</button>}
        <select
          value={genre}
          onChange={(e) => router.push(`/dashboard/discovery/music?genre=${e.target.value}&source=apple_music`)}
          aria-label="Choose a genre for Top Songs"
        >
          {genres.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </div>

      <div id="amk-rows">
        {showSongs && (
          <div className="amk-row" id="amk-top-songs">
            <div className="amk-row__head">
              <h2>{topSongsTitle}</h2>
              <span className="disc-badge disc-badge--live">Official Chart</span>
            </div>
            <div className="amk-row__scroll">
              {playableSongs.map((e, i) => {
                const song = queue[i];
                const isCurrent = nowPlaying?.title === song.name && nowPlaying?.artist === song.artistName;
                return (
                  <div className="amk-tile amk-tile--song" key={e.catalogId}>
                    <span className="amk-tile__rank">{e.rank}</span>
                    <div className="amk-tile__art" style={e.artworkUrl ? { backgroundImage: `url(${e.artworkUrl})` } : undefined} />
                    <div className="amk-tile__body">
                      <span className="amk-tile__title">{e.song}</span>
                      <span className="amk-tile__subtitle">{e.artist}</span>
                    </div>
                    <button type="button" className="amk-tile__playover" aria-label={isCurrent && isPlaying ? `Pause ${e.song}` : `Play ${e.song}`} onClick={() => playSong(song, queue)}>
                      {isCurrent && isPlaying ? "❚❚" : "▶"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showAlbums && (
          <div className="amk-row" id="amk-new-releases">
            <div className="amk-row__head"><h2>{albumsPill === "albums" ? "Albums" : albumsTitle}</h2></div>
            <div className="amk-row__scroll">
              {albums.map((a) => (
                <a key={a.id} className="amk-tile" href={a.url ?? "#"} target={a.url ? "_blank" : undefined} rel="noopener noreferrer">
                  <div className="amk-tile__art" style={a.artworkUrl ? { backgroundImage: `url(${a.artworkUrl})` } : undefined}>
                    <button
                      type="button"
                      className="amk-tile__playover"
                      aria-label={`Play ${a.name}`}
                      onClick={(e) => { e.preventDefault(); playCollection(a.id, "album", a.name); }}
                    >▶</button>
                  </div>
                  <span className="amk-tile__title">{a.name}</span>
                  <span className="amk-tile__subtitle">{a.artistName}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {showArtists && (
          <div className="amk-row" id="amk-artists">
            <div className="amk-row__head"><h2>Artists</h2></div>
            <div className="amk-row__scroll">
              {artists.map((ar) => (
                <a
                  key={ar.name}
                  className="amk-tile amk-tile--artist"
                  href={`/dashboard/discovery/music?source=apple_music&q=${encodeURIComponent(ar.name)}&genre=${genre}`}
                >
                  <div className="amk-tile__art amk-tile__art--round" style={ar.artworkUrl ? { backgroundImage: `url(${ar.artworkUrl})` } : undefined} />
                  <span className="amk-tile__title">{ar.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {showPlaylists && (
          <div className="amk-row" id="amk-playlists">
            <div className="amk-row__head"><h2>{playlistsTitle}</h2></div>
            <div className="amk-row__scroll">
              {playlists.map((p) => (
                <a key={p.id} className="amk-tile" href={p.url ?? "#"} target={p.url ? "_blank" : undefined} rel="noopener noreferrer">
                  <div className="amk-tile__art" style={p.artworkUrl ? { backgroundImage: `url(${p.artworkUrl})` } : undefined}>
                    <button
                      type="button"
                      className="amk-tile__playover"
                      aria-label={`Play ${p.name}`}
                      onClick={(e) => { e.preventDefault(); playCollection(p.id, "playlist", p.name); }}
                    >▶</button>
                  </div>
                  <span className="amk-tile__title">{p.name}</span>
                  <span className="amk-tile__subtitle">{p.curatorName ?? "Apple Music"}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {!showSongs && !showAlbums && !showArtists && !showPlaylists && (
          <p className="disc-empty">Nothing to show in this view right now.</p>
        )}
      </div>
    </>
  );
}
