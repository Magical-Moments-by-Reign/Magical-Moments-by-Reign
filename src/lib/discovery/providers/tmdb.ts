// ── Watch + Movies — TMDB provider (SERVER ONLY) ─────────────────
// TMDB (themoviedb.org) is the metadata source for both the WATCH (TV) and
// MOVIES tabs: titles, artwork, synopses, dates, popularity, and — where TMDB
// itself supplies it — watch-provider availability. TMDB does not give a
// "#1 on Netflix" ranking; we only ever say "Available on Netflix" etc. when
// TMDB's own /watch/providers data says so, never a claimed rank.

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

export type WatchSection = "trending" | "new_this_week" | "popular" | "airing_today";
export type MovieSection = "now_playing" | "opening_this_week" | "coming_soon" | "popular";

export interface WatchItem {
  id: string; // TMDB tv id, stringified
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  firstAirDate?: string;
  popularity?: number;
  voteAverage?: number;
}

export interface MovieItem {
  id: string; // TMDB movie id, stringified
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  releaseDate?: string;
  popularity?: number;
  voteAverage?: number;
  genres?: string[];
  runtimeMinutes?: number;
}

export interface WatchProviderAvailability {
  name: string;
  logoUrl?: string;
  /** TMDB's own JustWatch-sourced link for "where to watch" this title. */
  link?: string;
}

export interface TvEpisodeRef {
  seasonNumber: number;
  episodeNumber: number;
  name?: string;
  airDate?: string; // ISO date
}

export interface TvNetwork {
  name: string;
  logoUrl?: string;
}

export interface WatchDetails extends WatchItem {
  seasons?: number;
  latestSeasonName?: string;
  status?: string; // "Returning Series" | "Ended" | ...
  availableOn: WatchProviderAvailability[];
  externalUrl?: string; // TMDB's own page (always safe to link to)
  /** TMDB's own networks/channels for this show (e.g. HBO, Netflix) —
   *  distinct from availableOn, which is JustWatch streaming availability. */
  networks: TvNetwork[];
  /** TMDB's own next_episode_to_air, when the show has a confirmed one —
   *  never guessed or estimated. */
  nextEpisode?: TvEpisodeRef;
  /** true when the upcoming episode is episode 1 of its season (a season
   *  premiere) rather than just the next episode of an already-airing one. */
  nextEpisodeIsSeasonPremiere?: boolean;
  /** TMDB's own last_episode_to_air — the most recent real episode, used
   *  for "current season/episode" display when there's no upcoming one. */
  lastEpisode?: TvEpisodeRef;
}

export interface MovieDetails extends MovieItem {
  trailerUrl?: string; // YouTube, from TMDB's official videos endpoint
  externalUrl?: string;
  availableOn: WatchProviderAvailability[];
  /** MPAA rating (e.g. "R", "PG-13") from TMDB's US release_dates data.
   *  Omitted (never guessed) when TMDB has no US certification on file. */
  certification?: string;
}

export interface WatchProvider {
  readonly slug: string;
  readonly name: string;
  readonly attribution: string;
  isConfigured(): boolean;
  browse(section: WatchSection): Promise<WatchItem[] | null>;
  details(id: string): Promise<WatchDetails | null>;
}

export interface MovieProvider {
  readonly slug: string;
  readonly name: string;
  readonly attribution: string;
  isConfigured(): boolean;
  browse(section: MovieSection): Promise<MovieItem[] | null>;
  details(id: string): Promise<MovieDetails | null>;
}

function tmdbKey(): string | undefined {
  // TMDB supports both a v3 "api_key" query param and a v4 Bearer read token —
  // accept either, since projects are issued one or the other.
  return process.env.TMDB_API_KEY || undefined;
}

function authedFetch(path: string, params: Record<string, string> = {}) {
  const key = tmdbKey();
  const isBearer = (key ?? "").length > 40; // v4 read tokens are long JWTs; v3 keys are short hex
  const q = new URLSearchParams({ language: "en-US", ...params });
  if (key && !isBearer) q.set("api_key", key);
  return fetch(`${TMDB_BASE}${path}?${q.toString()}`, {
    headers: isBearer && key ? { Authorization: `Bearer ${key}` } : undefined,
    next: { revalidate: 21_600 }, // 6h — TMDB catalog data doesn't need to be hot
  });
}

