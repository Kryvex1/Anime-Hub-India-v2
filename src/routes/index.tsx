import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { IconPlay } from "@/components/anime/icons";
import { Hero, HeroSkeleton } from "@/components/anime/hero";
import { Row } from "@/components/anime/row";
import { ErrorState } from "@/components/anime/states";
import { TelegramBanner } from "@/components/anime/telegram-banner";
import { fetchHome } from "@/lib/anime.functions";
import { useAppSettings } from "@/lib/settings";
import { useWatchHistory } from "@/lib/watch-history";
import { useWatchlist } from "@/lib/watchlist";
import { buildUserTasteProfile, getRecommendationFeed } from "@/lib/recommendations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "7Shows — Watch Movies, Series & Anime in HD" },
      {
        name: "description",
        content:
          "7Shows: Discover trending, popular movies, web series, and anime with fast HD multi-audio streaming.",
      },
      { property: "og:title", content: "7Shows — Watch Movies, Series & Anime in HD" },
      {
        property: "og:description",
        content:
          "7Shows: Discover trending, popular movies, web series, and anime with fast HD multi-audio streaming.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { settings } = useAppSettings();
  const { history: watchHistory } = useWatchHistory();
  const { ids: watchlistIds } = useWatchlist();

  // 1. Dynamic country-based home feed (real TMDB regional trending & popular data)
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: [
      "home",
      settings.country,
      settings.safeMode,
      settings.adultMode,
      settings.darkGoreMode,
      settings.theme,
    ],
    queryFn: () => fetchHome(settings.country),
    staleTime: 1000 * 60 * 5,
  });

  // 2. Advanced Personalized Recommendation Feed
  const { data: recFeed } = useQuery({
    queryKey: [
      "recommendations-feed",
      settings.country,
      settings.preferredLanguages.join(","),
      watchHistory.length,
      watchlistIds.length,
      watchHistory[0]?.animeId || 0,
      watchHistory[0]?.updatedAt || 0,
    ],
    queryFn: () => {
      const profile = buildUserTasteProfile(watchHistory, watchlistIds, settings);
      return getRecommendationFeed(profile);
    },
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
          <Row title="Popular Titles" items={[]} loading />
        </div>
      </>
    );
  }

  const hasConfiguredAnime = Boolean(data.totalConfigured > 0);

  if (!hasConfiguredAnime) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#E50914]/10 border border-[#E50914]/30 text-[#ff2a34] shadow-xl shadow-[#E50914]/10 animate-bounce">
          <IconPlay width={32} height={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            No Stream Links Added Yet
          </h1>
          <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
            CinePulse displays stream-ready titles. Go to the Admin Panel to configure video links
            for your favorite movies and series.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/admin"
            className="rounded-2xl bg-[#E50914] px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#b80710] transition shadow-lg shadow-[#E50914]/30"
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

      <div className="relative z-10 mt-6 sm:mt-8 space-y-6 md:space-y-8 pb-12">
        {/* 1. Personalized Recommendations */}
        {recFeed?.recommendedForYou && recFeed.recommendedForYou.length > 0 && (
          <Row
            title="Recommended for You"
            items={recFeed.recommendedForYou}
            action={
              <Link to="/browse" className="text-xs font-semibold text-primary hover:underline">
                Explore
              </Link>
            }
          />
        )}

        {/* 2. Country-Aware Regional Trending */}
        {recFeed?.trendingInCountry && recFeed.trendingInCountry.items.length > 0 && (
          <Row
            title={recFeed.trendingInCountry.countryLabel}
            items={recFeed.trendingInCountry.items}
            action={
              <Link to="/trending" className="text-xs font-semibold text-primary hover:underline">
                See all
              </Link>
            }
          />
        )}

        {/* 3. Because You Watched Section */}
        {recFeed?.becauseYouWatched && recFeed.becauseYouWatched.items.length > 0 && (
          <Row
            title={`Because You Watched "${recFeed.becauseYouWatched.sourceTitle}"`}
            items={recFeed.becauseYouWatched.items}
          />
        )}

        {/* 4. Similar to Watchlist */}
        {recFeed?.similarToWatchlist && recFeed.similarToWatchlist.items.length > 0 && (
          <Row
            title={`Similar to "${recFeed.similarToWatchlist.sourceTitle}" on Watchlist`}
            items={recFeed.similarToWatchlist.items}
            action={
              <Link to="/watchlist" className="text-xs font-semibold text-primary hover:underline">
                Watchlist
              </Link>
            }
          />
        )}

        {/* 5. Top in Preferred Language */}
        {recFeed?.topInLanguage && recFeed.topInLanguage.items.length > 0 && (
          <Row title={recFeed.topInLanguage.languageLabel} items={recFeed.topInLanguage.items} />
        )}

        {/* 6. New Releases & Fresh Hits */}
        {recFeed?.newReleases && recFeed.newReleases.length > 0 && (
          <Row title="New Releases & Fresh Hits" items={recFeed.newReleases} />
        )}

        {/* Existing Catalog Rows */}
        {data.hollywood && data.hollywood.length > 0 && (
          <Row
            title="Hollywood Blockbusters"
            items={data.hollywood}
            action={
              <Link to="/popular" className="text-xs font-semibold text-primary hover:underline">
                See all
              </Link>
            }
          />
        )}

        {data.bollywood && data.bollywood.length > 0 && (
          <Row title="Bollywood Blockbusters" items={data.bollywood} />
        )}

        {data.indianTrending && data.indianTrending.length > 0 && (
          <Row
            title="Trending in India"
            items={data.indianTrending}
            action={
              <Link to="/trending" className="text-xs font-semibold text-primary hover:underline">
                See all
              </Link>
            }
          />
        )}

        {data.kdrama && data.kdrama.length > 0 && (
          <Row title="Korean Dramas (K-Drama)" items={data.kdrama} />
        )}

        {data.anime && data.anime.length > 0 && (
          <Row title="Top Anime Hits & Movies" items={data.anime} />
        )}

        {data.kidsFamily && data.kidsFamily.length > 0 && (
          <Row title="Kids & Family Shows" items={data.kidsFamily} />
        )}

        {data.topSeries && data.topSeries.length > 0 && (
          <Row title="Popular Web Series" items={data.topSeries} />
        )}

        {data.southCinema && data.southCinema.length > 0 && (
          <Row title="South Indian Cinema (Dubbed & Original)" items={data.southCinema} />
        )}

        {/* 7. Hidden Gems */}
        {recFeed?.hiddenGems && recFeed.hiddenGems.length > 0 && (
          <Row title="Top-Rated Hidden Gems" items={recFeed.hiddenGems} />
        )}

        {data.topRated && data.topRated.length > 0 && (
          <Row title="Top Rated Masterpieces" items={data.topRated} />
        )}

        <div className="pt-4 sm:pt-6">
          <TelegramBanner />
        </div>
      </div>
    </>
  );
}
