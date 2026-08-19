import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Palette,
  Shield,
  ShieldAlert,
  Skull,
  RotateCcw,
  Check,
  Zap,
  Sliders,
  Eye,
  Trash2,
  Database,
  Sparkles,
} from "lucide-react";
import { THEME_OPTIONS, useAppSettings, ThemeId } from "@/lib/settings";
import { clearAllAppCache } from "@/lib/tmdb";
import { AdultConfirmModal } from "@/components/anime/adult-confirm-modal";
import { FilterLoadingModal } from "@/components/anime/filter-loading-modal";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Themes — AniStream" },
      {
        name: "description",
        content:
          "Customize website colors, accent themes, content filters, and playback preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function Switch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[var(--brand-primary)]" : "bg-white/15"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useAppSettings();
  const queryClient = useQueryClient();
  const [showAdultModal, setShowAdultModal] = useState(false);
  const [pendingAdultMode, setPendingAdultMode] = useState<"include" | "only">("include");
  const [isLoading, setIsLoading] = useState(false);

  const runFilterTransition = (action: () => void) => {
    setIsLoading(true);

    // Apply setting change immediately
    action();

    // Clear network/session cache
    clearAllAppCache(false);

    // Invalidate and reload React Query data smoothly
    setTimeout(async () => {
      try {
        await queryClient.invalidateQueries();
      } catch {
        // ignore
      }
      setTimeout(() => {
        setIsLoading(false);
      }, 350);
    }, 450);
  };

  const handleThemeSelect = (themeId: ThemeId) => {
    updateSetting("theme", themeId);
  };

  const handleNormalToggle = (checked: boolean) => {
    if (checked) {
      runFilterTransition(() => updateSetting("normalMode", true));
    }
  };

  const handleOnlyAdultToggle = (checked: boolean) => {
    if (checked) {
      setPendingAdultMode("only");
      setShowAdultModal(true);
    } else {
      runFilterTransition(() => updateSetting("onlyAdultMode", false));
    }
  };

  const handleConfirmAdult = () => {
    if (pendingAdultMode === "only") {
      runFilterTransition(() => updateSetting("onlyAdultMode", true));
    } else {
      runFilterTransition(() => updateSetting("adultMode", true));
    }
  };

  const handleSafeToggle = (checked: boolean) => {
    runFilterTransition(() => updateSetting("safeMode", checked));
  };

  const handleDarkGoreToggle = (checked: boolean) => {
    runFilterTransition(() => updateSetting("darkGoreMode", checked));
  };

  const handleClearAllStorage = () => {
    runFilterTransition(() => {
      clearAllAppCache(true);
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:pt-8 md:pt-10 pb-24 md:px-8 space-y-8">
      {/* Minimal Fullscreen Blurred Theme Spinner */}
      <FilterLoadingModal isOpen={isLoading} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--brand-glow)] text-xs font-bold uppercase tracking-wider">
            <Sliders className="w-4 h-4" />
            <span>Preferences & Customization</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Website Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Personalize website colors, content viewing filters, and playback preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            runFilterTransition(() => resetSettings());
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {/* 1. THEME COLORS & GRADIENTS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg">
          <Palette className="w-5 h-5 text-[var(--brand-glow)]" />
          <h2>Theme & Accent Colors</h2>
        </div>
        <p className="text-xs text-slate-400 -mt-2">
          Select a color palette. Buttons, glowing indicators, badges, and sliders will instantly
          transition across the whole app.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = settings.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeSelect(theme.id)}
                className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all duration-300 text-center cursor-pointer group ${
                  isSelected
                    ? "bg-white/[0.08] border-white/30 shadow-lg shadow-black/50 ring-2 ring-[var(--brand-primary)] scale-[1.02]"
                    : "bg-[#0b0f19]/80 border-white/[0.07] hover:bg-white/[0.04] hover:border-white/15"
                }`}
              >
                {/* Color Swatch Circle */}
                <div
                  className="w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-transform group-hover:scale-110 mb-2 border border-white/20"
                  style={{
                    background: theme.gradient || theme.primary,
                  }}
                >
                  {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                </div>

                <span className="text-xs font-bold text-white truncate max-w-full">
                  {theme.name}
                </span>

                {isSelected && (
                  <span className="mt-1.5 inline-flex items-center shrink-0 whitespace-nowrap text-[10px] font-semibold text-[var(--brand-glow)] bg-[var(--brand-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--brand-primary)]/20">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. CONTENT FILTERS & SPECIAL MODES */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg">
          <Eye className="w-5 h-5 text-[var(--brand-glow)]" />
          <h2>Content Viewing Modes</h2>
        </div>
        <p className="text-xs text-slate-400 -mt-2">
          Toggle custom modes for your browsing and discovery experience.
        </p>

        <div className="space-y-3">
          {/* NORMAL MODE (DEFAULT ON) */}
          <div className="group relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/90 border border-white/[0.07] hover:border-white/15 transition-all duration-300 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-3.5 sm:gap-4">
              <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[var(--brand-glow)] shrink-0 mt-0.5 shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Normal Mode (All Anime)
                    </h3>
                    {settings.normalMode && (
                      <span className="inline-flex items-center shrink-0 whitespace-nowrap rounded-full bg-indigo-500/15 text-[var(--brand-glow)] text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 border border-indigo-500/30">
                        Default Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    Unrestricted anime discovery. Browse all action, shonen, romance, fantasy, and
                    trending series freely with zero barriers.
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-0.5">
                <Switch checked={settings.normalMode} onChange={handleNormalToggle} />
              </div>
            </div>
          </div>

          {/* ONLY 18+ ADULT MODE */}
          <div className="group relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/90 border border-white/[0.07] hover:border-white/15 transition-all duration-300 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-3.5 sm:gap-4">
              <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 shadow-inner">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Only 18+ Mature Mode
                    </h3>
                    {settings.onlyAdultMode && (
                      <span className="inline-flex items-center shrink-0 whitespace-nowrap rounded-full bg-rose-500/15 text-rose-300 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 border border-rose-500/30">
                        Active (18+ Only)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    Exclusively filters and displays 18+ adult, uncensored, and ecchi anime titles
                    across feeds.
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-0.5">
                <Switch checked={settings.onlyAdultMode} onChange={handleOnlyAdultToggle} />
              </div>
            </div>
          </div>

          {/* SAFE FAMILY MODE */}
          <div className="group relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/90 border border-white/[0.07] hover:border-white/15 transition-all duration-300 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-3.5 sm:gap-4">
              <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 shadow-inner">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Safe Family Mode
                    </h3>
                    {settings.safeMode && (
                      <span className="inline-flex items-center shrink-0 whitespace-nowrap rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 border border-emerald-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    100% clean family-friendly mode. Completely filters out all suggestive, ecchi,
                    and mature content.
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-0.5">
                <Switch checked={settings.safeMode} onChange={handleSafeToggle} />
              </div>
            </div>
          </div>

          {/* DARK PSYCHOLOGICAL / GORE MODE */}
          <div className="group relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/90 border border-white/[0.07] hover:border-white/15 transition-all duration-300 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-3.5 sm:gap-4">
              <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5 shadow-inner">
                  <Skull className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Dark Thriller / Gore Mode
                    </h3>
                    {settings.darkGoreMode && (
                      <span className="inline-flex items-center shrink-0 whitespace-nowrap rounded-full bg-purple-500/15 text-purple-300 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 border border-purple-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    Prioritizes psychological mind-game thrillers, dark sci-fi, horror, and
                    action-packed gore anime (e.g. Berserk, Tokyo Ghoul, Chainsaw Man).
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-0.5">
                <Switch checked={settings.darkGoreMode} onChange={handleDarkGoreToggle} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PLAYBACK PREFERENCES */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg">
          <Zap className="w-5 h-5 text-[var(--brand-glow)]" />
          <h2>Playback Options</h2>
        </div>

        <div className="group relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/90 border border-white/[0.07] hover:border-white/15 transition-all duration-300 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-3.5 sm:gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Auto-Play Next Episode
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                Automatically transition to the next episode when watching multi-episode seasons.
              </p>
            </div>

            <div className="shrink-0">
              <Switch
                checked={settings.autoPlayNext}
                onChange={(val) => {
                  updateSetting("autoPlayNext", val);
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. STORAGE & DATA MANAGEMENT */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg">
          <Database className="w-5 h-5 text-rose-400" />
          <h2>Storage & Cache Management</h2>
        </div>

        <div className="group relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/90 border border-white/[0.07] hover:border-white/15 transition-all duration-300 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Clear Temporary Storage & Cache
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                Purge temporary cache and refresh the anime feeds directly without affecting your
                watchlist or preferences.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearAllStorage}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-4 py-2.5 text-xs font-bold text-rose-300 transition active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto shadow-sm"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Clear Storage & Cache</span>
            </button>
          </div>
        </div>
      </section>

      {/* Clean 18+ Confirmation Modal */}
      <AdultConfirmModal
        isOpen={showAdultModal}
        onClose={() => setShowAdultModal(false)}
        onConfirm={handleConfirmAdult}
      />
    </div>
  );
}
