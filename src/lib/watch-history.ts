import { useCallback, useEffect, useState } from "react";

export interface WatchHistoryItem {
  animeId: number;
  animeTitle: string;
  season: number;
  episode: number;
  episodeTitle?: string;
  poster?: string | null;
  backdrop?: string | null;
  type?: "TV" | "Movie" | "Series";
  updatedAt: number;
}

const STORAGE_KEY = "anistream.watch_history.v1";
const MAX_HISTORY_ITEMS = 30;

function readHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && typeof item.animeId === "number" && item.animeId > 0)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
}

function writeHistory(items: WatchHistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = items.slice(0, MAX_HISTORY_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent("watchhistory-change"));
  } catch {
    // Ignore quota errors
  }
}

/** Record or update watch history for an anime episode */
export function recordWatchHistory(entry: {
  animeId: number;
  animeTitle: string;
  season: number;
  episode: number;
  episodeTitle?: string;
  poster?: string | null;
  backdrop?: string | null;
  type?: "TV" | "Movie" | "Series";
}) {
  if (!entry.animeId || !Number.isFinite(entry.animeId)) return;

  const current = readHistory();
  const filtered = current.filter((item) => item.animeId !== entry.animeId);

  const newItem: WatchHistoryItem = {
    animeId: entry.animeId,
    animeTitle: entry.animeTitle || "Anime",
    season: entry.season || 1,
    episode: entry.episode || 1,
    episodeTitle: entry.episodeTitle || "",
    poster: entry.poster || null,
    backdrop: entry.backdrop || null,
    type: entry.type || "TV",
    updatedAt: Date.now(),
  };

  writeHistory([newItem, ...filtered]);
}

/** React hook to access and manage Watch History */
export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => readHistory());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setHistory(readHistory());
    sync();
    setReady(true);

    window.addEventListener("watchhistory-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("watchhistory-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const removeItem = useCallback((animeId: number) => {
    const next = readHistory().filter((item) => item.animeId !== animeId);
    writeHistory(next);
    setHistory(next);
  }, []);

  const clearAll = useCallback(() => {
    writeHistory([]);
    setHistory([]);
  }, []);

  const getItem = useCallback(
    (animeId: number) => history.find((h) => h.animeId === animeId),
    [history],
  );

  return {
    history,
    ready,
    removeItem,
    clearAll,
    getItem,
  };
}
