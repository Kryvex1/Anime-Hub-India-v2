import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, Clock, Play, Trash2, X, Compass, ArrowLeft } from "lucide-react";

import { AnimeCard, CardSkeleton } from "@/components/anime/card";
import { IconClose } from "@/components/anime/icons";
import { ErrorState } from "@/components/anime/states";
import { fetchWatchlistItems } from "@/lib/anime.functions";
import { useWatchlist } from "@/lib/watchlist";
import { useWatchHistory } from "@/lib/watch-history";
import { getMediaCategory } from "@/lib/routes-helper";
import { img, Img } from "@/components/anime/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/watchlist")({
  validateSearch: (search: Record<string, unknown>): { tab?: "watchlist" | "history" } => {
    const rawTab = search?.["tab"];
    if (rawTab === "history" || rawTab === "watchlist") {
      return { tab: rawTab };
    }
    return {};
  },
  head: () => ({
    meta: [
      { title: "My Library — 7Shows" },
      {
        name: "description",
        content: "Your saved watchlist and watch history on 7Shows.",
      },
      { property: "og:title", content: "My Library — 7Shows" },
      {
        property: "og:description",
        content: "Your saved watchlist and watch history on 7Shows.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"watchlist" | "history">(
    search.tab === "history" ? "history" : "watchlist",
  );
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const { ids, ready, remove } = useWatchlist();
  const { history, removeItem, clearAll, ready: historyReady } = useWatchHistory();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["watchlist", ids.join(",")],
    queryFn: () => fetchWatchlistItems({ data: { ids } }),
    enabled: ready && ids.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  const handleTabChange = (tab: "watchlist" | "history") => {
    setActiveTab(tab);
    void navigate({
      to: "/watchlist",
      search: tab === "history" ? { tab: "history" } : {},
    });
  };

  const handleBack = () => {
    try {
      if (document.referrer && document.referrer.includes(window.location.host)) {
        window.history.back();
      } else {
        void navigate({ to: "/" });
      }
    } catch {
      void navigate({ to: "/" });
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] min-h-[calc(100dvh-70px)] px-4 pt-4 sm:pt-6 pb-20 md:px-8 overscroll-none select-none">
      {/* Top Navigation Bar: Mobile-optimized Back Icon + Tab Pills */}
      <div className="flex items-center justify-between pb-3">
        {/* Back Button: Icon only on mobile, text on desktop */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-xs font-bold text-white transition-all cursor-pointer active:scale-90 shadow-md backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#0D111C] border border-white/[0.08] shadow-inner">
          <button
            type="button"
            onClick={() => handleTabChange("watchlist")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "watchlist"
                ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/30"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Watchlist</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                activeTab === "watchlist"
                  ? "bg-black/30 text-white"
                  : "bg-white/10 text-neutral-300",
              )}
            >
              {ids.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("history")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "history"
                ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/30"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>History</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                activeTab === "history" ? "bg-black/30 text-white" : "bg-white/10 text-neutral-300",
              )}
            >
              {history.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: WATCHLIST */}
      {activeTab === "watchlist" && (
        <div className="mt-4">
          {!ready || (ids.length > 0 && isPending) ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: Math.max(ids.length, 6) }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : ids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-[#0D111C]/60 border border-white/[0.06] my-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-[#E50914] mb-3 shadow-lg shadow-[#E50914]/10">
                <Bookmark className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Your watchlist is empty</h2>
              <p className="text-xs text-neutral-400 max-w-sm mb-5">
                Save your favorite movies, series, or anime to watch them anytime.
              </p>
              <Link
                to="/browse"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#E50914]/30 transition active:scale-95"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore Catalog</span>
              </Link>
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {(data ?? []).map((item) => (
                <div key={item.id} className="fade-up relative group">
                  <AnimeCard item={item} />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(item.id);
                    }}
                    aria-label={`Remove ${item.title} from watchlist`}
                    className="absolute top-2 right-2 rounded-full bg-black/80 hover:bg-[#E50914] p-1.5 text-neutral-300 hover:text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-lg active:scale-90"
                    title="Remove from watchlist"
                  >
                    <IconClose width={14} height={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WATCH HISTORY */}
      {activeTab === "history" && (
        <div className="mt-4">
          {history.length > 0 && (
            <div className="flex justify-end pb-2.5">
              <button
                type="button"
                onClick={() => setConfirmClearHistory(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-rose-400 transition cursor-pointer px-2.5 py-1 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            </div>
          )}

          {!historyReady ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-video w-full rounded-2xl bg-white/[0.04] shimmer" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-[#0D111C]/60 border border-white/[0.06] my-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-[#E50914] mb-3 shadow-lg shadow-[#E50914]/10">
                <Clock className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">No watch history found</h2>
              <p className="text-xs text-neutral-400 max-w-sm mb-5">
                Start streaming any title and your progress will automatically appear here.
              </p>
              <Link
                to="/trending"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#E50914]/30 transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                <span>Browse Trending</span>
              </Link>
            </div>
          ) : (
            /* Premium Ultra-Clean Widescreen Continue Watching Grid */
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {history.map((item) => {
                const isMovie = item.type?.toLowerCase() === "movie";
                const cat =
                  item.category || getMediaCategory(item.animeId, { isMovie, type: item.type });
                const thumb = img(item.backdrop || item.poster, "w500");

                const watchParams = { id: String(item.animeId) };
                const watchSearch = isMovie
                  ? { season: 1, episode: 1 }
                  : { season: item.season, episode: item.episode };

                return (
                  <div
                    key={`history-card-${item.animeId}`}
                    style={{ contentVisibility: "auto", containIntrinsicSize: "0 180px" }}
                    className="fade-up group relative rounded-2xl overflow-hidden bg-[#121624] border border-white/[0.08] hover:border-[#E50914]/60 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#E50914]/10"
                  >
                    {/* Widescreen Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
                      <Img
                        src={thumb}
                        alt={item.animeTitle}
                        rounded="rounded-none"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Gradient Mask */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                      {/* Episode Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-black/80 text-white border border-white/15 backdrop-blur-md shadow-md">
                          {isMovie ? "Movie" : `S${item.season} E${item.episode}`}
                        </span>
                      </div>

                      {/* Quick Delete */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeItem(item.animeId);
                        }}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/80 hover:bg-rose-600 text-neutral-300 hover:text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-md active:scale-90 z-20"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Hover Play Button */}
                      {cat === "movie" ? (
                        <Link
                          to="/movie/$id/watch"
                          params={watchParams}
                          search={{ season: 1, episode: 1 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        >
                          <div className="h-10 w-10 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-lg shadow-[#E50914]/50 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </Link>
                      ) : cat === "webseries" ? (
                        <Link
                          to="/webseries/$id/watch"
                          params={watchParams}
                          search={watchSearch}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        >
                          <div className="h-10 w-10 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-lg shadow-[#E50914]/50 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </Link>
                      ) : (
                        <Link
                          to="/anime/$id/watch"
                          params={watchParams}
                          search={watchSearch}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        >
                          <div className="h-10 w-10 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-lg shadow-[#E50914]/50 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </Link>
                      )}

                      {/* Progress Line */}
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 z-10">
                        <div className="h-full w-2/3 bg-[#E50914] shadow-[0_0_8px_rgba(229,9,20,0.8)]" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="p-2.5 sm:p-3">
                      {cat === "movie" ? (
                        <Link
                          to="/movie/$id/watch"
                          params={watchParams}
                          search={{ season: 1, episode: 1 }}
                          className="block"
                        >
                          <h3
                            className="text-xs sm:text-[13px] font-bold text-white line-clamp-1 group-hover:text-[#ff2a34] transition-colors"
                            title={item.animeTitle}
                          >
                            {item.animeTitle}
                          </h3>
                        </Link>
                      ) : cat === "webseries" ? (
                        <Link
                          to="/webseries/$id/watch"
                          params={watchParams}
                          search={watchSearch}
                          className="block"
                        >
                          <h3
                            className="text-xs sm:text-[13px] font-bold text-white line-clamp-1 group-hover:text-[#ff2a34] transition-colors"
                            title={item.animeTitle}
                          >
                            {item.animeTitle}
                          </h3>
                        </Link>
                      ) : (
                        <Link
                          to="/anime/$id/watch"
                          params={watchParams}
                          search={watchSearch}
                          className="block"
                        >
                          <h3
                            className="text-xs sm:text-[13px] font-bold text-white line-clamp-1 group-hover:text-[#ff2a34] transition-colors"
                            title={item.animeTitle}
                          >
                            {item.animeTitle}
                          </h3>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ANIMATED POPUP MODAL FOR CLEARING HISTORY */}
      {confirmClearHistory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-[#0f1422] p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Clear Watch History?</h3>
              <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                This will remove all titles from your continue watching list.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearHistory(false)}
                className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-bold text-neutral-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAll();
                  setConfirmClearHistory(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition cursor-pointer active:scale-95"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
