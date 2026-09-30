import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { IconClose, IconSearch, IconSparkles } from "@/components/anime/icons";
import { Grid, Row } from "@/components/anime/row";
import { EmptyState, ErrorState } from "@/components/anime/states";
import { fetchSearch, fetchSmartRecommendations, fetchTrending } from "@/lib/anime.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Movies, Series & Anime — 7Shows" },
      {
        name: "description",
        content: "Search thousands of movies, TV series, and anime on 7Shows.",
      },
      { property: "og:title", content: "Search Movies, Series & Anime — 7Shows" },
      {
        property: "og:description",
        content: "Search thousands of movies, TV series, and anime on 7Shows.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isDebouncing = input.trim() !== query && input.trim().length >= 2;

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input.trim());
    }, 320);
    return () => clearTimeout(t);
  }, [input]);

  // Primary Search Results Query
  const { data, isFetching, isPending, isError, refetch } = useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) => fetchSearch({ data: { q: query, page: 1, signal } }),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  // Top item from search results to derive intelligent contextual suggestions
  const topItem = useMemo(() => {
    return data?.items && data.items.length > 0 ? data.items[0] : null;
  }, [data?.items]);

  // Intelligent Contextual & Director Recommendations Query (YouTube/Netflix style algorithm)
  const { data: smartRecs } = useQuery({
    queryKey: ["search-smart-recs", topItem?.id, topItem?.isMovie],
    queryFn: () =>
      fetchSmartRecommendations({
        data: { topItemId: topItem!.id, isMovie: Boolean(topItem!.isMovie) },
      }),
    enabled: Boolean(topItem && query.length >= 2),
    staleTime: 1000 * 60 * 30,
  });

  // Real-time Dynamic Viral/Trending Titles for quick search chips (top 5 to 6)
  const { data: trendingData } = useQuery({
    queryKey: ["search-trending-chips"],
    queryFn: () => fetchTrending({ data: { page: 1 } }),
    staleTime: 1000 * 60 * 30,
  });

  const viralSuggestions = useMemo(() => {
    if (trendingData?.items && trendingData.items.length > 0) {
      const titles = trendingData.items.map((item) => item.title).filter(Boolean);
      return Array.from(new Set(titles)).slice(0, 6);
    }
    return [
      "Deadpool & Wolverine",
      "Stranger Things",
      "Dune",
      "The Boys",
      "House of the Dragon",
      "Loki",
    ];
  }, [trendingData?.items]);

  const isLoadingSearch = query.length >= 2 && (isDebouncing || isFetching || isPending);

  const handleSuggestionClick = (title: string) => {
    setInput(title);
    setQuery(title);
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:pt-8 md:pt-10 pb-16 md:px-8">
      {/* Search Input Card */}
      <div className="fade-up mx-auto max-w-3xl space-y-3.5">
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all focus-within:ring-2 focus-within:ring-[#E50914] focus-within:border-[#E50914]">
          <IconSearch
            width={20}
            height={20}
            className={isLoadingSearch ? "animate-pulse text-[#E50914]" : "text-[#94a3b8]"}
          />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search movies, web series, K-dramas, or anime..."
            className="w-full bg-transparent text-sm sm:text-base outline-none placeholder:text-[#64748b] text-white"
          />
          {input && (
            <button
              onClick={() => {
                setInput("");
                setQuery("");
              }}
              aria-label="Clear search"
              className="text-[#94a3b8] transition hover:text-white cursor-pointer p-1"
            >
              <IconClose width={18} height={18} />
            </button>
          )}
        </div>

        {/* Real-time Dynamic Viral / Trending Titles Quick Chips (5-6 titles) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {viralSuggestions.map((title) => {
            const isSelected = query.toLowerCase() === title.toLowerCase();
            return (
              <button
                key={title}
                type="button"
                onClick={() => handleSuggestionClick(title)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 shadow-sm border",
                  isSelected
                    ? "bg-[#E50914] text-white border-[#E50914] shadow-md shadow-[#E50914]/30"
                    : "bg-white/[0.05] hover:bg-white/[0.12] text-neutral-300 hover:text-white border-white/[0.08]",
                )}
              >
                <span>{title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Results / Skeleton State / Empty State */}
      <div className="mt-8 sm:mt-10">
        {isLoadingSearch ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 rounded-md bg-white/[0.05] animate-pulse" />
            </div>
            <Grid items={[]} loading />
          </div>
        ) : isError && query.length >= 2 ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : query.length >= 2 ? (
          data && data.items.length === 0 ? (
            <EmptyState
              title={`No titles found for "${query}"`}
              hint="Try checking the spelling or search for another movie, show, or series."
            />
          ) : (
            <div className="space-y-8 fade-up">
              {/* Section 1: Exact Matches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <p className="text-xs sm:text-sm font-semibold text-[#94a3b8]">
                    Found <span className="font-bold text-white">{data?.items.length ?? 0}</span>{" "}
                    results for “<span className="text-[#E50914] font-bold">{query}</span>”
                  </p>
                </div>
                <Grid items={data?.items ?? []} />
              </div>

              {/* Section 2: Smart Algorithm — More Like Top Match (YouTube/Netflix style) */}
              {smartRecs?.similar && smartRecs.similar.length > 0 && topItem && (
                <div className="pt-2">
                  <Row title={`More Like "${topItem.title}"`} items={smartRecs.similar} />
                </div>
              )}

              {/* Section 3: Smart Algorithm — Director / Creator Spotlight */}
              {smartRecs?.director && smartRecs.director.works.length > 0 && (
                <div className="pt-2">
                  <Row
                    title={`Director Spotlight: ${smartRecs.director.name}`}
                    items={smartRecs.director.works}
                  />
                </div>
              )}

              {/* Section 4: Smart Algorithm — Lead Star Spotlight */}
              {smartRecs?.star && smartRecs.star.works.length > 0 && (
                <div className="pt-2">
                  <Row title={`Starring ${smartRecs.star.name}`} items={smartRecs.star.works} />
                </div>
              )}
            </div>
          )
        ) : (
          /* When no query is typed: Show clean, distraction-free search guide */
          <div className="mx-auto max-w-md py-16 text-center space-y-4 fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-[#94a3b8]">
              <IconSearch width={28} height={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Search Movies, Series, K-Dramas & Anime
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] max-w-xs mx-auto">
                Type a title, actor, director or genre above to start exploring in HD.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
