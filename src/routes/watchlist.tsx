import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, Clock, Film, Play, Trash2, X, ChevronRight, Compass } from "lucide-react";

import { AnimeCard, CardSkeleton } from "@/components/anime/card";
import { IconClose } from "@/components/anime/icons";
import { EmptyState, ErrorState } from "@/components/anime/states";
import { fetchWatchlistItems } from "@/lib/anime.functions";
import { useWatchlist } from "@/lib/watchlist";
import { useWatchHistory, type WatchHistoryItem } from "@/lib/watch-history";
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
      { title: "My Library — CinePulse" },
      {
        name: "description",
        content: "Your saved watchlist and continue watching history on CinePulse.",
      },
      { property: "og:title", content: "My Library — CinePulse" },
      {
        property: "og:description",
        content: "Your saved watchlist and continue watching history on CinePulse.",
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

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:pt-8 md:pt-10 pb-16 md:px-8">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#E50914] uppercase">
            Personal Space
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-4xl">
            My Library
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-neutral-400">
            Access your saved watchlist and pick up right where you left off.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#0D111C] border border-white/[0.08] shadow-inner self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleTabChange("watchlist")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
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
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
              activeTab === "history"
                ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/30"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.05]",
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Watch History</span>
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
        <div className="mt-8">
          {!ready || (ids.length > 0 && isPending) ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: Math.max(ids.length, 6) }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : ids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-[#0D111C]/60 border border-white/[0.06]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-[#E50914] mb-4 shadow-xl shadow-[#E50914]/10">
                <Bookmark className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Your watchlist is empty</h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mb-6">
                Tap the bookmark icon on any movie, series, or anime to save it here for later.
              </p>
              <Link
                to="/browse"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#E50914]/30 transition active:scale-95"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Titles</span>
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
        <div className="mt-8">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Recently Watched</span>
              <span className="text-xs font-normal text-neutral-400">
                ({history.length} {history.length === 1 ? "title" : "titles"})
              </span>
            </h2>

            {history.length > 0 && (
              <div>
                {!confirmClearHistory ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearHistory(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-rose-400 transition cursor-pointer px-3 py-1.5 rounded-lg hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-300 font-medium">Clear all?</span>
                    <button
                      type="button"
                      onClick={() => {
                        clearAll();
                        setConfirmClearHistory(false);
                      }}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-sm"
                    >
                      Yes, Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearHistory(false)}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-neutral-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!historyReady ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-video w-full rounded-2xl bg-white/[0.04] shimmer" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-[#0D111C]/60 border border-white/[0.06]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-[#E50914] mb-4 shadow-xl shadow-[#E50914]/10">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No watch history found</h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mb-6">
                Start streaming any movie, web series, or anime and your progress will automatically
                appear here.
              </p>
              <Link
                to="/trending"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#E50914]/30 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-white ml-0.5" />
                <span>Watch Trending Now</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {history.map((item) => {
                const isMovie = item.type?.toLowerCase() === "movie";
                const cat =
                  item.category || getMediaCategory(item.animeId, { isMovie, type: item.type });
                const thumb = img(item.backdrop || item.poster, "w780");

                const watchParams = { id: String(item.animeId) };
                const watchSearch = isMovie
                  ? { season: 1, episode: 1 }
                  : { season: item.season, episode: item.episode };

                return (
                  <div
                    key={`history-card-${item.animeId}`}
                    className="fade-up group relative rounded-2xl overflow-hidden bg-[#111520] border border-white/[0.08] hover:border-[#E50914]/50 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#E50914]/10"
                  >
                    {/* Media Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
                      <Img
                        src={thumb}
                        alt={item.animeTitle}
                        rounded="rounded-none"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-black/85 text-[#ff2a34] border border-[#E50914]/30 shadow-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E50914] animate-pulse" />
                          {isMovie ? "Movie" : `S${item.season} · Ep ${item.episode}`}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeItem(item.animeId);
                        }}
                        className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-black/80 hover:bg-rose-600 text-neutral-300 hover:text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-md active:scale-90"
                        title="Remove from history"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Play Hover Overlay */}
                      {cat === "movie" ? (
                        <Link
                          to="/movie/$id/watch"
                          params={watchParams}
                          search={watchSearch}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <div className="h-11 w-11 rounded-2xl bg-[#E50914] text-white flex items-center justify-center shadow-xl shadow-[#E50914]/50 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </Link>
                      ) : cat === "webseries" ? (
                        <Link
                          to="/webseries/$id/watch"
                          params={watchParams}
                          search={watchSearch}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <div className="h-11 w-11 rounded-2xl bg-[#E50914] text-white flex items-center justify-center shadow-xl shadow-[#E50914]/50 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </Link>
                      ) : (
                        <Link
                          to="/anime/$id/watch"
                          params={watchParams}
                          search={watchSearch}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <div className="h-11 w-11 rounded-2xl bg-[#E50914] text-white flex items-center justify-center shadow-xl shadow-[#E50914]/50 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </Link>
                      )}

                      {/* Progress bar line */}
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                        <div className="h-full w-2/3 bg-[#E50914] shadow-[0_0_8px_rgba(229,9,20,0.8)]" />
                      </div>
                    </div>

                    {/* Info Card */}
                    <div className="p-3.5 space-y-1">
                      <h3
                        className="text-xs sm:text-sm font-bold text-white truncate"
                        title={item.animeTitle}
                      >
                        {item.animeTitle}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="truncate">
                          {isMovie
                            ? "Full Movie"
                            : item.episodeTitle || `Season ${item.season}, Episode ${item.episode}`}
                        </span>

                        {cat === "movie" ? (
                          <Link
                            to="/movie/$id/watch"
                            params={watchParams}
                            search={watchSearch}
                            className="text-[#ff2a34] font-bold hover:underline shrink-0 ml-2"
                          >
                            Resume
                          </Link>
                        ) : cat === "webseries" ? (
                          <Link
                            to="/webseries/$id/watch"
                            params={watchParams}
                            search={watchSearch}
                            className="text-[#ff2a34] font-bold hover:underline shrink-0 ml-2"
                          >
                            Resume
                          </Link>
                        ) : (
                          <Link
                            to="/anime/$id/watch"
                            params={watchParams}
                            search={watchSearch}
                            className="text-[#ff2a34] font-bold hover:underline shrink-0 ml-2"
                          >
                            Resume
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
