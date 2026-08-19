import { createFileRoute } from "@tanstack/react-router";

import { LoadMoreList } from "@/components/anime/list-page";
import { fetchTrending } from "@/lib/anime.functions";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending Anime This Week — AniStream" },
      { name: "description", content: "The anime everyone is watching right now, ranked weekly." },
      { property: "og:title", content: "Trending Anime This Week — AniStream" },
      {
        property: "og:description",
        content: "The anime everyone is watching right now, ranked weekly.",
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
      title="Trending Anime"
      description="Ranked by what the community is watching and rating right now."
      ranked
    />
  );
}
