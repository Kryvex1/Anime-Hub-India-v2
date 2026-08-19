import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { fetchSeason, fetchShow } from "@/lib/anime.functions";
import { useWatchlist } from "@/lib/watchlist";
import { cn } from "@/lib/utils";
import { getEpisodeId, fetchSeasonEpisodesConfig } from "@/lib/episodes.firebase";
import { checkAdminSession } from "@/lib/admin-auth";

import {
  IconAlert,
  IconBack,
  IconBookmark,
  IconCalendar,
  IconCheck,
  IconClock,
  IconClose,
  IconPlay,
  IconShare,
  IconStar,
} from "./icons";
import { Img, img } from "./media";
import { Row } from "./row";
import { ErrorState } from "./states";
import { ComingSoonModal } from "./coming-soon-modal";

export function AnimeDetail({ id, autoPlay }: { id: number; autoPlay?: boolean }) {
  const router = useRouter();
  const { has, toggle, ready } = useWatchlist();
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [comingSoonEpisode, setComingSoonEpisode] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(checkAdminSession());
  }, []);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["show", id],
    queryFn: () => fetchShow({ data: { id } }),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  useEffect(() => {
    setSeasonNumber(null);
  }, [id]);

  const seasons = (data?.seasons ?? []).filter(
    (s) => s.seasonNumber > 0 && s.episodeCount > 0 && !s.name?.toLowerCase().includes("special"),
  );
  const activeSeason = seasonNumber ?? seasons[0]?.seasonNumber ?? 1;

  useEffect(() => {
    if (autoPlay && data) {
      void router.navigate({
        to: "/anime/$id/watch",
        params: { id: String(data.id) },
        search: { season: Number(activeSeason) || 1, episode: 1 },
      });
    }
  }, [autoPlay, data, activeSeason, router]);

  const seasonQuery = useQuery({
    queryKey: ["season", id, activeSeason],
    queryFn: () => fetchSeason({ data: { id, seasonNumber: activeSeason as number } }),
    enabled: activeSeason !== null,
    staleTime: 1000 * 60 * 10,
  });

  const { data: seasonFirebaseMap } = useQuery({
    queryKey: ["season-firebase", id, activeSeason],
    queryFn: () => fetchSeasonEpisodesConfig(id, activeSeason as number),
    enabled: activeSeason !== null,
    staleTime: 1000 * 60 * 2,
  });

  if (isError) {
    return (
      <div className="pt-24 pb-12">
        <ErrorState message={(error as Error)?.message} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isPending || !data) return <DetailSkeleton />;

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: data.title, url });
      else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* dismissed */
    }
  };

  const saved = ready && has(data.id);

  // Handle Watch Click with Availability Check & Coming Soon Modal
  const handleEpisodeClick = (epNumber: number) => {
    const epId = getEpisodeId(data.id, activeSeason as number, epNumber);
    const epDoc = seasonFirebaseMap?.get(epId);
    const hasStream = Boolean(epDoc?.server1?.url || epDoc?.server2?.url);

    if (!hasStream) {
      setComingSoonEpisode(epNumber);
      return;
    }

    void router.navigate({
      to: "/anime/$id/watch",
      params: { id: String(data.id) },
      search: { season: Number(activeSeason) || 1, episode: Number(epNumber) || 1 },
    });
  };

  const handleWatchNow = () => {
    const firstAvailable = seasonQuery.data?.episodes?.find((ep) => {
      const epId = getEpisodeId(data.id, activeSeason as number, ep.episodeNumber);
      const epDoc = seasonFirebaseMap?.get(epId);
      return Boolean(epDoc?.server1?.url || epDoc?.server2?.url);
    });

    if (firstAvailable) {
      handleEpisodeClick(firstAvailable.episodeNumber);
    } else {
      handleEpisodeClick(1);
    }
  };

  return (
    <div className="pb-16 bg-[#070A12] text-[#f1f5f9]">
      {/* Backdrop */}
      <div className="relative h-[48vh] min-h-[340px] w-full overflow-hidden md:h-[65vh]">
        <div className="zoom-in-soft absolute inset-0">
          <Img
            src={img(data.backdrop, "original")}
            alt={data.title}
            className="h-full w-full object-cover"
            rounded="rounded-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/60 to-[#070A12]/20" />
      </div>

      {/* Main info */}
      <div className="relative z-10 mx-auto -mt-32 max-w-[1600px] px-4 md:-mt-44 md:px-8">
        <div className="fade-up flex flex-col gap-5 md:flex-row md:items-end">
          <Img
            src={img(data.poster, "w500")}
            alt={data.title}
            className="w-28 shrink-0 shadow-2xl ring-1 ring-white/15 md:w-52"
            rounded="rounded-2xl"
          />

          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {data.title}
            </h1>
            {data.originalTitle && data.originalTitle !== data.title && (
              <p className="mt-1 text-xs sm:text-sm text-[#94a3b8]">{data.originalTitle}</p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#94a3b8]">
              {data.rating > 0 && (
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <IconStar width={13} height={13} />
                  {data.rating.toFixed(1)}
                  <span className="font-normal text-[#94a3b8]/70">
                    ({data.voteCount.toLocaleString()})
                  </span>
                </span>
              )}
              {data.firstAirDate && (
                <span className="flex items-center gap-1">
                  <IconCalendar width={13} height={13} />
                  {data.firstAirDate.slice(0, 4)}
                </span>
              )}
              {data.runtime && (
                <span className="flex items-center gap-1">
                  <IconClock width={13} height={13} />
                  {data.runtime} min
                </span>
              )}
              {data.status && (
                <span className="rounded-full bg-white/[0.08] border border-white/[0.08] px-2.5 py-0.5 text-[10px] font-semibold text-[#cbd5e1]">
                  {data.status}
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(data.genres || []).map((g) => {
                const genreName = typeof g === "string" ? g : (g as { name?: string })?.name || "";
                if (!genreName) return null;
                return (
                  <span
                    key={genreName}
                    className="rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-[#cbd5e1]"
                  >
                    {genreName}
                  </span>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleWatchNow}
                className="flex items-center gap-2 rounded-full bg-[#6366f1] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#6366f1]/30 transition-all hover:bg-[#4f46e5] active:scale-95 cursor-pointer"
              >
                <IconPlay width={15} height={15} /> Watch Now
              </button>
              <button
                type="button"
                onClick={() => {
                  toggle(data.id);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer",
                  saved
                    ? "bg-white/15 text-[#818cf8] border border-[#818cf8]/40"
                    : "bg-[#0D111C]/80 border border-white/[0.08] backdrop-blur-md text-[#94a3b8] hover:text-white hover:bg-white/[0.08]",
                )}
              >
                {saved ? (
                  <IconCheck width={15} height={15} />
                ) : (
                  <IconBookmark width={15} height={15} />
                )}
                {saved ? "In Watchlist" : "Watchlist"}
              </button>
              <button
                type="button"
                onClick={() => void share()}
                className="flex items-center gap-1.5 rounded-full bg-[#0D111C]/80 border border-white/[0.08] backdrop-blur-md px-4 py-2.5 text-xs font-semibold text-[#94a3b8] transition-all hover:text-white hover:bg-white/[0.08] active:scale-95 cursor-pointer"
              >
                <IconShare width={14} height={14} /> Share
              </button>
            </div>
          </div>
        </div>

        <div className="fade-up mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-2xl bg-[#0D111C]/80 border border-white/[0.08] backdrop-blur-xl p-4 sm:p-5">
            <h2 className="text-sm sm:text-base font-bold text-white">Overview</h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#94a3b8]">
              {data.overview || "No description available for this title yet."}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-[#0D111C]/80 border border-white/[0.08] backdrop-blur-xl p-4 sm:p-5 text-xs">
            <Info label="Seasons" value={String(data.numberOfSeasons || seasons.length || "—")} />
            <Info label="Episodes" value={String(data.numberOfEpisodes || "—")} />
            <Info label="First aired" value={data.firstAirDate || "—"} />
            <Info label="Last aired" value={data.lastAirDate || "—"} />
            <Info label="Popularity" value={data.popularity ? String(data.popularity) : "—"} />
            <Info label="Language" value={data.language?.toUpperCase() || "JA"} />
            <Info
              label="Country"
              value={
                data.countries && data.countries.length > 0 ? data.countries.join(", ") : "Japan"
              }
            />
            <Info
              label="Studios"
              value={
                data.companies && data.companies.length > 0
                  ? data.companies
                      .map((c) => c.name)
                      .filter(Boolean)
                      .join(", ")
                  : "—"
              }
            />
          </dl>
        </div>
      </div>

      {/* Seasons & Episodes */}
      {seasons.length > 0 && activeSeason !== null && (
        <section className="mx-auto mt-8 max-w-[1600px] px-4 md:px-8">
          <div className="rounded-2xl bg-[#0D111C]/80 border border-white/[0.08] backdrop-blur-xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">Seasons & Episodes</h2>
                <p className="text-[11px] text-[#94a3b8]">
                  Select an episode to watch on high-speed servers.
                </p>
              </div>

              {seasons.length > 1 && (
                <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
                  {seasons.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSeasonNumber(s.seasonNumber)}
                      className={cn(
                        "rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95",
                        s.seasonNumber === activeSeason
                          ? "bg-[#6366f1] text-white shadow-sm shadow-[#6366f1]/30"
                          : "bg-white/[0.04] text-[#94a3b8] hover:text-white",
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div key={activeSeason} className="fade-up overflow-hidden">
              {seasonQuery.isPending ? (
                <SeasonSkeleton />
              ) : seasonQuery.isError ? (
                <ErrorState
                  message="This season's details couldn't be loaded."
                  onRetry={() => void seasonQuery.refetch()}
                />
              ) : (
                seasonQuery.data && (
                  <div className="space-y-4 overflow-hidden">
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {seasonQuery.data.episodes.map((ep) => {
                        const epId = getEpisodeId(
                          data.id,
                          activeSeason as number,
                          ep.episodeNumber,
                        );
                        const epDoc = seasonFirebaseMap?.get(epId);
                        const hasStream = Boolean(epDoc?.server1?.url || epDoc?.server2?.url);

                        return (
                          <button
                            key={ep.id}
                            type="button"
                            onClick={() => handleEpisodeClick(ep.episodeNumber)}
                            className="group flex w-full min-w-0 max-w-full items-start gap-2.5 rounded-xl bg-[#111622]/70 border border-white/[0.06] p-2 text-left transition-all hover:border-white/15 hover:bg-[#151b2a] cursor-pointer active:scale-[0.98] backdrop-blur-md overflow-hidden"
                          >
                            <div className="relative aspect-video w-20 sm:w-24 shrink-0 overflow-hidden rounded-lg bg-black/60">
                              <Img
                                src={img(ep.still, "w300")}
                                alt={ep.name || `Episode ${ep.episodeNumber}`}
                                className="h-full w-full object-cover"
                                rounded="rounded-lg"
                              />
                              <div className="absolute top-1 left-1 rounded bg-black/70 px-1 py-0.2 text-[9px] font-bold text-white">
                                EP {ep.episodeNumber}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 py-0.5 flex flex-col justify-between h-full overflow-hidden">
                              <div className="min-w-0 overflow-hidden">
                                <p className="truncate text-xs font-semibold text-[#f1f5f9] group-hover:text-[#818cf8] transition break-words">
                                  {ep.name || `Episode ${ep.episodeNumber}`}
                                </p>
                                <p className="line-clamp-2 mt-0.5 text-[10px] text-[#94a3b8] break-words leading-tight">
                                  {ep.overview || "No synopsis available."}
                                </p>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px] min-w-0 pt-0.5">
                                {hasStream ? (
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1 shrink-0">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
                                    Ready
                                  </span>
                                ) : (
                                  <span className="text-neutral-500 font-medium shrink-0">
                                    No Stream
                                  </span>
                                )}
                                {ep.runtime && (
                                  <span className="text-[#94a3b8] shrink-0">{ep.runtime}m</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* Cast */}
      {data.cast.length > 0 && (
        <PeopleRow title="Cast" people={data.cast.map((c) => ({ ...c, sub: c.character ?? "" }))} />
      )}
      {data.crew.length > 0 && (
        <PeopleRow
          title="Crew"
          people={data.crew.map((c) => ({
            ...c,
            sub: [c.job, c.department].filter(Boolean).join(" · "),
          }))}
        />
      )}

      {data.recommendations.length > 0 && (
        <div className="mt-6">
          <Row title="More Like This" items={data.recommendations} />
        </div>
      )}

      {comingSoonEpisode !== null && (
        <ComingSoonModal
          isOpen={comingSoonEpisode !== null}
          onClose={() => setComingSoonEpisode(null)}
          animeTitle={data.title}
          animeId={data.id}
          seasonNumber={Number(activeSeason) || 1}
          episodeNumber={comingSoonEpisode}
          episodeTitle={
            seasonQuery.data?.episodes?.find((ep) => ep.episodeNumber === comingSoonEpisode)?.name
          }
          posterPath={data.poster}
          backdropPath={
            seasonQuery.data?.episodes?.find((ep) => ep.episodeNumber === comingSoonEpisode)
              ?.still || data.backdrop
          }
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] tracking-wide text-[#94a3b8] uppercase font-semibold">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-medium text-white">{value}</dd>
    </div>
  );
}

function PeopleRow({
  title,
  people,
}: {
  title: string;
  people: { id: number; name: string; sub: string; profile: string | null }[];
}) {
  return (
    <section className="mx-auto mt-8 max-w-[1600px] px-4 md:px-8">
      <h2 className="text-sm sm:text-base font-bold text-white">{title}</h2>
      <div className="scrollbar-none mt-2.5 flex gap-3 overflow-x-auto pb-2">
        {people.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            className="w-20 shrink-0 text-center transition-transform duration-200 hover:-translate-y-0.5 md:w-24"
          >
            <Img
              src={img(p.profile, "w185")}
              alt={p.name}
              isAvatar={true}
              className="aspect-square w-full ring-1 ring-white/10"
              rounded="rounded-full"
            />
            <p className="mt-1.5 line-clamp-1 text-[11px] font-semibold text-[#f1f5f9]">{p.name}</p>
            <p className="line-clamp-1 text-[10px] text-[#94a3b8]">{p.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SeasonSkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="bg-[#070A12]">
      <div className="h-[48vh] min-h-[340px] w-full bg-white/[0.03] animate-pulse md:h-[65vh]" />
      <div className="mx-auto -mt-32 max-w-[1600px] px-4 md:-mt-44 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end">
          <div className="aspect-[2/3] w-28 rounded-2xl bg-white/[0.05] animate-pulse md:w-52" />
          <div className="flex-1 space-y-2.5">
            <div className="h-8 w-3/4 max-w-md rounded-lg bg-white/[0.05] animate-pulse" />
            <div className="h-3 w-44 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-10 w-48 rounded-full bg-white/[0.05] animate-pulse" />
          </div>
        </div>
        <div className="mt-6 h-24 w-full rounded-2xl bg-white/[0.03] animate-pulse" />
      </div>
    </div>
  );
}
