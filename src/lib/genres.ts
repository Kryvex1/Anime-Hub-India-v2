export type GenreDef = {
  slug: string;
  name: string;
  genreId?: number;
  keyword?: string;
  tint: string;
  defaultBackdrop: string;
};

export const GENRES: GenreDef[] = [
  {
    slug: "action",
    name: "Action",
    genreId: 10759,
    tint: "from-rose-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg",
  },
  {
    slug: "adventure",
    name: "Adventure",
    keyword: "adventure",
    tint: "from-amber-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
  },
  {
    slug: "comedy",
    name: "Comedy",
    genreId: 35,
    tint: "from-yellow-400/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/mAJ84WBK0AcbhEbOX2hpDvlzHXL.jpg",
  },
  {
    slug: "drama",
    name: "Drama",
    genreId: 18,
    tint: "from-sky-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/gclYvL4y32d0bVl2N5c9F3T5Xm8.jpg",
  },
  {
    slug: "fantasy",
    name: "Fantasy",
    genreId: 10765,
    tint: "from-rose-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/4QIZkPq8K2Fz9eH7aHk9qE3P2L4.jpg",
  },
  {
    slug: "romance",
    name: "Romance",
    keyword: "romance",
    tint: "from-pink-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/vL5LR6WecotvtJJmQI7KGjT3k1G.jpg",
  },
  {
    slug: "horror",
    name: "Horror",
    keyword: "horror",
    tint: "from-red-700/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/9xxLWtn8G92UVIRCRUm9ujKiYba.jpg",
  },
  {
    slug: "mystery",
    name: "Mystery",
    genreId: 9648,
    tint: "from-amber-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/7kxm1wzM5oR2c63vj0t0Q5YFmE2.jpg",
  },
  {
    slug: "sci-fi",
    name: "Sci-Fi",
    keyword: "science fiction",
    tint: "from-cyan-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/8Zf3e3aH9YkGgB7d4E9o0pY9q1F.jpg",
  },
  {
    slug: "sports",
    name: "Sports",
    keyword: "sport",
    tint: "from-emerald-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/6x8lH4t3jXm5V9K8Z7xY8q3N4P1.jpg",
  },
  {
    slug: "supernatural",
    name: "Supernatural",
    keyword: "supernatural",
    tint: "from-fuchsia-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/41npv2Q4fW5T5vM9B6N4H3G8J2K.jpg",
  },
  {
    slug: "isekai",
    name: "Isekai",
    keyword: "isekai",
    tint: "from-teal-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/7g9q2L9X7vF8t1mF2K0H5T6P9R1.jpg",
  },
  {
    slug: "mecha",
    name: "Mecha",
    keyword: "mecha",
    tint: "from-slate-400/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/3n8q9B5v9K8Z7xY8q3N4P1E2L4.jpg",
  },
  {
    slug: "school",
    name: "School",
    keyword: "school",
    tint: "from-orange-500/40",
    defaultBackdrop: "https://image.tmdb.org/t/p/w780/5s1A3d4F8G7H9J2K5L6M7N8P9Q.jpg",
  },
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
        genreNames.some((n) => n.includes("action")) ||
        text.includes("action") ||
        text.includes("battle") ||
        text.includes("fight")
      );
    case "adventure":
      return (
        genreIds.includes(10759) ||
        genreIds.includes(12) ||
        genreNames.some((n) => n.includes("adventure")) ||
        text.includes("adventure") ||
        text.includes("journey") ||
        text.includes("quest")
      );
    case "comedy":
      return (
        genreIds.includes(35) ||
        genreNames.some((n) => n.includes("comedy")) ||
        text.includes("comedy") ||
        text.includes("humor") ||
        text.includes("funny")
      );
    case "drama":
      return (
        genreIds.includes(18) ||
        genreNames.some((n) => n.includes("drama")) ||
        text.includes("drama") ||
        text.includes("emotional")
      );
    case "fantasy":
      return (
        genreIds.includes(10765) ||
        genreIds.includes(14) ||
        genreNames.some((n) => n.includes("fantasy")) ||
        text.includes("magic") ||
        text.includes("fantasy") ||
        text.includes("sword")
      );
    case "mystery":
      return (
        genreIds.includes(9648) ||
        genreNames.some((n) => n.includes("mystery")) ||
        text.includes("detective") ||
        text.includes("mystery") ||
        text.includes("investigat")
      );
    case "sci-fi":
      return (
        genreIds.includes(10765) ||
        genreIds.includes(878) ||
        genreNames.some((n) => n.includes("sci-fi") || n.includes("science fiction")) ||
        text.includes("sci-fi") ||
        text.includes("space") ||
        text.includes("cyborg") ||
        text.includes("future")
      );
    case "romance":
      return (
        genreIds.includes(10749) ||
        genreNames.some((n) => n.includes("romance")) ||
        text.includes("romance") ||
        text.includes("romantic") ||
        text.includes("love") ||
        text.includes("crush")
      );
    case "horror":
      return (
        genreIds.includes(27) ||
        genreNames.some((n) => n.includes("horror")) ||
        text.includes("horror") ||
        text.includes("zombie") ||
        text.includes("monster") ||
        text.includes("gore") ||
        text.includes("ghoul")
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
        text.includes("shinigami") ||
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
