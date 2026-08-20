import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Palette, RotateCcw, Check, Zap, Sliders, Trash2, Database } from "lucide-react";
import { THEME_OPTIONS, useAppSettings, ThemeId } from "@/lib/settings";
import { clearAllAppCache } from "@/lib/tmdb";
import { FilterLoadingModal } from "@/components/anime/filter-loading-modal";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Themes — CineAnime Hub" },
      {
        name: "description",
        content: "Customize website colors, accent themes, and playback preferences.",
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
            Personalize website colors and playback preferences.
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

      {/* 2. PLAYBACK & STREAMING PREFERENCES */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg">
          <Zap className="w-5 h-5 text-[var(--brand-glow)]" />
          <h2>Playback & Stream Settings</h2>
        </div>

        <div className="space-y-3">
          {/* Auto-Play Next Episode */}
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
        </div>
      </section>

      {/* 3. STORAGE & DATA MANAGEMENT */}
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
    </div>
  );
}
