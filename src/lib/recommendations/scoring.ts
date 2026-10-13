import type { CardItem } from "../tmdb";
import type {
  SignalWeights,
  ScoreBreakdown,
  ScoredItem,
  UserTasteProfile,
  ReferenceContentContext,
  DetailRecommendationWeights,
} from "./types";
import { DEFAULT_SIGNAL_WEIGHTS, DEFAULT_DETAIL_WEIGHTS } from "./types";
import { extractFranchiseStem } from "./diversity";

/**
 * Bayesian-smoothed rating score normalized to [0, 1].
 * Uses prior mean C = 6.8 and min-vote weight m = 30.
 * Prevents titles with 1 vote of 10.0 from dominating.
 */
export function normalizeRating(voteAverage?: number, voteCount?: number): number {
  const avg = typeof voteAverage === "number" && !isNaN(voteAverage) ? voteAverage : 0;
  const count = typeof voteCount === "number" && !isNaN(voteCount) ? voteCount : 0;

  if (count <= 0 && avg <= 0) return 0.5; // neutral fallback

  const priorMean = 6.8;
  const minVotes = 30;
  const smoothed = (count * avg + minVotes * priorMean) / (count + minVotes);
  return Math.min(1, Math.max(0, smoothed / 10));
}

/**
 * Log-scaled popularity normalized to [0, 1].
 * Bounded with log10(1 + pop) where pop ~ 3000 maps to 1.0.
 */
export function normalizePopularity(popularity?: number): number {
  if (typeof popularity !== "number" || isNaN(popularity) || popularity <= 0) {
    return 0.1;
  }
  const logVal = Math.log10(1 + popularity);
  return Math.min(1, Math.max(0, logVal / 3.5));
}

/**
 * Exponential recency decay for freshness normalized to [0, 1].
 * Uses a half-life of 180 days for current releases.
 */
export function normalizeFreshness(dateStr?: string): number {
  if (!dateStr) return 0.3;
  const date = new Date(dateStr);
  const time = date.getTime();
  if (isNaN(time)) return 0.3;

  const now = Date.now();
  const diffDays = Math.max(0, (now - time) / (1000 * 60 * 60 * 24));

  // If future release date within 60 days, treat as 1.0
  if (time > now) {
    const futureDays = (time - now) / (1000 * 60 * 60 * 24);
    return futureDays <= 60 ? 1.0 : 0.8;
  }

  // Half-life decay: items 180 days old get 0.5 score
  const halfLife = 180;
  const decayRate = Math.LN2 / halfLife;
  return Math.max(0.05, Math.min(1, Math.exp(-decayRate * diffDays)));
}

/**
 * Calculates genre match score in [0, 1] comparing candidate's genres
 * with user's learned genre affinity map.
 */
export function calculateGenreMatch(
  itemGenres: string[],
  genreAffinity: Record<string, number>,
): number {
  if (!itemGenres || itemGenres.length === 0) return 0.2;
  const affinityKeys = Object.keys(genreAffinity);
  if (affinityKeys.length === 0) return 0.5; // Cold-start neutral

  let matchedSum = 0;
  let matches = 0;

  for (const genre of itemGenres) {
    const key = genre.toLowerCase().trim();
    if (genreAffinity[key] !== undefined) {
      matchedSum += genreAffinity[key];
      matches++;
    }
  }

  if (matches === 0) return 0.1;
  // Blend mean affinity with match breadth
  const avgAffinity = matchedSum / matches;
  const coverageBonus = Math.min(1, matches / itemGenres.length);
  return Math.min(1, avgAffinity * 0.75 + coverageBonus * 0.25);
}

/**
 * Calculates language affinity score in [0, 1] comparing candidate's original language
 * with user's preferred languages and learned language habits.
 */
