import { ref, get, set, remove, update, onValue, type Unsubscribe } from "firebase/database";
import { rtdb } from "./firebase";

export type EpisodeServer = {
  url: string;
};

export type EpisodeDoc = {
  id: string; // e.g. "12345_s01_e01"
  animeId: number;
  animeTitle?: string;
  season: number;
  episode: number;
  episodeTitle?: string;
  thumbnail?: string | null;
  server1?: EpisodeServer | null;
  server2?: EpisodeServer | null;
  activeServer: 1 | 2;
  updatedAt: number;
  updatedBy?: string;
};

export type AddedAnimeDoc = {
  animeId: number;
  id?: number;
  title: string;
  originalTitle?: string;
  poster?: string | null;
  backdrop?: string | null;
  overview?: string;
  rating?: number;
  voteCount?: number;
  year?: string;
  type?: string;
  genres?: string[];
  popularity?: number;
  addedAt: number;
};

export type HeroBannerDoc = {
  id: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  backdrop?: string | null;
  poster?: string | null;
  rating?: number;
  year?: string;
  type?: string;
  genres?: string[];
  order?: number;
  addedAt: number;
};

export type DashboardStats = {
  totalConfigured: number;
  withServer1: number;
  withServer2: number;
  withBothServers: number;
  withNoServer: number;
  recentEpisodes: EpisodeDoc[];
};

export function getEpisodeId(animeId: number, seasonNumber: number, episodeNumber: number): string {
  const s = String(seasonNumber).padStart(2, "0");
  const e = String(episodeNumber).padStart(2, "0");
  return `${animeId}_s${s}_e${e}`;
}

/* =========================================================
   ADMIN ROLE MANAGEMENT (Realtime Database /admins)
   ========================================================= */

export async function checkIsAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const adminRef = ref(rtdb, `admins/${uid}`);
    const snap = await get(adminRef);
    if (snap.exists()) {
      const data = snap.val();
      return data?.role === "admin";
    }

    // Bootstrap initial admin if /admins is completely empty
    const allAdminsRef = ref(rtdb, "admins");
    const allSnap = await get(allAdminsRef);
    if (!allSnap.exists() || Object.keys(allSnap.val() || {}).length === 0) {
      await set(adminRef, {
        role: "admin",
        createdAt: Date.now(),
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error checking admin authorization in RTDB:", err);
    return false;
  }
}

export async function setAdminRole(uid: string, email?: string): Promise<void> {
  const adminRef = ref(rtdb, `admins/${uid}`);
  await update(adminRef, {
    role: "admin",
    email: email ?? "",
    createdAt: Date.now(),
  });
}

export async function removeAdminRole(uid: string): Promise<void> {
  const adminRef = ref(rtdb, `admins/${uid}`);
  await remove(adminRef);
}

export async function listAdmins(): Promise<
  { uid: string; email?: string; role: string; createdAt: number }[]
> {
  try {
    const allRef = ref(rtdb, "admins");
    const snap = await get(allRef);
    if (!snap.exists()) return [];
    const val = snap.val() as Record<string, { email?: string; role?: string; createdAt?: number }>;
    return Object.entries(val).map(([uid, data]) => ({
      uid,
      email: data.email || "",
      role: data.role || "admin",
      createdAt: data.createdAt || Date.now(),
    }));
  } catch (err) {
    console.error("Error listing admins from RTDB:", err);
    return [];
  }
}

/* =========================================================
   HERO BANNER CAROUSEL MANAGEMENT (/hero_banners)
   ========================================================= */

const HERO_CACHE_KEY = "cineanime_hero_banners_cache";

export function getStoredHeroBanners(): HeroBannerDoc[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(HERO_CACHE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredHeroBanners(banners: HeroBannerDoc[]) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(banners));
    }
  } catch {
    // ignore
  }
}

export async function addHeroBanner(
  banner: Partial<HeroBannerDoc> & { id: number; title: string },
): Promise<void> {
  if (!banner.id) return;
  try {
    const bannerRef = ref(rtdb, `hero_banners/${banner.id}`);
    const data: HeroBannerDoc = {
      id: Number(banner.id),
      title: banner.title || "",
      originalTitle: banner.originalTitle || "",
      overview: banner.overview || "",
      backdrop: banner.backdrop ?? null,
      poster: banner.poster ?? null,
      rating: banner.rating ?? 8.5,
      year: banner.year || "",
      type: banner.type || "TV",
      genres: banner.genres || [],
      order: banner.order ?? Date.now(),
      addedAt: Date.now(),
    };
    await set(bannerRef, data);
  } catch (err) {
    console.error("Error adding hero banner to RTDB:", err);
  }
}

