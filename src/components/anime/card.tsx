import { Link } from "@tanstack/react-router";

import type { CardItem } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { useConfiguredAnime } from "@/lib/configured-anime-context";

import { IconInfo, IconPlay, IconStar } from "./icons";
import { Img, img } from "./media";

export function AnimeCard({
  item,
  rank,
  className,
}: {
  item: CardItem;
  rank?: number | undefined;
  className?: string | undefined;
}) {
  const { hasLink } = useConfiguredAnime();
  const isStreamReady = hasLink(item.id);

  return (
    <Link
      to="/anime/$id"
      params={{ id: String(item.id) }}
      className={cn(
        "group relative block w-full transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-xl ring-1 ring-white/8 transition-shadow duration-300 group-hover:shadow-[0_18px_50px_-16px_rgba(0,0,0,0.9)] group-hover:ring-primary/50">
        <Img
          src={img(item.poster, "w500")}
          alt={item.title}
          className="aspect-[2/3] w-full"
          rounded="rounded-xl"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Top badges: Rank or Stream Ready Badge */}
        {isStreamReady ? (
          <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-emerald-950/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_4px_#34d399]" />
            PLAY
          </span>
        ) : rank ? (
          <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-foreground backdrop-blur-md">
            #{rank}
          </span>
        ) : null}

        {item.rating > 0 && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur-md">
            <IconStar width={11} height={11} className="text-accent" />
            {item.rating.toFixed(1)}
          </span>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-2.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
              <IconPlay width={11} height={11} /> Watch
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md">
              <IconInfo width={11} height={11} /> Info
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-0.5">
        <h3 className="line-clamp-1 text-[13px] leading-tight font-semibold text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </h3>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{item.year || "TBA"}</span>
          <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground" />
          <span>{item.type}</span>
        </p>
      </div>
    </Link>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-full">
      <div className="shimmer aspect-[2/3] w-full rounded-xl" />
      <div className="shimmer mt-2 h-3 w-4/5 rounded" />
      <div className="shimmer mt-1.5 h-2.5 w-2/5 rounded" />
    </div>
  );
}
