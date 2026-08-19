import { useCallback, useEffect, useState } from "react";

const KEY = "kuroi.watchlist.v1";

function read(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function write(ids: number[]) {
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("watchlist-change"));
}

/** Local-storage backed watchlist. Swap these helpers for API calls when auth lands. */
export function useWatchlist() {
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    setReady(true);
    window.addEventListener("watchlist-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("watchlist-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: number) => {
    const next = read().includes(id) ? read().filter((x) => x !== id) : [id, ...read()];
    write(next);
  }, []);

  const remove = useCallback((id: number) => write(read().filter((x) => x !== id)), []);

  return { ids, ready, toggle, remove, has: (id: number) => ids.includes(id) };
}
