import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { IconClose, IconSearch } from "@/components/anime/icons";
import { Grid } from "@/components/anime/row";
import { EmptyState, ErrorState } from "@/components/anime/states";
import { fetchSearch } from "@/lib/anime.functions";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Anime — AniStream" },
      {
        name: "description",
        content: "Search thousands of anime series by title and open full details instantly.",
      },
      { property: "og:title", content: "Search Anime — AniStream" },
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
  "Frieren",
  "Chainsaw Man",
  "Spy x Family",
];

function SearchPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 380);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) => fetchSearch({ data: { q: query, page: 1, signal } }),
    enabled: query.length > 1,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:pt-8 md:pt-10 pb-16 md:px-8">
      <div className="fade-up mx-auto max-w-3xl">
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-primary">
          <IconSearch
            width={20}
            height={20}
            className={isFetching ? "animate-pulse text-primary" : "text-muted-foreground"}
          />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search anime titles…"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-lg"
          />
          {input && (
            <button
              onClick={() => setInput("")}
              aria-label="Clear search"
              className="text-muted-foreground transition hover:text-foreground"
            >
              <IconClose width={18} height={18} />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="glass rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:scale-105 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        {query.length < 2 ? (
          <EmptyState
            title="Start typing to discover anime"
            hint="Search by title — results stream in from the server as you type."
          />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : isFetching && !data ? (
          <Grid items={[]} loading skeletonCount={12} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            title={`No anime found for "${query}"`}
            hint="Try a different spelling or a shorter title."
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {data?.items.length ?? 0} results for “{query}”
            </p>
            <Grid items={data?.items ?? []} />
          </>
        )}
      </div>
    </div>
  );
}