export async function removeHeroBanner(animeId: number): Promise<void> {
  if (!animeId) return;
  try {
    const bannerRef = ref(rtdb, `hero_banners/${animeId}`);
    await remove(bannerRef);
  } catch (err) {
    console.error("Error removing hero banner from RTDB:", err);
  }
}

export async function fetchHeroBanners(): Promise<HeroBannerDoc[]> {
  try {
    const bannerRef = ref(rtdb, "hero_banners");
    const snap = await get(bannerRef);
    if (!snap.exists()) return getStoredHeroBanners();
    const val = snap.val() as Record<string, HeroBannerDoc>;
    const list = Object.values(val).sort((a, b) => (a.order || 0) - (b.order || 0));
    saveStoredHeroBanners(list);
    return list;
  } catch (err) {
    console.error("Error fetching hero banners:", err);
    return getStoredHeroBanners();
  }
}

export function subscribeHeroBanners(callback: (banners: HeroBannerDoc[]) => void): Unsubscribe {
  // First notify immediately with stored cache
  const stored = getStoredHeroBanners();
  if (stored.length > 0) callback(stored);

  const bannerRef = ref(rtdb, "hero_banners");
  return onValue(
    bannerRef,
    (snap) => {
      if (snap.exists()) {
        const val = snap.val() as Record<string, HeroBannerDoc>;
        const list = Object.values(val).sort((a, b) => (a.order || 0) - (b.order || 0));
        saveStoredHeroBanners(list);
        callback(list);
      } else {
        callback([]);
      }
    },
    () => {
      // ignore errors
    },
  );
}

/* =========================================================
   ADDED ANIME TO WEBSITE MANAGEMENT (Realtime Database /added_anime)
   ========================================================= */

const ADDED_ANIME_CACHE_KEY = "cineanime_added_anime_cache";

