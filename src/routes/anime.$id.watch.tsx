import { createFileRoute } from "@tanstack/react-router";
import { AnimePlayer } from "@/components/anime/player";
import { z } from "zod";

export const Route = createFileRoute("/anime/$id/watch")({
  validateSearch: (search: Record<string, unknown>) => {
    const rawSeason = Number(search?.season);
    const rawEpisode = Number(search?.episode);
    return {
      season: Number.isFinite(rawSeason) && rawSeason > 0 ? Math.floor(rawSeason) : 1,
      episode: Number.isFinite(rawEpisode) && rawEpisode > 0 ? Math.floor(rawEpisode) : 1,
    };
  },
  head: () => ({
    meta: [
      { title: "Stream Episode — AniStream" },
      {
        name: "description",
        content: "Watch anime episodes in high quality with multi-server streaming support.",
      },
    ],
  }),
  component: AnimeWatchPage,
});

function AnimeWatchPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const numericId = Number(id);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-32 text-center">
        <h1 className="text-xl font-bold">Invalid anime</h1>
        <p className="mt-2 text-sm text-muted-foreground">That anime ID doesn't look right.</p>
      </div>
    );
  }

  return (
    <AnimePlayer
      key={numericId}
      animeId={numericId}
      initialSeasonNumber={search.season || 1}
      initialEpisodeNumber={search.episode || 1}
    />
  );
}
