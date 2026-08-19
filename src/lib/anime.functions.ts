import { findGenre, GENRES, animeMatchesGenre } from "./genres";
import {
  fetchConfiguredAnimeIds,
  fetchAddedAnimeList,
  fetchHeroBanners,
  type AddedAnimeDoc,
  type HeroBannerDoc,
  addAnimeToWebsite,
} from "./episodes.firebase";
import {
  type CardItem,
  details,
  searchAnime,
  season,
  tmdb,
  toCard,
  type Show,
  type PagedResults,
} from "./tmdb";

// In-memory cache for CardItems with TTL
const animeCardCache = new Map<number, { at: number; item: CardItem }>();

// Cache for TMDB real trending IDs
let cachedTmdbTrendingIds: { at: number; ids: Set<number> } | null = null;

export async function getTmdbTrendingIds(): Promise<Set<number>> {
  const now = Date.now();
  if (cachedTmdbTrendingIds && now - cachedTmdbTrendingIds.at < 1000 * 60 * 30) {
    return cachedTmdbTrendingIds.ids;
  }

  const idSet = new Set<number>();
  try {
    const [tvTrending, movieTrending] = await Promise.allSettled([
      tmdb<PagedResults<Show>>("/trending/tv/week"),
      tmdb<PagedResults<Show>>("/trending/movie/week"),
    ]);

    if (tvTrending.status === "fulfilled" && tvTrending.value?.results) {
      tvTrending.value.results.forEach((s) => {
        if (s.id) idSet.add(s.id);
      });
    }

    if (movieTrending.status === "fulfilled" && movieTrending.value?.results) {
      movieTrending.value.results.forEach((s) => {
        if (s.id) idSet.add(s.id);
      });
    }

    cachedTmdbTrendingIds = { at: now, ids: idSet };
  } catch (err) {
    console.error("Error fetching TMDB trending IDs:", err);
  }

  return idSet;
}

function docToCardItem(doc: AddedAnimeDoc | HeroBannerDoc): CardItem {
  const animeId = Number(doc.id || (doc as AddedAnimeDoc).animeId);
  return {
    id: animeId,
    title: doc.title || "Anime",
    originalTitle: doc.originalTitle || doc.title || "",
    overview: doc.overview || "",
    poster: doc.poster && doc.poster.trim() !== "" ? doc.poster : null,
    backdrop: doc.backdrop && doc.backdrop.trim() !== "" ? doc.backdrop : null,
    rating: typeof doc.rating === "number" ? doc.rating : 8.0,
    voteCount: (doc as AddedAnimeDoc).voteCount ?? 100,
    year: doc.year || "Anime",
    firstAirDate: doc.year ? `${doc.year}-01-01` : "",
    type: (doc.type as "TV" | "Movie") || "TV",
    genres: doc.genres || ["Animation", "Action"],
    popularity: (doc as AddedAnimeDoc).popularity ?? 100,
  };
}

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

        // Auto-persist full metadata to RTDB with valid poster & backdrop
        void addAnimeToWebsite(card.id, card.title, card.poster, {
          title: card.title,
          originalTitle: card.originalTitle,
          poster: card.poster,
          backdrop: card.backdrop,
          overview: card.overview,
          rating: card.rating,
          voteCount: card.voteCount,
          year: card.year,
          type: card.type,
          genres: card.genres,
          popularity: card.popularity,
        });

        return card;
      } catch {
        return null;
      }
    }),
  );

  return items.filter((i): i is CardItem => i !== null);
}

// Fetch all configured anime card items with full poster self-healing
export async function getConfiguredAnimeCards(): Promise<CardItem[]> {
  const addedList = await fetchAddedAnimeList();
  const cardMap = new Map<number, CardItem>();
  const needsTmdbFetch: number[] = [];

  addedList.forEach((doc) => {
    const card = docToCardItem(doc);
    if (card.id) {
      // If poster is missing or null, mark for fetching from TMDB
      if (!card.poster) {
        needsTmdbFetch.push(card.id);
      } else {
        cardMap.set(card.id, card);
      }
    }
  });

  const configuredIds = await fetchConfiguredAnimeIds();
  configuredIds.forEach((id) => {
    if (!cardMap.has(id)) {
      needsTmdbFetch.push(id);
    }
  });

  const uniqueFetchIds = Array.from(new Set(needsTmdbFetch));
  if (uniqueFetchIds.length > 0) {
    const fetchedCards = await fetchCardItemsByIds(uniqueFetchIds);
    fetchedCards.forEach((c) => cardMap.set(c.id, c));
  }

  return Array.from(cardMap.values());
}

// Pagination helper for an in-memory array of CardItems
function paginateCards(items: CardItem[], page = 1, pageSize = 20) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const validPage = Math.max(1, Math.min(page, totalPages));
  const start = (validPage - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  return {
    page: validPage,
    totalPages,
    items: pagedItems,
  };
}

export async function getTrending(page = 1, _timeWindow: "week" | "day" = "week") {
  const [cards, tmdbTrendingIds] = await Promise.all([
    getConfiguredAnimeCards(),
    getTmdbTrendingIds(),
  ]);

  // Check if any of user's added anime are in real TMDB Trending
  const matchedInTrending = cards.filter((item) => tmdbTrendingIds.has(item.id));

  // If there are matches, show only those matched; otherwise sort added by popularity
  const finalTrending =
    matchedInTrending.length > 0
      ? matchedInTrending.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      : [...cards].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || b.rating - a.rating);

  return paginateCards(finalTrending, page, 20);
}

