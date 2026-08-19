import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Hero, HeroSkeleton } from "@/components/anime/hero";
import { Row } from "@/components/anime/row";
import { ErrorState } from "@/components/anime/states";
import { TelegramBanner } from "@/components/anime/telegram-banner";
import { fetchHome } from "@/lib/anime.functions";
import { useAppSettings } from "@/lib/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anime Hub India — Watch & Discover Anime" },
      {
        name: "description",
        content:
          "Anime Hub India: Discover trending, popular, top-rated anime and genre picks with fast multi-server streaming.",
      },
      { property: "og:title", content: "Anime Hub India — Watch & Discover Anime" },
      {
        property: "og:description",
        content:
          "Anime Hub India: Discover trending, popular, top-rated anime and genre picks with fast multi-server streaming.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { settings } = useAppSettings();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [
      "home",
      settings.safeMode,
      settings.adultMode,
      settings.darkGoreMode,
      settings.theme,
    ],
    queryFn: () => fetchHome(),
    staleTime: 1000 * 60 * 5,
  });

  if (isError) {
    return (
      <div className="pt-24">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isPending || !data) {
    return (
      <>
        <HeroSkeleton />
        <div className="-mt-16 relative z-10">
          <Row title="Trending Now" items={[]} loading />
          <Row title="Popular Anime" items={[]} loading />
        </div>
      </>
    );
  }

  return (
    <>
      <Hero items={data.hero} />
      <div className="relative z-10 -mt-20 space-y-2 md:-mt-28">
        {data.trending && data.trending.length > 0 && (
          <Row
            title="Trending Now"
            items={data.trending}
            ranked
            action={
              <Link to="/trending" className="text-xs font-semibold text-primary hover:underline">
                See all
              </Link>
            }
          />
        )}
        {data.popular && data.popular.length > 0 && (
          <Row
            title="Popular Anime"
            items={data.popular}
            action={
              <Link to="/popular" className="text-xs font-semibold text-primary hover:underline">
                See all
              </Link>
            }
          />
        )}
        {data.topRated && data.topRated.length > 0 && (
          <Row title="Top Rated" items={data.topRated} />
        )}
        {data.latest && data.latest.length > 0 && (
          <Row title="Recently Added" items={data.latest} />
        )}
        {data.recommended && data.recommended.length > 0 && (
          <Row title="Recommended For You" items={data.recommended} />
        )}
        {data.genreRows &&
          data.genreRows.map(
            (row) =>
              row.items &&
              row.items.length > 0 && (
                <Row
                  key={row.slug}
                  title={row.name}
                  items={row.items}
                  action={
                    <Link
                      to="/genres/$slug"
                      params={{ slug: row.slug }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      See all
                    </Link>
                  }
                />
              ),
          )}
        <div className="pt-4 sm:pt-6">
          <TelegramBanner />
        </div>
      </div>
    </>
  );
}
