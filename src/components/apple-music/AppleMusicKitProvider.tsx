"use client";
// ── Apple Music — MusicKit JS playback + authorization (CLIENT ONLY) ──
// Loads Apple's MusicKit JS from their own CDN, configures it with the
// developer token fetched from /api/apple-music/developer-token (safe to
// hand to the client — that's how every MusicKit-powered site works; the
// private key that signs it never leaves the server), and exposes:
//   - authorize()/unauthorize() — the member signs in with their own Apple
//     ID via Apple's own popup; Magical Moments never sees Apple
//     credentials, only the resulting authorization state
//   - real full-track/album/playlist playback for authorized members with
//     an active Apple Music subscription, via MusicKit's own player, with
//     next/previous, shuffle, and repeat through whatever list the member
//     started playing from
//   - a real 30-second preview fallback (plain HTML5 audio, Apple's own
//     preview clip URL) for everyone else, or if full playback fails for
//     any reason — playback always does something honest, never fails
//     silently
// Entirely independent of Spotify — no shared code, no shared state, no
// shared credentials. MusicKit JS manages its own per-browser
// authorization session; nothing is persisted server-side in this pass.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface PlayableSong {
  id: string;
  name: string;
  artistName: string;
  albumName?: string;
  artworkUrl?: string;
  previewUrl?: string;
}

interface NowPlaying {
  title: string;
  artist: string;
  artworkUrl?: string;
  mode: "musickit" | "preview";
}

type RepeatMode = "off" | "one" | "all";

interface AppleMusicKitContextValue {
  ready: boolean;
  authorized: boolean;
  connecting: boolean;
  statusMessage: string | null;
  nowPlaying: NowPlaying | null;
  isPlaying: boolean;
  progress: { current: number; duration: number };
  volume: number;
  hasNext: boolean;
  hasPrevious: boolean;
  shuffled: boolean;
  repeatMode: RepeatMode;
  queue: PlayableSong[];
  queueIndex: number;
  queueOpen: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  playSong: (song: PlayableSong, queue?: PlayableSong[]) => Promise<void>;
  playCollection: (id: string, kind: "album" | "playlist", label: string) => Promise<void>;
  togglePlayPause: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  seek: (seconds: number) => void;
  setVolume: (level: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleQueueOpen: () => void;
  playQueueIndex: (index: number) => void;
}

const AppleMusicKitContext = createContext<AppleMusicKitContextValue | null>(null);

export function useAppleMusicKit(): AppleMusicKitContextValue {
  const ctx = useContext(AppleMusicKitContext);
  if (!ctx) throw new Error("useAppleMusicKit must be used within AppleMusicKitProvider");
  return ctx;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    MusicKit?: {
      configure: (config: { developerToken: string; app: { name: string; build: string } }) => Promise<AppleMusicKitInstance>;
    };
  }
}

interface AppleMusicKitInstance {
  isAuthorized: boolean;
  authorize: () => Promise<string>;
  unauthorize: () => Promise<void>;
  setQueue: (descriptor: { song: string } | { songs: string[] } | { album: string } | { playlist: string }) => Promise<any>;
  play: () => Promise<void>;
  pause: () => void;
  skipToNextItem?: () => Promise<void>;
  skipToPreviousItem?: () => Promise<void>;
  seekToTime?: (seconds: number) => Promise<void>;
  player?: { isPlaying?: boolean; currentPlaybackTime?: number; currentPlaybackDuration?: number; volume?: number; shuffleMode?: number; repeatMode?: number };
  nowPlayingItem?: { title?: string; artistName?: string; artworkURL?: string } | null;
  addEventListener: (event: string, handler: (...args: any[]) => void) => void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const SCRIPT_ID = "musickit-js";
const SCRIPT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";

export function AppleMusicKitProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  const [volume, setVolumeState] = useState(1);
  const [shuffled, setShuffled] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>("off");
  const [queue, setQueueState] = useState<PlayableSong[]>([]);
  const [queueIndex, setQueueIndexState] = useState(-1);
  const [queueOpen, setQueueOpen] = useState(false);

  const musicRef = useRef<AppleMusicKitInstance | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewQueueRef = useRef<{ songs: PlayableSong[]; index: number }>({ songs: [], index: -1 });
  const hasQueueRef = useRef(false); // whether MusicKit currently has a multi-item queue (album/playlist/song-list)
  const repeatModeRef = useRef<RepeatMode>("off");

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    let cancelled = false;

