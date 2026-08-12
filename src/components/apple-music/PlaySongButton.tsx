"use client";

import { useAppleMusicKit, type PlayableSong } from "./AppleMusicKitProvider";

export default function PlaySongButton({ song }: { song: PlayableSong }) {
  const { nowPlaying, isPlaying, playSong, togglePlayPause } = useAppleMusicKit();
  const isCurrent = nowPlaying?.title === song.name && nowPlaying?.artist === song.artistName;
  const showPause = isCurrent && isPlaying;

  return (
    <button
      type="button"
      className="amk-play-btn"
      aria-label={showPause ? `Pause ${song.name}` : `Play ${song.name}`}
      onClick={() => (isCurrent ? togglePlayPause() : playSong(song))}
    >
      {showPause ? "❚❚" : "▶"}
    </button>
  );
}
