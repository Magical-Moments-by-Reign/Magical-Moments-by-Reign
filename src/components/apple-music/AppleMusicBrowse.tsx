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

type View = "all" | "songs" | "albums" | "playlists";

function toPlayable(e: MusicChartEntry): PlayableSong {
  return { id: e.catalogId ?? "", name: e.song, artistName: e.artist, artworkUrl: e.artworkUrl, previewUrl: e.previewUrl };
}

export default function AppleMusicBrowse({ topSongsTitle, topSongs, albumsTitle, albums, playlistsTitle, playlists, genre, genres }: Props) {
  const router = useRouter();
  const { nowPlaying, isPlaying, playSong, playCollection } = useAppleMusicKit();
  const [view, setView] = useState<View>("all");

  const playableSongs = topSongs.filter((e) => e.catalogId);
  const queue = playableSongs.map(toPlayable);
  const showSongs = (view === "all" || view === "songs") && playableSongs.length > 0;
  const showAlbums = (view === "all" || view === "albums") && albums.length > 0;
  const showPlaylists = (view === "all" || view === "playlists") && playlists.length > 0;

  return (
    <>
      <div className="amk-hero">
        <div className="amk-hero__badge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="Magical Moments by Reign" width={36} height={36} />
          <span>Magical Moments</span>
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
        {albums.length > 0 && <button type="button" aria-current={view === "albums" ? "true" : undefined} onClick={() => setView("albums")}>New Releases</button>}
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
            <div className="amk-row__head"><h2>{albumsTitle}</h2></div>
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

        {!showSongs && !showAlbums && !showPlaylists && (
          <p className="disc-empty">Nothing to show in this view right now.</p>
        )}
      </div>
    </>
  );
}
