import { createFileRoute } from "@tanstack/react-router";

import { LoadMoreList } from "@/components/anime/list-page";
import { fetchTrending } from "@/lib/anime.functions";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending This Week — 7Shows" },
      {
        name: "description",
        content: "The movies and series everyone is watching right now, ranked weekly on 7Shows.",
      },
      { property: "og:title", content: "Trending This Week — 7Shows" },
      {
        property: "og:description",
        content: "The movies and series everyone is watching right now, ranked weekly on 7Shows.",
      },
    ],
  }),
  component: TrendingPage,
});

function TrendingPage() {
  return (
    <LoadMoreList
      queryKey="trending-page"
      fetchPage={(page) => fetchTrending({ data: { page } })}
      eyebrow="This week"
      title="Trending Now"
      description="The movies, web series, and anime everyone is watching right now."
    />
  );
}
