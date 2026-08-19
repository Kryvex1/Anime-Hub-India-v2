import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { CardItem } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { fetchSeasonEpisodesConfig, getEpisodeId } from "@/lib/episodes.firebase";
import { checkAdminSession } from "@/lib/admin-auth";

import { IconInfo, IconPlay, IconStar } from "./icons";
import { img } from "./media";
import { ComingSoonModal } from "./coming-soon-modal";

export function Hero({ items }: { items: CardItem[] }) {
  const [index, setIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(false);
  const [modalItem, setModalItem] = useState<CardItem | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsAdmin(checkAdminSession());
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 8000);
    return () => clearInterval(t);
  }, [items.length]);

  const item = items[index];
  if (!item) return <HeroSkeleton />;

  const handleHeroWatchNow = async (animeItem: CardItem) => {
    setChecking(true);
    try {
      const map = await fetchSeasonEpisodesConfig(animeItem.id, 1);
      const ep1 = map.get(getEpisodeId(animeItem.id, 1, 1));
      const hasStream = Boolean(
        ep1?.server1?.url ||
        ep1?.server2?.url ||
        Array.from(map.values()).some((e) => Boolean(e.server1?.url || e.server2?.url)),
      );

      if (hasStream) {
        void navigate({
          to: "/anime/$id/watch",
          params: { id: String(animeItem.id) },
          search: { season: 1, episode: 1 },
        });
      } else {
        setModalItem(animeItem);
      }
    } catch {
      // If error or unconfigured, show coming soon modal
      setModalItem(animeItem);
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <section className="relative h-[76vh] min-h-[520px] w-full overflow-hidden md:h-[86vh]">
        {items.map((it, i) => {
          const bgUrl = img(it.backdrop || it.poster, "original");
          if (!bgUrl) return null;
          return (
            <img
              key={it.id}
              src={bgUrl}
              alt=""
              aria-hidden={i !== index}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-all duration-[1400ms] ease-out",
                i === index ? "scale-100 opacity-100" : "scale-105 opacity-0",
              )}
            />
          );
        })}

        <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/70 to-[#070A12]/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A12] via-[#070A12]/60 to-transparent" />

        <div className="relative z-10 mx-auto flex h-full max-w-[1600px] items-end px-4 pb-20 md:px-8 md:pb-28">
          <div key={item.id} className="fade-up max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#6366f1]/15 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#818cf8] uppercase ring-1 ring-[#6366f1]/30">
              Featured anime
            </span>
            <h1 className="mt-3 text-3xl leading-[1.05] font-extrabold tracking-tight md:text-6xl text-white">
              {item.title}
            </h1>
            {item.originalTitle && item.originalTitle !== item.title && (
              <p className="mt-1.5 text-sm text-[#94a3b8] md:text-base">{item.originalTitle}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#94a3b8]">
              {item.rating > 0 && (
                <span className="flex items-center gap-1 font-semibold text-amber-400">
                  <IconStar width={14} height={14} /> {item.rating.toFixed(1)}
                </span>
              )}
              {item.year && <span>{item.year}</span>}
              <span className="rounded border border-white/20 px-1.5 py-0.5 text-[11px] text-[#cbd5e1]">
                {item.type}
              </span>
            </div>

            <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-[#cbd5e1] md:line-clamp-4 md:text-base">
              {item.overview}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={checking}
                onClick={() => void handleHeroWatchNow(item)}
                className="flex items-center gap-2 rounded-full bg-[#6366f1] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_40px_-16px_rgba(99,102,241,0.5)] transition-all hover:bg-[#4f46e5] active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <IconPlay width={16} height={16} /> {checking ? "Checking..." : "Watch Now"}
              </button>
              <Link
                to="/anime/$id"
                params={{ id: String(item.id) }}
                className="glass flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95"
              >
                <IconInfo width={16} height={16} /> More Info
              </Link>
            </div>

            <div className="mt-7 flex items-center gap-2">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${it.title}`}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === index ? "w-8 bg-[#6366f1]" : "w-3 bg-white/30 hover:bg-white/60",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {modalItem && (
        <ComingSoonModal
          isOpen={Boolean(modalItem)}
          onClose={() => setModalItem(null)}
          animeTitle={modalItem.title}
          animeId={modalItem.id}
          seasonNumber={1}
          episodeNumber={1}
          posterPath={modalItem.poster}
          backdropPath={modalItem.backdrop || modalItem.poster}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}

export function HeroSkeleton() {
  return (
    <section className="relative h-[76vh] min-h-[520px] w-full overflow-hidden md:h-[86vh]">
      <div className="shimmer absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end gap-3 px-4 pb-24 md:px-8">
        <div className="shimmer h-4 w-28 rounded-full" />
        <div className="shimmer h-10 w-3/4 max-w-xl rounded-lg" />
        <div className="shimmer h-3 w-40 rounded" />
        <div className="shimmer h-16 w-full max-w-lg rounded-lg" />
        <div className="flex gap-3">
          <div className="shimmer h-11 w-36 rounded-full" />
          <div className="shimmer h-11 w-32 rounded-full" />
        </div>
      </div>
    </section>
  );
}
