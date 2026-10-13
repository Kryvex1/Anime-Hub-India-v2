import {
  type CardItem,
  type Show,
  tmdb,
  toCard,
  trending as fetchTrending,
  discoverIndianTrending,
  discoverBollywood,
  discoverHollywood,
  discoverKDrama,
  discoverAnimeHits,
  discoverSouthCinema,
  discoverPopularSeries,
  getKnownCard,
  details,
  fetchCollectionParts,
} from "../tmdb";
import type {
  UserTasteProfile,
  RecommendationFeed,
  ScoredItem,
  SignalWeights,
  ReferenceContentContext,
  DetailRecommendationWeights,
} from "./types";
import { DEFAULT_SIGNAL_WEIGHTS, DEFAULT_DETAIL_WEIGHTS } from "./types";
import {
  scoreCandidateItem,
  scoreDetailCandidateItem,
  normalizePopularity,
  normalizeFreshness,
} from "./scoring";
import { applyMMRDiversity, filterExcludedIds } from "./diversity";

// In-memory cache for recommendation feed keyed by user state
interface CachedFeed {
  at: number;
  data: RecommendationFeed;
}
const feedCache = new Map<string, CachedFeed>();
const FEED_CACHE_TTL = 1000 * 60 * 8; // 8 minutes

// In-memory cache for candidate pools
interface CachedPool {
  at: number;
  items: CardItem[];
}
const poolCache = new Map<string, CachedPool>();
const POOL_CACHE_TTL = 1000 * 60 * 15; // 15 minutes

function getCachedPool(key: string): CardItem[] | null {
  const cached = poolCache.get(key);
  if (cached && Date.now() - cached.at < POOL_CACHE_TTL) {
    return cached.items;
  }
  return null;
}

function setCachedPool(key: string, items: CardItem[]) {
  poolCache.set(key, { at: Date.now(), items });
}

/**
 * Fetches a broad candidate pool from diverse TMDB endpoints
 */
async function fetchCandidatePool(): Promise<CardItem[]> {
  const cacheKey = "broad_candidate_pool_v1";
  const cached = getCachedPool(cacheKey);
  if (cached) return cached;

  const [
    trendingRes,
    hollywoodRes,
    bollywoodRes,
    indianRes,
    kdramaRes,
    animeRes,
    seriesRes,
    southRes,
  ] = await Promise.all([
    fetchTrending(1, "week").catch(() => ({ items: [] as CardItem[] })),
    discoverHollywood(1).catch(() => ({ items: [] as CardItem[] })),
    discoverBollywood(1).catch(() => ({ items: [] as CardItem[] })),
    discoverIndianTrending(1).catch(() => ({ items: [] as CardItem[] })),
    discoverKDrama(1).catch(() => ({ items: [] as CardItem[] })),
    discoverAnimeHits(1).catch(() => ({ items: [] as CardItem[] })),
    discoverPopularSeries(1).catch(() => ({ items: [] as CardItem[] })),
    discoverSouthCinema(1).catch(() => ({ items: [] as CardItem[] })),
  ]);

  const rawList = [
    ...(trendingRes.items || []),
    ...(hollywoodRes.items || []),
    ...(bollywoodRes.items || []),
    ...(indianRes.items || []),
    ...(kdramaRes.items || []),
    ...(animeRes.items || []),
    ...(seriesRes.items || []),
    ...(southRes.items || []),
  ];

  // Deduplicate candidates by ID and ensure valid posters
  const seen = new Set<number>();
  const candidates: CardItem[] = [];
  for (const item of rawList) {
    if (item && item.id && !seen.has(item.id) && item.poster) {
      seen.add(item.id);
      candidates.push(item);
    }
  }

  setCachedPool(cacheKey, candidates);
  return candidates;
}

/**
 * Computes personalized recommendations tailored to the UserTasteProfile.
 * Uses MMR diversity re-ranking and suppresses already-watched items.
 */
export async function getPersonalizedRecommendations(
  profile: UserTasteProfile,
  limit = 18,
  weights: SignalWeights = DEFAULT_SIGNAL_WEIGHTS,
): Promise<CardItem[]> {
  const candidates = await fetchCandidatePool();

  // Exclude already watched items from personalized recommendations
  const unviewed = filterExcludedIds(candidates, profile.watchedIds);
  const eligible = unviewed.length >= limit ? unviewed : candidates;

  const scored: ScoredItem[] = eligible.map((item) => scoreCandidateItem(item, profile, weights));

  return applyMMRDiversity(scored, limit);
}