export function getStoredAddedAnime(): AddedAnimeDoc[] {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(ADDED_ANIME_CACHE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredAddedAnime(list: AddedAnimeDoc[]) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(ADDED_ANIME_CACHE_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}

export async function addAnimeToWebsite(
  animeId: number,
  title?: string,
  poster?: string | null,
  metadata?: Partial<AddedAnimeDoc>,
): Promise<void> {
  if (!animeId || !Number.isFinite(animeId)) return;
  try {
    const animeRef = ref(rtdb, `added_anime/${animeId}`);
    const data: AddedAnimeDoc = {
      animeId: Number(animeId),
      id: Number(animeId),
      title: title || metadata?.title || "",
      originalTitle: metadata?.originalTitle || "",
      poster: poster ?? metadata?.poster ?? null,
      backdrop: metadata?.backdrop ?? null,
      overview: metadata?.overview || "",
      rating: metadata?.rating ?? 8.0,
      voteCount: metadata?.voteCount ?? 0,
      year: metadata?.year || "",
      type: metadata?.type || "TV",
      genres: metadata?.genres || [],
      popularity: metadata?.popularity ?? 100,
      addedAt: Date.now(),
    };
    await set(animeRef, data);
    invalidateConfiguredAnimeCache();
  } catch (err) {
    console.error("Error adding anime to website:", err);
  }
}

export async function removeAnimeFromWebsite(animeId: number): Promise<void> {
  if (!animeId || !Number.isFinite(animeId)) return;
  try {
    const animeRef = ref(rtdb, `added_anime/${animeId}`);
    await remove(animeRef);
    invalidateConfiguredAnimeCache();
  } catch (err) {
    console.error("Error removing anime from website:", err);
  }
}

export async function isAnimeAddedToWebsite(animeId: number): Promise<boolean> {
  if (!animeId || !Number.isFinite(animeId)) return false;
  try {
    const animeRef = ref(rtdb, `added_anime/${animeId}`);
    const snap = await get(animeRef);
    return snap.exists();
  } catch {
    return false;
  }
}

export async function fetchAddedAnimeMap(): Promise<Map<number, AddedAnimeDoc>> {
  const map = new Map<number, AddedAnimeDoc>();
  try {
    const allRef = ref(rtdb, "added_anime");
    const snap = await get(allRef);
    if (snap.exists()) {
      const val = snap.val() as Record<string, AddedAnimeDoc>;
      const list: AddedAnimeDoc[] = [];
      Object.values(val).forEach((doc) => {
        const aId = Number(doc.animeId || doc.id);
        if (aId) {
          const fullDoc: AddedAnimeDoc = {
            ...doc,
            animeId: aId,
            id: aId,
          };
          map.set(aId, fullDoc);
          list.push(fullDoc);
        }
      });
      saveStoredAddedAnime(list);
    } else {
      // fallback to stored
      getStoredAddedAnime().forEach((doc) => map.set(doc.animeId, doc));
    }
  } catch (err) {
    console.error("Error fetching added anime map:", err);
    getStoredAddedAnime().forEach((doc) => map.set(doc.animeId, doc));
  }
  return map;
}

export async function fetchAddedAnimeList(): Promise<AddedAnimeDoc[]> {
  const map = await fetchAddedAnimeMap();
  return Array.from(map.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

/* =========================================================
   EPISODE MANAGEMENT (Realtime Database /episodes)
   ========================================================= */

export async function fetchEpisodeConfig(episodeId: string): Promise<EpisodeDoc | null> {
  if (!episodeId) return null;
  try {
    const epRef = ref(rtdb, `episodes/${episodeId}`);
    const snap = await get(epRef);
    if (snap.exists()) {
      return snap.val() as EpisodeDoc;
    }
    return null;
  } catch (err) {
    console.error("Error fetching episode configuration from RTDB:", err);
    return null;
  }
}

export async function fetchSeasonEpisodesConfig(
  animeId: number,
  seasonNumber: number,
): Promise<Map<string, EpisodeDoc>> {
  const map = new Map<string, EpisodeDoc>();
  try {
    const allEpRef = ref(rtdb, "episodes");
    const snap = await get(allEpRef);
    if (snap.exists()) {
      const all = snap.val() as Record<string, EpisodeDoc>;
      Object.entries(all).forEach(([key, val]) => {
        if (
          Number(val.animeId) === Number(animeId) &&
          Number(val.season) === Number(seasonNumber)
        ) {
          map.set(key, val);
        }
      });
    }
  } catch (err) {
    console.error("Error fetching season episode configs from RTDB:", err);
  }
  return map;
}

// In-memory & local storage cache for ultra-fast instant 0ms rendering
const STORAGE_KEY = "cineanime_configured_ids";

export function getStoredConfiguredAnimeIds(): number[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => Number.isFinite(n));
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredConfiguredAnimeIds(ids: number[]) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore
  }
}

let cachedConfiguredAnimeIds: number[] | null = null;
let lastConfiguredFetch = 0;
const CONFIGURED_CACHE_TTL = 1000 * 15; // 15 seconds

export function invalidateConfiguredAnimeCache() {
  cachedConfiguredAnimeIds = null;
  lastConfiguredFetch = 0;
}

export function subscribeConfiguredAnimeIds(callback: (ids: number[]) => void): Unsubscribe {
  // First notify with cached IDs immediately for instant 0ms render
  const immediate = cachedConfiguredAnimeIds || getStoredConfiguredAnimeIds();
  if (immediate.length > 0) {
    callback(immediate);
  }

  // Realtime listeners on /added_anime and /episodes
  let addedIds = new Set<number>();
  let episodeIds = new Set<number>();

  const emitCombined = () => {
    const combined = Array.from(new Set([...addedIds, ...episodeIds]));
    cachedConfiguredAnimeIds = combined;
    lastConfiguredFetch = Date.now();
    saveStoredConfiguredAnimeIds(combined);
    callback(combined);
  };

  const addedRef = ref(rtdb, "added_anime");
  const unsubAdded = onValue(
    addedRef,
    (snap) => {
      addedIds = new Set<number>();
      if (snap.exists()) {
        const val = snap.val() as Record<string, AddedAnimeDoc>;
        Object.values(val).forEach((doc) => {
          const aId = Number(doc?.animeId || doc?.id);
          if (aId && Number.isFinite(aId)) {
            addedIds.add(aId);
          }
        });
      }
      emitCombined();
    },
    () => {
      // ignore errors
    },
  );

  const epRef = ref(rtdb, "episodes");
  const unsubEp = onValue(
    epRef,
    (snap) => {
      episodeIds = new Set<number>();
      if (snap.exists()) {
        const val = snap.val() as Record<string, EpisodeDoc>;
        Object.values(val).forEach((doc) => {
          const hasUrl = Boolean(doc.server1?.url?.trim() || doc.server2?.url?.trim());
          if (hasUrl && doc.animeId && Number.isFinite(Number(doc.animeId))) {
            episodeIds.add(Number(doc.animeId));
          }
        });
      }
      emitCombined();
    },
    () => {
      // ignore errors
    },
  );

  return () => {
    unsubAdded();
    unsubEp();
  };
}

export async function fetchConfiguredAnimeIds(force = false): Promise<number[]> {
  const now = Date.now();
  if (
    !force &&
    cachedConfiguredAnimeIds !== null &&
    now - lastConfiguredFetch < CONFIGURED_CACHE_TTL
  ) {
    return cachedConfiguredAnimeIds;
  }

  if (!force && cachedConfiguredAnimeIds === null) {
    const stored = getStoredConfiguredAnimeIds();
    if (stored.length > 0) {
      cachedConfiguredAnimeIds = stored;
      return stored;
    }
  }

  try {
    const [addedSnap, epSnap] = await Promise.all([
      get(ref(rtdb, "added_anime")),
      get(ref(rtdb, "episodes")),
    ]);

    const idSet = new Set<number>();

    if (addedSnap.exists()) {
      const addedVal = addedSnap.val() as Record<string, AddedAnimeDoc>;
      Object.values(addedVal).forEach((doc) => {
        const aId = Number(doc?.animeId || doc?.id);
        if (aId && Number.isFinite(aId)) {
          idSet.add(aId);
        }
      });
    }

    if (epSnap.exists()) {
      const epVal = epSnap.val() as Record<string, EpisodeDoc>;
      Object.values(epVal).forEach((doc) => {
        const hasUrl = Boolean(doc.server1?.url?.trim() || doc.server2?.url?.trim());
        if (hasUrl && doc.animeId && Number.isFinite(Number(doc.animeId))) {
          idSet.add(Number(doc.animeId));
        }
      });
    }

    cachedConfiguredAnimeIds = Array.from(idSet);
    lastConfiguredFetch = now;
    saveStoredConfiguredAnimeIds(cachedConfiguredAnimeIds);
    return cachedConfiguredAnimeIds;
  } catch {
    return cachedConfiguredAnimeIds || getStoredConfiguredAnimeIds();
  }
}

export async function saveEpisodeConfig(
  config: Omit<EpisodeDoc, "updatedAt"> & { updatedAt?: number },
): Promise<void> {
  const epRef = ref(rtdb, `episodes/${config.id}`);
  const data: EpisodeDoc = {
    ...config,
    updatedAt: Date.now(),
  };
  await set(epRef, data);

  // Auto add to website when episode link is saved
  if (config.animeId) {
    await addAnimeToWebsite(config.animeId, config.animeTitle);
  }

  invalidateConfiguredAnimeCache();
}

export async function deleteEpisodeConfig(episodeId: string): Promise<void> {
  const epRef = ref(rtdb, `episodes/${episodeId}`);
  await remove(epRef);
  invalidateConfiguredAnimeCache();
}

export async function deleteServerFromEpisode(episodeId: string, serverNum: 1 | 2): Promise<void> {
  const epRef = ref(rtdb, `episodes/${episodeId}`);
  if (serverNum === 1) {
    await update(epRef, {
      server1: null,
      activeServer: 2,
      updatedAt: Date.now(),
    });
  } else {
    await update(epRef, {
      server2: null,
      activeServer: 1,
      updatedAt: Date.now(),
    });
  }
  invalidateConfiguredAnimeCache();
}

export async function fetchAnimeConfiguredEpisodes(animeId: number): Promise<EpisodeDoc[]> {
  try {
    const epRef = ref(rtdb, "episodes");
    const snap = await get(epRef);
    if (!snap.exists()) return [];

    const all = snap.val() as Record<string, EpisodeDoc>;
    return Object.values(all).filter(
      (ep) =>
        Number(ep.animeId) === Number(animeId) &&
        Boolean(ep.server1?.url?.trim() || ep.server2?.url?.trim()),
    );
  } catch (err) {
    console.error("Error fetching anime configured episodes from RTDB:", err);
    return [];
  }
}

export async function fetchAllConfiguredEpisodes(): Promise<EpisodeDoc[]> {
  try {
    const epRef = ref(rtdb, "episodes");
    const snap = await get(epRef);
    if (!snap.exists()) return [];

    const all = snap.val() as Record<string, EpisodeDoc>;
    const list = Object.values(all);
    return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 100);
  } catch (err) {
    console.error("Error fetching all configured episodes from RTDB:", err);
    return [];
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const epRef = ref(rtdb, "episodes");
    const snap = await get(epRef);
    if (!snap.exists()) {
      return {
        totalConfigured: 0,
        withServer1: 0,
        withServer2: 0,
        withBothServers: 0,
        withNoServer: 0,
        recentEpisodes: [],
      };
    }

    const all = Object.values(snap.val() as Record<string, EpisodeDoc>);
    let withServer1 = 0;
    let withServer2 = 0;
    let withBothServers = 0;
    let withNoServer = 0;

    all.forEach((ep) => {
      const has1 = Boolean(ep.server1?.url?.trim());
      const has2 = Boolean(ep.server2?.url?.trim());
      if (has1 && has2) withBothServers++;
      if (has1) withServer1++;
      if (has2) withServer2++;
      if (!has1 && !has2) withNoServer++;
    });

    const sorted = [...all].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    return {
      totalConfigured: all.length,
      withServer1,
      withServer2,
      withBothServers,
      withNoServer,
      recentEpisodes: sorted.slice(0, 15),
    };
  } catch (err) {
    console.error("Error calculating dashboard stats from RTDB:", err);
    return {
      totalConfigured: 0,
      withServer1: 0,
      withServer2: 0,
      withBothServers: 0,
      withNoServer: 0,
      recentEpisodes: [],
    };
  }
}