function poster(path: unknown, size: "w342" | "w500" = "w500"): string | undefined {
  return typeof path === "string" && path ? `${TMDB_IMG}/${size}${path}` : undefined;
}
function backdrop(path: unknown): string | undefined {
  return typeof path === "string" && path ? `${TMDB_IMG}/w1280${path}` : undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Pure: map one TMDB tv object → our shape. Exported for tests. */
export function mapTv(t: any): WatchItem | null {
  const id = t?.id;
  const title = t?.name;
  if (id === undefined || !title) return null;
  return {
    id: String(id),
    title: String(title),
    posterUrl: poster(t?.poster_path),
    backdropUrl: backdrop(t?.backdrop_path),
    overview: typeof t?.overview === "string" ? t.overview : undefined,
    firstAirDate: typeof t?.first_air_date === "string" ? t.first_air_date : undefined,
    popularity: typeof t?.popularity === "number" ? t.popularity : undefined,
    voteAverage: typeof t?.vote_average === "number" ? t.vote_average : undefined,
  };
}

/** Pure: map one TMDB movie object → our shape. Exported for tests. */
export function mapMovie(m: any): MovieItem | null {
  const id = m?.id;
  const title = m?.title;
  if (id === undefined || !title) return null;
  return {
    id: String(id),
    title: String(title),
    posterUrl: poster(m?.poster_path),
    backdropUrl: backdrop(m?.backdrop_path),
    overview: typeof m?.overview === "string" ? m.overview : undefined,
    releaseDate: typeof m?.release_date === "string" ? m.release_date : undefined,
    popularity: typeof m?.popularity === "number" ? m.popularity : undefined,
    voteAverage: typeof m?.vote_average === "number" ? m.vote_average : undefined,
    genres: Array.isArray(m?.genres) ? m.genres.map((g: any) => g?.name).filter((n: any): n is string => typeof n === "string") : undefined,
    runtimeMinutes: typeof m?.runtime === "number" ? m.runtime : undefined,
  };
}

function watchSectionPath(section: WatchSection): { path: string; params?: Record<string, string> } {
  switch (section) {
    case "trending": return { path: "/trending/tv/week" };
    case "airing_today": return { path: "/tv/airing_today" };
    case "new_this_week": return { path: "/discover/tv", params: { "first_air_date.gte": weekAgo(), sort_by: "popularity.desc" } };
    case "popular": default: return { path: "/tv/popular" };
  }
}

function movieSectionPath(section: MovieSection): { path: string; params?: Record<string, string> } {
  switch (section) {
    case "now_playing": return { path: "/movie/now_playing" };
    case "opening_this_week": return { path: "/discover/movie", params: { "primary_release_date.gte": weekAgo(), sort_by: "popularity.desc" } };
    case "coming_soon": return { path: "/movie/upcoming" };
    case "popular": default: return { path: "/movie/popular" };
  }
}

function weekAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export const TmdbWatchProvider: WatchProvider = {
  slug: "tmdb",
  name: "TMDB",
  attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB.",

  isConfigured(): boolean {
    return Boolean(tmdbKey());
  },

  async browse(section: WatchSection): Promise<WatchItem[] | null> {
    if (!tmdbKey()) return null;
    const { path, params } = watchSectionPath(section);
    try {
      const res = await authedFetch(path, params);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data?.results)) return null;
      return data.results.map(mapTv).filter((t: WatchItem | null): t is WatchItem => t !== null);
    } catch {
      return null;
    }
  },

  async details(id: string): Promise<WatchDetails | null> {
    if (!tmdbKey() || !id) return null;
    try {
      const [showRes, providersRes] = await Promise.all([
        authedFetch(`/tv/${encodeURIComponent(id)}`),
        authedFetch(`/tv/${encodeURIComponent(id)}/watch/providers`),
      ]);
      if (!showRes.ok) return null;
      const show = await showRes.json();
      const base = mapTv(show);
      if (!base) return null;

      let availableOn: WatchProviderAvailability[] = [];
      if (providersRes.ok) {
        const pdata = await providersRes.json();
        const us = pdata?.results?.US;
        const flat = [...(us?.flatrate ?? []), ...(us?.ads ?? [])];
        availableOn = flat
          .filter((p: any) => typeof p?.provider_name === "string")
          .map((p: any) => ({ name: p.provider_name, logoUrl: poster(p.logo_path, "w342"), link: typeof us?.link === "string" ? us.link : undefined }));
      }

      const nextEp = show?.next_episode_to_air;
      const lastEp = show?.last_episode_to_air;
      const toEpisodeRef = (e: any): TvEpisodeRef | undefined =>
        typeof e?.season_number === "number" && typeof e?.episode_number === "number"
          ? { seasonNumber: e.season_number, episodeNumber: e.episode_number, name: typeof e?.name === "string" ? e.name : undefined, airDate: typeof e?.air_date === "string" ? e.air_date : undefined }
          : undefined;
      const networks: TvNetwork[] = Array.isArray(show?.networks)
        ? show.networks.filter((n: any) => typeof n?.name === "string").map((n: any) => ({ name: n.name, logoUrl: poster(n.logo_path, "w342") }))
        : [];

      return {
        ...base,
        seasons: typeof show?.number_of_seasons === "number" ? show.number_of_seasons : undefined,
        latestSeasonName: typeof show?.last_episode_to_air?.name === "string" ? show.last_episode_to_air.name : undefined,
        status: typeof show?.status === "string" ? show.status : undefined,
        availableOn,
        networks,
        externalUrl: show?.id ? `https://www.themoviedb.org/tv/${show.id}` : undefined,
        nextEpisode: toEpisodeRef(nextEp),
        nextEpisodeIsSeasonPremiere: nextEp?.episode_number === 1,
        lastEpisode: toEpisodeRef(lastEp),
      };
    } catch {
      return null;
    }
  },
};

