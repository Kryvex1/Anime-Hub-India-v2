import { createFileRoute } from "@tanstack/react-router";
import { AnimePlayer } from "@/components/anime/player";

export const Route = createFileRoute("/movie/$id/watch")({
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
      { title: "Stream Movie — CinePulse" },
      {
        name: "description",
        content: "Watch full movie in HD with multi-server streaming and multi-audio support.",
      },
    ],
  }),
  component: MovieWatchPage,
});

function MovieWatchPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const numericId = Number(id);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-32 text-center">
        <h1 className="text-xl font-bold">Invalid movie</h1>
        <p className="mt-2 text-sm text-muted-foreground">That movie ID doesn't look right.</p>
      </div>
    );
  }

  return (
    <AnimePlayer
      key={`movie-player-${numericId}`}
      animeId={numericId}
      initialSeasonNumber={search.season || 1}
      initialEpisodeNumber={search.episode || 1}
    />
  );
}