/**
 * Computes Country-Aware Regional Trending Content
 */
export async function getRegionalTrending(
  countryCode: string,
  limit = 18,
): Promise<{ countryCode: string; countryLabel: string; items: CardItem[] }> {
  const code = (countryCode || "IN").toUpperCase().trim();
  const poolKey = `regional_trending_${code}`;
  const cached = getCachedPool(poolKey);

  let label = "Trending in India";
  switch (code) {
    case "IN":
      label = "Trending in India";
      break;
    case "US":
      label = "Trending in United States";
      break;
    case "GB":
      label = "Trending in United Kingdom";
      break;
    case "CA":
      label = "Trending in Canada";
      break;
    case "AU":
      label = "Trending in Australia";
      break;
    case "JP":
      label = "Popular in Japan";
      break;
    case "KR":
      label = "Popular in South Korea";
      break;
    case "GLOBAL":
    default:
      label = "Global Trending Hits";
      break;
  }

  if (cached) {
    return { countryCode: code, countryLabel: label, items: cached.slice(0, limit) };
  }

  let items: CardItem[] = [];

  if (code === "IN") {
    const res = await discoverIndianTrending(1).catch(() => ({ items: [] as CardItem[] }));
    items = res.items || [];
  } else if (code === "JP") {
    try {
      const res = await tmdb<{ results: Show[] }>("/discover/tv", {
        with_origin_country: "JP",
        sort_by: "popularity.desc",
        page: 1,
      });
      items = (res.results || []).map(toCard);
    } catch {
      const res = await discoverAnimeHits(1).catch(() => ({ items: [] as CardItem[] }));
      items = res.items || [];
    }
  } else if (code === "KR") {
    const res = await discoverKDrama(1).catch(() => ({ items: [] as CardItem[] }));
    items = res.items || [];
  } else {
    // For US, GB, CA, AU, or GLOBAL: fetch global trending + Hollywood blockbusters
    const [trendRes, holRes] = await Promise.all([
      fetchTrending(1, "week").catch(() => ({ items: [] as CardItem[] })),
      discoverHollywood(1).catch(() => ({ items: [] as CardItem[] })),
    ]);
    const merged = [...(trendRes.items || []), ...(holRes.items || [])];
    const seen = new Set<number>();
    items = merged.filter((it) => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return Boolean(it.poster);
    });
  }

  if (items.length > 0) {
    setCachedPool(poolKey, items);
  }

  return { countryCode: code, countryLabel: label, items: items.slice(0, limit) };
}

/**
 * Computes Intelligent Detail Page Recommendations.
 * Implements the user's priority hierarchy:
 * A. Same Franchise or Directly Related Content (sequels, prequels, spin-offs, TMDB collection)
 * B. Same Actors & Cast (top billed cast members)
 * C. Same Director or Creator
 * D. Same Genre and Subgenre
 * E. TMDB Similar Titles and Official Recommendations
 * F. Same Language and Regional Relevance (e.g. Tamil for Tamil movies, Hindi for Hindi movies)
 * G. Personal Taste (user's watch history and watchlist)
 */
