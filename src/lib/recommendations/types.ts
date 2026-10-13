import type { CardItem } from "../tmdb";

export interface SignalWeights {
  personalTaste: number; // 0.30 (30%)
  genreMatch: number; // 0.15 (15%)
  languageMatch: number; // 0.15 (15%)
  regionalRelevance: number; // 0.10 (10%)
  popularity: number; // 0.10 (10%)
  similarity: number; // 0.10 (10%)
  freshness: number; // 0.05 (5%)
  qualityRating: number; // 0.05 (5%)
}

export const DEFAULT_SIGNAL_WEIGHTS: SignalWeights = {
  personalTaste: 0.3,
  genreMatch: 0.15,
  languageMatch: 0.15,
  regionalRelevance: 0.1,
  popularity: 0.1,
  similarity: 0.1,
  freshness: 0.05,
  qualityRating: 0.05,
};

export interface DetailRecommendationWeights {
  franchise: number; // 0.22
  cast: number; // 0.14
  crew: number; // 0.12
  genre: number; // 0.16
  language: number; // 0.14
  tmdbRelevance: number; // 0.10
  personalTaste: number; // 0.06
  qualityRating: number; // 0.06
}

export const DEFAULT_DETAIL_WEIGHTS: DetailRecommendationWeights = {
  franchise: 0.22,
  cast: 0.14,
  crew: 0.12,
  genre: 0.16,
  language: 0.14,
  tmdbRelevance: 0.1,
  personalTaste: 0.06,
  qualityRating: 0.06,
};

export interface ReferenceContentContext {
  id: number;
  title?: string;
  originalTitle?: string;
  isMovie?: boolean;
  type?: "movie" | "tv";
  genres?: string[];
  originalLanguage?: string;
  language?: string;
  cast?: { id: number; name: string; character?: string | null; profile?: string | null }[];
  crew?: {
    id: number;
    name: string;
    job?: string | null;
    department?: string | null;
    profile?: string | null;
  }[];
  overview?: string;
  belongsToCollection?: { id: number; name: string } | null;
}

export interface UserTasteProfile {
  isColdStart: boolean;
  totalInteractions: number;
  country: string;
  preferredLanguages: string[];
  genreAffinity: Record<string, number>; // genre name -> normalized affinity [0, 1]
  languageAffinity: Record<string, number>; // lang code -> normalized affinity [0, 1]
  categoryAffinity: {
    movie: number;
    series: number;
    anime: number;
  };
  watchedIds: Set<number>;
  watchlistIds: Set<number>;
  recentWatchedItems: {
    id: number;
    title: string;
    genres?: string[];
    isMovie?: boolean;
    updatedAt: number;
  }[];
}

export interface ScoreBreakdown {
  personalTaste: number;
  genreMatch: number;
  languageMatch: number;
  regionalRelevance: number;
  popularity: number;
  similarity: number;
  freshness: number;
  qualityRating: number;
}

export interface ScoredItem {
  item: CardItem;
  score: number;
  breakdown: ScoreBreakdown;
  recommendationReason?: string;
}

export interface DiversityConfig {
  lambda: number; // Tradeoff parameter in MMR: 1 = pure relevance, 0 = pure diversity. Default: 0.72
  maxPerFranchise: number; // Max items sharing title base name. Default: 2
  maxPerPrimaryGenre: number; // Max items sharing same primary genre in top N. Default: 4
}

export const DEFAULT_DIVERSITY_CONFIG: DiversityConfig = {
  lambda: 0.72,
  maxPerFranchise: 2,
  maxPerPrimaryGenre: 4,
};

export interface RecommendationFeed {
  recommendedForYou: CardItem[];
  trendingInCountry: {
    countryCode: string;
    countryLabel: string;
    items: CardItem[];
  };
  becauseYouWatched?: {
    sourceId: number;
    sourceTitle: string;
    items: CardItem[];
  };
  similarToWatchlist?: {
    sourceId: number;
    sourceTitle: string;
    items: CardItem[];
  };
  topInLanguage?: {
    languageCode: string;
    languageLabel: string;
    items: CardItem[];
  };
  newReleases: CardItem[];
  hiddenGems: CardItem[];
}
