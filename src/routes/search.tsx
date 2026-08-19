import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { IconClose, IconSearch, IconSparkles } from "@/components/anime/icons";
import { Grid } from "@/components/anime/row";
import { EmptyState, ErrorState } from "@/components/anime/states";
import { fetchPopular, fetchSearch } from "@/lib/anime.functions";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Anime — Anime Hub India" },
      {
        name: "description",
        content: "Search thousands of anime series by title and open full details instantly.",
      },
      { property: "og:title", content: "Search Anime — Anime Hub India" },
      { property: "og:description", content: "Search thousands of anime series by title." },
    ],
  }),
  component: SearchPage,
});

const SUGGESTIONS = [
  "Naruto",
  "One Piece",
  "Jujutsu Kaisen",
  "Attack on Titan",
  "Demon Slayer",
  "Solo Leveling",
  "Bleach",
  "Death Note",
];

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

  // Search Results Query
  const { data, isFetching, isPending, isError, refetch } = useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) => fetchSearch({ data: { q: query, page: 1, signal } }),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  // Recommended Anime Query when search is empty
  const { data: popularData, isPending: isPopularPending } = useQuery({
    queryKey: ["search-popular-recommendations"],
    queryFn: () => fetchPopular({ data: { page: 1 } }),
    staleTime: 1000 * 60 * 10,
  });

  const isLoadingSearch = query.length >= 2 && (isDebouncing || isFetching || isPending);

  const handleSuggestionClick = (title: string) => {
    setInput(title);
    setQuery(title);
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:pt-8 md:pt-10 pb-16 md:px-8">
      {/* Search Input Card */}
      <div className="fade-up mx-auto max-w-3xl space-y-4">
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all focus-within:ring-2 focus-within:ring-[#6366f1] focus-within:border-[#818cf8]">
          <IconSearch
            width={20}
            height={20}
            className={isLoadingSearch ? "animate-pulse text-[#818cf8]" : "text-[#94a3b8]"}
          />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search anime titles, genres, or keywords..."
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

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider pl-1">
            Trending:
          </span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              className="rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-xs font-medium text-[#94a3b8] transition-all hover:scale-105 hover:bg-[#6366f1]/20 hover:text-white hover:border-[#6366f1]/40 cursor-pointer active:scale-95"
            >
              {s}
            </button>
          ))}
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
              title={`No anime found for "${query}"`}
              hint="Try checking the spelling or search for another anime series."
            />
          ) : (
            <div className="space-y-4 fade-up">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <p className="text-xs sm:text-sm font-semibold text-[#94a3b8]">
                  Found <span className="font-bold text-white">{data?.items.length ?? 0}</span>{" "}
                  results for “<span className="text-[#818cf8] font-bold">{query}</span>”
                </p>
              </div>
              <Grid items={data?.items ?? []} />
            </div>
          )
        ) : (
          /* When no query is typed: Show curated Recommended Anime with Skeletons */
          <div className="space-y-4 fade-up">
            <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
              <IconSparkles width={16} height={16} className="text-[#818cf8]" />
              <h2 className="text-sm sm:text-base font-bold text-white">
                Popular & Recommended Anime
              </h2>
            </div>
            <Grid items={popularData?.items ?? []} loading={isPopularPending} />
          </div>
        )}
      </div>
    </div>
  );
}
