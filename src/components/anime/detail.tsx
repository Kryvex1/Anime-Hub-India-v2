import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";

import { fetchSeason, fetchShow } from "@/lib/anime.functions";
import { getKnownCard, type ShowDetails } from "@/lib/tmdb";
import { useWatchlist } from "@/lib/watchlist";
import { cn } from "@/lib/utils";
import { animateCardStagger } from "@/lib/anime-animation";
import { getMediaCategory } from "@/lib/routes-helper";

import {
  IconBookmark,
  IconCalendar,
  IconCheck,
  IconClock,
  IconPlay,
  IconShare,
  IconStar,
} from "./icons";
import { Img, img } from "./media";
import { ErrorState } from "./states";
import { Row } from "./row";
import { CastCrewSection, PersonWorksModal, type SelectedPerson } from "./cast-crew";

export function AnimeDetail({ id, autoPlay }: { id: number; autoPlay?: boolean }) {
  const router = useRouter();
  const { has, toggle, ready } = useWatchlist();
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(null);
  const epGridRef = useRef<HTMLDivElement | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["show", id],
    queryFn: () => fetchShow({ data: { id } }),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 120,
    placeholderData: () => {
      const c = getKnownCard(id);
      if (!c) return undefined;
      const isMovieCard = c.type === "Movie";
      return {
        id: c.id,
        type: isMovieCard ? "movie" : "tv",
        isMovie: isMovieCard,
        title: c.title,
        originalTitle: c.originalTitle || c.title,
        overview: c.overview || "",
        poster: c.poster,
        backdrop: c.backdrop || c.poster,
        rating: c.rating,
        voteAverage: c.rating,
        voteCount: c.voteCount || 0,
        firstAirDate: c.firstAirDate || (c.year ? `${c.year}-01-01` : ""),
        lastAirDate: undefined,
        numberOfSeasons: isMovieCard ? 1 : 1,
        numberOfEpisodes: isMovieCard ? 1 : 12,
        language: "JA",
        popularity: c.popularity || 0,
        runtime: null,
        countries: ["Japan"],
        companies: [],
        status: isMovieCard ? "Movie" : "Series",
        genres: c.genres && c.genres.length > 0 ? c.genres : ["Animation"],
        seasons: isMovieCard
          ? [
              {
                id: 1,
                seasonNumber: 1,
                name: "Full Movie",
                episodeCount: 1,
                poster: c.poster,
                overview: "",
                airDate: null,
              },
            ]
          : [
              {
                id: 1,
                seasonNumber: 1,
                name: "Season 1",
                episodeCount: 12,
                poster: c.poster,
                overview: "",
                airDate: null,
              },
            ],
        cast: [],
        crew: [],
        recommendations: [],
        trailerUrl: null,
      } as ShowDetails;
    },
    retry: 1,
  });

  const isMovie = useMemo(() => {
    if (!data) return false;
    if (data.isMovie === true || data.type === "movie") return true;
    if (data.isMovie === false || data.type === "tv") return false;
    if (data.numberOfEpisodes === 1 && (!data.seasons || data.seasons.length <= 1)) return true;
    if (data.seasons?.length === 1 && data.seasons[0]?.name?.toLowerCase().includes("movie"))
      return true;
    return false;
  }, [data]);

  // Valid seasons for TV series
  const allSeasons = useMemo(() => {
    return (data?.seasons ?? []).filter(
      (s) => s.seasonNumber > 0 && s.episodeCount > 0 && !s.name?.toLowerCase().includes("special"),
    );
  }, [data?.seasons]);

  const availableSeasons =
    allSeasons.length > 0
      ? allSeasons
      : [
          {
            id: 1,
            seasonNumber: 1,
            name: "Season 1",
            episodeCount: 1,
            poster: null,
            overview: "",
            airDate: null,
          },
        ];

  const activeSeason = seasonNumber ?? availableSeasons[0]?.seasonNumber ?? 1;

  useEffect(() => {
    setSeasonNumber(null);
  }, [id]);

  // Watch Navigation Helper
  const navigateToWatch = (seasonNum: number, epNum: number) => {
    if (!data) return;
    const cat = getMediaCategory(data.id, data);
    if (cat === "movie") {
      void router.navigate({
        to: "/movie/$id/watch",
        params: { id: String(data.id) },
        search: { season: 1, episode: 1 },
      });
      return;
    }
    if (cat === "webseries") {
      void router.navigate({
        to: "/webseries/$id/watch",
        params: { id: String(data.id) },
        search: { season: Number(seasonNum) || 1, episode: Number(epNum) || 1 },
      });
      return;
    }
    void router.navigate({
      to: "/anime/$id/watch",
      params: { id: String(data.id) },
      search: { season: Number(seasonNum) || 1, episode: Number(epNum) || 1 },
    });
  };

  // AutoPlay support
  useEffect(() => {
    if (autoPlay && data) {
      navigateToWatch(Number(activeSeason) || 1, 1);
    }
  }, [autoPlay, data, activeSeason]);

  // Fetch season data for TV shows
  const seasonQuery = useQuery({
    queryKey: ["season", id, activeSeason],
    queryFn: () => fetchSeason({ data: { id, seasonNumber: activeSeason } }),
    enabled: Boolean(data) && !isMovie,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 120,
  });

  const visibleEpisodes = useMemo(() => {
    if (isMovie) return [];
    return seasonQuery.data?.episodes ?? [];
  }, [seasonQuery.data?.episodes, isMovie]);

  // Stagger animation when episodes load
  useEffect(() => {
    if (epGridRef.current && visibleEpisodes.length > 0) {
      const cards = epGridRef.current.querySelectorAll<HTMLElement>(".ep-card");
      if (cards.length > 0) {
        animateCardStagger(Array.from(cards));
      }
    }
  }, [visibleEpisodes, activeSeason]);

  if (isError) {
    return (
      <div className="pt-24 pb-12">
        <ErrorState message={(error as Error)?.message} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isPending || !data) {
    return <DetailSkeleton />;
  }

  const share = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: data.title,
          text: `Watch ${data.title} on CinePulse`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* dismissed */
    }
  };

  const saved = ready && has(data.id);

  const handleEpisodeClick = (epNumber: number) => {
    navigateToWatch(Number(activeSeason) || 1, Number(epNumber) || 1);
  };

  const handleWatchNow = () => {
    if (isMovie) {
      navigateToWatch(1, 1);
    } else {
      const firstEp = visibleEpisodes[0]?.episodeNumber ?? 1;
      navigateToWatch(Number(activeSeason) || 1, firstEp);
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
            className="w-28 shrink-0 shadow-2xl ring-1 ring-white/15 md:w-52 anime-glow-card"
            rounded="rounded-2xl"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                {isMovie ? "Anime Movie" : "Anime Series"}
              </span>
            </div>

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
                  {data.voteCount ? (
                    <span className="font-normal text-[#94a3b8]/70">
                      ({data.voteCount.toLocaleString()})
                    </span>
                  ) : null}
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
                className="flex items-center gap-2 rounded-full bg-[#E50914] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#E50914]/30 transition-all hover:bg-[#b80710] active:scale-95 cursor-pointer"
              >
                <IconPlay width={15} height={15} /> {isMovie ? "Watch Movie" : "Watch Now"}
              </button>

              <button
                type="button"
                onClick={() => {
                  toggle(data.id);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer",
                  saved
                    ? "bg-white/15 text-[#ff2a34] border border-[#ff2a34]/40"
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
                <IconShare width={14} height={14} /> {copied ? "Copied Link" : "Share"}
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
            <Info label="Format" value={isMovie ? "Full Movie" : "Web Series"} />
            <Info
              label={isMovie ? "Runtime" : "Episodes"}
              value={
                isMovie
                  ? data.runtime
                    ? `${data.runtime} min`
                    : "Feature Length"
                  : String(data.numberOfEpisodes || "—")
              }
            />
            <Info label="Release Date" value={data.firstAirDate || "—"} />
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

      {/* Movie Mode Direct Stream Banner Card */}
      {isMovie ? (
        <section className="mx-auto mt-8 max-w-[1600px] px-4 md:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-[#0D111C]">
            {/* Backdrop Image with gradient overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <Img
                src={img(data.backdrop || data.poster, "w1280")}
                alt=""
                className="h-full w-full object-cover object-center filter brightness-[0.35] scale-105"
                rounded="rounded-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070A12] via-[#070A12]/80 to-[#070A12]/50" />
            </div>

            {/* Flat Content */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#ff2a34] shadow-lg shadow-[#E50914]/20">
                  <IconPlay width={20} height={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {data.title}
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    {data.runtime
                      ? `${data.runtime} min · Full Movie`
                      : "Feature Film · Stream in HD"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleWatchNow}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#E50914] px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#b80710] transition shadow-lg shadow-[#E50914]/30 cursor-pointer active:scale-95"
                >
                  <IconPlay width={14} height={14} /> Start Movie
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* TV Series Seasons & Episodes */
        availableSeasons.length > 0 && (
          <section className="mx-auto mt-8 max-w-[1600px] px-4 md:px-8">
            <div className="rounded-2xl bg-[#0D111C]/80 border border-white/[0.08] backdrop-blur-xl p-4 sm:p-6 space-y-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">Episodes</h2>
                  <p className="text-[11px] text-[#94a3b8]">
                    Select an episode to watch on high-speed servers.
                  </p>
                </div>

                {availableSeasons.length > 1 && (
                  <div className="scrollbar-none no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                    {availableSeasons.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSeasonNumber(s.seasonNumber)}
                        className={cn(
                          "rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95",
                          s.seasonNumber === activeSeason
                            ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/30"
                            : "bg-white/[0.04] text-[#94a3b8] hover:text-white hover:bg-white/10",
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div key={activeSeason} className="overflow-hidden">
                {seasonQuery.isPending ? (
                  <SeasonSkeleton />
                ) : seasonQuery.isError ? (
                  <ErrorState
                    message="This season's details couldn't be loaded."
                    onRetry={() => void seasonQuery.refetch()}
                  />
                ) : visibleEpisodes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#94a3b8] space-y-2">
                    <p>Episodes will be listed shortly.</p>
                  </div>
                ) : (
                  <div
                    ref={epGridRef}
                    className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-h-[640px] overflow-y-auto scrollbar-none no-scrollbar pr-0.5"
                  >
                    {visibleEpisodes.map((ep) => {
                      return (
                        <button
                          key={ep.id}
                          type="button"
                          onClick={() => handleEpisodeClick(ep.episodeNumber)}
                          className="ep-card group flex w-full min-w-0 max-w-full items-start gap-2.5 rounded-2xl bg-[#111622]/70 border border-white/[0.06] p-2.5 text-left transition-all duration-250 hover:border-[#E50914]/40 hover:bg-[#151b2a] cursor-pointer active:scale-[0.98] backdrop-blur-md overflow-hidden hover:shadow-[0_8px_20px_rgba(229,9,20,0.15)]"
                        >
                          <div className="relative aspect-video w-20 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-black/60">
                            <Img
                              src={img(ep.still || data.poster, "w300")}
                              alt={ep.name || `Episode ${ep.episodeNumber}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                              rounded="rounded-xl"
                            />
                            <div className="absolute top-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-black text-white">
                              EP {ep.episodeNumber}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 py-0.5 flex flex-col justify-between h-full overflow-hidden">
                            <div className="min-w-0 overflow-hidden">
                              <p className="truncate text-xs font-bold text-[#f1f5f9] group-hover:text-[#ff2a34] transition break-words">
                                {ep.name || `Episode ${ep.episodeNumber}`}
                              </p>
                              <p className="line-clamp-2 mt-0.5 text-[10px] text-[#94a3b8] break-words leading-tight">
                                {ep.overview || "No synopsis available."}
                              </p>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] min-w-0 pt-0.5">
                              <span className="text-slate-400 font-medium shrink-0">
                                Ep {ep.episodeNumber}
                              </span>
                              {ep.runtime && (
                                <span className="text-[#94a3b8] shrink-0 font-medium">
                                  {ep.runtime}m
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )
      )}

      {/* Cast & Crew Section */}
      {((data.cast && data.cast.length > 0) || (data.crew && data.crew.length > 0)) && (
        <div className="mx-auto mt-8 max-w-[1600px] px-4 md:px-8">
          <div className="rounded-3xl bg-[#0D111C]/80 border border-white/[0.08] backdrop-blur-xl p-5 sm:p-7 shadow-xl">
            <CastCrewSection cast={data.cast} crew={data.crew} onSelectPerson={setSelectedPerson} />
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="mx-auto mt-8 max-w-[1600px] space-y-6">
          <Row
            title={isMovie ? "Related Anime Movies" : "More Recommended Anime"}
            items={data.recommendations}
          />
        </div>
      )}

      {/* Person Works Modal */}
      <PersonWorksModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-semibold text-[#94a3b8]">{label}</dt>
      <dd className="font-bold text-white truncate">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="pb-16 bg-[#070A12]">
      <div className="shimmer h-[48vh] min-h-[340px] w-full md:h-[65vh] bg-white/[0.04]" />
      <div className="mx-auto -mt-32 max-w-[1600px] px-4 md:-mt-44 md:px-8 space-y-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end">
          <div className="shimmer h-44 w-28 shrink-0 rounded-2xl bg-white/[0.05] md:h-72 md:w-52" />
          <div className="w-full space-y-3">
            <div className="shimmer h-8 w-2/3 rounded-xl bg-white/[0.05]" />
            <div className="shimmer h-4 w-1/3 rounded-lg bg-white/[0.04]" />
            <div className="shimmer h-10 w-44 rounded-full bg-white/[0.05]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SeasonSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#ff2a34]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E50914]" />
        </span>
        <span className="text-[#94a3b8] text-[11px]">Loading episodes...</span>
      </div>
      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex w-full min-w-0 items-start gap-2.5 rounded-2xl bg-[#111622]/60 border border-white/[0.05] p-2.5 overflow-hidden"
          >
            <div className="relative aspect-video w-20 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-white/[0.05] shimmer flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                <IconPlay width={10} height={10} className="text-white/20 ml-0.5" />
              </div>
            </div>
            <div className="min-w-0 flex-1 py-0.5 space-y-2">
              <div className="h-3 w-3/4 rounded-md bg-white/[0.08] shimmer" />
              <div className="space-y-1">
                <div className="h-2 w-full rounded bg-white/[0.04] shimmer" />
                <div className="h-2 w-4/5 rounded bg-white/[0.03] shimmer" />
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <div className="h-2 w-12 rounded bg-white/[0.05] shimmer" />
                <div className="h-2 w-8 rounded bg-white/[0.04] shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
