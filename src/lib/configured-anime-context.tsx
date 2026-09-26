import { createContext, useContext, type ReactNode } from "react";

type ConfiguredAnimeContextType = {
  configuredIds: Set<number>;
  hasLink: (id: number) => boolean;
  refreshConfiguredIds: () => Promise<void>;
};

const ConfiguredAnimeContext = createContext<ConfiguredAnimeContextType>({
  configuredIds: new Set(),
  hasLink: () => true,
  refreshConfiguredIds: async () => {},
});

export function ConfiguredAnimeProvider({ children }: { children: ReactNode }) {
  const hasLink = (_id: number) => true;

  return (
    <ConfiguredAnimeContext.Provider
      value={{
        configuredIds: new Set(),
        hasLink,
        refreshConfiguredIds: async () => {},
      }}
    >
      {children}
    </ConfiguredAnimeContext.Provider>
  );
}

export function useConfiguredAnime() {
  return useContext(ConfiguredAnimeContext);
}
