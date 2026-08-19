import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { AnimeCard, CardSkeleton } from "@/components/anime/card";
import { IconClose } from "@/components/anime/icons";
import { EmptyState, ErrorState, PageHeading } from "@/components/anime/states";
import { fetchWatchlistItems } from "@/lib/anime.functions";
import { useWatchlist } from "@/lib/watchlist";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "My Anime Watchlist — AniStream" },
      { name: "description", content: "Every anime you saved, ready to pick up whenever you are." },
      { property: "og:title", content: "My Anime Watchlist — AniStream" },
      { property: "og:description", content: "Every anime you saved, in one place." },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { ids, ready, remove } = useWatchlist();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["watchlist", ids.join(",")],
    queryFn: () => fetchWatchlistItems({ data: { ids } }),
    enabled: ready && ids.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:pt-8 md:pt-10 pb-16 md:px-8">
      <PageHeading
        eyebrow="Your library"
        title="Watchlist"
        description="Saved on this device for now — ready to sync to an account later."
      />

      {!ready || (ids.length > 0 && isPending) ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: Math.max(ids.length, 6) }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : ids.length === 0 ? (
        <div className="flex flex-col items-center">
          <EmptyState
            title="Your watchlist is empty"
            hint="Tap the bookmark icon on any anime to save it here."
          />
          <Link
            to="/browse"
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:scale-105"
          >
            Browse anime
          </Link>
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {(data ?? []).map((item) => (
            <div key={item.id} className="fade-up relative">
              <AnimeCard item={item} />
              <button
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.title} from watchlist`}
                className="absolute top-2 left-2 rounded-full bg-black/70 p-1.5 text-foreground opacity-0 backdrop-blur-md transition-all hover:bg-destructive focus:opacity-100 group-hover:opacity-100 sm:opacity-100"
              >
                <IconClose width={14} height={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
