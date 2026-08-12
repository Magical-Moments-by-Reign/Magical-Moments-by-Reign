"use client";
// ── Apple Music — MusicKit JS playback + authorization (CLIENT ONLY) ──
// Loads Apple's MusicKit JS from their own CDN, configures it with the
// developer token fetched from /api/apple-music/developer-token (safe to
// hand to the client — that's how every MusicKit-powered site works; the
// private key that signs it never leaves the server), and exposes:
//   - authorize()/unauthorize() — the member signs in with their own Apple
//     ID via Apple's own popup; Magical Moments never sees Apple
//     credentials, only the resulting authorization state
//   - real full-track playback for authorized members with an active
//     Apple Music subscription, via MusicKit's own player
//   - a real 30-second preview fallback (plain HTML5 audio, Apple's own
//     preview clip URL) for everyone else, or if full playback fails for
//     any reason (no subscription, a revoked authorization, etc.)
// Entirely independent of Spotify — no shared code, no shared state, no
// shared credentials. MusicKit JS manages its own per-browser
// authorization session; nothing here is persisted server-side.

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

interface AppleMusicKitContextValue {
  ready: boolean;
  authorized: boolean;
  connecting: boolean;
  statusMessage: string | null;
  nowPlaying: NowPlaying | null;
  isPlaying: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  playSong: (song: PlayableSong) => Promise<void>;
  togglePlayPause: () => void;
}

const AppleMusicKitContext = createContext<AppleMusicKitContextValue | null>(null);

export function useAppleMusicKit(): AppleMusicKitContextValue {
  const ctx = useContext(AppleMusicKitContext);
  if (!ctx) throw new Error("useAppleMusicKit must be used within AppleMusicKitProvider");
  return ctx;
}

declare global {
  interface Window {
    MusicKit?: {
      configure: (config: { developerToken: string; app: { name: string; build: string } }) => Promise<AppleMusicKitInstance>;
      getInstance?: () => AppleMusicKitInstance;
    };
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface AppleMusicKitInstance {
  isAuthorized: boolean;
  musicUserToken: string;
  authorize: () => Promise<string>;
  unauthorize: () => Promise<void>;
  setQueue: (descriptor: { song: string }) => Promise<any>;
  play: () => Promise<void>;
  pause: () => void;
  player?: { isPlaying?: boolean };
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

  const musicRef = useRef<AppleMusicKitInstance | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

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
        if (!window.MusicKit) return; // script not loaded yet — musickitloaded listener will retry

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
  }, []);

  const playPreview = useCallback((song: PlayableSong) => {
    if (!song.previewUrl) {
      setStatusMessage("No preview is available for this track.");
      return;
    }
    if (!previewAudioRef.current) previewAudioRef.current = new Audio();
    const audio = previewAudioRef.current;
    audio.src = song.previewUrl;
    audio.play().catch(() => setStatusMessage("Playback couldn't start — please try again."));
    setNowPlaying({ title: song.name, artist: song.artistName, artworkUrl: song.artworkUrl, mode: "preview" });
    setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
  }, []);

  const playSong = useCallback(async (song: PlayableSong) => {
    setStatusMessage(null);
    if (authorized && musicRef.current) {
      try {
        await musicRef.current.setQueue({ song: song.id });
        await musicRef.current.play();
        return;
      } catch {
        setStatusMessage("Full playback needs an active Apple Music subscription — playing the preview instead.");
      }
    }
    playPreview(song);
  }, [authorized, playPreview]);

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

  return (
    <AppleMusicKitContext.Provider value={{ ready, authorized, connecting, statusMessage, nowPlaying, isPlaying, connect, disconnect, playSong, togglePlayPause }}>
      {children}
    </AppleMusicKitContext.Provider>
  );
}
