// Video Player Providers Architecture & Central Resolver
// Supporting: Multi Server (Viduki), Hindi / Multi-Audio, Vidy.st, VidLink, CineSrc

export type ProviderType = "viduki" | "vidy" | "vidlink" | "cinesrc";
export type VidukiApiId = "1" | "2" | "3" | "4";

export interface VidyOptions {
  color?: string;
  progress?: string | number;
  autoplay?: boolean;
  nextEpisode?: boolean;
  episodeSelector?: boolean;
  autoplayNextEpisode?: boolean;
}

export interface ServerOption {
  id: string;
  provider: ProviderType;
  api?: VidukiApiId;
  name: string;
  badge?: string;
  description?: string;
}

/**
 * 1. VIDY.ST URL GENERATOR (DOCUMENTED SPECIFICATION)
 *
 * Official endpoints:
 * - Movie: https://vidy.st/movie/{tmdbId}
 * - TV:    https://vidy.st/tv/{tmdbId}/{season}/{episode}
 * - Anime: https://vidy.st/anime/{anilistId}/{episode}
 *
 * Supported query parameters:
 * ?color=DC2626&autoplay=true&progress=...&nextEpisode=...&episodeSelector=...&autoplayNextEpisode=...
 */
export function getVidyUrl(
  type: "movie" | "tv" | "anime",
  id: string | number,
  season: number = 1,
  episode: number = 1,
  options: VidyOptions = {},
): string {
  let url = "";

  if (type === "movie") {
    url = `https://vidy.st/movie/${id}`;
  } else if (type === "tv") {
    url = `https://vidy.st/tv/${id}/${season}/${episode}`;
  } else if (type === "anime") {
    url = `https://vidy.st/anime/${id}/${episode}`;
  }

  const params = new URLSearchParams();

  if (options.color) {
    params.set("color", options.color.replace(/^#/, ""));
  }

  if (options.progress !== undefined) {
    params.set("progress", String(options.progress));
  }

  if (options.autoplay !== undefined) {
    params.set("autoplay", String(options.autoplay));
  }

  if (options.nextEpisode !== undefined) {
    params.set("nextEpisode", String(options.nextEpisode));
  }

  if (options.episodeSelector !== undefined) {
    params.set("episodeSelector", String(options.episodeSelector));
  }

  if (options.autoplayNextEpisode !== undefined) {
    params.set("autoplayNextEpisode", String(options.autoplayNextEpisode));
  }

  const query = params.toString();
  return query ? `${url}?${query}` : url;
}

/**
 * 2. VIDUKI URL GENERATOR
 */
export function getVidukiUrl(
  api: VidukiApiId,
  type: "movie" | "tv",
  id: string | number,
  season: number = 1,
  episode: number = 1,
  color: string = "E50914",
): string {
  const cleanId = String(id).trim();
  const cleanSeason = Math.max(1, Math.floor(Number(season) || 1));
  const cleanEpisode = Math.max(1, Math.floor(Number(episode) || 1));

  if (type === "movie") {
    if (api === "1") {
      const cleanColor = color.replace(/^#/, "");
      return `https://viduki.net/1/movie/${cleanId}${cleanColor ? `?color=${cleanColor}` : ""}`;
    }
    return `https://viduki.net/${api}/movie/${cleanId}`;
  }

  if (type === "tv") {
    return `https://viduki.net/${api}/tv/${cleanId}/${cleanSeason}/${cleanEpisode}`;
  }

  return "";
}

/**
 * 3. VIDLINK URL GENERATOR
 */
export function getVidLinkUrl(
  type: "movie" | "tv",
  id: string | number,
  season: number = 1,
  episode: number = 1,
): string {
  const cleanId = String(id).trim();
  const cleanSeason = Math.max(1, Math.floor(Number(season) || 1));
  const cleanEpisode = Math.max(1, Math.floor(Number(episode) || 1));

  if (type === "movie") {
    return `https://vidlink.pro/movie/${cleanId}?primaryColor=E50914`;
  }
  return `https://vidlink.pro/tv/${cleanId}/${cleanSeason}/${cleanEpisode}?primaryColor=E50914`;
}

/**
 * 4. CINESRC URL GENERATOR
 */
export function getCineSrcUrl(
  type: "movie" | "tv",
  id: string | number,
  season: number = 1,
  episode: number = 1,
): string {
  const cleanId = String(id).trim();
  const cleanSeason = Math.max(1, Math.floor(Number(season) || 1));
  const cleanEpisode = Math.max(1, Math.floor(Number(episode) || 1));

  if (type === "movie") {
    return `https://cinesrc.com/embed/movie/${cleanId}`;
  }
  return `https://cinesrc.com/embed/tv/${cleanId}/${cleanSeason}/${cleanEpisode}`;
}

/**
 * PROVIDERS ABSTRACTION
 */
export const providers = {
  viduki: {
    name: "Viduki",
    getUrl: (
      api: VidukiApiId,
      type: "movie" | "tv",
      id: string | number,
      season: number,
      episode: number,
    ) => getVidukiUrl(api, type, id, season, episode),
  },
  vidy: {
    name: "Vidy",
    getUrl: (
      type: "movie" | "tv" | "anime",
      id: string | number,
      season: number,
      episode: number,
      options?: VidyOptions,
    ) => getVidyUrl(type, id, season, episode, options),
  },
  vidlink: {
    name: "VidLink",
    getUrl: (type: "movie" | "tv", id: string | number, season: number, episode: number) =>
      getVidLinkUrl(type, id, season, episode),
  },
  cinesrc: {
    name: "CineSrc",
    getUrl: (type: "movie" | "tv", id: string | number, season: number, episode: number) =>
      getCineSrcUrl(type, id, season, episode),
  },
};

/**
 * ALL ACTIVE STREAMING SERVERS (ORDERED AS REQUESTED)
 * 1. VidLink (VidLink Provider) - 1st Primary Server!
 * 2. Hindi / Multi-Audio (Viduki API 2: Hindi Dub + Multi Language) - 2nd Server!
 * 3. Multi Server (Viduki API 1: Auto Fast, high-speed CDN)
 * 4. Vidy (Vidy.st Provider)
 * 5. CineSrc (CineSrc Provider)
 * 6. Multi Embeds (Viduki API 3)
 * 7. Ultra HD (Viduki API 4)
 */
export const ALL_PLAY_SERVERS: ServerOption[] = [
  {
    id: "vidlink",
    provider: "vidlink",
    name: "VidLink",
    badge: "Fast HD",
    description: "Primary ultra-fast HD player with instant load",
  },
  {
    id: "viduki-2",
    provider: "viduki",
    api: "2",
    name: "Hindi / Multi-Audio",
    badge: "Hindi Dubbed",
    description: "Includes Hindi, English & multiple audio languages + subtitles",
  },
  {
    id: "viduki-1",
    provider: "viduki",
    api: "1",
    name: "Multi Server",
    badge: "Auto Fast",
    description: "High-speed CDN cluster with adaptive streaming",
  },
  {
    id: "vidy",
    provider: "vidy",
    name: "Vidy",
    badge: "Fast HD · No Ads",
    description: "Clean Vidy.st player node with responsive buffer",
  },
  {
    id: "cinesrc",
    provider: "cinesrc",
    name: "CineSrc",
    badge: "Stream Cluster",
    description: "Multi-source streaming cluster",
  },
  {
    id: "viduki-3",
    provider: "viduki",
    api: "3",
    name: "Multi Embeds",
    badge: "High Compat",
    description: "High compatibility streaming mirrors",
  },
  {
    id: "viduki-4",
    provider: "viduki",
    api: "4",
    name: "Ultra HD",
    badge: "1080p Pure",
    description: "Ultra-fast direct buffer & premium CDN",
  },
];

export const VIDUKI_SERVERS = ALL_PLAY_SERVERS.filter((s) => s.provider === "viduki");

/**
 * CENTRAL RESOLVER
 */
export function resolveStreamUrl(
  server: ServerOption,
  type: "movie" | "tv",
  id: string | number,
  season: number = 1,
  episode: number = 1,
  anilistId?: number | null,
): string {
  if (server.provider === "vidy") {
    // If anilistId is available and type is anime/tv, use anime endpoint
    if (anilistId) {
      return getVidyUrl("anime", anilistId, season, episode, {
        color: "E50914",
        autoplay: false,
      });
    }
    return getVidyUrl(type, id, season, episode, {
      color: "E50914",
      autoplay: false,
    });
  }

  if (server.provider === "vidlink") {
    return getVidLinkUrl(type, id, season, episode);
  }

  if (server.provider === "cinesrc") {
    return getCineSrcUrl(type, id, season, episode);
  }

  // Default: Viduki
  const apiId: VidukiApiId = server.api || "1";
  return getVidukiUrl(apiId, type, id, season, episode);
}

/**
 * AUTOMATIC SERVER ROTATION FALLBACK
 * Multi Server -> Hindi / Multi-Audio -> Vidy -> VidLink -> CineSrc -> Multi Embeds -> Ultra HD -> null
 */
export function getNextServer(currentServerId: string): ServerOption | null {
  const currentIndex = ALL_PLAY_SERVERS.findIndex((s) => s.id === currentServerId);
  if (currentIndex === -1 || currentIndex >= ALL_PLAY_SERVERS.length - 1) {
    return null;
  }
  return ALL_PLAY_SERVERS[currentIndex + 1];
}

export function getNextVidukiApi(currentApi: VidukiApiId): VidukiApiId | null {
  switch (currentApi) {
    case "1":
      return "2";
    case "2":
      return "3";
    case "3":
      return "4";
    default:
      return null;
  }
}
