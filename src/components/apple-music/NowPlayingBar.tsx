"use client";

import { useAppleMusicKit } from "./AppleMusicKitProvider";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NowPlayingBar() {
  const { nowPlaying, isPlaying, progress, volume, hasNext, hasPrevious, togglePlayPause, skipNext, skipPrevious, seek, setVolume } = useAppleMusicKit();
  if (!nowPlaying) return null;

  return (
    <div className="amk-now-playing" role="status">
      <div className="amk-now-playing__art" style={nowPlaying.artworkUrl ? { backgroundImage: `url(${nowPlaying.artworkUrl})` } : undefined} />
      <div className="amk-now-playing__info">
        <b>{nowPlaying.title}</b>
        <span>{nowPlaying.artist}{nowPlaying.mode === "preview" ? " · Preview" : ""}</span>
      </div>

      <div className="amk-now-playing__controls">
        <button type="button" className="amk-now-playing__skip" onClick={skipPrevious} disabled={!hasPrevious} aria-label="Previous">⏮</button>
        <button type="button" className="amk-now-playing__toggle" onClick={togglePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "❚❚" : "▶"}</button>
        <button type="button" className="amk-now-playing__skip" onClick={skipNext} disabled={!hasNext} aria-label="Next">⏭</button>
      </div>

      <div className="amk-now-playing__progress">
        <span>{formatTime(progress.current)}</span>
        <input
          type="range"
          min={0}
          max={progress.duration || 0}
          step={1}
          value={Math.min(progress.current, progress.duration || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
        />
        <span>{formatTime(progress.duration)}</span>
      </div>

      <input
        type="range"
        className="amk-now-playing__volume"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Volume"
      />
    </div>
  );
}
