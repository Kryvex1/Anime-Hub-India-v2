import type { WatchHistoryItem } from "../watch-history";
import type { AppSettings } from "../settings";
import type { UserTasteProfile } from "./types";
import { getKnownCard } from "../tmdb";

/**
 * Builds a comprehensive UserTasteProfile from watch history, watchlist, and user settings.
 * Supports recency weighting and cold-start detection.
 */
export function buildUserTasteProfile(
  history: WatchHistoryItem[] = [],
  watchlistIds: number[] = [],
  settings?: AppSettings,
): UserTasteProfile {
  const country = settings?.country || "IN";
  const preferredLanguages =
    settings?.preferredLanguages && settings.preferredLanguages.length > 0
      ? settings.preferredLanguages
      : ["hi", "en"];

  const watchedSet = new Set<number>();
  const watchlistSet = new Set<number>(
    watchlistIds.filter((id) => typeof id === "number" && id > 0),
  );

  const genreCounts: Record<string, number> = {};
  const langCounts: Record<string, number> = {};
  let movieCount = 0;
  let seriesCount = 0;
  let animeCount = 0;

  const now = Date.now();
  const recentWatched: UserTasteProfile["recentWatchedItems"] = [];

  for (const item of history) {
    if (!item || typeof item.animeId !== "number" || item.animeId <= 0) continue;
    watchedSet.add(item.animeId);

    // Recency decay factor: recent items have stronger signal than older ones
    const ageDays = item.updatedAt
      ? Math.max(0, (now - item.updatedAt) / (1000 * 60 * 60 * 24))
      : 30;
    const recencyWeight = Math.max(0.25, Math.min(1.0, Math.exp(-0.02 * ageDays)));

    // Categorization
    const isMovie = item.type?.toLowerCase() === "movie" || item.category === "movie";
    const isAnime = item.category === "anime";
    if (isAnime) animeCount += 1.5 * recencyWeight;
    else if (isMovie) movieCount += 1.0 * recencyWeight;
    else seriesCount += 1.0 * recencyWeight;

    // Check if card metadata is already cached in memory
    const card = getKnownCard(item.animeId);
    const genres = card?.genres || [];
    const lang = (
      card?.originalLanguage || (item.category === "anime" ? "ja" : "hi")
    ).toLowerCase();

    langCounts[lang] = (langCounts[lang] || 0) + 1.0 * recencyWeight;

    for (const g of genres) {
      const gKey = g.toLowerCase().trim();
      genreCounts[gKey] = (genreCounts[gKey] || 0) + 1.0 * recencyWeight;
    }

    recentWatched.push({
      id: item.animeId,
      title: item.animeTitle,
      genres,
      isMovie,
      updatedAt: item.updatedAt || now,
    });
  }

  // Also include items added to watchlist (explicit positive intent)
  for (const wId of watchlistSet) {
    const card = getKnownCard(wId);
    if (card) {
      for (const g of card.genres || []) {
        const gKey = g.toLowerCase().trim();
        genreCounts[gKey] = (genreCounts[gKey] || 0) + 1.2; // Watchlist is an explicit positive intent
      }
      if (card.originalLanguage) {
        const lKey = card.originalLanguage.toLowerCase();
        langCounts[lKey] = (langCounts[lKey] || 0) + 1.2;
      }
    }
  }

  // Normalize genre affinities to [0, 1]
  const genreAffinity: Record<string, number> = {};
  const maxGenreScore = Math.max(1, ...Object.values(genreCounts));
  for (const [g, count] of Object.entries(genreCounts)) {
    genreAffinity[g] = Math.min(1, count / maxGenreScore);
  }

  // Normalize language affinities to [0, 1]
  const languageAffinity: Record<string, number> = {};
  const maxLangScore = Math.max(1, ...Object.values(langCounts));
  for (const [l, count] of Object.entries(langCounts)) {
    languageAffinity[l] = Math.min(1, count / maxLangScore);
  }

  // Normalize category distribution
  const totalCat = movieCount + seriesCount + animeCount || 1;
  const categoryAffinity = {
    movie: movieCount / totalCat,
    series: seriesCount / totalCat,
    anime: animeCount / totalCat,
  };

  const totalInteractions = watchedSet.size + watchlistSet.size;
  const isColdStart = totalInteractions === 0;

  return {
    isColdStart,
    totalInteractions,
    country,
    preferredLanguages,
    genreAffinity,
    languageAffinity,
    categoryAffinity,
    watchedIds: watchedSet,
    watchlistIds: watchlistSet,
    recentWatchedItems: recentWatched.slice(0, 10),
  };
}
