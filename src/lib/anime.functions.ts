import { findGenre, GENRES } from "./genres";
import { loadStoredSettings } from "./settings";
import {
  type CardItem,
  details,
  discover,
  getPastDate,
  getTodayDate,
  keywordId,
  searchAnime,
  season,
  tmdb,
  toCard,
  trending,
  type Show,
} from "./tmdb";

// Helper to fetch multiple CardItems for a list of anime IDs with caching
const animeCardCache = new Map<number, { at: number; item: CardItem }>();

export async function fetchCardItemsByIds(ids: number[]): Promise<CardItem[]> {
  if (!ids || ids.length === 0) return [];
  const now = Date.now();

  const items = await Promise.all(
    ids.map(async (id) => {
      const cached = animeCardCache.get(id);
      if (cached && now - cached.at < 1000 * 60 * 30) {
        return cached.item;
      }
      try {
        const s = await tmdb<Show>(`/tv/${id}`);
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

export async function getTrending(page = 1, timeWindow: "week" | "day" = "week") {
  return trending(page, timeWindow);
}

export async function getPopular(page = 1) {
  return discover({ sort_by: "popularity.desc" }, page);
}

export async function getTopRated(page = 1) {
  return discover({ sort_by: "vote_average.desc", "vote_count.gte": 100 }, page);
}

export async function getLatest(page = 1) {
  return discover(
    {
      sort_by: "first_air_date.desc",
      "first_air_date.lte": getTodayDate(),
      "first_air_date.gte": getPastDate(200),
    },
    page,
  );
}

export async function getSearch(
  q: string,
  page = 1,
  signal?: AbortSignal,
  options?: { bypassFilter?: boolean },
) {
  const query = q.trim();
  if (!query) return { page: 1, totalPages: 0, items: [] as CardItem[] };
  return searchAnime(query, page, signal, options);
}

export async function getShow(id: number) {
  return details(id);
}

export async function getSeason(id: number, seasonNumber: number) {
  return season(id, seasonNumber);
}

async function genreParams(slug: string) {
  const g = findGenre(slug);
  if (!g) return { sort_by: "popularity.desc" };
  if (g.genreId) return { with_genres: `16,${g.genreId}` };
  const kw = g.keyword ? await keywordId(g.keyword) : null;
  if (!kw) return { sort_by: "popularity.desc" };
  return { with_keywords: String(kw) };
}

export async function getGenreList(slug: string, page = 1) {
  const g = findGenre(slug);
  const extra = await genreParams(slug);
  const res = await discover({ sort_by: "popularity.desc", ...extra }, page);
  return { ...res, name: g?.name ?? slug, slug };
}

export async function getGenreShowcase() {
  const entries = await Promise.all(
    GENRES.map(async (g) => {
      try {
        const res = await getGenreList(g.slug, 1);
        return {
          slug: g.slug,
          name: g.name,
          tint: g.tint,
          backdrop: res.items[0]?.backdrop ?? res.items[0]?.poster ?? null,
          count: res.items.length,
        };
      } catch {
        return { slug: g.slug, name: g.name, tint: g.tint, backdrop: null, count: 0 };
      }
    }),
  );
  return entries;
}

export async function getWatchlistItems(ids: number[]) {
  return fetchCardItemsByIds(ids);
}

export async function getHome() {
  let userSettings;
  try {
    userSettings = loadStoredSettings();
  } catch {
    // fallback
  }

  const [trendingTmdb, popular, topRated, latest] = await Promise.all([
    trending(1, "week").catch(() => ({ page: 1, totalPages: 1, items: [] })),
    discover({ sort_by: "popularity.desc" }, 1).catch(() => ({
      page: 1,
      totalPages: 1,
      items: [],
    })),
    discover({ sort_by: "vote_average.desc", "vote_count.gte": 100 }, 1).catch(() => ({
      page: 1,
      totalPages: 1,
      items: [],
    })),
    discover(
      {
        sort_by: "first_air_date.desc",
        "first_air_date.lte": getTodayDate(),
        "first_air_date.gte": getPastDate(200),
      },
      1,
    ).catch(() => ({ page: 1, totalPages: 1, items: [] })),
  ]);

  // Curate hero banner from top trending/popular TMDB items that have backdrop and synopsis
  const heroCandidates = (trendingTmdb.items || []).filter((i) => i.backdrop && i.overview);
  const heroSeen = new Set<number>();
  const hero = heroCandidates
    .filter((i) => (heroSeen.has(i.id) ? false : (heroSeen.add(i.id), true)))
    .slice(0, 6);

  let featuredGenres = ["action", "fantasy", "comedy", "romance", "isekai"];
  if (userSettings?.darkGoreMode) {
    featuredGenres = ["action", "horror", "mystery", "sci-fi", "supernatural"];
  } else if (userSettings?.safeMode) {
    featuredGenres = ["adventure", "comedy", "fantasy", "sports", "school"];
  }

  const genreRows = await Promise.all(
    featuredGenres.map(async (slug) => {
      try {
        const res = await getGenreList(slug, 1);
        return { slug, name: res.name, items: res.items };
      } catch {
        const g = findGenre(slug);
        return { slug, name: g?.name ?? slug, items: [] };
      }
    }),
  );

  const popularList = popular.items || [];
  const recommended = [...popularList].sort((a, b) => b.rating - a.rating).slice(0, 20);

  return {
    hero: hero.length > 0 ? hero : popularList.slice(0, 5),
    trending: trendingTmdb.items,
    popular: popular.items,
    topRated: topRated.items,
    latest: latest.items,
    recommended: recommended.length > 0 ? recommended : popularList,
    genreRows: genreRows.filter((r) => r.items.length > 0),
  };
}

// Client helper wrappers matching both signature patterns
export const fetchHome = async () => getHome();

export const fetchTrending = async (
  args?: { data?: { page?: number; timeWindow?: "week" | "day" } } | number,
) => {
  const page = typeof args === "number" ? args : (args?.data?.page ?? 1);
  const timeWindow =
    typeof args === "object" && args?.data?.timeWindow ? args.data.timeWindow : "week";
  return getTrending(page, timeWindow);
};

export const fetchPopular = async (args?: { data?: { page?: number } } | number) => {
  const page = typeof args === "number" ? args : (args?.data?.page ?? 1);
  return getPopular(page);
};

export const fetchTopRated = async (args?: { data?: { page?: number } } | number) => {
  const page = typeof args === "number" ? args : (args?.data?.page ?? 1);
  return getTopRated(page);
};

export const fetchLatest = async (args?: { data?: { page?: number } } | number) => {
  const page = typeof args === "number" ? args : (args?.data?.page ?? 1);
  return getLatest(page);
};

export const fetchSearch = async (
  args:
    | { data: { q: string; page?: number; signal?: AbortSignal; bypassFilter?: boolean } }
    | { q: string; page?: number; signal?: AbortSignal; bypassFilter?: boolean },
  options?: { bypassFilter?: boolean },
) => {
  const data = "data" in args ? args.data : args;
  const bypass = options?.bypassFilter ?? data.bypassFilter;
  return getSearch(data.q, data.page ?? 1, data.signal, { bypassFilter: bypass });
};

export const fetchShow = async (args: { data: { id: number } } | { id: number } | number) => {
  const id = typeof args === "number" ? args : "data" in args ? args.data.id : args.id;
  return getShow(id);
};

export const fetchSeason = async (
  args: { data: { id: number; seasonNumber: number } } | { id: number; seasonNumber: number },
) => {
  const data = "data" in args ? args.data : args;
  return getSeason(data.id, data.seasonNumber);
};

export const fetchGenre = async (
  args: { data: { slug: string; page?: number } } | { slug: string; page?: number },
) => {
  const data = "data" in args ? args.data : args;
  return getGenreList(data.slug, data.page ?? 1);
};

export const fetchGenreShowcase = async () => getGenreShowcase();

export const fetchWatchlistItems = async (
  args: { data: { ids: number[] } } | { ids: number[] } | number[],
) => {
  const ids = Array.isArray(args) ? args : "data" in args ? args.data.ids : args.ids;
  return getWatchlistItems(ids);
};
