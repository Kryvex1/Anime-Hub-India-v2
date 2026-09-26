import { isAnime, getKnownMediaType, getKnownCard, type CardItem, type ShowDetails } from "./tmdb";

export type MediaCategory = "anime" | "movie" | "webseries";

/**
 * Determine if media is an anime, movie, or web series
 */
export function getMediaCategory(
  id: number,
  item?: Partial<CardItem | ShowDetails> | null,
): MediaCategory {
  // 1. Direct explicit category
  const explicitCategory = (item as { category?: MediaCategory })?.category;
  if (
    explicitCategory === "anime" ||
    explicitCategory === "movie" ||
    explicitCategory === "webseries"
  ) {
    return explicitCategory;
  }

  // 2. Session storage category cache
  try {
    if (typeof window !== "undefined" && id) {
      const storedCat = sessionStorage.getItem(`media_category_${id}`);
      if (storedCat === "anime" || storedCat === "movie" || storedCat === "webseries") {
        return storedCat;
      }
    }
  } catch {
    // Ignore
  }

  // 3. Check known card from storage/memory
  const known = getKnownCard(id);
  if (known) {
    const knownAny = known as { category?: MediaCategory; isAnime?: boolean };
    if (
      knownAny.category === "anime" ||
      knownAny.category === "movie" ||
      knownAny.category === "webseries"
    ) {
      return knownAny.category;
    }
    if (knownAny.isAnime) return "anime";
    const knownAnim =
      known.genres?.some((g) => /animation|anime/i.test(String(g))) || known.genreIds?.includes(16);
    if (
      knownAnim &&
      (known.originalLanguage === "ja" ||
        (known as { language?: string }).language?.toLowerCase() === "ja")
    ) {
      return "anime";
    }
    if (known.type === "Movie" || (known as { isMovie?: boolean }).isMovie) return "movie";
    if (known.type === "Series") return "webseries";
  }

  // 4. Check explicit anime characteristics (Japanese + Animation)
  const isJap =
    item?.originalLanguage === "ja" ||
    item?.language?.toLowerCase() === "ja" ||
    (item as ShowDetails)?.countries?.includes("Japan");
  const isAnim =
    (item as { isAnime?: boolean })?.isAnime ||
    item?.genres?.some((g) => /animation|anime/i.test(String(g))) ||
    Boolean(item?.genreIds?.includes(16));

  if (isAnim && isJap) {
    return "anime";
  }

  // 5. Media type / movie vs series
  const knownType = getKnownMediaType(id);
  if (knownType === "movie") return "movie";
  if (knownType === "tv") return "webseries";

  if (item?.isMovie || item?.type?.toLowerCase() === "movie") {
    return "movie";
  }

  if (item?.type?.toLowerCase() === "series") {
    return "webseries";
  }

  return "webseries";
}

export function getMediaDetailPath(
  id: number,
  item?: Partial<CardItem | ShowDetails> | null,
): string {
  const cat = getMediaCategory(id, item);
  return `/${cat}/${id}`;
}

export function getMediaWatchPath(
  id: number,
  params?: { season?: number; episode?: number },
  item?: Partial<CardItem | ShowDetails> | null,
): string {
  const cat = getMediaCategory(id, item);
  const season = params?.season || 1;
  const episode = params?.episode || 1;
  return `/${cat}/${id}/watch?season=${season}&episode=${episode}`;
}
