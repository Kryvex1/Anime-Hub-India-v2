export type GenreDef = {
  slug: string;
  name: string;
  genreId?: number;
  keyword?: string;
  tint: string;
};

export const GENRES: GenreDef[] = [
  { slug: "action", name: "Action", genreId: 10759, tint: "from-rose-500/40" },
  { slug: "adventure", name: "Adventure", keyword: "adventure", tint: "from-amber-500/40" },
  { slug: "comedy", name: "Comedy", genreId: 35, tint: "from-yellow-400/40" },
  { slug: "drama", name: "Drama", genreId: 18, tint: "from-sky-500/40" },
  { slug: "fantasy", name: "Fantasy", genreId: 10765, tint: "from-violet-500/40" },
  { slug: "romance", name: "Romance", keyword: "romance", tint: "from-pink-500/40" },
  { slug: "horror", name: "Horror", keyword: "horror", tint: "from-red-700/40" },
  { slug: "mystery", name: "Mystery", genreId: 9648, tint: "from-indigo-500/40" },
  { slug: "sci-fi", name: "Sci-Fi", keyword: "science fiction", tint: "from-cyan-500/40" },
  { slug: "sports", name: "Sports", keyword: "sport", tint: "from-emerald-500/40" },
  {
    slug: "supernatural",
    name: "Supernatural",
    keyword: "supernatural",
    tint: "from-fuchsia-500/40",
  },
  { slug: "isekai", name: "Isekai", keyword: "isekai", tint: "from-teal-500/40" },
  { slug: "mecha", name: "Mecha", keyword: "mecha", tint: "from-slate-400/40" },
  { slug: "school", name: "School", keyword: "school", tint: "from-orange-500/40" },
];

export function findGenre(slug: string) {
  return GENRES.find((g) => g.slug === slug);
}

export function animeMatchesGenre(
  item: {
    title?: string;
    originalTitle?: string;
    overview?: string;
    genreIds?: number[];
    genres?: string[];
  },
  slug: string,
): boolean {
  const g = findGenre(slug);
  if (!g) return false;

  const genreIds = item.genreIds || [];
  const genreNames = (item.genres || []).map((n) => n.toLowerCase());
  const text =
    `${item.title || ""} ${item.originalTitle || ""} ${item.overview || ""}`.toLowerCase();

  // 1. Direct genreId check
  if (g.genreId && genreIds.includes(g.genreId)) return true;

  // 2. Direct genre name check
  if (g.name && genreNames.some((n) => n.includes(g.name.toLowerCase()))) return true;

  // 3. TMDB category mapping heuristics
  switch (slug) {
    case "action":
      return (
        genreIds.includes(10759) ||
        genreIds.includes(28) ||
        genreNames.some((n) => n.includes("action"))
      );
    case "adventure":
      return (
        genreIds.includes(10759) ||
        genreIds.includes(12) ||
        genreNames.some((n) => n.includes("adventure")) ||
        text.includes("adventure") ||
        text.includes("journey")
      );
    case "comedy":
      return genreIds.includes(35) || genreNames.some((n) => n.includes("comedy"));
    case "drama":
      return genreIds.includes(18) || genreNames.some((n) => n.includes("drama"));
    case "fantasy":
      return (
        genreIds.includes(10765) ||
        genreIds.includes(14) ||
        genreNames.some((n) => n.includes("fantasy"))
      );
    case "mystery":
      return genreIds.includes(9648) || genreNames.some((n) => n.includes("mystery"));
    case "sci-fi":
      return (
        genreIds.includes(10765) ||
        genreIds.includes(878) ||
        genreNames.some((n) => n.includes("sci-fi") || n.includes("science fiction")) ||
        text.includes("sci-fi") ||
        text.includes("space") ||
        text.includes("cyborg")
      );
    case "romance":
      return (
        genreIds.includes(10749) ||
        genreNames.some((n) => n.includes("romance")) ||
        text.includes("romance") ||
        text.includes("romantic") ||
        text.includes("love story")
      );
    case "horror":
      return (
        genreIds.includes(27) ||
        genreNames.some((n) => n.includes("horror")) ||
        text.includes("horror") ||
        text.includes("zombie") ||
        text.includes("monster")
      );
    case "sports":
      return (
        genreNames.some((n) => n.includes("sport")) ||
        text.includes("sport") ||
        text.includes("basketball") ||
        text.includes("volleyball") ||
        text.includes("football") ||
        text.includes("soccer") ||
        text.includes("boxing") ||
        text.includes("tennis") ||
        text.includes("baseball")
      );
    case "supernatural":
      return (
        genreNames.some((n) => n.includes("supernatural")) ||
        text.includes("supernatural") ||
        text.includes("demon") ||
        text.includes("spirit") ||
        text.includes("curse") ||
        text.includes("magic") ||
        text.includes("vampire")
      );
    case "isekai":
      return (
        genreNames.some((n) => n.includes("isekai")) ||
        text.includes("isekai") ||
        text.includes("reincarnat") ||
        text.includes("another world") ||
        text.includes("transported to another world") ||
        text.includes("parallel world")
      );
    case "mecha":
      return (
        genreNames.some((n) => n.includes("mecha")) ||
        text.includes("mecha") ||
        text.includes("robot") ||
        text.includes("giant robot") ||
        text.includes("gundam") ||
        text.includes("eva")
      );
    case "school":
      return (
        genreNames.some((n) => n.includes("school")) ||
        text.includes("school") ||
        text.includes("academy") ||
        text.includes("high school") ||
        text.includes("classroom") ||
        text.includes("student")
      );
    default:
      return false;
  }
}
