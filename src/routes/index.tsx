import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { IconPlay } from "@/components/anime/icons";
import { Hero, HeroSkeleton } from "@/components/anime/hero";
import { Row } from "@/components/anime/row";
import { ContinueWatchingRow } from "@/components/anime/continue-watching-row";
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
          "Anime Hub India: Discover trending, popular, and top-rated anime with fast multi-server streaming.",
      },
      { property: "og:title", content: "Anime Hub India — Watch & Discover Anime" },
      {
        property: "og:description",
        content:
          "Anime Hub India: Discover trending, popular, and top-rated anime with fast multi-server streaming.",
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
        <div className="-mt-16 relative z-10 space-y-4">
          <Row title="Trending Now" items={[]} loading />
          <Row title="Popular Anime" items={[]} loading />
        </div>
      </>
    );
  }

  const hasConfiguredAnime = Boolean(data.totalConfigured > 0);

  if (!hasConfiguredAnime) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#6366f1]/10 border border-[#6366f1]/30 text-[#818cf8] shadow-xl shadow-[#6366f1]/10 animate-bounce">
          <IconPlay width={32} height={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            No Stream Links Added Yet
          </h1>
          <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
            Anime Hub India displays only stream-ready anime. Go to the Admin Panel to configure
            video links for your favorite anime series.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/data/admin"
            className="rounded-2xl bg-[#6366f1] px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#4f46e5] transition shadow-lg shadow-[#6366f1]/30"
          >
            Open Admin Panel to Add Links
          </Link>
          <Link
            to="/browse"
            className="rounded-2xl bg-white/[0.06] border border-white/10 px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/10 transition"
          >
            Browse Catalog
          </Link>
        </div>
        <div className="pt-8">
          <TelegramBanner />
        </div>
      </div>
    );
  }

  return (
    <>
      {data.hero && data.hero.length > 0 && <Hero items={data.hero} />}

      <div className="relative z-10 -mt-20 space-y-4 md:-mt-28 md:space-y-6">
        <ContinueWatchingRow />

        {data.trending && data.trending.length > 0 && (
          <Row
            title="Trending Now"
            items={data.trending}
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

        {data.actionAdventure && data.actionAdventure.length > 0 && (
          <Row title="Action & Adventure" items={data.actionAdventure} />
        )}

        {data.fantasySupernatural && data.fantasySupernatural.length > 0 && (
          <Row title="Fantasy & Supernatural" items={data.fantasySupernatural} />
        )}

        {data.movies && data.movies.length > 0 && (
          <Row title="Blockbuster Movies" items={data.movies} />
        )}

        {data.romanceDrama && data.romanceDrama.length > 0 && (
          <Row title="Romance & Drama" items={data.romanceDrama} />
        )}

        {data.topRated && data.topRated.length > 0 && (
          <Row title="Top Rated Masterpieces" items={data.topRated} />
        )}

        {data.latest && data.latest.length > 0 && (
          <Row title="Recently Added" items={data.latest} />
        )}

        <div className="pt-4 sm:pt-6">
          <TelegramBanner />
        </div>
      </div>
    </>
  );
}
