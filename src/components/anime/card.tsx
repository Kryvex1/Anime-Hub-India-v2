import { Link } from "@tanstack/react-router";

import type { CardItem } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

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
  return (
    <Link
      to="/anime/$id"
      params={{ id: String(item.id) }}
      className={cn(
        "group relative block w-full transition-all duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:outline-none",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl ring-1 ring-white/10 transition-all duration-300 group-hover:shadow-[0_16px_36px_-10px_rgba(99,102,241,0.4)] group-hover:ring-[#818cf8]/70 bg-[#0d111c]">
        <Img
          src={img(item.poster, "w500")}
          alt={item.title}
          className="aspect-[2/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
          rounded="rounded-xl sm:rounded-2xl"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070a12]/90 via-[#070a12]/15 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-90" />

        {/* Hover action overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-2.5 sm:p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-xl bg-[#6366f1] px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white shadow-md shadow-[#6366f1]/40">
              <IconPlay width={12} height={12} /> Watch
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-white/15 border border-white/10 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-white backdrop-blur-md">
              <IconInfo width={12} height={12} />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-0.5 px-0.5">
        <h3 className="line-clamp-1 text-xs sm:text-[13px] leading-tight font-bold text-white transition-colors group-hover:text-[#818cf8]">
          {item.title}
        </h3>
        <p className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#94a3b8]">
          <span>{item.year || "Anime"}</span>
          <span className="h-0.5 w-0.5 rounded-full bg-[#94a3b8]" />
          <span className="capitalize">{item.type || "TV"}</span>
        </p>
      </div>
    </Link>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-full space-y-2">
      <div className="shimmer aspect-[2/3] w-full rounded-xl sm:rounded-2xl bg-white/[0.04]" />
      <div className="shimmer h-3.5 w-4/5 rounded-lg bg-white/[0.04]" />
      <div className="shimmer h-2.5 w-2/5 rounded-lg bg-white/[0.03]" />
    </div>
  );
}
