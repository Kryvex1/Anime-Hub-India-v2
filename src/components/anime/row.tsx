import { useRef } from "react";

import type { CardItem } from "@/lib/tmdb";

import { AnimeCard, CardSkeleton } from "./card";
import { IconChevronLeft, IconChevronRight } from "./icons";

export function Row({
  title,
  items,
  loading,
  ranked,
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
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  if (!loading && items.length === 0) return null;

  return (
    <section className="fade-up py-4">
      <div className="mb-3 flex items-center justify-between gap-3 px-4 md:px-8">
        <h2 className="text-lg font-bold tracking-tight md:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          <div className="hidden gap-1.5 md:flex">
            <button
              onClick={() => scrollBy(-1)}
              aria-label={`Scroll ${title} left`}
              className="glass rounded-full p-1.5 text-foreground/80 transition hover:scale-110 hover:text-primary"
            >
              <IconChevronLeft width={18} height={18} />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label={`Scroll ${title} right`}
              className="glass rounded-full p-1.5 text-foreground/80 transition hover:scale-110 hover:text-primary"
            >
              <IconChevronRight width={18} height={18} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:gap-4 md:px-8"
      >
        {(loading ? Array.from({ length: 8 }) : items).map((item, i) => (
          <div
            key={loading ? i : (item as CardItem).id}
            className="w-[38vw] shrink-0 snap-start sm:w-[26vw] md:w-[20vw] lg:w-[15vw] xl:w-[12.5vw]"
          >
            {loading ? (
              <CardSkeleton />
            ) : (
              <AnimeCard item={item as CardItem} rank={ranked ? i + 1 : undefined} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function Grid({
  items,
  loading,
  skeletonCount = 18,
  ranked,
}: {
  items: CardItem[];
  loading?: boolean;
  skeletonCount?: number;
  ranked?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 xl:gap-x-4">
      {items.map((item, i) => (
        <AnimeCard key={`${item.id}-${i}`} item={item} rank={ranked ? i + 1 : undefined} />
      ))}
      {loading
        ? Array.from({ length: skeletonCount }).map((_, i) => <CardSkeleton key={`s-${i}`} />)
        : null}
    </div>
  );
}
