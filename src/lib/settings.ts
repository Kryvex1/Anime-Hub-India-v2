import { useEffect, useState, useCallback } from "react";

export type ThemeId =
  "indigo" | "emerald" | "amber" | "crimson" | "cyan" | "rose" | "sunset" | "cyberpunk";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  primary: string;
  glow: string;
  hover: string;
  rgb: string;
  gradient?: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "indigo",
    name: "Cyber Violet",
    primary: "#6366f1",
    glow: "#818cf8",
    hover: "#4f46e5",
    rgb: "99, 102, 241",
    gradient: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
  },
  {
    id: "emerald",
    name: "Neon Emerald",
    primary: "#10b981",
    glow: "#34d399",
    hover: "#059669",
    rgb: "16, 185, 129",
    gradient: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
  },
  {
    id: "amber",
    name: "Cyber Orange",
    primary: "#f97316",
    glow: "#fb923c",
    hover: "#ea580c",
    rgb: "249, 115, 22",
    gradient: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
  },
  {
    id: "crimson",
    name: "Blood Moon Red",
    primary: "#ef4444",
    glow: "#f87171",
    hover: "#dc2626",
    rgb: "239, 68, 68",
    gradient: "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
  },
  {
    id: "cyan",
    name: "Electric Cyan",
    primary: "#06b6d4",
    glow: "#38bdf8",
    hover: "#0891b2",
    rgb: "6, 182, 212",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%)",
  },
  {
    id: "rose",
    name: "Sakura Pink",
    primary: "#ec4899",
    glow: "#f472b6",
    hover: "#db2777",
    rgb: "236, 72, 153",
    gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
  },
  {
    id: "sunset",
    name: "Tokyo Sunset",
    primary: "#a855f7",
    glow: "#f97316",
    hover: "#9333ea",
    rgb: "168, 85, 247",
    gradient: "linear-gradient(135deg, #a855f7 0%, #f97316 100%)",
  },
  {
    id: "cyberpunk",
    name: "Synthwave Cyber",
    primary: "#ec4899",
    glow: "#06b6d4",
    hover: "#db2777",
    rgb: "236, 72, 153",
    gradient: "linear-gradient(135deg, #ec4899 0%, #06b6d4 100%)",
  },
];

export interface AppSettings {
  theme: ThemeId;
  normalMode: boolean; // Default true: All anime unrestricted
  safeMode: boolean; // Only clean family friendly content
  adultMode: boolean; // 18+ mature content included
  onlyAdultMode: boolean; // Show only 18+ mature anime
  darkGoreMode: boolean; // Dark psychological, thriller & gore priority
  autoPlayNext: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "indigo",
  normalMode: true,
  safeMode: false,
  adultMode: false,
  onlyAdultMode: false,
  darkGoreMode: false,
  autoPlayNext: true,
};

const SETTINGS_KEY = "anistream_user_settings_v4";

export function loadStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyThemeToDOM(settings.theme);
    window.dispatchEvent(new CustomEvent("anistream:settings-changed", { detail: settings }));
  } catch {
    // Ignore storage issues
  }
}

export function applyThemeToDOM(themeId: ThemeId): void {
  if (typeof document === "undefined") return;
  const theme = THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0];
  const root = document.documentElement;

  root.style.setProperty("--brand-primary", theme.primary);
  root.style.setProperty("--brand-glow", theme.glow);
  root.style.setProperty("--brand-hover", theme.hover);
  root.style.setProperty("--brand-rgb", theme.rgb);
  root.style.setProperty("--brand-gradient", theme.gradient || theme.primary);
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--ring", theme.primary);
  root.style.setProperty("--accent", theme.glow);
  root.style.setProperty("--color-brand", theme.primary);
  root.style.setProperty("--color-brand-glow", theme.glow);

  root.setAttribute("data-theme", themeId);
}

// React Hook for App Settings
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());

  useEffect(() => {
    applyThemeToDOM(settings.theme);

    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<AppSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };

    window.addEventListener("anistream:settings-changed", handleSettingsChanged);
    return () => {
      window.removeEventListener("anistream:settings-changed", handleSettingsChanged);
    };
  }, [settings.theme]);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "normalMode" && value === true) {
          next.safeMode = false;
          next.onlyAdultMode = false;
        }
        if (key === "safeMode" && value === true) {
          next.normalMode = false;
          next.adultMode = false;
          next.onlyAdultMode = false;
        }
        if (key === "onlyAdultMode" && value === true) {
          next.normalMode = false;
          next.safeMode = false;
          next.adultMode = true;
        }
        if (key === "adultMode" && value === true) {
          next.safeMode = false;
        }
        // If safeMode and onlyAdultMode are turned off, default normalMode back to true
        if (!next.safeMode && !next.onlyAdultMode && !next.normalMode) {
          next.normalMode = true;
        }
        saveStoredSettings(next);
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    saveStoredSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    resetSettings,
  };
}
