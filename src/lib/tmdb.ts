// TMDB API Client with Multi-Tier Persistent Cache & Automatic Fallback Failover
import { loadStoredSettings } from "./settings";

export type Show = {
  id: number;
  name?: string;
  title?: string;
  original_name?: string;
  original_title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  first_air_date?: string;
  release_date?: string;
  overview?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  popularity?: number;
  media_type?: string;
  origin_country?: string[];
  original_language?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
};

export type CardItem = {
  id: number;
  title: string;
  originalTitle: string;
  poster: string | null;
  backdrop: string | null;
  rating: number;
  year: string;
  overview: string;
  type: "Series" | "Movie";
  genreIds: number[];
  genres: string[];
  popularity?: number;
  voteCount?: number;
  firstAirDate?: string;
  category?: "anime" | "movie" | "webseries";
  isAnime?: boolean;
  isMovie?: boolean;
  originalLanguage?: string;
};

export type SeasonSummary = {
  id: number;
  seasonNumber: number;
  name: string;
  episodeCount: number;
  poster: string | null;
  overview: string;
  airDate: string | null;
};

export type Episode = {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview: string;
  still: string | null;
  airDate: string | null;
  voteAverage: number;
  runtime: number | null;
};

export type SeasonDetails = {
  id: number;
  seasonNumber: number;
  name: string;
  overview: string;
  poster: string | null;
  airDate: string | null;
  episodes: Episode[];
};

export type ShowDetails = {
  id: number;
  type?: "tv" | "movie";
  isMovie?: boolean;
  title: string;
  originalTitle: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  rating: number;
  voteAverage: number;
  voteCount: number;
  firstAirDate: string;
  lastAirDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  language?: string;
  popularity?: number;
  runtime?: number | null;
  countries: string[];
  companies: { id: number; name: string }[];
  status: string;
  genres: string[];
  seasons: SeasonSummary[];
  cast: { id: number; name: string; character: string | null; profile: string | null }[];
  crew: {
    id: number;
    name: string;
    job: string | null;
    department: string | null;
    profile: string | null;
  }[];
  recommendations: CardItem[];
  trailerUrl: string | null;
};

export type Params = Record<string, string | number | boolean | undefined>;

const PROXY_BASE = "/api/tmdb";
const DIRECT_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// Verified Active TMDB API keys pool
const TMDB_KEY_POOL = [
  "ef311eb0b9b07b9c73e9fb0a732cc150",
  "8265bd1679663a7ea12ac168da84d2e8",
  "15d2ea6d0dc1d476efbca3eba2b9bbfb",
  "4e44d9029b1270a757cddc766a1bcb63",
  "3fd2be6f0c70a2a598f084ddfb75487c",
  "2c46288716a18fb7aadcc2a801f3fc6b",
];

let activeKeyIndex = Math.floor(Math.random() * TMDB_KEY_POOL.length);

function getRandomApiKey(): string {
  activeKeyIndex = (activeKeyIndex + 1) % TMDB_KEY_POOL.length;
  return TMDB_KEY_POOL[activeKeyIndex];
}

// Dynamic Date Helpers
export const getTodayDate = () => new Date().toISOString().split("T")[0];
export const getPastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};
export const getCurrentYear = () => new Date().getFullYear();

// Multi-Tier Caching System
type CacheEntry = { at: number; ttl: number; data: unknown };
const memoryCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

const STORAGE_CACHE_PREFIX = "tmdb_cache_v2_";

function getFromPersistentStorage<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(STORAGE_CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.at < parsed.ttl) {
      memoryCache.set(key, parsed);
      return parsed.data as T;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

function saveToPersistentStorage(key: string, ttl: number, data: unknown) {
  try {
    if (typeof window === "undefined") return;
    const entry: CacheEntry = { at: Date.now(), ttl, data };
    sessionStorage.setItem(STORAGE_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // SessionStorage quota exceeded or private mode, gracefully ignore
  }
}

export function clearAllAppCache(clearStorage = false): void {
  try {
    memoryCache.clear();
    pendingRequests.clear();

    if (typeof window !== "undefined") {
      sessionStorage.clear();

      if (clearStorage) {
        const preserveKeys = [
          "anistream_user_settings_v3",
          "anistream_user_settings_v2",
          "anistream_watchlist",
          "animao_watch_history",
        ];
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !preserveKeys.some((p) => key.startsWith(p))) {
            toRemove.push(key);
          }
        }
        for (const k of toRemove) {
          try {
            localStorage.removeItem(k);
          } catch {
            // ignore
          }
        }
      }

      window.dispatchEvent(new CustomEvent("anistream:cache-cleared"));
    }
  } catch {
    // ignore
  }
}

