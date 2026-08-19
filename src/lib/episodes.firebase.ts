import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

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

export async function checkIsAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const adminRef = doc(db, "admins", uid);
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      const data = snap.data();
      return data["role"] === "admin";
    }
    // If the admins collection has zero documents, check if we can auto-grant the initial admin
    const colRef = collection(db, "admins");
    const allAdminsSnap = await getDocs(colRef);
    if (allAdminsSnap.empty) {
      // First user is granted admin bootstrap access
      await setDoc(adminRef, {
        role: "admin",
        createdAt: Date.now(),
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error checking admin authorization:", err);
    return false;
  }
}

export async function setAdminRole(uid: string, email?: string): Promise<void> {
  const adminRef = doc(db, "admins", uid);
  await setDoc(
    adminRef,
    {
      role: "admin",
      email: email ?? "",
      createdAt: Date.now(),
    },
    { merge: true },
  );
}

export async function removeAdminRole(uid: string): Promise<void> {
  const adminRef = doc(db, "admins", uid);
  await deleteDoc(adminRef);
}

export async function listAdmins(): Promise<
  { uid: string; email?: string; role: string; createdAt: number }[]
> {
  try {
    const snap = await getDocs(collection(db, "admins"));
    return snap.docs.map((d) => ({
      uid: d.id,
      email: (d.data()["email"] as string) || "",
      role: (d.data()["role"] as string) || "admin",
      createdAt: (d.data()["createdAt"] as number) || Date.now(),
    }));
  } catch (err) {
    console.error("Error listing admins:", err);
    return [];
  }
}

export async function fetchEpisodeConfig(episodeId: string): Promise<EpisodeDoc | null> {
  if (!episodeId) return null;
  try {
    const epRef = doc(db, "episodes", episodeId);
    const snap = await getDoc(epRef);
    if (snap.exists()) {
      return snap.data() as EpisodeDoc;
    }
    return null;
  } catch (err) {
    console.error("Error fetching episode configuration:", err);
    return null;
  }
}

export async function fetchSeasonEpisodesConfig(
  animeId: number,
  seasonNumber: number,
): Promise<Map<string, EpisodeDoc>> {
  const map = new Map<string, EpisodeDoc>();
  try {
    const epCol = collection(db, "episodes");
    const q = query(
      epCol,
      where("animeId", "==", Number(animeId)),
      where("season", "==", Number(seasonNumber)),
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      map.set(d.id, d.data() as EpisodeDoc);
    });
  } catch (err) {
    console.error("Error fetching season episode configs:", err);
  }
  return map;
}

// In-memory & local cache for configured anime IDs
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
const CONFIGURED_CACHE_TTL = 1000 * 30; // 30 seconds

export function invalidateConfiguredAnimeCache() {
  cachedConfiguredAnimeIds = null;
  lastConfiguredFetch = 0;
}

export function subscribeConfiguredAnimeIds(callback: (ids: number[]) => void): Unsubscribe {
  // First notify with stored / memory cached IDs immediately for instant 0ms render
  const immediate = cachedConfiguredAnimeIds || getStoredConfiguredAnimeIds();
  if (immediate.length > 0) {
    callback(immediate);
  }

  const epCol = collection(db, "episodes");
  return onSnapshot(
    epCol,
    (snap) => {
      const idSet = new Set<number>();
      snap.forEach((d) => {
        const data = d.data() as EpisodeDoc;
        const hasUrl = Boolean(data.server1?.url?.trim() || data.server2?.url?.trim());
        if (hasUrl && data.animeId && Number.isFinite(data.animeId)) {
          idSet.add(Number(data.animeId));
        }
      });
      const ids = Array.from(idSet);
      cachedConfiguredAnimeIds = ids;
      lastConfiguredFetch = Date.now();
      saveStoredConfiguredAnimeIds(ids);
      callback(ids);
    },
    (err) => {
      // Gracefully handle offline mode / transient network drops without breaking UI
      const stored = cachedConfiguredAnimeIds || getStoredConfiguredAnimeIds();
      if (stored.length > 0) {
        callback(stored);
      }
    },
  );
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

  // Check storage if memory is empty
  if (!force && cachedConfiguredAnimeIds === null) {
    const stored = getStoredConfiguredAnimeIds();
    if (stored.length > 0) {
      cachedConfiguredAnimeIds = stored;
      return stored;
    }
  }

  try {
    const epCol = collection(db, "episodes");
    const snap = await getDocs(epCol);
    const idSet = new Set<number>();

    snap.forEach((d) => {
      const data = d.data() as EpisodeDoc;
      const hasUrl = Boolean(data.server1?.url?.trim() || data.server2?.url?.trim());
      if (hasUrl && data.animeId && Number.isFinite(data.animeId)) {
        idSet.add(Number(data.animeId));
      }
    });

    cachedConfiguredAnimeIds = Array.from(idSet);
    lastConfiguredFetch = now;
    saveStoredConfiguredAnimeIds(cachedConfiguredAnimeIds);
    return cachedConfiguredAnimeIds;
  } catch {
    // Return stored cached values on offline or backend unavailable
    return cachedConfiguredAnimeIds || getStoredConfiguredAnimeIds();
  }
}

export async function saveEpisodeConfig(
  config: Omit<EpisodeDoc, "updatedAt"> & { updatedAt?: number },
): Promise<void> {
  const epRef = doc(db, "episodes", config.id);
  const data: EpisodeDoc = {
    ...config,
    updatedAt: Date.now(),
  };
  await setDoc(epRef, data, { merge: true });
  invalidateConfiguredAnimeCache();
}

export async function deleteEpisodeConfig(episodeId: string): Promise<void> {
  const epRef = doc(db, "episodes", episodeId);
  await deleteDoc(epRef);
  invalidateConfiguredAnimeCache();
}

export async function deleteServerFromEpisode(episodeId: string, serverNum: 1 | 2): Promise<void> {
  const epRef = doc(db, "episodes", episodeId);
  if (serverNum === 1) {
    await updateDoc(epRef, {
      server1: null,
      activeServer: 2,
      updatedAt: Date.now(),
    });
  } else {
    await updateDoc(epRef, {
      server2: null,
      activeServer: 1,
      updatedAt: Date.now(),
    });
  }
  invalidateConfiguredAnimeCache();
}

export async function fetchAllConfiguredEpisodes(): Promise<EpisodeDoc[]> {
  try {
    const epCol = collection(db, "episodes");
    const q = query(epCol, orderBy("updatedAt", "desc"), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as EpisodeDoc);
  } catch (err) {
    console.error("Error fetching all configured episodes:", err);
    return [];
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const epCol = collection(db, "episodes");
    const snap = await getDocs(epCol);
    const all = snap.docs.map((d) => d.data() as EpisodeDoc);

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

    // Sort recent episodes
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
    console.error("Error calculating dashboard stats:", err);
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