    async function configure() {
      try {
        const res = await fetch("/api/apple-music/developer-token");
        if (!res.ok) {
          if (!cancelled) setStatusMessage("Apple Music isn't connected yet.");
          return;
        }
        const { token } = (await res.json()) as { token: string };
        if (!window.MusicKit) return;

        const instance = await window.MusicKit.configure({
          developerToken: token,
          app: { name: "Magical Moments by Reign", build: "1.0.0" },
        });
        if (cancelled) return;

        musicRef.current = instance;
        setReady(true);
        setAuthorized(Boolean(instance.isAuthorized));

        instance.addEventListener("authorizationStatusDidChange", () => {
          setAuthorized(Boolean(musicRef.current?.isAuthorized));
        });
        instance.addEventListener("playbackStateDidChange", () => {
          setIsPlaying(Boolean(musicRef.current?.player?.isPlaying));
        });
        instance.addEventListener("nowPlayingItemDidChange", () => {
          const item = musicRef.current?.nowPlayingItem;
          setNowPlaying(item?.title ? { title: item.title, artist: item.artistName ?? "", artworkUrl: item.artworkURL, mode: "musickit" } : null);
        });
      } catch {
        if (!cancelled) setStatusMessage("Apple Music is temporarily unavailable. Please try again shortly.");
      }
    }

