"use client";

import { useAppleMusicKit } from "./AppleMusicKitProvider";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NowPlayingBar() {
  const {
    nowPlaying, isPlaying, progress, volume, hasNext, hasPrevious,
    shuffled, repeatMode, queue, queueIndex, queueOpen,
    togglePlayPause, skipNext, skipPrevious, seek, setVolume,
    toggleShuffle, cycleRepeat, toggleQueueOpen, playQueueIndex,
  } = useAppleMusicKit();
  if (!nowPlaying) return null;

  return (
    <div className="amk-now-playing" role="status">
      <div className="amk-now-playing__art" style={nowPlaying.artworkUrl ? { backgroundImage: `url(${nowPlaying.artworkUrl})` } : undefined} />
      <div className="amk-now-playing__info">
        <b>{nowPlaying.title}</b>
        <span>{nowPlaying.artist}{nowPlaying.mode === "preview" ? " · Preview" : ""}</span>
      </div>

      <div className="amk-now-playing__controls">
        <button
          type="button"
          className="amk-now-playing__toggle-btn"
          aria-pressed={shuffled}
          aria-label={shuffled ? "Shuffle on" : "Shuffle off"}
          onClick={toggleShuffle}
        >⤨</button>
        <button type="button" className="amk-now-playing__skip" onClick={skipPrevious} disabled={!hasPrevious} aria-label="Previous">⏮</button>
        <button type="button" className="amk-now-playing__toggle" onClick={togglePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "❚❚" : "▶"}</button>
        <button type="button" className="amk-now-playing__skip" onClick={skipNext} disabled={!hasNext} aria-label="Next">⏭</button>
        <button
          type="button"
          className="amk-now-playing__toggle-btn"
          aria-pressed={repeatMode !== "off"}
          aria-label={repeatMode === "one" ? "Repeat one" : repeatMode === "all" ? "Repeat all" : "Repeat off"}
          onClick={cycleRepeat}
        >{repeatMode === "one" ? "🔂" : "🔁"}</button>
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

      <div className="amk-now-playing__right">
        <button
          type="button"
          className="amk-now-playing__toggle-btn"
          aria-pressed={queueOpen}
          aria-label={queueOpen ? "Hide queue" : "Show queue"}
          onClick={toggleQueueOpen}
        >☰</button>
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

      {queueOpen && (
        <div className="amk-queue-panel" role="dialog" aria-label="Up next">
          <div className="amk-queue-panel__head">
            <span>Up Next</span>
            <button type="button" onClick={toggleQueueOpen} aria-label="Close queue">✕</button>
          </div>
          {queue.length === 0 ? (
            <p className="amk-queue-panel__empty">
              {nowPlaying.mode === "musickit"
                ? "Apple Music is playing this album or playlist directly — the track-by-track queue isn't available in this view."
                : "Nothing queued yet."}
            </p>
          ) : (
            <ul className="amk-queue-panel__list">
              {queue.map((song, i) => (
                <li key={`${song.id}-${i}`}>
                  <button
                    type="button"
                    className={i === queueIndex ? "amk-queue-panel__item amk-queue-panel__item--current" : "amk-queue-panel__item"}
                    onClick={() => playQueueIndex(i)}
                    disabled={nowPlaying.mode === "musickit"}
                  >
                    <span className="amk-queue-panel__art" style={song.artworkUrl ? { backgroundImage: `url(${song.artworkUrl})` } : undefined} />
                    <span className="amk-queue-panel__meta">
                      <span className="amk-queue-panel__title">{song.name}</span>
                      <span className="amk-queue-panel__artist">{song.artistName}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
