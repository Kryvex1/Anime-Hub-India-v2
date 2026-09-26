import { createFileRoute } from "@tanstack/react-router";
import { AnimeDetail } from "@/components/anime/detail";

export const Route = createFileRoute("/webseries/$id/")({
  validateSearch: (search: Record<string, unknown>): { play?: boolean } =>
    search["play"] === true || search["play"] === "true" ? { play: true } : {},
  head: () => ({
    meta: [
      { title: "Web Series Details — CinePulse" },
      {
        name: "description",
        content: "Watch web series episodes, seasons, cast, crew and stream in HD.",
      },
      { property: "og:title", content: "Web Series Details — CinePulse" },
      {
        property: "og:description",
        content: "Watch web series episodes, seasons, cast, crew and stream in HD.",
      },
    ],
  }),
  component: WebSeriesDetailPage,
});

function WebSeriesDetailPage() {
  const { id } = Route.useParams();
  const { play } = Route.useSearch();
  const numericId = Number(id);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-32 text-center">
        <h1 className="text-xl font-bold">Invalid series</h1>
        <p className="mt-2 text-sm text-muted-foreground">That series ID doesn't look right.</p>
      </div>
    );
  }

  return <AnimeDetail key={`series-${id}`} id={numericId} autoPlay={!!play} />;
}
