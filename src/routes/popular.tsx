import { createFileRoute } from "@tanstack/react-router";

import { LoadMoreList } from "@/components/anime/list-page";
import { fetchPopular } from "@/lib/anime.functions";

export const Route = createFileRoute("/popular")({
  head: () => ({
    meta: [
      { title: "Popular Titles — CinePulse" },
      {
        name: "description",
        content: "Browse the most popular movies and series of all time on CinePulse.",
      },
      { property: "og:title", content: "Popular Titles — CinePulse" },
      {
        property: "og:description",
        content: "Browse the most popular movies and series of all time on CinePulse.",
      },
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
      title="Popular Titles"
      description="The movies, web series, and anime with the biggest audiences worldwide."
    />
  );
}