export async function getSimilarContent(
  referenceItem:
    | ReferenceContentContext
    | CardItem
    | { id: number; title?: string; isMovie?: boolean; [key: string]: unknown },
  limit = 16,
  userProfile?: UserTasteProfile,
): Promise<CardItem[]> {
  const refId = referenceItem.id;
  const isMovie =
    referenceItem.isMovie ??
    (referenceItem.type === "movie" || (referenceItem as Record<string, unknown>).isMovie === true);

  const refLang = (
    referenceItem.originalLanguage ||
    (referenceItem as Record<string, unknown>).language ||
    "en"
  )
    .toString()
    .toLowerCase()
    .trim();

  const refContext: ReferenceContentContext = {
    id: refId,
    title: referenceItem.title,
    originalTitle:
      (referenceItem as Record<string, unknown>).originalTitle?.toString() || referenceItem.title,
    isMovie,
    type: isMovie ? "movie" : "tv",
    genres: referenceItem.genres || [],
    originalLanguage: refLang,
    language: refLang,
    cast: (referenceItem as Record<string, unknown>).cast as ReferenceContentContext["cast"],
    crew: (referenceItem as Record<string, unknown>).crew as ReferenceContentContext["crew"],
    overview: (referenceItem as Record<string, unknown>).overview?.toString(),
    belongsToCollection: (referenceItem as Record<string, unknown>)
      .belongsToCollection as ReferenceContentContext["belongsToCollection"],
  };

  const candidateMap = new Map<
    number,
    {
      item: CardItem;
      isDirectCollectionPart?: boolean;
      isTmdbRecommended?: boolean;
      tmdbRank?: number;
      matchedActorId?: number;
      matchedDirectorId?: number;
    }
  >();

  try {
    // --- Step A: Franchise & Collection Parts (Priority A) ---
    if (refContext.belongsToCollection?.id) {
      try {
        const parts = await fetchCollectionParts(refContext.belongsToCollection.id);
        for (const part of parts) {
          if (part.id !== refId && part.poster) {
            candidateMap.set(part.id, {
              item: part,
              isDirectCollectionPart: true,
            });
          }
        }
      } catch {
        // Continue
      }
    }

    // --- Step B: TMDB Official Recommendations & Similar Content (Priority E) ---
    const recEndpoint = isMovie
      ? `/movie/${refId}/recommendations`
      : `/tv/${refId}/recommendations`;
    const simEndpoint = isMovie ? `/movie/${refId}/similar` : `/tv/${refId}/similar`;

    const [recRes, simRes] = await Promise.all([
      tmdb<{ results: Show[] }>(recEndpoint).catch(() => ({ results: [] as Show[] })),
      tmdb<{ results: Show[] }>(simEndpoint).catch(() => ({ results: [] as Show[] })),
    ]);

    let rankCounter = 0;
    for (const show of recRes.results || []) {
      if (show && show.id && show.id !== refId && (show.poster_path || show.backdrop_path)) {
        if (!candidateMap.has(show.id)) {
          candidateMap.set(show.id, {
            item: toCard({ ...show, media_type: isMovie ? "movie" : "tv" }),
            isTmdbRecommended: true,
            tmdbRank: rankCounter++,
          });
        }
      }
    }

    for (const show of simRes.results || []) {
      if (show && show.id && show.id !== refId && (show.poster_path || show.backdrop_path)) {
        if (!candidateMap.has(show.id)) {
          candidateMap.set(show.id, {
            item: toCard({ ...show, media_type: isMovie ? "movie" : "tv" }),
            isTmdbRecommended: true,
            tmdbRank: rankCounter++,
          });
        }
      }
    }

    // --- Step C: Top Cast & Director Notable Works (Priorities B & C) ---
    const leadActors = (refContext.cast || []).slice(0, 2);
    const keyDirector = (refContext.crew || []).find(
      (c) => c.job === "Director" || c.job === "Creator",
    );

    const personQueries: Promise<void>[] = [];

    for (const actor of leadActors) {
      personQueries.push(
        tmdb<{ cast?: Show[] }>(`/person/${actor.id}/combined_credits`)
          .then((res) => {
            const works = (res.cast || [])
              .filter((s) => (isMovie ? s.media_type === "movie" : s.media_type === "tv"))
              .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
              .slice(0, 4);

            for (const work of works) {
              if (work.id && work.id !== refId && work.poster_path && !candidateMap.has(work.id)) {
                candidateMap.set(work.id, {
                  item: toCard(work),
                  matchedActorId: actor.id,
                });
              }
            }
          })
          .catch(() => {}),
      );
    }

    if (keyDirector) {
      personQueries.push(
        tmdb<{ crew?: Show[] }>(`/person/${keyDirector.id}/combined_credits`)
          .then((res) => {
            const works = (res.crew || [])
              .filter(
                (s) =>
                  (isMovie ? s.media_type === "movie" : s.media_type === "tv") &&
                  (s.job === "Director" || s.department === "Directing"),
              )
              .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
              .slice(0, 4);

            for (const work of works) {
              if (work.id && work.id !== refId && work.poster_path && !candidateMap.has(work.id)) {
                candidateMap.set(work.id, {
                  item: toCard(work),
                  matchedDirectorId: keyDirector.id,
                });
              }
            }
          })
          .catch(() => {}),
      );
    }

    // --- Step D: Same-Language & Genre Discovery Pool (Priority F) ---
    // Guarantees authentic titles in the same language (e.g. Tamil for Tamil movies)
    if (refLang && refLang !== "en") {
      const discoverEndpoint = isMovie ? "/discover/movie" : "/discover/tv";
      personQueries.push(
        tmdb<{ results?: Show[] }>(discoverEndpoint, {
          with_original_language: refLang,
          sort_by: "popularity.desc",
          page: 1,
        })
          .then((res) => {
            for (const show of (res.results || []).slice(0, 8)) {
              if (
                show &&
                show.id &&
                show.id !== refId &&
                show.poster_path &&
                !candidateMap.has(show.id)
              ) {
                candidateMap.set(show.id, {
                  item: toCard({ ...show, media_type: isMovie ? "movie" : "tv" }),
                });
              }
            }
          })
          .catch(() => {}),
      );
    }

    await Promise.all(personQueries);
  } catch (err) {
    console.warn("getSimilarContent candidate generation error:", err);
  }

  const rawCandidates = Array.from(candidateMap.values());

  if (rawCandidates.length === 0) {
    return [];
  }

  // --- Step E: Strict Media Type Filter (Prevent mixing movies and TV shows inappropriately) ---
  const validCandidates = rawCandidates.filter(({ item, isDirectCollectionPart }) => {
    if (isDirectCollectionPart) return true;
    if (isMovie) {
      return item.isMovie === true;
    }
    return !item.isMovie;
  });

  const pool = validCandidates.length > 0 ? validCandidates : rawCandidates;

  // --- Step F: Advanced Multi-Signal Scoring ---
  const scoredItems: ScoredItem[] = pool.map(({ item, ...meta }) => {
    const scoredDetail = scoreDetailCandidateItem(
      item,
      refContext,
      userProfile,
      DEFAULT_DETAIL_WEIGHTS,
      meta,
    );

    return {
      item,
      score: scoredDetail.score,
      breakdown: {
        personalTaste: scoredDetail.signals.personalTaste,
        genreMatch: scoredDetail.signals.genre,
        languageMatch: scoredDetail.signals.language,
        regionalRelevance: scoredDetail.signals.franchise,
        popularity: normalizePopularity(item.popularity),
        similarity: scoredDetail.signals.cast * 0.5 + scoredDetail.signals.crew * 0.5,
        freshness: normalizeFreshness(item.firstAirDate),
        qualityRating: scoredDetail.signals.qualityRating,
      },
      recommendationReason: scoredDetail.reason,
    };
  });

  // --- Step G: MMR Diversity Re-Ranking ---
  return applyMMRDiversity(scoredItems, limit, {
    lambda: 0.76, // Favor relevance while preventing repetitive dominance
    maxPerFranchise: 2,
    maxPerPrimaryGenre: 5,
  });
}

