"use client";
// ── Apple Music — browse layout (CLIENT ONLY) ──────────────────────
// Renders the hero + curated rows for the default (no search query) Apple
// Music view. All data is passed in as props, fetched server-side from
// real Apple Music Catalog Charts — nothing here is fabricated. Apple's
// catalog API has no "artists" chart, so there's no Artists row here;
// artist discovery lives in the search box above this component.

import { useState } from "react";
import { useAppleMusicKit, type PlayableSong } from "./AppleMusicKitProvider";
import ConnectAppleMusicButton from "./ConnectAppleMusicButton";
import AddToPlaylistMenu from "./AddToPlaylistMenu";
import type { AppleMusicAlbumResult, AppleMusicPlaylistResult } from "@/lib/apple-music/types";
import type { MusicChartEntry, MusicGenre } from "@/lib/discovery/providers/music";
import type { PlaylistEntry } from "@/lib/discovery/playlists";

interface Props {
  topSongsTitle: string;
  topSongs: MusicChartEntry[];
  albumsTitle: string;
  albums: AppleMusicAlbumResult[];
  playlistsTitle: string;
  playlists: AppleMusicPlaylistResult[];
  genre: MusicGenre;
  isOfficial: boolean;
  myPlaylists: PlaylistEntry[];
  createPlaylistAction: (formData: FormData) => Promise<void>;
  deletePlaylistAction: (formData: FormData) => Promise<void>;
  addTrackToPlaylistAction: (formData: FormData) => Promise<void>;
  removeTrackFromPlaylistAction: (formData: FormData) => Promise<void>;
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

function AppleMarkSvg() {
  return (
    <svg viewBox="0 0 170 170" width="15" height="15" aria-hidden="true" fill="currentColor">
      <path d="M150.7 130.6c-2.8 6.4-6.1 12.3-10 17.7-5.3 7.4-9.6 12.5-13 15.4-5.2 4.7-10.8 7.1-16.7 7.2-4.3 0-9.4-1.2-15.4-3.7-6-2.5-11.5-3.7-16.5-3.7-5.3 0-11 1.2-17.1 3.7-6.1 2.5-11 3.8-14.8 3.9-5.7.2-11.4-2.3-17.1-7.4-3.7-3.1-8.2-8.4-13.5-16-5.7-8-10.3-17.4-14-28-3.9-11.5-5.9-22.6-5.9-33.3 0-12.3 2.7-22.9 8-31.8 4.2-7.2 9.8-12.8 16.8-17 7-4.2 14.6-6.3 22.7-6.5 4.6 0 10.5 1.4 17.9 4.2 7.3 2.8 12 4.2 14 4.2 1.5 0 6.7-1.7 15.5-5 8.3-3.1 15.3-4.4 21-3.9 15.5 1.3 27.2 7.4 34.9 18.4-13.9 8.4-20.8 20.2-20.6 35.3.1 11.7 4.4 21.5 12.8 29.2 3.8 3.6 8.1 6.4 12.8 8.4-1 3-2.1 5.9-3.3 8.8zM119 5.3c0 9.2-3.4 17.8-10 25.7-8.1 9.4-17.9 14.8-28.5 13.9-.1-1.1-.2-2.3-.2-3.5 0-8.8 3.8-18.2 10.6-25.9 3.4-3.9 7.7-7.1 12.9-9.7 5.2-2.5 10.1-3.9 14.7-4.1.1 1.2.2 2.4.2 3.6z" />
    </svg>
  );
}

export default function AppleMusicBrowse({
  topSongsTitle, topSongs, albumsTitle, albums, playlistsTitle, playlists, genre, isOfficial,
  myPlaylists, createPlaylistAction, deletePlaylistAction, addTrackToPlaylistAction, removeTrackFromPlaylistAction,
}: Props) {
  const { authorized, nowPlaying, isPlaying, playSong, playCollection } = useAppleMusicKit();
  const [view, setView] = useState<View>("all");
  const [albumsPill, setAlbumsPill] = useState<AlbumsPill>("new");

  const playableSongs = topSongs.filter((e) => e.catalogId);
  const queue = playableSongs.map(toPlayable);
  const artists = deriveArtists(topSongs, albums);
  const topFivePlaylists = playlists.slice(0, 5);
  const showSongs = (view === "all" || view === "songs") && playableSongs.length > 0;
  const showAlbums = (view === "all" || view === "albums") && albums.length > 0;
  const showArtists = (view === "all" || view === "artists") && artists.length > 0;
  // The dedicated Playlists view is always reachable (it's also where a
  // member creates their own playlists), even on weeks Apple has no curated
  // "Top Playlists" chart — the "all" overview still only surfaces the row
  // automatically when there's curated content to show alongside it.
  const showPlaylists = view === "playlists" || (view === "all" && topFivePlaylists.length > 0);

  function goToAlbums(pill: AlbumsPill) {
    setAlbumsPill(pill);
    setView("albums");
  }

  return (
    <>
      <div className="amk-hero">
        <div className="amk-hero__badge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-champagne.png" alt="" />
          <span>Magical Moments<em>by Reign</em></span>
        </div>
        <div className="amk-hero__apple" aria-label="Powered by Apple Music — sign in with your Apple Music account">
          <AppleMarkSvg />
          <span>Apple Music</span>
        </div>
        <div className="amk-hero__body">
          <h1>{showSongs ? topSongsTitle : "Music"}</h1>
          <p>{showSongs ? "The most played hits right now." : "Discover. Play. Feel. All inside Magical Moments."}</p>
          <div className="amk-hero__actions">
            <ConnectAppleMusicButton compact />
            {showSongs && (
              <button type="button" className="amk-hero__play-all" onClick={() => playSong(queue[0], queue)}>▶ Play All</button>
            )}
          </div>
        </div>
      </div>

      <div className="amk-pills" role="group" aria-label="Browse Apple Music">
        <button type="button" aria-current={view === "all" ? "true" : undefined} onClick={() => setView("all")}>All</button>
        {playableSongs.length > 0 && <button type="button" aria-current={view === "songs" ? "true" : undefined} onClick={() => setView("songs")}>Top Songs</button>}
        {albums.length > 0 && <button type="button" aria-current={view === "albums" && albumsPill === "new" ? "true" : undefined} onClick={() => goToAlbums("new")}>New Releases</button>}
        {albums.length > 0 && <button type="button" aria-current={view === "albums" && albumsPill === "albums" ? "true" : undefined} onClick={() => goToAlbums("albums")}>Albums</button>}
        {artists.length > 0 && <button type="button" aria-current={view === "artists" ? "true" : undefined} onClick={() => setView("artists")}>Artists</button>}
        <button type="button" aria-current={view === "playlists" ? "true" : undefined} onClick={() => setView("playlists")}>Playlists</button>
      </div>

      <div id="amk-rows">
        {showSongs && (
          <div className="amk-row" id="amk-top-songs">
            <div className="amk-row__head">
              <h2>{topSongsTitle}</h2>
              {isOfficial && <span className="disc-badge disc-badge--live">Official Chart</span>}
              <span className="amk-row__signin"><AppleMarkSvg />{authorized ? "Playing via your Apple Music account" : "Sign in to Apple Music to play full songs"}</span>
              {view === "all" && playableSongs.length > 5 && (
                <button type="button" className="amk-row__seeall" onClick={() => setView("songs")}>See All <span aria-hidden="true">→</span></button>
              )}
            </div>
            <div className="amk-row__ranked">
              {(view === "all" ? playableSongs.slice(0, 5) : playableSongs).map((e, i) => {
                const song = toPlayable(e);
                const isCurrent = nowPlaying?.title === song.name && nowPlaying?.artist === song.artistName;
                return (
                  <div className="amk-ranked" key={e.catalogId}>
                    <span className="amk-ranked__num">{e.rank}</span>
                    <div className="amk-ranked__art">
                      {e.artworkUrl && <div className="amk-ranked__img" style={{ backgroundImage: `url(${e.artworkUrl})` }} />}
                      <button type="button" className="amk-ranked__play" aria-label={isCurrent && isPlaying ? `Pause ${e.song}` : `Play ${e.song}`} onClick={() => playSong(song, playableSongs.map(toPlayable))}>
                        {isCurrent && isPlaying ? "❚❚" : "▶"}
                      </button>
                    </div>
                    <span className="amk-ranked__title">{e.song}</span>
                    <span className="amk-ranked__subtitle">{e.artist}</span>
                    <AddToPlaylistMenu
                      playlists={myPlaylists}
                      track={{ catalogId: e.catalogId ?? "", name: e.song, artistName: e.artist, artworkUrl: e.artworkUrl, url: e.listenUrl, previewUrl: e.previewUrl }}
                      addTrackToPlaylistAction={addTrackToPlaylistAction}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showArtists && (
          <div className="amk-row" id="amk-artists">
            <div className="amk-row__head"><h2>Artists</h2></div>
            <div className="amk-row__ranked">
              {(view === "all" ? artists.slice(0, 5) : artists).map((ar) => (
                <a
                  key={ar.name}
                  className="amk-ranked amk-ranked--round"
                  href={`/dashboard/discovery/music?source=apple_music&q=${encodeURIComponent(ar.name)}&genre=${genre}`}
                >
                  <div className="amk-ranked__art amk-ranked__art--round">
                    {ar.artworkUrl && <div className="amk-ranked__img" style={{ backgroundImage: `url(${ar.artworkUrl})` }} />}
                  </div>
                  <span className="amk-ranked__title">{ar.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {showPlaylists && (
          <>
            <div className="amk-row" id="amk-my-playlists">
              <div className="amk-row__head"><h2>My Playlists</h2></div>
              <form action={createPlaylistAction} className="amk-newplaylist">
                <input type="text" name="name" placeholder="New playlist name" maxLength={120} required />
                <button type="submit" className="btn btn--sm btn--gold">Create Playlist</button>
              </form>
              {myPlaylists.length === 0 ? (
                <p className="disc-empty">You haven&rsquo;t made a playlist yet — name one above to get started.</p>
              ) : (
                <div className="amk-myplaylists">
                  {myPlaylists.map((p) => (
                    <div className="amk-myplaylist" key={p.id}>
                      <div className="amk-myplaylist__head">
                        <h3>{p.name}</h3>
                        <span>{p.tracks.length} track{p.tracks.length === 1 ? "" : "s"}</span>
                        <form action={deletePlaylistAction}>
                          <input type="hidden" name="playlistId" value={p.id} />
                          <button type="submit" className="amk-myplaylist__delete" aria-label={`Delete ${p.name}`}>Delete</button>
                        </form>
                      </div>
                      {p.tracks.length === 0 ? (
                        <p className="disc-empty">No songs yet — use the ＋ button on any song to add it here.</p>
                      ) : (
                        <div className="amk-myplaylist__tracks">
                          {p.tracks.map((t) => {
                            const song: PlayableSong = { id: t.catalogId, name: t.name, artistName: t.artistName, artworkUrl: t.artworkUrl, previewUrl: t.previewUrl };
                            const isCurrent = nowPlaying?.title === t.name && nowPlaying?.artist === t.artistName;
                            return (
                              <div className="amk-ranked" key={t.id}>
                                <div className="amk-ranked__art">
                                  {t.artworkUrl && <div className="amk-ranked__img" style={{ backgroundImage: `url(${t.artworkUrl})` }} />}
                                  <button type="button" className="amk-ranked__play" aria-label={isCurrent && isPlaying ? `Pause ${t.name}` : `Play ${t.name}`} onClick={() => playSong(song, p.tracks.map((tr) => ({ id: tr.catalogId, name: tr.name, artistName: tr.artistName, artworkUrl: tr.artworkUrl, previewUrl: tr.previewUrl })))}>
                                    {isCurrent && isPlaying ? "❚❚" : "▶"}
                                  </button>
                                </div>
                                <span className="amk-ranked__title">{t.name}</span>
                                <span className="amk-ranked__subtitle">{t.artistName}</span>
                                <form action={removeTrackFromPlaylistAction}>
                                  <input type="hidden" name="playlistId" value={p.id} />
                                  <input type="hidden" name="catalogId" value={t.catalogId} />
                                  <button type="submit" className="amk-myplaylist__delete" aria-label={`Remove ${t.name} from ${p.name}`}>Remove</button>
                                </form>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {topFivePlaylists.length > 0 && (
              <div className="amk-row" id="amk-playlists">
                <div className="amk-row__head"><h2>{playlistsTitle}</h2></div>
                <div className="amk-row__ranked">
                  {topFivePlaylists.map((p, i) => (
                    <a key={p.id} className="amk-ranked" href={p.url ?? "#"} target={p.url ? "_blank" : undefined} rel="noopener noreferrer">
                      <span className="amk-ranked__num">{i + 1}</span>
                      <div className="amk-ranked__art">
                        {p.artworkUrl && <div className="amk-ranked__img" style={{ backgroundImage: `url(${p.artworkUrl})` }} />}
                        <button type="button" className="amk-ranked__play" aria-label={`Play ${p.name}`} onClick={(e) => { e.preventDefault(); playCollection(p.id, "playlist", p.name); }}>▶</button>
                      </div>
                      <span className="amk-ranked__title">{p.name}</span>
                      <span className="amk-ranked__subtitle">{p.curatorName ?? "Apple Music"}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
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

        {!showSongs && !showAlbums && !showArtists && !showPlaylists && (
          <p className="disc-empty">Nothing to show in this view right now.</p>
        )}
      </div>
    </>
  );
}
