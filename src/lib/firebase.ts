import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db =
  "firestoreDatabaseId" in firebaseConfig && firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId as string)
    : getFirestore(app);

export interface CustomStreamLink {
  id?: string;
  serverName: string;
  customUrl: string;
  badge?: string;
}

export interface CustomStreamData {
  id: string; // e.g. "movie_12345" or "tv_12345_1_1"
  mediaId: number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  title?: string;
  poster?: string | null;
  customUrl?: string; // iframe embed url (primary/fallback)
  serverName?: string;
  badge?: string;
  streams?: CustomStreamLink[]; // Multiple custom stream sources
  serverNames?: Record<string, string>; // Per-title/episode custom server name overrides (e.g. vidlink -> "Custom Dub")
  serverBadges?: Record<string, string>; // Per-title/episode custom server badge overrides (e.g. vidlink -> "1080p")
  hiddenServers?: string[]; // Specific default server IDs hidden for this title/episode
  hideDefaultServers?: boolean; // If true, hide all default servers for this specific title
  updatedAt?: string;
  updatedBy?: string;
}

export interface GlobalServerConfig {
  serverNames?: Record<string, string>; // serverId -> custom name
  serverBadges?: Record<string, string>; // serverId -> custom badge label
  hiddenServers?: string[]; // list of globally hidden server IDs
  allHidden?: boolean; // if true, hides all default servers globally
  updatedAt?: string;
}

// In-memory & Session quick caches for zero-latency retrieval & minimal Firestore reads
const customStreamCache = new Map<string, { at: number; data: CustomStreamData | null }>();
let globalConfigCache: { at: number; data: GlobalServerConfig | null } | null = null;

const FB_STORAGE_PREFIX = "fb_cache_";
const CUSTOM_STREAMS_EVENT = "custom_streams_cache_updated";

/**
 * Check if a custom stream data object actually has a valid custom embed link
 */
export function hasValidCustomStream(data: CustomStreamData | null | undefined): boolean {
  if (!data) return false;
  if (data.customUrl && data.customUrl.trim().length > 0) return true;
  if (Array.isArray(data.streams)) {
    return data.streams.some(
      (s) => s && typeof s.customUrl === "string" && s.customUrl.trim().length > 0,
    );
  }
  return false;
}

function getFbSession<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(FB_STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.at < 1000 * 60 * 10) {
      return parsed.data as T;
    }
  } catch {
    // Ignore
  }
  return null;
}

function setFbSession(key: string, data: unknown) {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(FB_STORAGE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Ignore
  }
}

export function getStreamDocId(
  mediaType: "movie" | "tv",
  mediaId: number,
  season = 1,
  episode = 1,
): string {
  if (mediaType === "movie") {
    return `movie_${mediaId}`;
  }
  return `tv_${mediaId}_${season}_${episode}`;
}

/**
 * Fetch Custom Stream link from Firestore for a specific movie or episode
 */
export async function fetchCustomStream(
  mediaType: "movie" | "tv",
  mediaId: number,
  season = 1,
  episode = 1,
): Promise<CustomStreamData | null> {
  const docId = getStreamDocId(mediaType, mediaId, season, episode);
  const now = Date.now();
  const cached = customStreamCache.get(docId);
  if (cached && now - cached.at < 1000 * 60 * 10) {
    return cached.data;
  }

  const sessionData = getFbSession<CustomStreamData>(`stream_${docId}`);
  if (sessionData !== null) {
    customStreamCache.set(docId, { at: now, data: sessionData });
    return sessionData;
  }

  try {
    const docRef = doc(db, "customStreams", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as CustomStreamData;
      customStreamCache.set(docId, { at: now, data });
      setFbSession(`stream_${docId}`, data);
      return data;
    }
    customStreamCache.set(docId, { at: now, data: null });
    setFbSession(`stream_${docId}`, null);
    return null;
  } catch (err) {
    console.warn("Error fetching custom stream:", err);
    return null;
  }
}

/**
 * Save custom stream link
 */
export async function saveCustomStream(stream: CustomStreamData): Promise<void> {
  const docId =
    stream.id || getStreamDocId(stream.mediaType, stream.mediaId, stream.season, stream.episode);
  const docRef = doc(db, "customStreams", docId);
  const payload = {
    ...stream,
    id: docId,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || "admin",
  };
  await setDoc(docRef, payload, { merge: true });
  customStreamCache.set(docId, { at: Date.now(), data: payload });
  setFbSession(`stream_${docId}`, payload);

  // Invalidate all-custom-streams session cache
  try {
    sessionStorage.removeItem(FB_STORAGE_PREFIX + "all_custom_streams");
  } catch {
    // Ignore
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CUSTOM_STREAMS_EVENT, { detail: { docId, payload } }));
  }
}