/** TMDB's own "recommendations" for a TV show — a real, provider-computed
 *  list (not a hand-tuned algorithm of ours), used to power "Suggested For
 *  You" from what's already in a member's lineup. Returns null (not an
 *  empty array) on any failure so callers can tell "no recommendations"
 *  from "the request failed." */
export async function recommendedTv(id: string): Promise<WatchItem[] | null> {
  if (!tmdbKey() || !id) return null;
  try {
    const res = await authedFetch(`/tv/${encodeURIComponent(id)}/recommendations`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.results)) return null;
    return data.results.map(mapTv).filter((t: WatchItem | null): t is WatchItem => t !== null);
  } catch {
    return null;
  }
}

/** Free-text TV show search (TMDB's real `/search/tv` endpoint) — for
 *  finding a show that isn't in any of the browse rows. Returns null (not
 *  an empty array) on failure so callers can tell "no results" from "the
 *  request failed." */
export async function searchTv(query: string): Promise<WatchItem[] | null> {
  if (!tmdbKey() || !query.trim()) return null;
  try {
    const res = await authedFetch("/search/tv", { query: query.trim() });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.results)) return null;
    return data.results.map(mapTv).filter((t: WatchItem | null): t is WatchItem => t !== null);
  } catch {
    return null;
  }
}

export const TmdbMovieProvider: MovieProvider = {
  slug: "tmdb",
  name: "TMDB",
  attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB.",

  isConfigured(): boolean {
    return Boolean(tmdbKey());
  },

  async browse(section: MovieSection): Promise<MovieItem[] | null> {
    if (!tmdbKey()) return null;
    const { path, params } = movieSectionPath(section);
    try {
      const res = await authedFetch(path, params);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data?.results)) return null;
      return data.results.map(mapMovie).filter((m: MovieItem | null): m is MovieItem => m !== null);
    } catch {
      return null;
    }
  },

  async details(id: string): Promise<MovieDetails | null> {
    if (!tmdbKey() || !id) return null;
    try {
      const [movieRes, videosRes, providersRes, releaseDatesRes] = await Promise.all([
        authedFetch(`/movie/${encodeURIComponent(id)}`),
        authedFetch(`/movie/${encodeURIComponent(id)}/videos`),
        authedFetch(`/movie/${encodeURIComponent(id)}/watch/providers`),
        authedFetch(`/movie/${encodeURIComponent(id)}/release_dates`),
      ]);
      if (!movieRes.ok) return null;
      const movie = await movieRes.json();
      const base = mapMovie(movie);
      if (!base) return null;

      let trailerUrl: string | undefined;
      if (videosRes.ok) {
        const vdata = await videosRes.json();
        const trailer = Array.isArray(vdata?.results)
          ? vdata.results.find((v: any) => v?.site === "YouTube" && v?.type === "Trailer") ?? vdata.results.find((v: any) => v?.site === "YouTube")
          : undefined;
        if (trailer?.key) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
      }

      let availableOn: WatchProviderAvailability[] = [];
      if (providersRes.ok) {
        const pdata = await providersRes.json();
        const us = pdata?.results?.US;
        const flat = [...(us?.flatrate ?? []), ...(us?.ads ?? [])];
        availableOn = flat
          .filter((p: any) => typeof p?.provider_name === "string")
          .map((p: any) => ({ name: p.provider_name, logoUrl: poster(p.logo_path, "w342"), link: typeof us?.link === "string" ? us.link : undefined }));
      }

      let certification: string | undefined;
      if (releaseDatesRes.ok) {
        const rdata = await releaseDatesRes.json();
        const us = Array.isArray(rdata?.results) ? rdata.results.find((r: any) => r?.iso_3166_1 === "US") : undefined;
        const withCert = Array.isArray(us?.release_dates) ? us.release_dates.find((d: any) => typeof d?.certification === "string" && d.certification.trim()) : undefined;
        certification = withCert?.certification;
      }

      return { ...base, trailerUrl, availableOn, certification, externalUrl: movie?.id ? `https://www.themoviedb.org/movie/${movie.id}` : undefined };
    } catch {
      return null;
    }
  },
};
