"use client";
// Small "＋ Playlist" dropdown attached to any real Apple Music track —
// lists the member's own playlists (never Apple's curated ones) as one-click
// add targets. The track fields passed in are always real Apple catalog
// data already on the page; nothing here is fabricated.

interface PlaylistOption {
  id: string;
  name: string;
}

interface TrackInput {
  catalogId: string;
  name: string;
  artistName: string;
  albumName?: string;
  artworkUrl?: string;
  url?: string;
  previewUrl?: string;
}

interface Props {
  playlists: PlaylistOption[];
  track: TrackInput;
  addTrackToPlaylistAction: (formData: FormData) => Promise<void>;
}

export default function AddToPlaylistMenu({ playlists, track, addTrackToPlaylistAction }: Props) {
  if (!track.catalogId) return null;
  return (
    <details className="amk-addto">
      <summary aria-label={`Add ${track.name} to a playlist`}>＋</summary>
      <div className="amk-addto__menu">
        {playlists.length === 0 ? (
          <p className="amk-addto__empty">Create a playlist first, under the Playlists tab.</p>
        ) : (
          playlists.map((p) => (
            <form action={addTrackToPlaylistAction} key={p.id}>
              <input type="hidden" name="playlistId" value={p.id} />
              <input type="hidden" name="catalogId" value={track.catalogId} />
              <input type="hidden" name="name" value={track.name} />
              <input type="hidden" name="artistName" value={track.artistName} />
              {track.albumName && <input type="hidden" name="albumName" value={track.albumName} />}
              {track.artworkUrl && <input type="hidden" name="artworkUrl" value={track.artworkUrl} />}
              {track.url && <input type="hidden" name="url" value={track.url} />}
              {track.previewUrl && <input type="hidden" name="previewUrl" value={track.previewUrl} />}
              <button type="submit">{p.name}</button>
            </form>
          ))
        )}
      </div>
    </details>
  );
}
