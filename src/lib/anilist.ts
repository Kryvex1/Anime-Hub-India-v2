// AniList GraphQL ID Resolver with Memory & Local Storage caching
const anilistCache = new Map<string, number | null>();

export async function getAniListIdByTitle(title: string): Promise<number | null> {
  const cleanTitle = (title || "").trim();
  if (!cleanTitle) return null;

  const key = cleanTitle.toLowerCase();
  if (anilistCache.has(key)) {
    return anilistCache.get(key) ?? null;
  }

  try {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(`anilist_id_${key}`);
      if (cached) {
        const parsed = parseInt(cached, 10);
        if (!isNaN(parsed) && parsed > 0) {
          anilistCache.set(key, parsed);
          return parsed;
        }
      }
    }

    const query = `
      query ($search: String) {
        Media(search: $search, type: ANIME) {
          id
        }
      }
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables: { search: cleanTitle } }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      anilistCache.set(key, null);
      return null;
    }

    const json = await res.json();
    const id = json?.data?.Media?.id;
    if (typeof id === "number" && id > 0) {
      anilistCache.set(key, id);
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`anilist_id_${key}`, String(id));
        }
      } catch {
        // Ignore storage errors
      }
      return id;
    }

    anilistCache.set(key, null);
    return null;
  } catch {
    anilistCache.set(key, null);
    return null;
  }
}
