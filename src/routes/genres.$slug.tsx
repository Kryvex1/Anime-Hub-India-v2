import { createFileRoute, notFound } from "@tanstack/react-router";

import { LoadMoreList } from "@/components/anime/list-page";
import { fetchGenre } from "@/lib/anime.functions";
import { findGenre } from "@/lib/genres";

export const Route = createFileRoute("/genres/$slug")({
  beforeLoad: ({ params }) => {
    if (!findGenre(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const name = findGenre(params.slug)?.name ?? "Anime";
    return {
      meta: [
        { title: `${name} Anime — AniStream` },
        {
          name: "description",
          content: `Browse the best ${name.toLowerCase()} anime series with ratings, artwork and full details.`,
        },
        { property: "og:title", content: `${name} Anime — AniStream` },
        {
          property: "og:description",
          content: `Browse the best ${name.toLowerCase()} anime series.`,
        },
      ],
    };
  },
  component: GenreDetail,
});

function GenreDetail() {
  const { slug } = Route.useParams();
  const name = findGenre(slug)?.name ?? slug;

  return (
    <LoadMoreList
      queryKey={`genre-${slug}`}
      fetchPage={(page) => fetchGenre({ data: { slug, page } })}
      eyebrow="Genre"
      title={`${name} Anime`}
      description={`Hand-picked ${name.toLowerCase()} anime series with streaming links.`}
      emptyTitle="No Anime Found"
      emptyHint={`No anime has been added to the "${name}" genre yet. Add links from Admin Dashboard or explore other categories.`}
    />
  );
}
