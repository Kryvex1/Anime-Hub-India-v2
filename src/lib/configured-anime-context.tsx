import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getStoredConfiguredAnimeIds,
  subscribeConfiguredAnimeIds,
  fetchConfiguredAnimeIds,
} from "./episodes.firebase";

type ConfiguredAnimeContextType = {
  configuredIds: Set<number>;
  hasLink: (id: number) => boolean;
  refreshConfiguredIds: () => Promise<void>;
};

const ConfiguredAnimeContext = createContext<ConfiguredAnimeContextType>({
  configuredIds: new Set(),
  hasLink: () => false,
  refreshConfiguredIds: async () => {},
});

export function ConfiguredAnimeProvider({ children }: { children: ReactNode }) {
  // Synchronous instant initialization from localStorage (0ms delay)
  const [configuredIds, setConfiguredIds] = useState<Set<number>>(() => {
    const stored = getStoredConfiguredAnimeIds();
    return new Set(stored);
  });

  useEffect(() => {
    // Realtime Firestore snapshot listener: instantly updates and syncs
    const unsubscribe = subscribeConfiguredAnimeIds((ids) => {
      setConfiguredIds(new Set(ids));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const hasLink = (id: number) => configuredIds.has(Number(id));

  return (
    <ConfiguredAnimeContext.Provider
      value={{
        configuredIds,
        hasLink,
        refreshConfiguredIds: async () => {
          const ids = await fetchConfiguredAnimeIds(true);
          setConfiguredIds(new Set(ids));
        },
      }}
    >
      {children}
    </ConfiguredAnimeContext.Provider>
  );
}

export function useConfiguredAnime() {
  return useContext(ConfiguredAnimeContext);
}