export async function tmdb<T>(path: string, params: Params = {}, signal?: AbortSignal): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const searchParams = new URLSearchParams();
  searchParams.set("endpoint", cleanPath);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && k !== "api_key") {
      searchParams.set(k, String(v));
    }
  }

  const cacheKey = cleanPath + "?" + searchParams.toString();
  const ttl = getEndpointTTL(path);

  // 1. Check in-memory cache
  const inMem = memoryCache.get(cacheKey);
  if (inMem && Date.now() - inMem.at < inMem.ttl) {
    return inMem.data as T;
  }

  // 2. Check persistent storage cache
  const inStorage = getFromPersistentStorage<T>(cacheKey);
  if (inStorage) {
    return inStorage;
  }

  // In-flight deduplication
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) as Promise<T>;
  }

  const execute = async (): Promise<T> => {
    // Try 1: Direct TMDB API with active built-in pool key (Instant response, zero Vercel timeout)
    for (let i = 0; i < 3; i++) {
      try {
        const directController = new AbortController();
        const directTimeoutId = setTimeout(() => directController.abort(), 6000);

        if (signal) {
          if (signal.aborted) {
            clearTimeout(directTimeoutId);
            throw new DOMException("Aborted", "AbortError");
          }
          signal.addEventListener("abort", () => {
            clearTimeout(directTimeoutId);
            directController.abort();
          });
        }

        const apiKey = getRandomApiKey();
        const directUrl = new URL(DIRECT_BASE + cleanPath);
        directUrl.searchParams.set("api_key", apiKey);
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== "" && k !== "api_key") {
            directUrl.searchParams.set(k, String(v));
          }
        }

        const directRes = await fetch(directUrl.toString(), { signal: directController.signal });
        clearTimeout(directTimeoutId);

        if (directRes.ok) {
          const data = (await directRes.json()) as T;
          memoryCache.set(cacheKey, { at: Date.now(), ttl, data });
          saveToPersistentStorage(cacheKey, ttl, data);
          return data;
        }
      } catch {
        // Retry next key in pool
      }
    }

    // Try 2: Server Proxy Failover
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      if (signal && !signal.aborted) {
        signal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          controller.abort();
        });
      }

      const proxyUrl = `${PROXY_BASE}?${searchParams.toString()}`;
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as T;
        memoryCache.set(cacheKey, { at: Date.now(), ttl, data });
        saveToPersistentStorage(cacheKey, ttl, data);
        return data;
      }
    } catch {
      // Proxy failed or timed out
    }

    // Try 3: Last Resort — Return stale cache data if available instead of crashing!
    if (inMem?.data) {
      return inMem.data as T;
    }
    const rawStale =
      typeof window !== "undefined"
        ? sessionStorage.getItem(STORAGE_CACHE_PREFIX + cacheKey)
        : null;
    if (rawStale) {
      try {
        const parsed = JSON.parse(rawStale) as CacheEntry;
        if (parsed.data) return parsed.data as T;
      } catch {
        // ignore
      }
    }

    throw new Error(`Data is temporarily unavailable for ${cleanPath}`);
  };

  const promise = execute().finally(() => {
    pendingRequests.delete(cacheKey);
  });

  pendingRequests.set(cacheKey, promise);
  return promise;
}

export const ANIMATION_GENRE = 16;
export const JAPAN_ORIGIN = "JP";

export const DISCOVER_BASE: Params = {
  include_adult: "true",
  include_null_first_air_dates: "false",
};

export const knownMediaTypeMap = new Map<number, "movie" | "tv">();

export function setKnownMediaType(id: number, type: "movie" | "tv") {
  if (!id) return;
  knownMediaTypeMap.set(id, type);
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`media_type_${id}`, type);
    }
  } catch {
    // Ignore
  }
}

export function getKnownMediaType(id: number): "movie" | "tv" | undefined {
  if (knownMediaTypeMap.has(id)) return knownMediaTypeMap.get(id);
  try {
    if (typeof window !== "undefined") {
      const val = sessionStorage.getItem(`media_type_${id}`);
      if (val === "movie" || val === "tv") {
        knownMediaTypeMap.set(id, val);
        return val;
      }
    }
  } catch {
    // Ignore
  }
  return undefined;
}

export const knownCardMap = new Map<number, CardItem>();

