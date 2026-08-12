"use client";

import { useAppleMusicKit } from "./AppleMusicKitProvider";

export default function NowPlayingBar() {
  const { nowPlaying, isPlaying, togglePlayPause } = useAppleMusicKit();
  if (!nowPlaying) return null;

  return (
    <div className="amk-now-playing" role="status">
      <div className="amk-now-playing__art" style={nowPlaying.artworkUrl ? { backgroundImage: `url(${nowPlaying.artworkUrl})` } : undefined} />
      <div className="amk-now-playing__info">
        <b>{nowPlaying.title}</b>
        <span>{nowPlaying.artist}{nowPlaying.mode === "preview" ? " · Preview" : ""}</span>
      </div>
      <button type="button" className="amk-now-playing__toggle" onClick={togglePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? "❚❚" : "▶"}
      </button>
    </div>
  );
}
