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

// In-memory quick caches for zero-latency retrieval
const customStreamCache = new Map<string, { at: number; data: CustomStreamData | null }>();
let globalConfigCache: { at: number; data: GlobalServerConfig | null } | null = null;

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
  if (cached && now - cached.at < 1000 * 60 * 5) {
    return cached.data;
  }

  try {
    const docRef = doc(db, "customStreams", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as CustomStreamData;
      customStreamCache.set(docId, { at: now, data });
      return data;
    }
    customStreamCache.set(docId, { at: now, data: null });
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
}

/**
 * Delete custom stream link
 */
export async function deleteCustomStream(docId: string): Promise<void> {
  const docRef = doc(db, "customStreams", docId);
  await deleteDoc(docRef);
  customStreamCache.delete(docId);
}

/**
 * Fetch all configured custom streams (for admin overview)
 */
export async function fetchAllCustomStreams(): Promise<CustomStreamData[]> {
  try {
    const colRef = collection(db, "customStreams");
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomStreamData);
  } catch (err) {
    console.warn("Error fetching all custom streams:", err);
    return [];
  }
}

/**
 * Fetch global server settings (renamed servers & hidden servers)
 */
export async function fetchGlobalServerConfig(): Promise<GlobalServerConfig> {
  const now = Date.now();
  if (globalConfigCache && now - globalConfigCache.at < 1000 * 60 * 5) {
    return globalConfigCache.data || {};
  }

  try {
    const docRef = doc(db, "serverSettings", "global_config");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as GlobalServerConfig;
      globalConfigCache = { at: now, data };
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