export function calculateLanguageMatch(
  itemLanguage: string | undefined,
  preferredLanguages: string[],
  learnedAffinity: Record<string, number> = {},
): number {
  const lang = (itemLanguage || "en").toLowerCase().trim();
  const prefs = preferredLanguages.map((l) => l.toLowerCase().trim());

  // Primary preference
  if (prefs.length > 0 && prefs[0] === lang) {
    return 1.0;
  }
  // Secondary preferences
  if (prefs.includes(lang)) {
    return 0.85;
  }
  // Learned language affinity from watch history
  if (learnedAffinity[lang] !== undefined) {
    return Math.min(1, 0.4 + learnedAffinity[lang] * 0.6);
  }
  // Universal global fallback for English
  if (lang === "en") {
    return 0.65;
  }

  return 0.25;
}

/**
 * Regional relevance calculation based on user's selected country.
 */
export function calculateRegionalRelevance(item: CardItem, userCountry: string): number {
  const country = (userCountry || "IN").toUpperCase().trim();
  const lang = (item.originalLanguage || "en").toLowerCase().trim();
  const genres = (item.genres || []).map((g) => g.toLowerCase());

  switch (country) {
    case "IN": {
      // Indian Regional Cinema languages: Hindi, Tamil, Telugu, Malayalam, Bengali, Kannada, Marathi, Punjabi
      const indianLangs = ["hi", "ta", "te", "ml", "kn", "bn", "mr", "pa"];
      if (indianLangs.includes(lang)) return 1.0;
      if (item.category === "anime") return 0.75; // Anime has massive youth popularity in India
      if (lang === "ko") return 0.7; // K-Drama has huge streaming presence in India
      if (lang === "en") return 0.65; // Hollywood hits
      return 0.35;
    }
    case "JP": {
      if (lang === "ja" || item.isAnime) return 1.0;
      if (lang === "en") return 0.7;
      if (lang === "ko") return 0.65;
      return 0.3;
    }
    case "KR": {
      if (lang === "ko") return 1.0;
      if (lang === "ja" || item.isAnime) return 0.75;
      if (lang === "en") return 0.7;
      return 0.3;
    }
    case "US":
    case "GB":
    case "CA":
    case "AU": {
      if (lang === "en") return 1.0;
      if (lang === "es") return 0.8;
      if (item.isAnime || lang === "ja") return 0.7;
      if (lang === "ko") return 0.65;
      return 0.35;
    }
    case "GLOBAL":
    default: {
      if (lang === "en") return 0.9;
      if (item.isAnime || lang === "ja" || lang === "hi" || lang === "ko") return 0.8;
      return 0.5;
    }
  }
}

/**
 * Multi-attribute Content Similarity between two CardItems.
 * Combines genre Jaccard similarity, type match, language match, and title/synopsis token overlap.
 */
export function calculateContentSimilarity(itemA: CardItem, itemB: CardItem): number {
  if (itemA.id === itemB.id) return 1.0;

  // 1. Genre Jaccard Similarity (40% weight)
  const setA = new Set((itemA.genres || []).map((g) => g.toLowerCase().trim()));
  const setB = new Set((itemB.genres || []).map((g) => g.toLowerCase().trim()));
  let intersection = 0;
  for (const g of setA) {
    if (setB.has(g)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  const genreSim = union > 0 ? intersection / union : 0.3;

  // 2. Media Type & Category Match (20% weight)
  let typeSim = 0.5;
  if (itemA.isMovie === itemB.isMovie) typeSim = 1.0;
  if (itemA.isAnime && itemB.isAnime) typeSim = 1.0;

  // 3. Language & Regional Match (20% weight)
  const langA = (itemA.originalLanguage || "en").toLowerCase();
  const langB = (itemB.originalLanguage || "en").toLowerCase();
  const langSim = langA === langB ? 1.0 : 0.4;

  // 4. Token Overlap from Overview / Synopsis (20% weight)
  const wordsA = extractSignificantTokens(itemA.overview || itemA.title);
  const wordsB = extractSignificantTokens(itemB.overview || itemB.title);
  let wordMatches = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) wordMatches++;
  }
  const tokenSim =
    wordsA.size > 0 && wordsB.size > 0
      ? Math.min(1, (wordMatches * 2) / (wordsA.size + wordsB.size))
      : 0.2;

  return genreSim * 0.4 + typeSim * 0.2 + langSim * 0.2 + tokenSim * 0.2;
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "by",
  "from",
  "of",
  "is",
  "was",
  "are",
  "were",
  "it",
  "this",
  "that",
  "his",
  "her",
  "their",
  "when",
  "who",
  "what",
  "where",
  "how",
  "after",
  "into",
  "must",
  "save",
  "world",
  "life",
  "series",
]);

