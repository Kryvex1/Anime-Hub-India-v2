import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { CardItem } from "@/lib/tmdb";
import { useAppSettings } from "@/lib/settings";

import { CardSkeleton } from "./card";
import { Grid } from "./row";
import { EmptyState, ErrorState } from "./states";

type Page = { items: CardItem[]; totalPages: number };

export function LoadMoreList({
  queryKey,
  fetchPage,
  eyebrow,
  title,
  description,
  ranked,
  actions,
  emptyTitle = "No Titles Found",
  emptyHint = "No titles available in this section yet.",
}: {
  queryKey: string;
  fetchPage: (page: number) => Promise<Page>;
  eyebrow?: string;
  title: string;
  description?: string;
  ranked?: boolean;
  actions?: React.ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const { settings } = useAppSettings();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CardItem[]>([]);

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [queryKey, settings.safeMode, settings.adultMode, settings.darkGoreMode]);

  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: [queryKey, page, settings.safeMode, settings.adultMode, settings.darkGoreMode],
    queryFn: () => fetchPage(page),
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!data) return;
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.id));
      const merged =
        page === 1 ? data.items : [...prev, ...data.items.filter((i) => !seen.has(i.id))];
      return merged;
    });
  }, [data, page]);

  const hasMore = data ? page < data.totalPages : false;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:pt-8 md:pt-10 pb-16 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--brand-glow)] uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-[#94a3b8]">{description}</p>
          )}
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {isError && items.length === 0 ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !isPending && items.length === 0 ? (
        <EmptyState title={emptyTitle} hint={emptyHint} />
      ) : (
        <>
          <Grid
            items={ranked ? items.slice(0, 10) : items}
            loading={isPending && items.length === 0}
            ranked={!!ranked}
          />

          {/* Smooth skeletons appended at the bottom when fetching next page */}
          {isFetching && page > 1 && (
            <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={`skeleton-more-${i}`} />
              ))}
            </div>
          )}
        </>
      )}

      {hasMore && !ranked && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            disabled={isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] hover:bg-[#E50914] border border-white/10 px-8 py-3.5 text-xs sm:text-sm font-bold text-white transition-all duration-200 active:scale-95 disabled:opacity-75 disabled:hover:bg-white/[0.06] cursor-pointer shadow-lg shadow-black/40"
          >
            {isFetching ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span>Loading more...</span>
              </>
            ) : (
              <span>Load More</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