/**
 * Discovers New Releases & Fresh Content with recency ranking
 */
export async function getNewReleases(profile: UserTasteProfile, limit = 18): Promise<CardItem[]> {
  const cacheKey = "new_releases_v1";
  let items = getCachedPool(cacheKey);

  if (!items) {
    try {
      const currentYear = new Date().getFullYear();
      const res = await tmdb<{ results: Show[] }>("/discover/movie", {
        sort_by: "primary_release_date.desc",
        "vote_count.gte": 20,
        primary_release_year: currentYear,
        page: 1,
      }).catch(() => ({ results: [] as Show[] }));

      items = (res.results || []).map(toCard).filter((c) => Boolean(c.poster));
      if (items.length > 0) setCachedPool(cacheKey, items);
    } catch {
      items = [];
    }
  }

  if (!items || items.length === 0) {
    const candidates = await fetchCandidatePool();
    items = candidates.filter((c) => normalizeFreshness(c.firstAirDate) > 0.6);
  }

  const scored: ScoredItem[] = items.map((item) =>
    scoreCandidateItem(item, profile, {
      personalTaste: 0.15,
      genreMatch: 0.15,
      languageMatch: 0.15,
      regionalRelevance: 0.1,
      popularity: 0.1,
      similarity: 0,
      freshness: 0.3, // High freshness emphasis
      qualityRating: 0.05,
    }),
  );

  return applyMMRDiversity(scored, limit);
}

/**
 * Top rated hidden gems (high Bayesian rating, moderate popularity)
 */