function extractSignificantTokens(text: string): Set<string> {
  const set = new Set<string>();
  if (!text) return set;
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/);
  for (const t of tokens) {
    if (t.length >= 4 && !STOP_WORDS.has(t)) {
      set.add(t);
    }
  }
  return set;
}

/**
 * Calculates user's Personal Taste Match score in [0, 1].
 */
export function calculatePersonalTasteMatch(item: CardItem, profile: UserTasteProfile): number {
  if (profile.isColdStart) {
    // In cold start, taste match blends default regional & quality indicators
    return normalizeRating(item.rating, item.voteCount);
  }

  // 1. Genre affinity match (50%)
  const genreScore = calculateGenreMatch(item.genres, profile.genreAffinity);

  // 2. Language affinity match (25%)
  const langScore = calculateLanguageMatch(
    item.originalLanguage,
    profile.preferredLanguages,
    profile.languageAffinity,
  );

  // 3. Category preference match (25%)
  let catScore = 0.5;
  if (item.isAnime && profile.categoryAffinity.anime > 0) {
    catScore = profile.categoryAffinity.anime;
  } else if (item.isMovie && profile.categoryAffinity.movie > 0) {
    catScore = profile.categoryAffinity.movie;
  } else if (!item.isMovie && profile.categoryAffinity.series > 0) {
    catScore = profile.categoryAffinity.series;
  }

  return genreScore * 0.5 + langScore * 0.25 + catScore * 0.25;
}

/**
 * Final Multi-Signal Scoring Function:
 * FinalScore = Sum(NormalizedSignalScore_i * SignalWeight_i)
 * Automatically renormalizes weights when any signal is not applicable (e.g. no reference item).
 */
export function scoreCandidateItem(
  item: CardItem,
  profile: UserTasteProfile,
  weights: SignalWeights = DEFAULT_SIGNAL_WEIGHTS,
  referenceItem?: CardItem,
): ScoredItem {
  const personalTaste = calculatePersonalTasteMatch(item, profile);
  const genreMatch = calculateGenreMatch(item.genres, profile.genreAffinity);
  const languageMatch = calculateLanguageMatch(
    item.originalLanguage,
    profile.preferredLanguages,
    profile.languageAffinity,
  );
  const regionalRelevance = calculateRegionalRelevance(item, profile.country);
  const popularity = normalizePopularity(item.popularity);
  const freshness = normalizeFreshness(item.firstAirDate);
  const qualityRating = normalizeRating(item.rating, item.voteCount);

  // If a reference item exists, compute similarity; otherwise similarity is not active
  const hasSimilarity = Boolean(referenceItem);
  const similarity = hasSimilarity ? calculateContentSimilarity(item, referenceItem!) : 0;

  const activeWeights = { ...weights };
  if (!hasSimilarity) {
    // Redistribute similarity weight proportionally among other signals
    const simWeight = activeWeights.similarity;
    activeWeights.similarity = 0;
    const remainingSum = Object.values(activeWeights).reduce((a, b) => a + b, 0);
    if (remainingSum > 0) {
      const scale = (remainingSum + simWeight) / remainingSum;
      for (const k of Object.keys(activeWeights) as (keyof SignalWeights)[]) {
        if (k !== "similarity") {
          activeWeights[k] *= scale;
        }
      }
    }
  }

  const breakdown: ScoreBreakdown = {
    personalTaste,
    genreMatch,
    languageMatch,
    regionalRelevance,
    popularity,
    similarity,
    freshness,
    qualityRating,
  };

  const finalScore =
    personalTaste * activeWeights.personalTaste +
    genreMatch * activeWeights.genreMatch +
    languageMatch * activeWeights.languageMatch +
    regionalRelevance * activeWeights.regionalRelevance +
    popularity * activeWeights.popularity +
    similarity * activeWeights.similarity +
    freshness * activeWeights.freshness +
    qualityRating * activeWeights.qualityRating;

  // Determine an intuitive human-readable recommendation reason
  let reason: string | undefined;
  if (referenceItem) {
    reason = `Because you watched ${referenceItem.title}`;
  } else if (personalTaste > 0.75 && item.genres && item.genres[0]) {
    reason = `Matches your taste in ${item.genres.slice(0, 2).join(" & ")}`;
  } else if (regionalRelevance > 0.85) {
    reason = `Popular in your region`;
  } else if (popularity > 0.75) {
    reason = `Trending worldwide`;
  } else if (freshness > 0.8) {
    reason = `Recently released`;
  }

  return {
    item,
    score: Math.min(1, Math.max(0, finalScore)),
    breakdown,
    recommendationReason: reason,
  };
}

