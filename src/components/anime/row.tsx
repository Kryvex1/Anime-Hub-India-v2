import { useRef } from "react";

import type { CardItem } from "@/lib/tmdb";

import { AnimeCard, CardSkeleton } from "./card";
import { IconChevronLeft, IconChevronRight } from "./icons";

export function Row({
  title,
  items,
  loading,
  action,
}: {
  title: string;
  items: CardItem[];
  loading?: boolean;
  ranked?: boolean;
  action?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.75), behavior: "smooth" });
  };

  if (!loading && items.length === 0) return null;

  return (
    <section className="fade-up py-2.5 sm:py-3.5">
      <div className="mb-2 sm:mb-2.5 flex items-center justify-between gap-3 px-4 md:px-8">
        <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {action}
          <div className="hidden gap-1.5 md:flex">
            <button
              onClick={() => scrollBy(-1)}
              aria-label={`Scroll ${title} left`}
              className="rounded-full bg-white/[0.06] border border-white/10 p-1.5 text-white/80 transition hover:scale-105 hover:bg-white/15 hover:text-white cursor-pointer active:scale-95"
            >
              <IconChevronLeft width={18} height={18} />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label={`Scroll ${title} right`}
              className="rounded-full bg-white/[0.06] border border-white/10 p-1.5 text-white/80 transition hover:scale-105 hover:bg-white/15 hover:text-white cursor-pointer active:scale-95"
            >
              <IconChevronRight width={18} height={18} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className="scrollbar-none flex snap-x snap-mandatory gap-2.5 sm:gap-3.5 overflow-x-auto px-4 pb-2 md:gap-4 md:px-8 items-start"
      >
        {(loading ? Array.from({ length: 7 }) : items).map((item, i) => {
          if (loading) {
            return (
              <div
                key={i}
                className="w-[34vw] shrink-0 snap-start sm:w-[24vw] md:w-[18vw] lg:w-[14vw] xl:w-[12vw]"
              >
                <CardSkeleton />
              </div>
            );
          }

          const cardItem = item as CardItem;
          return (
            <div
              key={cardItem.id}
              className="w-[34vw] shrink-0 snap-start sm:w-[24vw] md:w-[18vw] lg:w-[14vw] xl:w-[12vw]"
            >
              <AnimeCard item={cardItem} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Grid({ items, loading }: { items: CardItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <AnimeCard key={item.id} item={item} />
      ))}
    </div>
  );
}