    if (window.MusicKit) {
      configure();
    } else {
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        document.head.appendChild(script);
      }
      document.addEventListener("musickitloaded", configure, { once: true });
    }

    return () => {
      cancelled = true;
      document.removeEventListener("musickitloaded", configure);
    };
  }, []);

  // Progress polling — MusicKit JS's own player state doesn't reliably fire
  // an event per second, so this is the same "poll while playing" pattern
  // any MusicKit JS integration uses for a progress bar.
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (nowPlaying?.mode === "musickit" && musicRef.current?.player) {
        const p = musicRef.current.player;
        setProgress({ current: p.currentPlaybackTime ?? 0, duration: p.currentPlaybackDuration ?? 0 });
      } else if (nowPlaying?.mode === "preview" && previewAudioRef.current) {
        const a = previewAudioRef.current;
        setProgress({ current: a.currentTime, duration: Number.isFinite(a.duration) ? a.duration : 0 });
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, nowPlaying?.mode]);

  const connect = useCallback(async () => {
    if (!musicRef.current) return;
    setConnecting(true);
    setStatusMessage(null);
    try {
      await musicRef.current.authorize();
      setAuthorized(Boolean(musicRef.current.isAuthorized));
    } catch {
      setStatusMessage("Apple Music sign-in was cancelled or unavailable — please try again.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!musicRef.current) return;
    try {
      await musicRef.current.unauthorize();
    } catch {
      // Apple's own session cleanup failing shouldn't block the UI from reflecting "disconnected".
    }
    setAuthorized(false);
    setNowPlaying(null);
    hasQueueRef.current = false;
  }, []);

  const playPreviewAt = useCallback((index: number) => {
    const { songs } = previewQueueRef.current;
    const song = songs[index];
    if (!song?.previewUrl) {
      setStatusMessage("No preview is available for this track.");
      return;
    }
    previewQueueRef.current.index = index;
    setQueueIndexState(index);
    if (!previewAudioRef.current) {
      const audio = new Audio();
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        const q = previewQueueRef.current;
        if (repeatModeRef.current === "one") {
          playPreviewAt(q.index);
          return;
        }
        if (q.index + 1 < q.songs.length) playPreviewAt(q.index + 1);
        else if (repeatModeRef.current === "all" && q.songs.length) playPreviewAt(0);
        else setIsPlaying(false);
      };
      previewAudioRef.current = audio;
    }
    const audio = previewAudioRef.current;
    audio.src = song.previewUrl;
    audio.volume = volume;
    audio.play().catch(() => setStatusMessage("Playback couldn't start — please try again."));
    setNowPlaying({ title: song.name, artist: song.artistName, artworkUrl: song.artworkUrl, mode: "preview" });
  }, [volume]);

  const playSong = useCallback(async (song: PlayableSong, queue?: PlayableSong[]) => {
    setStatusMessage(null);
    const list = queue && queue.length > 1 ? queue : [song];
    setQueueState(list);
    setQueueIndexState(list.findIndex((s) => s.id === song.id));
    // Read isAuthorized fresh off the MusicKit instance rather than the
    // React `authorized` state — the state is updated via an event
    // listener + explicit setters, so there's a window right after
    // authorize() resolves (or after a remount) where it could lag behind
    // what MusicKit itself already knows.
    if (musicRef.current?.isAuthorized) {
      try {
        await musicRef.current.setQueue(list.length > 1 ? { songs: list.map((s) => s.id) } : { song: song.id });
        hasQueueRef.current = list.length > 1;
        await musicRef.current.play();
        return;
      } catch {
        setStatusMessage("Full playback didn't start — this usually means the signed-in Apple ID doesn't have an active Apple Music subscription. Playing the preview instead.");
      }
    }
    previewQueueRef.current.songs = list;
    hasQueueRef.current = list.length > 1;
    playPreviewAt(list.findIndex((s) => s.id === song.id));
  }, [playPreviewAt]);

  const playCollection = useCallback(async (id: string, kind: "album" | "playlist", label: string) => {
    setStatusMessage(null);
    if (!musicRef.current?.isAuthorized) {
      setStatusMessage(`Connect Apple Music to play ${label} — song previews are available from Top Songs.`);
      return;
    }
    try {
      // Apple's own track list for this album/playlist isn't fetched here,
      // so the queue panel intentionally shows nothing for this mode rather
      // than fabricating track names.
      setQueueState([]);
      setQueueIndexState(-1);
      await musicRef.current.setQueue(kind === "album" ? { album: id } : { playlist: id });
      hasQueueRef.current = true;
      await musicRef.current.play();
    } catch {
      setStatusMessage(`Couldn't start ${label} — this usually means the signed-in Apple ID doesn't have an active Apple Music subscription.`);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (nowPlaying?.mode === "musickit" && musicRef.current) {
      if (musicRef.current.player?.isPlaying) musicRef.current.pause();
      else musicRef.current.play().catch(() => {});
      return;
    }
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [nowPlaying]);

  const skipNext = useCallback(() => {
    if (nowPlaying?.mode === "musickit" && musicRef.current?.skipToNextItem) {
      musicRef.current.skipToNextItem().catch(() => {});
      return;
    }
    const q = previewQueueRef.current;
    if (q.index + 1 < q.songs.length) playPreviewAt(q.index + 1);
    else if (repeatModeRef.current === "all" && q.songs.length) playPreviewAt(0);
  }, [nowPlaying, playPreviewAt]);

  const skipPrevious = useCallback(() => {
    if (nowPlaying?.mode === "musickit" && musicRef.current?.skipToPreviousItem) {
      musicRef.current.skipToPreviousItem().catch(() => {});
      return;
    }
    const q = previewQueueRef.current;
    if (q.index > 0) playPreviewAt(q.index - 1);
  }, [nowPlaying, playPreviewAt]);

  const seek = useCallback((seconds: number) => {
    if (nowPlaying?.mode === "musickit" && musicRef.current?.seekToTime) {
      musicRef.current.seekToTime(seconds).catch(() => {});
      return;
    }
    if (previewAudioRef.current) previewAudioRef.current.currentTime = seconds;
  }, [nowPlaying]);

  const setVolume = useCallback((level: number) => {
    const clamped = Math.min(1, Math.max(0, level));
    setVolumeState(clamped);
    if (musicRef.current?.player) musicRef.current.player.volume = clamped;
    if (previewAudioRef.current) previewAudioRef.current.volume = clamped;
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffled((prev) => {
      const next = !prev;
      if (musicRef.current?.player) {
        try { musicRef.current.player.shuffleMode = next ? 1 : 0; } catch { /* not fatal — MusicKit's own UI-less shuffle state may not persist across versions */ }
      }
      const q = previewQueueRef.current;
      if (q.songs.length > 1) {
        const current = q.songs[q.index];
        const rest = q.songs.filter((_, i) => i !== q.index);
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        const reordered = current ? [current, ...rest] : rest;
        q.songs = reordered;
        q.index = current ? 0 : q.index;
        setQueueState(reordered);
        setQueueIndexState(q.index);
      }
      return next;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatModeState((prev) => {
      const next: RepeatMode = prev === "off" ? "all" : prev === "all" ? "one" : "off";
      if (musicRef.current?.player) {
        try { musicRef.current.player.repeatMode = next === "off" ? 0 : next === "one" ? 1 : 2; } catch { /* same defensive note as shuffle above */ }
      }
      return next;
    });
  }, []);

  const toggleQueueOpen = useCallback(() => setQueueOpen((v) => !v), []);

  const playQueueIndex = useCallback((index: number) => {
    if (nowPlaying?.mode === "preview" || !nowPlaying) playPreviewAt(index);
  }, [nowPlaying, playPreviewAt]);

  const q = previewQueueRef.current;
  const hasNext = nowPlaying?.mode === "musickit" ? hasQueueRef.current : q.index + 1 < q.songs.length || repeatMode === "all";
  const hasPrevious = nowPlaying?.mode === "musickit" ? hasQueueRef.current : q.index > 0;

  return (
    <AppleMusicKitContext.Provider value={{
      ready, authorized, connecting, statusMessage, nowPlaying, isPlaying, progress, volume, hasNext, hasPrevious,
      shuffled, repeatMode, queue, queueIndex, queueOpen,
      connect, disconnect, playSong, playCollection, togglePlayPause, skipNext, skipPrevious, seek, setVolume,
      toggleShuffle, cycleRepeat, toggleQueueOpen, playQueueIndex,
    }}>
      {children}
    </AppleMusicKitContext.Provider>
  );
}
