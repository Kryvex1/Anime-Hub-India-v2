import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { IconArrow } from "@/components/anime/icons";
import { Img, img } from "@/components/anime/media";
import { ErrorState, PageHeading } from "@/components/anime/states";
import { fetchGenreShowcase } from "@/lib/anime.functions";
import { GENRES } from "@/lib/genres";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/genres/")({
  head: () => ({
    meta: [
      { title: "Anime Genres — Action, Isekai, Romance & More | AniStream" },
      {
        name: "description",
        content: "Explore anime by genre: action, isekai, romance, horror, mecha, sports and more.",
      },
      { property: "og:title", content: "Anime Genres — AniStream" },
      {
        property: "og:description",
        content: "Explore anime by genre: action, isekai, romance, horror, mecha, sports and more.",
      },
    ],
  }),
  component: GenresPage,
});

function GenresPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["genre-showcase"],
    queryFn: () => fetchGenreShowcase(),
    staleTime: 1000 * 60 * 30,
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:pt-8 md:pt-10 pb-16 md:px-8">
      <PageHeading
        eyebrow="Explore"
        title="Anime Genres"
        description="Pick a mood — every genre opens a full, dynamically loaded catalogue."
      />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:gap-4">
          {(isPending ? GENRES.map((g) => ({ ...g, backdrop: null })) : data!).map((g, i) => (
            <Link
              key={g.slug}
              to="/genres/$slug"
              params={{ slug: g.slug }}
              style={{ animationDelay: `${i * 35}ms` }}
              className="fade-up group relative block aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:ring-primary/60"
            >
              {isPending ? (
                <div className="shimmer absolute inset-0" />
              ) : (
                <Img
                  src={img(g.backdrop, "w780")}
                  alt={g.name}
                  className="absolute inset-0 h-full w-full"
                  rounded="rounded-2xl"
                  imgClassName="transition-transform duration-700 group-hover:scale-110"
                />
              )}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t via-black/40 to-black/70",
                  "tint" in g ? (g as { tint: string }).tint : "from-black/80",
                )}
              />
              <div className="absolute inset-0 flex items-end justify-between gap-2 p-4">
                <h2 className="text-base font-bold tracking-tight md:text-lg">{g.name}</h2>
                <span className="translate-x-2 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                  <IconArrow width={18} height={18} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