export function getKnownCard(id: number): CardItem | undefined {
  if (knownCardMap.has(id)) return knownCardMap.get(id);
  try {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(`card_item_${id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CardItem;
        knownCardMap.set(id, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return undefined;
}

export function isAnimeShow(s: Show): boolean {
  const isJap = s.original_language === "ja" || s.origin_country?.includes("JP");
  const isAnim =
    s.genre_ids?.includes(16) ||
    s.genres?.some((g) => g.id === 16 || /animation/i.test(g.name)) ||
    s.origin_country?.includes("JP");
  return Boolean(isJap && isAnim);
}

export const toCard = (s: Show): CardItem => {
  const isMovie = s.media_type === "movie" || (!s.first_air_date && !!s.release_date);
  const isAnimeItem = isAnimeShow(s);
  const category: "anime" | "movie" | "webseries" = isAnimeItem
    ? "anime"
    : isMovie
      ? "movie"
      : "webseries";

  if (s.id) {
    setKnownMediaType(s.id, isMovie ? "movie" : "tv");
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`media_category_${s.id}`, category);
      }
    } catch {
      // Ignore
    }
  }
  const date = isMovie ? s.release_date || "" : s.first_air_date || s.release_date || "";
  const year = date ? date.slice(0, 4) : "";
  const genreIds = s.genre_ids || (s.genres ? s.genres.map((g) => g.id) : []);
  const genreNames = s.genres ? s.genres.map((g) => g.name) : [];
  const card: CardItem = {
    id: s.id,
    title: s.name || s.title || "Untitled",
    originalTitle: s.original_name || s.original_title || s.name || s.title || "",
    poster: s.poster_path ?? null,
    backdrop: s.backdrop_path ?? s.poster_path ?? null,
    rating: Math.round((s.vote_average ?? 0) * 10) / 10,
    year,
    overview: s.overview || "",
    type: isMovie ? "Movie" : "Series",
    category,
    isAnime: isAnimeItem,
    isMovie,
    originalLanguage: s.original_language,
    genreIds,
    genres: genreNames,
    popularity: s.popularity,
    voteCount: s.vote_count,
    firstAirDate: s.first_air_date,
  };
  if (s.id) {
    knownCardMap.set(s.id, card);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`card_item_${s.id}`, JSON.stringify(card));
      }
    } catch {
      // Ignore
    }
  }
  return card;
};

// 1. Explicit 18+ / Hentai / Ecchi blocklist (Blocked by default, unblocked ONLY when adultMode === true)
export const EXPLICIT_ADULT_BLOCKLIST = [
  "overflow",
  "caressing my hibernating bear",
  "mori no kuma-san",
  "show time! kanojo",
  "show time!",
  "boku no pico",
  "redo of healer",
  "kaifuku jutsushi",
  "interspecies reviewers",
  "ishuzoku reviewers",
  "aki sora",
  "kiss x sis",
  "kiss sis",
  "yosuga no sora",
  "euphoria",
  "night shift nurses",
  "discipline",
  "bible black",
  "resort boin",
  "princess lover",
  "valkyrie drive",
  "seikon no qwaser",
  "world's end harem",
  "shuumatsu no harem",
  "harem in the labyrinth of another world",
  "isekai meikyuu de harem",
  "peter grill",
  "futabu",
  "kanojo x kanojo",
  "tamashii insert",
  "sweet home: h",
  "fault!!",
  "master piece",
  "hentai",
  "ecchi",
  "erotic",
  "nudity",
  "uncensored",
  "nsfw",
  "smut",
  "borderline hentai",
  "explicit sex",
  "sexual content",
  "yaoi",
  "yuri",
  "boys love",
  "boy's love",
  "hibernating bear",
  "sensual",
  "fetish",
  "lewd",
  "incest",
  "voyeur",
  "eromanga",
];

// 2. Safe Family Mode Blocklist (1000% clean family-safe: blocks harem, suggestive fanservice, cartoons)
export const FAMILY_SAFE_BLOCKLIST = [
  ...EXPLICIT_ADULT_BLOCKLIST,
  "high school dxd",
  "highschool dxd",
  "to love ru",
  "to love-ru",
  "prison school",
  "monster musume",
  "why the hell are you here, teacher",
  "nande koko ni sensei",
  "domestic girlfriend",
  "domestic na kanojo",
  "scum's wish",
  "kuzu no honkai",
  "shimoneta",
  "keijo",
  "valkyrie drive",
  "harem",
  "bathhouse",
  "bikini",
  "underwear",
  "lingerie",
  "steamy",
  "seductive",
  "lust",
  "erotica",
];

// 3. Non-Anime Kids Cartoon Blocklist (Keeps only real anime)
export const NON_ANIME_CARTOON_BLOCKLIST = [
  "crayon shin-chan",
  "shin-chan",
  "shinchan",
  "shin chan",
  "chhota bheem",
  "motu patlu",
  "oggy and the cockroaches",
  "tom and jerry",
  "peppa pig",
  "mickey mouse",
  "ben 10",
  "looney tunes",
  "spongebob",
];

export function isFilteredAnime(
  item: {
    name?: string;
    title?: string;
    original_name?: string;
    original_title?: string;
    overview?: string;
  },
  settings?: {
    safeMode?: boolean;
    adultMode?: boolean;
    onlyAdultMode?: boolean;
    normalMode?: boolean;
  },
): boolean {
  const nameStr =
    `${item.name || ""} ${item.title || ""} ${item.original_name || ""} ${item.original_title || ""}`.toLowerCase();
  const overviewStr = (item.overview || "").toLowerCase();
  const fullText = `${nameStr} ${overviewStr}`;

  // Always block non-anime kids cartoons (like Shinchan, Motu Patlu)
  if (NON_ANIME_CARTOON_BLOCKLIST.some((k) => nameStr.includes(k))) {
    return false;
  }

  // 1. Only 18+ Adult Mode: Display ONLY 18+ mature and ecchi titles
  if (settings?.onlyAdultMode) {
    return EXPLICIT_ADULT_BLOCKLIST.some((k) => fullText.includes(k));
  }

  // 2. Safe Family Mode: 1000% strict filtering
  if (settings?.safeMode) {
    if (FAMILY_SAFE_BLOCKLIST.some((k) => fullText.includes(k))) {
      return false;
    }
    return true;
  }

  // 3. Normal / Standard Mode (Default ON for all users):
  // Unless adultMode or onlyAdultMode is active, explicit adult/hentai titles are filtered
  if (!settings?.adultMode && !settings?.onlyAdultMode) {
    if (EXPLICIT_ADULT_BLOCKLIST.some((k) => fullText.includes(k))) {
      return false;
    }
  }

  return true;
}

// Dark Gore Mode keywords
const DARK_KEYWORDS = [
  "dark",
  "gore",
  "horror",
  "psychological",
  "berserk",
  "tokyo ghoul",
  "chainsaw",
  "attack on titan",
  "death note",
  "psycho-pass",
  "parasyte",
  "monster",
  "hellsing",
  "akame ga kill",
  "vinland saga",
  "jujutsu kaisen",
  "demon slayer",
  "deadman",
  "claymore",
  "hunter x hunter",
  "bleach",
];

export const isAnime = (s: Show) =>
  (s.original_language === "ja" || s.origin_country?.includes(JAPAN_ORIGIN)) &&
  (s.genre_ids?.includes(ANIMATION_GENRE) ||
    s.genres?.some((g) => g.id === ANIMATION_GENRE) ||
    s.origin_country?.includes(JAPAN_ORIGIN)) &&
  !NON_ANIME_CARTOON_BLOCKLIST.some((k) =>
    (s.name || s.title || s.original_name || s.original_title || "").toLowerCase().includes(k),
  );

export async function discover(extra: Params = {}, page = 1) {
  try {
    const data = await tmdb<{ results: Show[]; total_pages: number; page: number }>(
      "/discover/tv",
      {
        sort_by: "popularity.desc",
        ...DISCOVER_BASE,
        ...extra,
        page,
      },
    );

    return {
      page: data.page,
      totalPages: Math.min(data.total_pages ?? 1, 500),
      items: (data.results ?? []).map((s) => toCard({ ...s, media_type: "tv" })),
    };
  } catch {
    return {
      page,
      totalPages: 1,
      items: [] as CardItem[],
    };
  }
}

export async function discoverMovies(extra: Params = {}, page = 1) {
  try {
    const data = await tmdb<{ results: Show[]; total_pages: number; page: number }>(
      "/discover/movie",
      {
        sort_by: "popularity.desc",
        ...DISCOVER_BASE,
        ...extra,
        page,
      },
    );

    return {
      page: data.page,
      totalPages: Math.min(data.total_pages ?? 1, 500),
      items: (data.results ?? []).map((s) => toCard({ ...s, media_type: "movie" })),
    };
  } catch {
    return {
      page,
      totalPages: 1,
      items: [] as CardItem[],
    };
  }
}

export async function trending(page = 1, timeWindow: "week" | "day" = "week") {
  try {
    const [allTrending, tvTrending, movieTrending] = await Promise.all([
      tmdb<{ results: Show[]; total_pages: number }>(`/trending/all/${timeWindow}`, {
        page,
      }).catch(() => null),
      tmdb<{ results: Show[]; total_pages: number }>(`/trending/tv/${timeWindow}`, {
        page,
      }).catch(() => null),
      tmdb<{ results: Show[]; total_pages: number }>(`/trending/movie/${timeWindow}`, {
        page,
      }).catch(() => null),
    ]);

    const combinedList = [
      ...(allTrending?.results ?? []),
      ...(tvTrending?.results ?? []),
      ...(movieTrending?.results ?? []),
    ];

    const seenIds = new Set<number>();
    const uniqueResults: Show[] = [];
    for (const item of combinedList) {
      if (item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueResults.push(item);
      }
    }

    if (uniqueResults.length > 0) {
      return {
        page,
        totalPages: Math.min(allTrending?.total_pages ?? 20, 500),
        items: uniqueResults.slice(0, 24).map(toCard),
      };
    }
  } catch {
    // Fall back to discover below
  }

  return discover({ sort_by: "popularity.desc" }, page);
}

export async function searchAnime(
  query: string,
  page = 1,
  signal?: AbortSignal,
  _options?: { bypassFilter?: boolean },
) {
  try {
    const [multiData, tvData, movieData] = await Promise.all([
      tmdb<{ results: Show[]; total_pages: number }>(
        "/search/multi",
        {
          query,
          page,
          include_adult: "true",
        },
        signal,
      ).catch(() => ({ results: [] as Show[], total_pages: 0 })),
      tmdb<{ results: Show[]; total_pages: number }>(
        "/search/tv",
        {
          query,
          page,
          include_adult: "true",
        },
        signal,
      ).catch(() => ({ results: [] as Show[], total_pages: 0 })),
      tmdb<{ results: Show[]; total_pages: number }>(
        "/search/movie",
        {
          query,
          page,
          include_adult: "true",
        },
        signal,
      ).catch(() => ({ results: [] as Show[], total_pages: 0 })),
    ]);

    const tvList = (tvData.results ?? []).map((s) => ({ ...s, media_type: s.media_type || "tv" }));
    const movieList = (movieData.results ?? []).map((s) => ({ ...s, media_type: "movie" }));
    const multiList = (multiData.results ?? []).filter(
      (s) => s.media_type === "tv" || s.media_type === "movie",
    );

    const rawList = [...multiList, ...tvList, ...movieList].sort(
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
    );

    const seenIds = new Set<number>();
    const uniqueResults: CardItem[] = [];
    for (const item of rawList) {
      if (item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueResults.push(toCard(item));
      }
    }

    return {
      page: 1,
      totalPages: Math.max(
        tvData.total_pages ?? 1,
        movieData.total_pages ?? 1,
        multiData.total_pages ?? 1,
        1,
      ),
      items: uniqueResults,
    };
  } catch {
    return {
      page: 1,
      totalPages: 0,
      items: [] as CardItem[],
    };
  }
}

const detailsMemoryCache = new Map<number, { at: number; data: ShowDetails }>();
const seasonMemoryCache = new Map<string, { at: number; data: SeasonDetails }>();

function deduplicateCreditsCast(
  cast: { id: number; name: string; character?: string | null; profile_path?: string | null }[],
) {
  const map = new Map<
    number,
    { id: number; name: string; character: string | null; profile: string | null }
  >();
  for (const c of cast || []) {
    if (!c || !c.id || !c.name) continue;
    const existing = map.get(c.id);
    if (!existing) {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        character: c.character || null,
        profile: c.profile_path || null,
      });
    } else if (c.character && existing.character && !existing.character.includes(c.character)) {
      existing.character = `${existing.character}, ${c.character}`;
    }
  }
  return Array.from(map.values()).slice(0, 30);
}

function deduplicateCreditsCrew(
  crew: {
    id: number;
    name: string;
    job?: string | null;
    department?: string | null;
    profile_path?: string | null;
  }[],
) {
  const map = new Map<
    number,
    {
      id: number;
      name: string;
      job: string | null;
      department: string | null;
      profile: string | null;
    }
  >();
  for (const c of crew || []) {
    if (!c || !c.id || !c.name) continue;
    const existing = map.get(c.id);
    if (!existing) {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        job: c.job || null,
        department: c.department || null,
        profile: c.profile_path || null,
      });
    } else if (c.job && existing.job && !existing.job.includes(c.job)) {
      existing.job = `${existing.job}, ${c.job}`;
    }
  }
  return Array.from(map.values()).slice(0, 24);
}

async function fetchTvDetails(id: number): Promise<ShowDetails> {
  const [show, credits, recs, videos] = await Promise.all([
    tmdb<
      Show & {
        last_air_date?: string;
        number_of_seasons?: number;
        number_of_episodes?: number;
        episode_run_time?: number[];
        origin_country?: string[];
        production_countries?: { iso_3166_1: string; name: string }[];
        production_companies?: { id: number; name: string }[];
        genres?: { id: number; name: string }[];
        seasons?: {
          id: number;
          season_number: number;
          name?: string;
          episode_count?: number;
          poster_path?: string | null;
          overview?: string;
          air_date?: string | null;
        }[];
      }
    >(`/tv/${id}`),
    tmdb<{
      cast: { id: number; name: string; character: string | null; profile_path: string | null }[];
      crew: {
        id: number;
        name: string;
        job: string | null;
        department: string | null;
        profile_path: string | null;
      }[];
    }>(`/tv/${id}/credits`).catch(() => ({
      cast: [],
      crew: [],
    })),
    tmdb<{ results: Show[] }>(`/tv/${id}/recommendations`).catch(() => ({
      results: [],
    })),
    tmdb<{
      results: { key: string; site: string; type: string; official?: boolean }[];
    }>(`/tv/${id}/videos`).catch(() => ({ results: [] })),
  ]);

  const trailer =
    videos.results.find(
      (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
    ) || videos.results.find((v) => v.site === "YouTube");

  const runtime = show.episode_run_time?.[0] ?? null;

  setKnownMediaType(id, "tv");

  return {
    id: show.id,
    type: "tv",
    isMovie: false,
    title: show.name || show.title || "Untitled",
    originalTitle: show.original_name || show.original_title || "",
    overview: show.overview || "No synopsis available.",
    poster: show.poster_path ?? null,
    backdrop: show.backdrop_path ?? show.poster_path ?? null,
    rating: Math.round((show.vote_average ?? 0) * 10) / 10,
    voteAverage: show.vote_average ?? 0,
    voteCount: show.vote_count ?? 0,
    firstAirDate: show.first_air_date || show.release_date || "",
    lastAirDate: show.last_air_date,
    numberOfSeasons: show.number_of_seasons ?? 1,
    numberOfEpisodes: show.number_of_episodes ?? 0,
    language: show.original_language?.toUpperCase() || "JA",
    popularity: show.popularity ?? 0,
    runtime,
    countries: show.production_countries?.map((c) => c.name) || show.origin_country || ["Japan"],
    companies: show.production_companies || [],
    status: show.status || "Ended",
    genres: (show.genres || []).map((g) => g.name),
    seasons: (show.seasons || [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        id: s.id,
        seasonNumber: s.season_number,
        name: s.name || `Season ${s.season_number}`,
        episodeCount: s.episode_count ?? 0,
        poster: s.poster_path ?? null,
        overview: s.overview || "",
        airDate: s.air_date ?? null,
      })),
    cast: deduplicateCreditsCast(credits.cast || []),
    crew: deduplicateCreditsCrew(credits.crew || []),
    recommendations: (recs.results || []).slice(0, 12).map(toCard),
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
  };
}

async function fetchMovieDetails(id: number): Promise<ShowDetails> {
  const [movie, credits, recs, videos] = await Promise.all([
    tmdb<
      Show & {
        release_date?: string;
        runtime?: number | null;
        production_countries?: { iso_3166_1: string; name: string }[];
        production_companies?: { id: number; name: string }[];
        genres?: { id: number; name: string }[];
      }
    >(`/movie/${id}`),
    tmdb<{
      cast: { id: number; name: string; character: string | null; profile_path: string | null }[];
      crew: {
        id: number;
        name: string;
        job: string | null;
        department: string | null;
        profile_path: string | null;
      }[];
    }>(`/movie/${id}/credits`).catch(() => ({
      cast: [],
      crew: [],
    })),
    tmdb<{ results: Show[] }>(`/movie/${id}/recommendations`).catch(() => ({
      results: [],
    })),
    tmdb<{
      results: { key: string; site: string; type: string; official?: boolean }[];
    }>(`/movie/${id}/videos`).catch(() => ({ results: [] })),
  ]);

  const trailer =
    videos.results.find(
      (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
    ) || videos.results.find((v) => v.site === "YouTube");

  const movieTitle = movie.title || movie.name || "Movie";

  setKnownMediaType(id, "movie");

  return {
    id: movie.id,
    type: "movie",
    isMovie: true,
    title: movieTitle,
    originalTitle: movie.original_title || movie.original_name || movieTitle,
    overview: movie.overview || "No synopsis available.",
    poster: movie.poster_path ?? null,
    backdrop: movie.backdrop_path ?? movie.poster_path ?? null,
    rating: Math.round((movie.vote_average ?? 0) * 10) / 10,
    voteAverage: movie.vote_average ?? 0,
    voteCount: movie.vote_count ?? 0,
    firstAirDate: movie.release_date || "",
    lastAirDate: movie.release_date,
    numberOfSeasons: 1,
    numberOfEpisodes: 1,
    language: movie.original_language?.toUpperCase() || "JA",
    popularity: movie.popularity ?? 0,
    runtime: movie.runtime ?? null,
    countries: movie.production_countries?.map((c) => c.name) || ["Japan"],
    companies: movie.production_companies || [],
    status: movie.status || "Released",
    genres: (movie.genres || []).map((g) => g.name),
    seasons: [
      {
        id: movie.id,
        seasonNumber: 1,
        name: "Movie",
        episodeCount: 1,
        poster: movie.poster_path ?? null,
        overview: movie.overview || "",
        airDate: movie.release_date ?? null,
      },
    ],
    cast: deduplicateCreditsCast(credits.cast || []),
    crew: deduplicateCreditsCrew(credits.crew || []),
    recommendations: (recs.results || []).slice(0, 12).map(toCard),
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
  };
}

export async function details(id: number): Promise<ShowDetails> {
  const now = Date.now();
  const inMem = detailsMemoryCache.get(id);
  if (inMem && now - inMem.at < 1000 * 60 * 60) {
    return inMem.data;
  }

  const inStorage = getFromPersistentStorage<ShowDetails>(`detail_cache_${id}`);
  if (inStorage) {
    detailsMemoryCache.set(id, { at: now, data: inStorage });
    return inStorage;
  }

  let result: ShowDetails;
  const knownType = getKnownMediaType(id);

  if (knownType === "movie") {
    result = await fetchMovieDetails(id);
  } else {
    try {
      result = await fetchTvDetails(id);
    } catch {
      result = await fetchMovieDetails(id);
    }
  }

  detailsMemoryCache.set(id, { at: now, data: result });
  saveToPersistentStorage(`detail_cache_${id}`, 1000 * 60 * 60, result);
  return result;
}

export async function season(id: number, seasonNumber: number): Promise<SeasonDetails> {
  const cacheKey = `${id}_${seasonNumber}`;
  const inMem = seasonMemoryCache.get(cacheKey);
  if (inMem && Date.now() - inMem.at < 1000 * 60 * 60) {
    return inMem.data;
  }

  const inStorage = getFromPersistentStorage<SeasonDetails>(`season_cache_${cacheKey}`);
  if (inStorage) {
    seasonMemoryCache.set(cacheKey, { at: Date.now(), data: inStorage });
    return inStorage;
  }

  let result: SeasonDetails;
  try {
    const data = await tmdb<{
      id: number;
      season_number: number;
      name: string;
      overview: string;
      poster_path: string | null;
      air_date: string | null;
      episodes: {
        id: number;
        episode_number: number;
        name: string;
        overview: string;
        still_path: string | null;
        air_date: string | null;
        vote_average: number;
        runtime: number | null;
      }[];
    }>(`/tv/${id}/season/${seasonNumber}`);

    result = {
      id: data.id,
      seasonNumber: data.season_number,
      name: data.name || `Season ${data.season_number}`,
      overview: data.overview || "",
      poster: data.poster_path ?? null,
      airDate: data.air_date ?? null,
      episodes: (data.episodes || []).map((e) => ({
        id: e.id,
        episodeNumber: e.episode_number,
        seasonNumber,
        name: e.name || `Episode ${e.episode_number}`,
        overview: e.overview || "",
        still: e.still_path ?? null,
        airDate: e.air_date ?? null,
        voteAverage: Math.round((e.vote_average ?? 0) * 10) / 10,
        runtime: e.runtime ?? null,
      })),
    };
  } catch {
    // If TV season fails, fallback to Movie endpoint
    const movie = await tmdb<{
      id: number;
      title?: string;
      name?: string;
      overview?: string;
      poster_path?: string | null;
      backdrop_path?: string | null;
      release_date?: string | null;
      vote_average?: number;
      runtime?: number | null;
    }>(`/movie/${id}`);

    result = {
      id: movie.id,
      seasonNumber: 1,
      name: "Movie",
      overview: movie.overview || "",
      poster: movie.poster_path ?? null,
      airDate: movie.release_date ?? null,
      episodes: [
        {
          id: movie.id,
          episodeNumber: 1,
          seasonNumber: 1,
          name: movie.title || movie.name || "Full Movie",
          overview: movie.overview || "",
          still: movie.backdrop_path ?? movie.poster_path ?? null,
          airDate: movie.release_date ?? null,
          voteAverage: Math.round((movie.vote_average ?? 0) * 10) / 10,
          runtime: movie.runtime ?? null,
        },
      ],
    };
  }

  seasonMemoryCache.set(cacheKey, { at: Date.now(), data: result });
  saveToPersistentStorage(`season_cache_${cacheKey}`, 1000 * 60 * 60, result);
  return result;
}

export async function keywordId(keyword: string): Promise<number | null> {
  try {
    const data = await tmdb<{ results: { id: number; name: string }[] }>("/search/keyword", {
      query: keyword,
    });
    return data.results?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

function getEndpointTTL(path: string): number {
  if (path.includes("/trending")) return 1000 * 60 * 60 * 2; // 2 hours
  if (path.includes("/discover")) return 1000 * 60 * 60 * 4; // 4 hours
  if (path.includes("/season/")) return 1000 * 60 * 60 * 24; // 24 hours
  if (path.startsWith("/tv/")) return 1000 * 60 * 60 * 12; // 12 hours
  return 1000 * 60 * 30; // 30 mins
}

export type PersonDetailsWithCredits = {
  id: number;
  name: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  placeOfBirth?: string | null;
  profilePath?: string | null;
  knownForDepartment?: string;
  works: (CardItem & { character?: string; job?: string })[];
};

export async function fetchPersonDetailsAndWorks(
  personId: number,
): Promise<PersonDetailsWithCredits> {
  const [person, credits] = await Promise.all([
    tmdb<{
      id: number;
      name: string;
      biography?: string;
      birthday?: string | null;
      deathday?: string | null;
      place_of_birth?: string | null;
      profile_path?: string | null;
      known_for_department?: string;
    }>(`/person/${personId}`).catch(() => ({
      id: personId,
      name: "Artist",
      biography: "",
      birthday: null,
      deathday: null,
      place_of_birth: null,
      profile_path: null,
      known_for_department: "Acting",
    })),
    tmdb<{
      cast: (Show & { character?: string })[];
      crew: (Show & { job?: string; department?: string })[];
    }>(`/person/${personId}/combined_credits`).catch(() => ({
      cast: [],
      crew: [],
    })),
  ]);

  const castRaw = credits.cast || [];
  const crewRaw = credits.crew || [];

  const seen = new Set<number>();
  const works: (CardItem & { character?: string; job?: string })[] = [];

  const isAnimeOrAnim = (s: Show) =>
    isAnime(s) ||
    (s.genre_ids && s.genre_ids.includes(ANIMATION_GENRE)) ||
    s.original_language === "ja" ||
    (s.origin_country && s.origin_country.includes("JP"));

  const animeCast = castRaw.filter(isAnimeOrAnim);
  const animeCrew = crewRaw.filter(isAnimeOrAnim);
  const otherCast = castRaw.filter((s) => !isAnimeOrAnim(s));
  const otherCrew = crewRaw.filter((s) => !isAnimeOrAnim(s));

  for (const item of animeCast) {
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      const card = toCard(item);
      works.push({
        ...card,
        character: item.character || undefined,
      });
    }
  }

  for (const item of animeCrew) {
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      const card = toCard(item);
      works.push({
        ...card,
        job: item.job || item.department || undefined,
      });
    }
  }

  for (const item of [...otherCast, ...otherCrew]) {
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      const card = toCard(item);
      works.push({
        ...card,
        character: "character" in item ? (item as { character?: string }).character : undefined,
        job: "job" in item ? (item as { job?: string }).job : undefined,
      });
    }
  }

  // Sort works by popularity or rating
  works.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  return {
    id: person.id,
    name: person.name,
    biography: person.biography || "",
    birthday: person.birthday,
    deathday: person.deathday,
    placeOfBirth: person.place_of_birth,
    profilePath: person.profile_path,
    knownForDepartment: person.known_for_department,
    works,
  };
}
