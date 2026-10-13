import type { CardItem } from "../tmdb";
import type { ScoredItem, DiversityConfig } from "./types";
import { DEFAULT_DIVERSITY_CONFIG } from "./types";
import { calculateContentSimilarity } from "./scoring";

/**
 * Extracts a normalized franchise / title stem to detect repeated franchises.
 * E.g., "Spider-Man: Homecoming" and "Spider-Man: No Way Home" -> "spider-man"
 */
export function extractFranchiseStem(title?: string): string {
  if (!title) return "";
  const mainPart = title.split(/[:—–[(]/)[0] || title;
  const cleaned = mainPart
    .toLowerCase()
    .replace(/\b(part|vol|volume|season|episode|chapter|movie|\d+)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return cleaned.length >= 3 ? cleaned : title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Maximal Marginal Relevance (MMR) Re-Ranking:
 * Given a scored candidate list and desired limit, iteratively selects the item that balances
 * high relevance score with low pairwise similarity to already chosen items:
 *
 * MMR_Score = lambda * score(c) - (1 - lambda) * max_{s in Selected} similarity(c, s)
 */
export function applyMMRDiversity(
  candidates: ScoredItem[],
  limit: number,
  config: DiversityConfig = DEFAULT_DIVERSITY_CONFIG,
): CardItem[] {
  if (!candidates || candidates.length === 0) return [];
  if (candidates.length <= 1) return candidates.map((c) => c.item);

  const { lambda, maxPerFranchise, maxPerPrimaryGenre } = config;
  const pool = [...candidates].sort((a, b) => b.score - a.score);

  const selected: ScoredItem[] = [];
  const selectedFranchises: Record<string, number> = {};
  const selectedGenres: Record<string, number> = {};

  // Always pick the top-ranked item first
  const first = pool.shift()!;
  selected.push(first);

  const firstFranchise = extractFranchiseStem(first.item.title);
  selectedFranchises[firstFranchise] = 1;
  const firstGenre = first.item.genres?.[0]?.toLowerCase() || "unknown";
  selectedGenres[firstGenre] = 1;

  while (selected.length < limit && pool.length > 0) {
    let bestIdx = -1;
    let bestMMR = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      const franchise = extractFranchiseStem(candidate.item.title);
      const genre = candidate.item.genres?.[0]?.toLowerCase() || "unknown";

      // Hard penalty if franchise limit exceeded
      if (selectedFranchises[franchise] && selectedFranchises[franchise] >= maxPerFranchise) {
        continue;
      }

      // Compute maximum similarity to any already-selected item
      let maxSim = 0;
      for (const sel of selected) {
        const sim = calculateContentSimilarity(candidate.item, sel.item);
        if (sim > maxSim) maxSim = sim;
      }

      // Soft penalty if primary genre is already over-concentrated
      const genreConcentration = selectedGenres[genre] || 0;
      const genrePenalty = genreConcentration >= maxPerPrimaryGenre ? 0.2 : 0;

      // MMR Formula
      const mmrScore = lambda * candidate.score - (1 - lambda) * maxSim - genrePenalty;

      if (mmrScore > bestMMR) {
        bestMMR = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      // All remaining candidates hit diversity / franchise limits
      break;
    }

    const chosen = pool.splice(bestIdx, 1)[0];
    selected.push(chosen);

    const fStem = extractFranchiseStem(chosen.item.title);
    selectedFranchises[fStem] = (selectedFranchises[fStem] || 0) + 1;
    const gName = chosen.item.genres?.[0]?.toLowerCase() || "unknown";
    selectedGenres[gName] = (selectedGenres[gName] || 0) + 1;
  }

  return selected.map((s) => s.item);
}

/**
 * Filter out items that are already present in an excluded Set (e.g. already watched or adjacent row)
 */
export function filterExcludedIds(items: CardItem[], excludedIds: Set<number>): CardItem[] {
  if (!excludedIds || excludedIds.size === 0) return items;
  return items.filter((item) => !excludedIds.has(item.id));
}
