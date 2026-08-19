import { createFileRoute } from "@tanstack/react-router";

import { LoadMoreList } from "@/components/anime/list-page";
import { fetchPopular } from "@/lib/anime.functions";

export const Route = createFileRoute("/popular")({
  head: () => ({
    meta: [
      { title: "Popular Anime Series — AniStream" },
      { name: "description", content: "Browse the most popular anime series of all time." },
      { property: "og:title", content: "Popular Anime Series — AniStream" },
      { property: "og:description", content: "Browse the most popular anime series of all time." },
    ],
  }),
  component: PopularPage,
});

function PopularPage() {
  return (
    <LoadMoreList
      queryKey="popular-page"
      fetchPage={(page) => fetchPopular({ data: { page } })}
      eyebrow="Fan favourites"
      title="Popular Anime"
      description="The titles with the biggest audiences across the anime world."
    />
  );
}
