import { useEffect, useState, useCallback } from "react";

export type ThemeId =
  "netflix" | "indigo" | "emerald" | "amber" | "crimson" | "cyan" | "rose" | "sunset" | "cyberpunk";

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
    id: "netflix",
    name: "Netflix Red (Default)",
    primary: "#E50914",
    glow: "#ff333d",
    hover: "#b80710",
    rgb: "229, 9, 20",
    gradient: "linear-gradient(135deg, #E50914 0%, #b80710 100%)",
  },
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

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "GLOBAL", name: "Global / Worldwide", flag: "🌐" },
];

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
];

export function getCountryName(code?: string): string {
  const match = COUNTRY_OPTIONS.find((c) => c.code === (code || "IN"));
  return match ? `${match.flag} ${match.name}` : "🇮🇳 India";
}

export function getLanguageName(code?: string): string {
  const match = LANGUAGE_OPTIONS.find((l) => l.code === (code || "hi"));
  return match ? match.name : (code || "Hindi").toUpperCase();
}

export interface AppSettings {
  theme: ThemeId;
  normalMode: boolean; // Default true: All anime unrestricted
  safeMode: boolean; // Only clean family friendly content
  adultMode: boolean; // 18+ mature content included
  onlyAdultMode: boolean; // Show only 18+ mature anime
  darkGoreMode: boolean; // Dark psychological, thriller & gore priority
  autoPlayNext: boolean;
  country: string; // ISO 3166-1 alpha-2, default "IN"
  preferredLanguages: string[]; // ISO 639-1 language codes, default ["hi", "en"]
  isManualCountry?: boolean; // Set to true when user explicitly selects a country
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "netflix",
  normalMode: true,
  safeMode: false,
  adultMode: false,
  onlyAdultMode: false,
  darkGoreMode: false,
  autoPlayNext: true,
  country: "IN",
  preferredLanguages: ["hi", "en"],
  isManualCountry: false,
};

const SETTINGS_KEY = "anistream_user_settings_v5";

/**
 * Detects visitor's country using reliable server-side IP geolocation endpoint (/api/geo),
 * falling back to browser timezone / locale mapping if network or server unavailable.
 */
export async function detectVisitorCountry(): Promise<string> {
  // 1. Server-side IP geolocation
  try {
    const res = await fetch("/api/geo");
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.country === "string" && data.country.length === 2) {
        return data.country.toUpperCase();
      }
    }
  } catch {
    // Ignore network error and proceed to timezone heuristic
  }

  // 2. Reliable browser timezone / locale mapping fallback
  if (typeof Intl !== "undefined") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Calcutta") || tz.includes("Kolkata") || tz.includes("India")) return "IN";
      if (
        tz.includes("New_York") ||
        tz.includes("Los_Angeles") ||
        tz.includes("Chicago") ||
        tz.includes("Denver") ||
        tz.includes("Phoenix") ||
        tz.includes("America")
      ) {
        return "US";
      }
      if (tz.includes("London") || tz.includes("Belfast")) return "GB";
      if (
        tz.includes("Toronto") ||
        tz.includes("Vancouver") ||
        tz.includes("Montreal") ||
        tz.includes("Edmonton")
      ) {
        return "CA";
      }
      if (
        tz.includes("Sydney") ||
        tz.includes("Melbourne") ||
        tz.includes("Brisbane") ||
        tz.includes("Perth")
      ) {
        return "AU";
      }
      if (tz.includes("Tokyo")) return "JP";
      if (tz.includes("Seoul")) return "KR";
      if (tz.includes("Berlin") || tz.includes("Frankfurt")) return "DE";
      if (tz.includes("Paris")) return "FR";
      if (tz.includes("Sao_Paulo")) return "BR";
    } catch {
      // Fallback
    }
  }

  return "IN";
}

export function loadStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    parsed.theme = "netflix"; // Enforce pure red Netflix theme
    const country =
      typeof parsed.country === "string" && parsed.country.length > 0 ? parsed.country : "IN";
    const preferredLanguages =
      Array.isArray(parsed.preferredLanguages) && parsed.preferredLanguages.length > 0
        ? parsed.preferredLanguages
        : ["hi", "en"];
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      country,
      preferredLanguages,
      theme: "netflix",
      isManualCountry: parsed.isManualCountry === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    const forced = { ...settings, theme: "netflix" as ThemeId };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(forced));
    applyThemeToDOM("netflix");
    window.dispatchEvent(new CustomEvent("anistream:settings-changed", { detail: forced }));
  } catch {
    // Ignore storage issues
  }
}

export function applyThemeToDOM(themeId: ThemeId = "netflix"): void {
  if (typeof document === "undefined") return;
  const theme = THEME_OPTIONS[0]; // Always Netflix red
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

  root.setAttribute("data-theme", "netflix");
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

  // Server-side IP geolocation / timezone auto-detection on first visit (only when user has not manually chosen)
  useEffect(() => {
    if (!settings.isManualCountry) {
      let isMounted = true;
      detectVisitorCountry()
        .then((detected) => {
          if (isMounted && detected && detected !== settings.country) {
            setSettings((prev) => {
              if (prev.isManualCountry) return prev;
              const updated = { ...prev, country: detected };
              saveStoredSettings(updated);
              return updated;
            });
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [settings.isManualCountry, settings.country]);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "country") {
          next.isManualCountry = true; // Mark as explicitly chosen by user
        }
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
