import { findGenre, animeMatchesGenre } from "./genres";
import {
  type CardItem,
  details,
  searchAnime,
  season,
  tmdb,
  toCard,
  trending as fetchTmdbTrending,
  discover as fetchTmdbDiscover,
  discoverMovies as fetchTmdbDiscoverMovies,
  ANIMATION_GENRE,
  type Show,
} from "./tmdb";

// In-memory cache for CardItems with TTL
const animeCardCache = new Map<number, { at: number; item: CardItem }>();

export async function fetchCardItemsByIds(ids: number[]): Promise<CardItem[]> {
  if (!ids || ids.length === 0) return [];
  const now = Date.now();

  const items = await Promise.all(
    ids.map(async (id) => {
      const cached = animeCardCache.get(id);
      if (cached && now - cached.at < 1000 * 60 * 60 && cached.item.poster) {
        return cached.item;
      }
      try {
        let s: Show;
        try {
          s = await tmdb<Show>(`/tv/${id}`);
        } catch {
          s = await tmdb<Show>(`/movie/${id}`);
          s.media_type = "movie";
        }
        const card = toCard(s);
        animeCardCache.set(id, { at: now, item: card });
        return card;
      } catch {
        return null;
      }
    }),
  );

  return items.filter((i): i is CardItem => i !== null);
}

// In-memory cache for home feed to deliver instant 0ms loads on revisits
let cachedHomeFeed: { at: number; data: Awaited<ReturnType<typeof fetchHomeDirect>> } | null = null;

async function fetchHomeDirect() {
  const [trendingRes, tvSeriesRes, moviesRes, topRatedRes, animeRes, actionRes] = await Promise.all(
    [
      fetchTmdbTrending(1, "week").catch(() => ({ items: [] as CardItem[] })),
      fetchTmdbDiscover({ sort_by: "popularity.desc" }, 1).catch(() => ({
        items: [] as CardItem[],
      })),
      fetchTmdbDiscoverMovies({ sort_by: "popularity.desc" }, 1).catch(() => ({
        items: [] as CardItem[],
      })),
      fetchTmdbDiscover({ sort_by: "vote_average.desc", "vote_count.gte": "200" }, 1).catch(() => ({
        items: [] as CardItem[],
      })),
      fetchTmdbDiscover({ with_genres: `${ANIMATION_GENRE}` }, 1).catch(() => ({
        items: [] as CardItem[],
      })),
      fetchTmdbDiscover({ with_genres: "28,10759" }, 1).catch(() => ({
        items: [] as CardItem[],
      })),
    ],
  );

  const trendingCards = trendingRes.items || [];
  const tvSeriesCards = tvSeriesRes.items || [];
  const movieCards = moviesRes.items || [];
  const topRatedCards = topRatedRes.items || [];
  const animeCards = animeRes.items || [];
  const actionCards = actionRes.items || [];

  // Deduplicate and select Hero banners with backdrops
  const heroCandidates = [...trendingCards, ...movieCards, ...tvSeriesCards].filter((c) =>
    Boolean(c.backdrop),
  );
  const seenHeroIds = new Set<number>();
  const heroItems: CardItem[] = [];

  for (const item of heroCandidates) {
    if (!seenHeroIds.has(item.id)) {
      seenHeroIds.add(item.id);
      heroItems.push(item);
      if (heroItems.length >= 10) break;
    }
  }

  // Fallback hero if needed
  if (heroItems.length === 0 && trendingCards.length > 0) {
    heroItems.push(...trendingCards.slice(0, 5));
  }

  // Netflix Top 10 Today list
  const top10 = trendingCards.slice(0, 10);

  return {
    hero: heroItems,
    trending: trendingCards,
    top10,
    tvSeries: tvSeriesCards,
    movies: movieCards,
    popular: tvSeriesCards,
    topRated: topRatedCards,
    animeHits: animeCards,
    actionAdventure: actionCards.length > 0 ? actionCards : movieCards.slice(0, 15),
    fantasySupernatural: animeCards.slice(0, 15),
    romanceDrama: movieCards.filter((c) => c.genres?.some((g) => /romance|drama|comedy/i.test(g))),
    latest: trendingCards.slice().reverse(),
    totalConfigured: trendingCards.length + movieCards.length + tvSeriesCards.length,
  };
}

export async function fetchHome() {
  const now = Date.now();
  if (cachedHomeFeed && now - cachedHomeFeed.at < 1000 * 60 * 10) {
    return cachedHomeFeed.data;
  }
  const data = await fetchHomeDirect();
  cachedHomeFeed = { at: now, data };
  return data;
}