/**
 * Delete custom stream link
 */
export async function deleteCustomStream(docId: string): Promise<void> {
  const docRef = doc(db, "customStreams", docId);
  await deleteDoc(docRef);
  customStreamCache.delete(docId);
  try {
    sessionStorage.removeItem(FB_STORAGE_PREFIX + `stream_${docId}`);
    sessionStorage.removeItem(FB_STORAGE_PREFIX + "all_custom_streams");
  } catch {
    // Ignore
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CUSTOM_STREAMS_EVENT, { detail: { docId, deleted: true } }),
    );
  }
}

/**
 * Fetch all configured custom streams (for admin overview and badges)
 */
export async function fetchAllCustomStreams(): Promise<CustomStreamData[]> {
  const sessionAll = getFbSession<CustomStreamData[]>("all_custom_streams");
  if (sessionAll) return sessionAll;

  try {
    const colRef = collection(db, "customStreams");
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomStreamData);
    setFbSession("all_custom_streams", list);
    return list;
  } catch (err) {
    console.warn("Error fetching all custom streams:", err);
    return [];
  }
}

/**
 * React hook to get a Set of all docIds that have active custom stream links configured
 */
export function useCustomStreamIds(): Set<string> {
  const [streamIds, setStreamIds] = useState<Set<string>>(() => {
    const cached = getFbSession<CustomStreamData[]>("all_custom_streams");
    if (cached) {
      const ids = new Set<string>();
      for (const item of cached) {
        if (hasValidCustomStream(item)) {
          ids.add(item.id);
        }
      }
      return ids;
    }
    return new Set<string>();
  });

  useEffect(() => {
    let mounted = true;

    const loadAll = async () => {
      const all = await fetchAllCustomStreams();
      if (!mounted) return;
      const ids = new Set<string>();
      for (const item of all) {
        if (hasValidCustomStream(item)) {
          ids.add(item.id);
        }
      }
      setStreamIds(ids);
    };

    void loadAll();

    const handleUpdate = () => {
      void loadAll();
    };

    window.addEventListener(CUSTOM_STREAMS_EVENT, handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener(CUSTOM_STREAMS_EVENT, handleUpdate);
    };
  }, []);

  return streamIds;
}

/**
 * React hook to check if a specific movie has a custom stream link
 */
export function useIsMovieCustomLinked(movieId: number | undefined | null): boolean {
  const customIds = useCustomStreamIds();
  if (!movieId) return false;
  return customIds.has(`movie_${movieId}`);
}

/**
 * React hook to check if TV episodes have custom stream links
 */
export function useTvEpisodeCustomLinks(
  tvId: number | undefined | null,
  seasonNumber: number,
): (epNumber: number) => boolean {
  const customIds = useCustomStreamIds();
  return (epNumber: number) => {
    if (!tvId) return false;
    return customIds.has(`tv_${tvId}_${seasonNumber}_${epNumber}`);
  };
}

/**
 * Fetch global server settings (renamed servers & hidden servers)
 */
export async function fetchGlobalServerConfig(): Promise<GlobalServerConfig> {
  const now = Date.now();
  if (globalConfigCache && now - globalConfigCache.at < 1000 * 60 * 10) {
    return globalConfigCache.data || {};
  }

  const sessionConfig = getFbSession<GlobalServerConfig>("global_server_config");
  if (sessionConfig) {
    globalConfigCache = { at: now, data: sessionConfig };
    return sessionConfig;
  }

  try {
    const docRef = doc(db, "serverSettings", "global_config");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as GlobalServerConfig;
      globalConfigCache = { at: now, data };
      setFbSession("global_server_config", data);
      return data;
    }
    return {};
  } catch (err) {
    console.warn("Error fetching global server config:", err);
    return {};
  }
}

/**
 * Save global server settings
 */
export async function saveGlobalServerConfig(config: GlobalServerConfig): Promise<void> {
  const docRef = doc(db, "serverSettings", "global_config");
  const payload = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
  globalConfigCache = { at: Date.now(), data: payload };
  setFbSession("global_server_config", payload);
}

/**
 * React hook for Firebase Auth state
 */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading, isAdmin: Boolean(user) };
}

export { signInWithEmailAndPassword, signOut };