export async function getPopular(page = 1) {
  const cards = await getConfiguredAnimeCards();
  const sorted = [...cards].sort(
    (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || (b.voteCount ?? 0) - (a.voteCount ?? 0),
  );
  return paginateCards(sorted, page, 20);
}

export async function getTopRated(page = 1) {
  const cards = await getConfiguredAnimeCards();
  const sorted = [...cards].sort(
    (a, b) => b.rating - a.rating || (b.voteCount ?? 0) - (a.voteCount ?? 0),
  );
  return paginateCards(sorted, page, 20);
}

export async function getLatest(page = 1) {
  const cards = await getConfiguredAnimeCards();
  const sorted = [...cards].sort((a, b) => {
    const dateA = a.firstAirDate || a.year || "";
    const dateB = b.firstAirDate || b.year || "";
    return dateB.localeCompare(dateA);
  });
  return paginateCards(sorted, page, 20);
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

  if (options?.bypassFilter) {
    return searchAnime(query, page, signal, options);
  }

  const cards = await getConfiguredAnimeCards();
  const lower = query.toLowerCase();
  const matched = cards.filter((item) => {
    const t1 = (item.title || "").toLowerCase();
    const t2 = (item.originalTitle || "").toLowerCase();
    const ov = (item.overview || "").toLowerCase();
    const genres = (item.genres || []).map((g) => g.toLowerCase()).join(" ");
    return t1.includes(lower) || t2.includes(lower) || ov.includes(lower) || genres.includes(lower);
  });

  return paginateCards(matched, page, 20);
}

export async function fetchHome() {
  // Fetch configured cards, custom hero banners, and TMDB real trending IDs
  const [cards, customHeroBanners, tmdbTrendingIds] = await Promise.all([
    getConfiguredAnimeCards(),
    fetchHeroBanners(),
    getTmdbTrendingIds(),
  ]);

  if (cards.length === 0 && customHeroBanners.length === 0) {
    return {
      hero: [] as CardItem[],
      trending: [] as CardItem[],
      popular: [] as CardItem[],
      actionAdventure: [] as CardItem[],
      fantasySupernatural: [] as CardItem[],
      movies: [] as CardItem[],
      romanceDrama: [] as CardItem[],
      topRated: [] as CardItem[],
      latest: [] as CardItem[],
      totalConfigured: 0,
    };
  }

  // Hero selection: Custom hero banners if configured in Admin, or backdrops fallback
  let heroItems: CardItem[] = [];
  if (customHeroBanners.length > 0) {
    heroItems = customHeroBanners.map(docToCardItem);
  } else {
    heroItems = cards.filter((c) => Boolean(c.backdrop)).slice(0, 5);
    if (heroItems.length === 0 && cards.length > 0) {
      heroItems = cards.slice(0, 5);
    }
  }

  // 1. Trending: Check if any added anime are currently trending in TMDB
  const matchedInTrending = cards.filter((item) => tmdbTrendingIds.has(item.id));
  const trending =
    matchedInTrending.length > 0
      ? matchedInTrending.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      : [...cards].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || b.rating - a.rating);

  // 2. Action & Adventure (TMDB Genre Filter)
  const actionAdventure = cards.filter((c) =>
    c.genres?.some((g) => /action|adventure|shounen/i.test(g)),
  );

  // 3. Fantasy & Supernatural (TMDB Genre Filter)
  const fantasySupernatural = cards.filter((c) =>
    c.genres?.some((g) => /fantasy|sci-fi|supernatural|magic|mystery/i.test(g)),
  );

  // 4. Blockbuster Anime Movies
  const movies = cards.filter((c) => c.type?.toLowerCase() === "movie");

  // 5. Romance & Slice of Life (TMDB Genre Filter)
  const romanceDrama = cards.filter((c) =>
    c.genres?.some((g) => /romance|drama|comedy|slice of life/i.test(g)),
  );

  // 6. Top Rated Masterpieces (Rating >= 8.0)
  const topRated = cards
    .filter((c) => c.rating >= 7.8)
    .sort((a, b) => b.rating - a.rating || (b.voteCount ?? 0) - (a.voteCount ?? 0));

  // 7. Popular Anime
  const popular = [...cards].sort(
    (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || (b.voteCount ?? 0) - (a.voteCount ?? 0),
  );

  // 8. Recently Added
  const latest = [...cards].sort((a, b) => {
    const dateA = a.firstAirDate || a.year || "";
    const dateB = b.firstAirDate || b.year || "";
    return dateB.localeCompare(dateA);
  });

  return {
    hero: heroItems,
    trending,
    popular,
    actionAdventure,
    fantasySupernatural,
    movies,
    romanceDrama,
    topRated,
    latest,
    totalConfigured: cards.length || customHeroBanners.length,
  };
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

  const cards = await getConfiguredAnimeCards();
  const matched = cards.filter((item) => animeMatchesGenre(item, genreSlug));

  return paginateCards(matched, page, 20);
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