export async function getTrending(page = 1, timeWindow: "week" | "day" = "week") {
  return fetchTmdbTrending(page, timeWindow);
}

export async function getPopular(page = 1) {
  return fetchTmdbDiscover({ sort_by: "popularity.desc" }, page);
}

export async function getTopRated(page = 1) {
  return fetchTmdbDiscover({ sort_by: "vote_average.desc", "vote_count.gte": "150" }, page);
}

export async function getLatest(page = 1) {
  return fetchTmdbDiscover({ sort_by: "first_air_date.desc", "vote_count.gte": "10" }, page);
}

export async function getSearch(
  q: unknown,
  page = 1,
  signal?: AbortSignal,
  options?: { bypassFilter?: boolean },
) {
  let query = "";
  if (typeof q === "string") {
    query = q.trim();
  } else if (q && typeof q === "object") {
    const d = (q as Record<string, unknown>).data || q;
    query = String(
      (d as Record<string, unknown>).q || (d as Record<string, unknown>).query || "",
    ).trim();
  }

  if (!query) return { page: 1, totalPages: 0, items: [] as CardItem[] };

  return searchAnime(query, page, signal, options);
}

export async function fetchShow({ data }: { data: { id: number } }) {
  return details(data.id);
}

export async function fetchSeason({ data }: { data: { id: number; seasonNumber: number } }) {
  return season(data.id, data.seasonNumber);
}

export async function fetchBrowseCategory(
  category: "all" | "trending" | "popular" | "top_rated" | "latest",
  page = 1,
) {
  switch (category) {
    case "trending":
      return getTrending(page);
    case "popular":
      return getPopular(page);
    case "top_rated":
      return getTopRated(page);
    case "latest":
      return getLatest(page);
    case "all":
    default:
      return getTrending(page);
  }
}

export async function fetchByGenre(genreSlug: string, page = 1) {
  const genreObj = findGenre(genreSlug);
  if (!genreObj) return { page: 1, totalPages: 0, items: [] as CardItem[] };

  // If genre has a direct TMDB ID
  if (genreObj.tmdbId) {
    return fetchTmdbDiscover({ with_genres: `${ANIMATION_GENRE},${genreObj.tmdbId}` }, page);
  }

  // Fallback: fetch popular and filter by genre
  const pop = await fetchTmdbDiscover({ sort_by: "popularity.desc" }, page);
  const matched = pop.items.filter((item) => animeMatchesGenre(item, genreSlug));
  return {
    page: pop.page,
    totalPages: pop.totalPages,
    items: matched,
  };
}

export async function fetchSearch(
  queryOrArgs:
    | string
    | {
        data?: {
          q?: string;
          query?: string;
          page?: number;
          signal?: AbortSignal;
          bypassFilter?: boolean;
        };
        page?: number;
        bypassFilter?: boolean;
      },
  page = 1,
  options?: { bypassFilter?: boolean },
) {
  let qStr = "";
  let pNum = page;
  let sig: AbortSignal | undefined;
  let bypass = options?.bypassFilter;

  if (typeof queryOrArgs === "string") {
    qStr = queryOrArgs;
  } else if (queryOrArgs && typeof queryOrArgs === "object") {
    const raw = queryOrArgs as Record<string, unknown>;
    const d = (raw.data as Record<string, unknown> | undefined) || raw;
    qStr = String(d.q || d.query || "");
    if (typeof d.page === "number") pNum = d.page;
    if (d.signal instanceof AbortSignal) sig = d.signal;
    if (d.bypassFilter !== undefined) bypass = Boolean(d.bypassFilter);
  }

  return getSearch(qStr, pNum, sig, { bypassFilter: bypass });
}

export async function fetchTrending(args?: { data?: { page?: number } }) {
  return getTrending(args?.data?.page ?? 1);
}

export async function fetchPopular(args?: { data?: { page?: number } }) {
  return getPopular(args?.data?.page ?? 1);
}

export async function fetchTopRated(args?: { data?: { page?: number } }) {
  return getTopRated(args?.data?.page ?? 1);
}

export async function fetchLatest(args?: { data?: { page?: number } }) {
  return getLatest(args?.data?.page ?? 1);
}

export async function fetchWatchlistItems({ data }: { data: { ids: number[] } }) {
  return fetchCardItemsByIds(data.ids);
}

export async function fetchPerson({ data }: { data: { id: number } }) {
  const { fetchPersonDetailsAndWorks } = await import("./tmdb");
  return fetchPersonDetailsAndWorks(data.id);
}
