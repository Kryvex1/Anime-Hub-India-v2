import { useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { X, Play, Trash2, Bookmark, Film, ChevronRight, Globe, Languages } from "lucide-react";
import { useWatchHistory, type WatchHistoryItem } from "@/lib/watch-history";
import { useWatchlist } from "@/lib/watchlist";
import { useAppSettings, COUNTRY_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/settings";
import { getMediaCategory } from "@/lib/routes-helper";
import { img } from "./media";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { history, removeItem, clearAll } = useWatchHistory();
  const { ids: watchlistIds } = useWatchlist();
  const { settings, updateSetting } = useAppSettings();
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResume = (item: WatchHistoryItem) => {
    onClose();
    const isMovie = item.type?.toLowerCase() === "movie";
    const cat = item.category || getMediaCategory(item.animeId, { isMovie, type: item.type });

    if (cat === "movie") {
      void navigate({
        to: "/movie/$id/watch",
        params: { id: String(item.animeId) },
        search: { season: 1, episode: 1 },
      });
    } else if (cat === "webseries") {
      void navigate({
        to: "/webseries/$id/watch",
        params: { id: String(item.animeId) },
        search: { season: item.season, episode: item.episode },
      });
    } else {
      void navigate({
        to: "/anime/$id/watch",
        params: { id: String(item.animeId) },
        search: { season: item.season, episode: item.episode },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel - 100% on phone, max-w-[420px] on desktop */}
      <aside
        ref={drawerRef}
        className="relative z-10 flex h-full w-full sm:max-w-[420px] flex-col bg-[#11141d] text-white shadow-2xl border-l border-white/10 transition-transform duration-200 ease-out"
        role="dialog"
        aria-label="My Library"
      >
        {/* Clean Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 sm:px-5 py-3.5 bg-[#0e121a]">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">My Library</h2>
            <p className="text-[11px] text-neutral-400">Watchlist, History & Region Preferences</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-2 p-3 sm:p-4 border-b border-white/[0.06] bg-[#0c1017]">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[11px] text-neutral-400 font-medium">Continue Watching</p>
            <p className="text-sm font-bold text-white mt-0.5">{history.length} titles</p>
          </div>

          <Link
            to="/watchlist"
            onClick={onClose}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition group cursor-pointer"
          >
            <div>
              <p className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-[#E50914]" /> Watchlist
              </p>
              <p className="text-sm font-bold text-white mt-0.5">{watchlistIds.length} saved</p>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
          </Link>
        </div>

        {/* Regional Personalization Section */}
        <div className="p-3 sm:p-4 border-b border-white/[0.06] bg-[#0d111a] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#E50914]" /> Recommendation Region
            </span>
            <span className="text-[11px] font-medium text-emerald-400">
              {COUNTRY_OPTIONS.find((c) => c.code === settings.country)?.flag || "🇮🇳"}{" "}
              {COUNTRY_OPTIONS.find((c) => c.code === settings.country)?.name || "India"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="country-select" className="block text-[10px] text-neutral-400 mb-1">
                Country
              </label>
              <select
                id="country-select"
                value={settings.country}
                onChange={(e) => updateSetting("country", e.target.value)}
                className="w-full text-xs font-semibold bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-[#E50914] cursor-pointer"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#11141d] text-white">
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="language-select" className="block text-[10px] text-neutral-400 mb-1">
                Primary Language
              </label>
              <select
                id="language-select"
                value={settings.preferredLanguages[0] || "hi"}
                onChange={(e) => {
                  const newPrimary = e.target.value;
                  const rest = settings.preferredLanguages.filter((l) => l !== newPrimary);
                  updateSetting("preferredLanguages", [newPrimary, ...rest]);
                }}
                className="w-full text-xs font-semibold bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-[#E50914] cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#11141d] text-white">
                    {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Continue Watching List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Continue Watching
            </span>

            {history.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-rose-400 transition cursor-pointer"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <Film className="w-8 h-8 text-neutral-500 mb-2" />
              <h3 className="text-sm font-bold text-white mb-1">Nothing in progress</h3>
              <p className="text-xs text-neutral-400 max-w-xs mb-3">
                Play any movie or episode and it will appear here so you can resume anytime.
              </p>
              <Link
                to="/browse"
                onClick={onClose}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white transition active:scale-95 cursor-pointer"
              >
                <span>Browse</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                const isMovie = item.type?.toLowerCase() === "movie";
                const thumb = img(item.backdrop || item.poster, "w300");

                return (
                  <div
                    key={`hist-${item.animeId}`}
                    className="group relative flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => handleResume(item)}
                      className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-900 cursor-pointer"
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.animeTitle}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-neutral-600">
                          <Film className="w-5 h-5" />
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 fill-white text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div
                      onClick={() => handleResume(item)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-[#ff4d55] transition">
                        {item.animeTitle}
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        {isMovie ? "Movie" : `S${item.season} · Ep ${item.episode}`}
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.animeId);
                      }}
                      className="h-7 w-7 shrink-0 rounded-md text-neutral-500 hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