export async function getHiddenGems(profile: UserTasteProfile, limit = 18): Promise<CardItem[]> {
  const candidates = await fetchCandidatePool();

  const gems = candidates.filter((item) => {
    const rating = item.rating || 0;
    const pop = item.popularity || 0;
    return rating >= 7.6 && pop < 250;
  });

  const pool = gems.length >= 6 ? gems : candidates.filter((c) => (c.rating || 0) >= 8.0);

  const scored: ScoredItem[] = pool.map((item) =>
    scoreCandidateItem(item, profile, {
      personalTaste: 0.25,
      genreMatch: 0.2,
      languageMatch: 0.15,
      regionalRelevance: 0.1,
      popularity: 0.05,
      similarity: 0,
      freshness: 0.05,
      qualityRating: 0.2, // High quality emphasis
    }),
  );

  return applyMMRDiversity(scored, limit);
}

/**
 * Assembles the full, dynamic RecommendationFeed for the homepage.
 * Results are cached in-memory per profile hash to deliver instant responses.
 */
export async function getRecommendationFeed(
  profile: UserTasteProfile,
): Promise<RecommendationFeed> {
  const profileHash = `${profile.country}_${profile.preferredLanguages.join(",")}_${profile.watchedIds.size}_${profile.watchlistIds.size}_${profile.recentWatchedItems[0]?.id || 0}`;
  const cached = feedCache.get(profileHash);
  if (cached && Date.now() - cached.at < FEED_CACHE_TTL) {
    return cached.data;
  }

  // 1. Personalized Recommendations
  const recommendedForYou = await getPersonalizedRecommendations(profile, 18);

  // 2. Regional Trending
  const trendingInCountry = await getRegionalTrending(profile.country, 18);

  // 3. "Because You Watched" (if user has watch history)
  let becauseYouWatched: RecommendationFeed["becauseYouWatched"] = undefined;
  if (profile.recentWatchedItems.length > 0) {
    const latestWatched = profile.recentWatchedItems[0];
    const similar = await getSimilarContent(latestWatched, 14);
    if (similar.length >= 4) {
      becauseYouWatched = {
        sourceId: latestWatched.id,
        sourceTitle: latestWatched.title,
        items: similar,
      };
    }
  }

  // 4. "Similar to Your Watchlist" (if user has watchlist items)
  let similarToWatchlist: RecommendationFeed["similarToWatchlist"] = undefined;
  if (profile.watchlistIds.size > 0) {
    const wArray = Array.from(profile.watchlistIds);
    const chosenId = wArray[0];
    const known = getKnownCard(chosenId);
    if (known) {
      const similar = await getSimilarContent(known, 14);
      if (similar.length >= 4) {
        similarToWatchlist = {
          sourceId: known.id,
          sourceTitle: known.title,
          items: similar,
        };
      }
    }
  }

  // 5. Top in Primary Preferred Language
  let topInLanguage: RecommendationFeed["topInLanguage"] = undefined;
  const primaryLang = profile.preferredLanguages[0] || "hi";
  let langLabel = "Top in Hindi";
  if (primaryLang === "en") langLabel = "Top in English";
  else if (primaryLang === "ja") langLabel = "Top Anime & Japanese Hits";
  else if (primaryLang === "ko") langLabel = "Top in Korean (K-Drama)";
  else if (primaryLang === "ta") langLabel = "Top in Tamil Cinema";
  else if (primaryLang === "te") langLabel = "Top in Telugu Cinema";
  else if (primaryLang === "es") langLabel = "Top in Spanish";

  const candidates = await fetchCandidatePool();
  const langItems = candidates.filter(
    (c) => (c.originalLanguage || "en").toLowerCase() === primaryLang.toLowerCase(),
  );
  if (langItems.length >= 6) {
    topInLanguage = {
      languageCode: primaryLang,
      languageLabel: langLabel,
      items: langItems.slice(0, 16),
    };
  }

  // 6. New Releases & Fresh Hits
  const newReleases = await getNewReleases(profile, 18);

  // 7. Hidden Gems
  const hiddenGems = await getHiddenGems(profile, 16);

  const feed: RecommendationFeed = {
    recommendedForYou,
    trendingInCountry,
    becauseYouWatched,
    similarToWatchlist,
    topInLanguage,
    newReleases,
    hiddenGems,
  };

  feedCache.set(profileHash, { at: Date.now(), data: feed });
  return feed;
}