export interface ScoredDetailCandidate {
  item: CardItem;
  score: number;
  signals: {
    franchise: number;
    cast: number;
    crew: number;
    genre: number;
    language: number;
    tmdbRelevance: number;
    personalTaste: number;
    qualityRating: number;
  };
  reason?: string;
}

/**
 * Intelligent Re-Ranking for Detail Page Recommendations.
 * Evaluates candidates using the strict priorities:
 * 1. Franchise & Direct Relationship (sequels, prequels, collection)
 * 2. Key Cast & Actors
 * 3. Director & Key Creators
 * 4. Genre & Subgenre Overlap
 * 5. Language & Regional Coherence (prioritizing same-language cinema e.g. Tamil for Tamil)
 * 6. TMDB Similar & Recommendation signals
 * 7. User Personal Taste
 * 8. Bayesian-smoothed Quality Rating
 */
export function scoreDetailCandidateItem(
  candidate: CardItem,
  reference: ReferenceContentContext,
  profile?: UserTasteProfile,
  weights: DetailRecommendationWeights = DEFAULT_DETAIL_WEIGHTS,
  meta?: {
    isDirectCollectionPart?: boolean;
    isTmdbRecommended?: boolean;
    tmdbRank?: number;
    matchedActorId?: number;
    matchedDirectorId?: number;
  },
): ScoredDetailCandidate {
  // 1. Same Franchise / Collection
  let franchise = 0;
  if (meta?.isDirectCollectionPart) {
    franchise = 1.0;
  } else if (
    reference.belongsToCollection &&
    candidate.title &&
    extractFranchiseStem(candidate.title) ===
      extractFranchiseStem(reference.belongsToCollection.name)
  ) {
    franchise = 1.0;
  } else {
    const refStem = extractFranchiseStem(reference.title || reference.originalTitle);
    const candStem = extractFranchiseStem(candidate.title || candidate.originalTitle);
    if (refStem && candStem && refStem.length >= 3 && refStem === candStem) {
      franchise = 0.85;
    }
  }

  // 2. Same Actors / Cast (prioritizing top cast)
  let castScore = 0;
  const refCast = reference.cast || [];
  if (meta?.matchedActorId) {
    const actorIdx = refCast.findIndex((c) => c.id === meta.matchedActorId);
    if (actorIdx === 0) castScore = 1.0;
    else if (actorIdx === 1) castScore = 0.85;
    else if (actorIdx === 2) castScore = 0.7;
    else castScore = 0.45;
  } else if (refCast.length > 0 && candidate.overview) {
    for (let i = 0; i < Math.min(3, refCast.length); i++) {
      const actorName = refCast[i].name.toLowerCase();
      if (candidate.overview.toLowerCase().includes(actorName)) {
        castScore = i === 0 ? 0.9 : 0.7;
        break;
      }
    }
  }

  // 3. Same Director / Creator
  let crewScore = 0;
  const refCrew = reference.crew || [];
  if (meta?.matchedDirectorId) {
    crewScore = 1.0;
  } else if (refCrew.length > 0 && candidate.overview) {
    const directors = refCrew.filter(
      (c) => c.job === "Director" || c.job === "Creator" || c.department === "Directing",
    );
    for (const d of directors) {
      if (candidate.overview.toLowerCase().includes(d.name.toLowerCase())) {
        crewScore = 0.8;
        break;
      }
    }
  }

  // 4. Same Genre & Subgenre (Jaccard similarity)
  const setA = new Set((reference.genres || []).map((g) => g.toLowerCase().trim()));
  const setB = new Set((candidate.genres || []).map((g) => g.toLowerCase().trim()));
  let commonGenres = 0;
  for (const g of setA) {
    if (setB.has(g)) commonGenres++;
  }
  const unionGenres = new Set([...setA, ...setB]).size;
  const genreScore = unionGenres > 0 ? commonGenres / unionGenres : 0.25;

  // 5. Same Language and Regional Relevance
  // If the reference title is Tamil (ta), Hindi (hi), Telugu (te), etc.,
  // prioritize relevant titles in that exact language and related regional cinema.
  const refLang = (reference.originalLanguage || reference.language || "en").toLowerCase().trim();
  const candLang = (candidate.originalLanguage || "en").toLowerCase().trim();

  let languageScore = 0.15;
  const indianLangs = new Set(["hi", "ta", "te", "ml", "kn", "bn", "mr", "pa"]);

  if (refLang === candLang) {
    languageScore = 1.0;
  } else if (indianLangs.has(refLang) && indianLangs.has(candLang)) {
    languageScore = 0.75;
  } else if (profile?.preferredLanguages?.map((l) => l.toLowerCase()).includes(candLang)) {
    languageScore = 0.7;
  } else if (candLang === "en") {
    languageScore = 0.5;
  } else {
    languageScore = 0.15;
  }

  // 6. TMDB Similar / Recommendation Relevance
  let tmdbRelevance = 0.3;
  if (meta?.isTmdbRecommended) {
    const rank = meta.tmdbRank ?? 10;
    if (rank <= 3) tmdbRelevance = 1.0;
    else if (rank <= 8) tmdbRelevance = 0.8;
    else tmdbRelevance = 0.6;
  }

  // 7. Personal Taste
  const personalTaste = profile
    ? calculatePersonalTasteMatch(candidate, profile)
    : normalizeRating(candidate.rating, candidate.voteCount);

  // 8. Quality Rating Signal
  const qualityRating = normalizeRating(candidate.rating, candidate.voteCount);

  // Weighted Sum Calculation
  const totalWeight =
    weights.franchise +
    weights.cast +
    weights.crew +
    weights.genre +
    weights.language +
    weights.tmdbRelevance +
    weights.personalTaste +
    weights.qualityRating;

  const rawScore =
    franchise * weights.franchise +
    castScore * weights.cast +
    crewScore * weights.crew +
    genreScore * weights.genre +
    languageScore * weights.language +
    tmdbRelevance * weights.tmdbRelevance +
    personalTaste * weights.personalTaste +
    qualityRating * weights.qualityRating;

  const finalScore = totalWeight > 0 ? rawScore / totalWeight : 0.5;

  let candidateReason: string | undefined = undefined;
  if (franchise >= 0.85) {
    candidateReason = "From the same franchise";
  } else if (castScore >= 0.7 && refCast[0]) {
    candidateReason = `Starring ${refCast[0].name}`;
  } else if (crewScore >= 0.7) {
    candidateReason = "From the same director";
  } else if (languageScore === 1.0 && genreScore >= 0.5) {
    candidateReason = "Similar genre & language";
  }

  return {
    item: candidate,
    score: Math.min(1, Math.max(0, finalScore)),
    signals: {
      franchise,
      cast: castScore,
      crew: crewScore,
      genre: genreScore,
      language: languageScore,
      tmdbRelevance,
      personalTaste,
      qualityRating,
    },
    reason: candidateReason,
  };
}
