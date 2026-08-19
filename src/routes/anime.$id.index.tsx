import { createFileRoute } from "@tanstack/react-router";
import { AnimeDetail } from "@/components/anime/detail";

export const Route = createFileRoute("/anime/$id/")({
  validateSearch: (search: Record<string, unknown>): { play?: boolean } =>
    search["play"] === true || search["play"] === "true" ? { play: true } : {},
  head: () => ({
    meta: [
      { title: "Anime Details — AniStream" },
      {
        name: "description",
        content: "Full anime details: synopsis, rating, seasons, episodes, cast and crew.",
      },
      { property: "og:title", content: "Anime Details — AniStream" },
      {
        property: "og:description",
        content: "Full anime details: synopsis, rating, seasons, episodes, cast and crew.",
      },
    ],
  }),
  component: AnimeDetailPage,
});

function AnimeDetailPage() {
  const { id } = Route.useParams();
  const { play } = Route.useSearch();
  const numericId = Number(id);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-32 text-center">
        <h1 className="text-xl font-bold">Invalid anime</h1>
        <p className="mt-2 text-sm text-muted-foreground">That anime ID doesn't look right.</p>
      </div>
    );
  }

  return <AnimeDetail key={id} id={numericId} autoPlay={!!play} />;
}
