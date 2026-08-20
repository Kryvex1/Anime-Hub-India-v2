import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Play, Trash2, X } from "lucide-react";
import { useWatchHistory, type WatchHistoryItem } from "@/lib/watch-history";
import { img } from "./media";
import { cn } from "@/lib/utils";

export function ContinueWatchingRow() {
  const { history, removeItem, clearAll, ready } = useWatchHistory();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (!ready || history.length === 0) {
    return null;
  }

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <section className="relative px-4 sm:px-6 md:px-8 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-sm shadow-primary/20">
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Continue Watching</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                {history.length}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 3 && (
            <div className="hidden md:flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                className="h-7 w-7 rounded-xl bg-white/[0.06] border border-white/10 text-neutral-300 hover:text-white hover:bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                className="h-7 w-7 rounded-xl bg-white/[0.06] border border-white/10 text-neutral-300 hover:text-white hover:bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-semibold text-neutral-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/[0.04]"
            title="Clear all watch history"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Cards List */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth snap-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {history.map((item) => (
          <ContinueWatchingCard key={item.animeId} item={item} onRemove={removeItem} />
        ))}
      </div>
    </section>
  );
}

function ContinueWatchingCard({
  item,
  onRemove,
}: {
  item: WatchHistoryItem;
  onRemove: (id: number) => void;
}) {
  const isMovie = item.type?.toLowerCase() === "movie";
  const backdropUrl = img(item.backdrop || item.poster, "w780");

  return (
    <div className="relative group shrink-0 w-[240px] sm:w-[280px] md:w-[300px] snap-start rounded-2xl overflow-hidden bg-neutral-900/90 border border-white/10 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-primary/10">
      {/* Clickable Area navigating directly to player */}
      <Link
        to="/anime/$id/watch"
        params={{ id: String(item.animeId) }}
        search={{ season: item.season, episode: item.episode }}
        className="block relative aspect-video w-full overflow-hidden bg-neutral-950"
      >
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={item.animeTitle}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-600">
            <Play className="w-10 h-10 opacity-30" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Play Icon on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="h-11 w-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/40 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Episode / Progress Tag */}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-black/75 backdrop-blur-md text-primary border border-primary/30 shadow-md">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {isMovie ? "Movie" : `S${item.season} · Ep ${item.episode}`}
          </span>
        </div>
      </Link>

      {/* Quick Remove Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item.animeId);
        }}
        className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-black/70 backdrop-blur-md text-neutral-400 hover:text-rose-400 hover:bg-rose-500/20 border border-white/10 flex items-center justify-center opacity-80 hover:opacity-100 transition active:scale-90 cursor-pointer z-10"
        title="Remove from history"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Card Footer Info */}
      <div className="p-3 bg-neutral-900/95 space-y-1">
        <Link
          to="/anime/$id/watch"
          params={{ id: String(item.animeId) }}
          search={{ season: item.season, episode: item.episode }}
          className="block"
        >
          <h3 className="text-xs sm:text-sm font-bold text-white truncate hover:text-primary transition">
            {item.animeTitle}
          </h3>
        </Link>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400">
          <span>{isMovie ? "Full Movie" : `Season ${item.season}, Episode ${item.episode}`}</span>
          <span className="text-neutral-500">Tap to resume</span>
        </div>
      </div>
    </div>
  );
}
