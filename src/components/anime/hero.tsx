import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Info, Star, Bookmark, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import type { CardItem } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { img } from "./media";
import { useWatchlist } from "@/lib/watchlist";
import { getMediaCategory } from "@/lib/routes-helper";

export function Hero({ items }: { items: CardItem[] }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const { has, toggle } = useWatchlist();

  // Swipe handling state
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const total = items.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Autoplay timer
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(timer);
  }, [total, isPaused, nextSlide]);

  // Keyboard navigation for desktop users (Left / Right Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === "ArrowRight") {
        nextSlide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  if (!items || items.length === 0) return <HeroSkeleton />;

  const currentItem = items[index] || items[0];
  const isSaved = has(currentItem.id);
  const heroCat = getMediaCategory(currentItem.id, currentItem);

  const handleHeroWatchNow = (item: CardItem) => {
    const cat = getMediaCategory(item.id, item);
    if (cat === "movie") {
      void navigate({
        to: "/movie/$id/watch",
        params: { id: String(item.id) },
        search: { season: 1, episode: 1 },
      });
    } else if (cat === "webseries") {
      void navigate({
        to: "/webseries/$id/watch",
        params: { id: String(item.id) },
        search: { season: 1, episode: 1 },
      });
    } else {
      void navigate({
        to: "/anime/$id/watch",
        params: { id: String(item.id) },
        search: { season: 1, episode: 1 },
      });
    }
  };

  // Touch event handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null) {
      if (touchDeltaX.current < -40) {
        nextSlide();
      } else if (touchDeltaX.current > 40) {
        prevSlide();
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setIsPaused(false);
  };

  // Mouse drag event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    touchDeltaX.current = 0;
    isDragging.current = true;
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    touchDeltaX.current = e.clientX - touchStartX.current;
  };

  const handleMouseUp = () => {
    if (isDragging.current && touchStartX.current !== null) {
      if (touchDeltaX.current < -40) {
        nextSlide();
      } else if (touchDeltaX.current > 40) {
        prevSlide();
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    isDragging.current = false;
    setIsPaused(false);
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-[#070A12] pt-6 sm:pt-10 md:pt-14 pb-10 sm:pb-14 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!isDragging.current) setIsPaused(false);
      }}
    >
      {/* Dynamic Background Backdrop with Cross-Fade - Optimized to render only active & adjacent backdrops */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {items.map((it, i) => {
          const dist = Math.abs(i - index);
          const isAdjacent = dist <= 1 || dist === total - 1;
          if (!isAdjacent) return null;

          const bgUrl = img(it.backdrop || it.poster, "w1280");
          if (!bgUrl) return null;
          const isActive = i === index;
          return (
            <img
              key={`bg-${it.id}`}
              src={bgUrl}
              alt=""
              aria-hidden="true"
              className={cn(
                "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ease-out",
                isActive ? "opacity-35" : "opacity-0",
              )}
            />
          );
        })}
        {/* Subtle overlays matching page background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A12] via-[#070A12]/90 to-transparent" />
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Featured Content Details & Actions */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4 sm:space-y-5 text-left order-2 lg:order-1">
            {/* Top Badges (Clean & Uncluttered) */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#E50914] text-white shadow-md shadow-[#E50914]/30">
                <Flame className="w-3.5 h-3.5 fill-white" />
                <span>#{(index + 1).toString().padStart(2, "0")} SPOTLIGHT</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-white/[0.08] border border-white/10 text-neutral-300 uppercase tracking-wider text-[11px] font-bold">
                {currentItem.type || "Series"}
              </span>
            </div>

            {/* Title (Line Clamped so huge titles don't stretch the layout) */}
            <div className="space-y-1.5">
              <h1
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-md line-clamp-2 max-w-2xl"
                title={currentItem.title}
              >
                {currentItem.title}
              </h1>
              {currentItem.originalTitle && currentItem.originalTitle !== currentItem.title && (
                <p className="text-xs sm:text-sm font-medium text-neutral-400 tracking-wide truncate max-w-xl">
                  {currentItem.originalTitle}
                </p>
              )}
            </div>

            {/* Badges & Metrics */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-xs sm:text-sm font-semibold text-neutral-300">
              {currentItem.rating > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 border border-white/10 text-amber-300 font-bold backdrop-blur-md">
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  {currentItem.rating.toFixed(1)}
                </span>
              )}
              {currentItem.year && (
                <span className="px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-white">
                  {currentItem.year}
                </span>
              )}
              {currentItem.genres && currentItem.genres.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  {currentItem.genres.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-[11px]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Synopsis */}
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-neutral-300 line-clamp-3 max-w-xl">
              {currentItem.overview || "Stream all episodes in HD with ultra-fast playback."}
            </p>

            {/* Call to Actions (Netflix Red Play Button) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleHeroWatchNow(currentItem)}
                className="flex items-center gap-2 rounded-lg bg-[#E50914] hover:bg-[#b80710] px-7 sm:px-9 py-3 text-sm sm:text-base font-black text-white shadow-xl shadow-[#E50914]/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
                <span>Play Now</span>
              </button>

              {heroCat === "movie" ? (
                <Link
                  to="/movie/$id"
                  params={{ id: String(currentItem.id) }}
                  className="flex items-center gap-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-white/15 px-5 sm:px-6 py-3 text-sm sm:text-base font-bold text-white transition-all transform hover:scale-105 active:scale-95"
                >
                  <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Details</span>
                </Link>
              ) : heroCat === "webseries" ? (
                <Link
                  to="/webseries/$id"
                  params={{ id: String(currentItem.id) }}
                  className="flex items-center gap-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-white/15 px-5 sm:px-6 py-3 text-sm sm:text-base font-bold text-white transition-all transform hover:scale-105 active:scale-95"
                >
                  <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Details</span>
                </Link>
              ) : (
                <Link
                  to="/anime/$id"
                  params={{ id: String(currentItem.id) }}
                  className="flex items-center gap-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700/80 border border-white/15 px-5 sm:px-6 py-3 text-sm sm:text-base font-bold text-white transition-all transform hover:scale-105 active:scale-95"
                >
                  <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Details</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => toggle(currentItem.id)}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer active:scale-95",
                  isSaved
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white border-white/10",
                )}
                title={isSaved ? "Saved in Watchlist" : "Add to Watchlist"}
              >
                <Bookmark className={cn("w-5 h-5", isSaved ? "fill-current" : "")} />
              </button>
            </div>

            {/* Carousel Indicators & Slide Counter */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5">
                {items.slice(0, 8).map((it, i) => (
                  <button
                    key={`dot-${it.id}`}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Jump to ${it.title}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                      i === index ? "w-8 bg-[#E50914]" : "w-2.5 bg-white/20 hover:bg-white/50",
                    )}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-neutral-400 tracking-wider">
                {(index + 1).toString().padStart(2, "0")} /{" "}
                {Math.min(items.length, 8).toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Right Column: 3D Swipeable Card Stack (Coverflow) */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center order-1 lg:order-2 py-4 lg:py-0">
            {/* 3D Perspective Stage Container */}
            <div className="relative w-full max-w-[380px] sm:max-w-[420px] flex items-center justify-center">
              {/* Prev / Next Chevron Quick Controls */}
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous slide"
                className="hidden sm:flex absolute -left-5 z-40 h-9 w-9 items-center justify-center rounded-full bg-black/80 hover:bg-[#E50914] text-white border border-white/20 shadow-xl transition-all cursor-pointer active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next slide"
                className="hidden sm:flex absolute -right-5 z-40 h-9 w-9 items-center justify-center rounded-full bg-black/80 hover:bg-[#E50914] text-white border border-white/20 shadow-xl transition-all cursor-pointer active:scale-90"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* 3D Perspective Stage */}
              <div
                className="relative w-full h-[350px] sm:h-[410px] flex items-center justify-center cursor-grab active:cursor-grabbing"
                style={{
                  perspective: "1000px",
                  perspectiveOrigin: "center center",
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {items.map((it, i) => {
                  let offset = (i - index) % total;
                  if (offset > total / 2) offset -= total;
                  if (offset < -total / 2) offset += total;

                  const isCenter = offset === 0;
                  const isVisible = Math.abs(offset) <= 2;

                  if (!isVisible) return null;

                  const posterUrl = img(it.poster || it.backdrop, "w500");

                  const translateX = offset * 54;
                  const translateZ = isCenter ? 50 : -65 * Math.abs(offset);
                  const rotateY = isCenter ? 0 : offset > 0 ? -18 : 18;
                  const scale = isCenter ? 1.04 : 0.84 - Math.abs(offset) * 0.05;
                  const opacity = isCenter ? 1 : 0.65 - (Math.abs(offset) - 1) * 0.25;
                  const zIndex = 30 - Math.abs(offset) * 10;

                  return (
                    <div
                      key={`card-3d-${it.id}`}
                      onClick={() => {
                        if (!isCenter) {
                          setIndex(i);
                        } else {
                          handleHeroWatchNow(it);
                        }
                      }}
                      style={{
                        transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                        zIndex,
                        opacity,
                        transformStyle: "preserve-3d",
                        willChange: "transform, opacity",
                        transition:
                          "transform 450ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease",
                      }}
                      className={cn(
                        "group absolute w-[210px] sm:w-[250px] h-[315px] sm:h-[375px] rounded-2xl overflow-hidden cursor-pointer select-none bg-[#181818] isolate",
                        isCenter
                          ? "border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
                          : "border border-white/[0.08] shadow-lg",
                      )}
                    >
                      {/* Inner Container ensuring rounded corner mask never bleeds */}
                      <div className="relative w-full h-full rounded-2xl overflow-hidden">
                        <img
                          src={posterUrl || ""}
                          alt={it.title}
                          loading="eager"
                          draggable={false}
                          className="w-full h-full object-cover rounded-2xl pointer-events-none"
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent rounded-2xl pointer-events-none" />

                        {/* Top Rank Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/90 text-xs font-black text-white border border-white/15 shadow-md">
                            #{(i + 1).toString()}
                          </span>
                        </div>

                        {/* Top Rating Badge */}
                        {it.rating > 0 && (
                          <div className="absolute top-3 right-3">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/90 text-[11px] font-semibold text-amber-300 border border-white/15 shadow-md">
                              <Star className="w-3 h-3 fill-amber-300" />
                              {it.rating.toFixed(1)}
                            </span>
                          </div>
                        )}

                        {/* Center Play Button on Active Card */}
                        {isCenter && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="h-12 w-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-200">
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            </div>
                          </div>
                        )}

                        {/* Card Title on Bottom */}
                        <div className="absolute bottom-0 inset-x-0 p-3.5 bg-gradient-to-t from-black via-black/85 to-transparent rounded-b-2xl">
                          <p className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                            {it.title}
                          </p>
                          <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                            {it.type || "Series"} · {it.year || "HD"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Fade Mask & Gradient - Smoothly transitions into sections below without covering cards */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#070A12] to-transparent pointer-events-none z-0" />
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section className="relative w-full overflow-hidden bg-[#070A12] py-12 md:py-16">
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="shimmer h-6 w-36 rounded-full" />
            <div className="shimmer h-12 w-4/5 max-w-xl rounded-2xl" />
            <div className="shimmer h-4 w-48 rounded-lg" />
            <div className="shimmer h-16 w-full max-w-lg rounded-2xl" />
            <div className="flex gap-3 pt-2">
              <div className="shimmer h-12 w-36 rounded-2xl" />
              <div className="shimmer h-12 w-32 rounded-2xl" />
            </div>
          </div>
          <div className="lg:col-span-5 flex justify-center py-6">
            <div className="shimmer w-[220px] sm:w-[250px] aspect-[2/3] rounded-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
