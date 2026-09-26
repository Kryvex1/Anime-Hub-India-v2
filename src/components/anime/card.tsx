import { Link } from "@tanstack/react-router";

import type { CardItem } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { getMediaCategory } from "@/lib/routes-helper";

import { IconInfo, IconPlay } from "./icons";
import { Img, img } from "./media";

export function AnimeCard({
  item,
  className,
}: {
  item: CardItem;
  rank?: number | undefined;
  className?: string | undefined;
}) {
  const category = getMediaCategory(item.id, item);

  const cardContent = (
    <>
      <div className="relative overflow-hidden rounded-md sm:rounded-lg border border-white/[0.08] transition-all duration-300 group-hover:border-white/30 group-hover:shadow-[0_14px_30px_rgba(0,0,0,0.9)] bg-[#141414]">
        <Img
          src={img(item.poster, "w500")}
          alt={item.title}
          className="aspect-[2/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
          rounded="rounded-md sm:rounded-lg"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-90" />

        {/* Hover action overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-2 sm:p-2.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded bg-[#E50914] px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold text-white shadow-md">
              <IconPlay width={11} height={11} /> Play
            </span>
            <span className="flex items-center gap-1 rounded bg-black/60 border border-white/20 px-2 py-1 text-[11px] sm:text-xs font-semibold text-white backdrop-blur-md">
              <IconInfo width={11} height={11} />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-1.5 space-y-0.5 px-0.5">
        <h3 className="line-clamp-1 text-xs sm:text-[13px] leading-tight font-bold text-neutral-200 transition-colors group-hover:text-white">
          {item.title}
        </h3>
        <p className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-400">
          <span>{item.year || "HD"}</span>
          <span className="h-0.5 w-0.5 rounded-full bg-neutral-500" />
          <span className="capitalize">
            {category === "anime" ? "Anime" : category === "movie" ? "Movie" : "Series"}
          </span>
        </p>
      </div>
    </>
  );

  const sharedClassName = cn(
    "group relative block w-full transition-all duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-[#E50914] focus-visible:outline-none",
    className,
  );

  if (category === "movie") {
    return (
      <Link to="/movie/$id" params={{ id: String(item.id) }} className={sharedClassName}>
        {cardContent}
      </Link>
    );
  }

  if (category === "webseries") {
    return (
      <Link to="/webseries/$id" params={{ id: String(item.id) }} className={sharedClassName}>
        {cardContent}
      </Link>
    );
  }

  return (
    <Link to="/anime/$id" params={{ id: String(item.id) }} className={sharedClassName}>
      {cardContent}
    </Link>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-full space-y-2">
      <div className="shimmer aspect-[2/3] w-full rounded-md sm:rounded-lg bg-white/[0.04]" />
      <div className="shimmer h-3.5 w-4/5 rounded bg-white/[0.04]" />
      <div className="shimmer h-2.5 w-2/5 rounded bg-white/[0.03]" />
    </div>
  );
}
