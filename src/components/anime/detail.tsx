import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";

import { fetchSeason, fetchShow } from "@/lib/anime.functions";
import { useWatchlist } from "@/lib/watchlist";
import { cn } from "@/lib/utils";
import {
  getEpisodeId,
  fetchSeasonEpisodesConfig,
  fetchAnimeConfiguredEpisodes,
  fetchAddedAnimeMap,
  getStoredAddedAnime,
} from "@/lib/episodes.firebase";
import { checkAdminSession } from "@/lib/admin-auth";
import { animateCardStagger } from "@/lib/anime-animation";
import type { CardItem } from "@/lib/tmdb";

import {
  IconBack,
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
import { ComingSoonModal } from "./coming-soon-modal";
import { Row } from "./row";

export function AnimeDetail({ id, autoPlay }: { id: number; autoPlay?: boolean }) {
  const router = useRouter();
  const { has, toggle, ready } = useWatchlist();
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [comingSoonEpisode, setComingSoonEpisode] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  const epGridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsAdmin(checkAdminSession());
  }, []);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["show", id],
    queryFn: () => fetchShow({ data: { id } }),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const isMovie = useMemo(() => {
    if (!data) return false;
    if (data.isMovie || data.type === "movie") return true;
    if (data.numberOfEpisodes === 1 && (!data.seasons || data.seasons.length <= 1)) return true;
    if (data.seasons?.length === 1 && data.seasons[0]?.name?.toLowerCase().includes("movie"))
      return true;
    return false;
  }, [data]);

  // Fetch all configured episodes for this anime to know available seasons & episodes
  const { data: animeConfiguredEpisodes } = useQuery({
    queryKey: ["anime-configured-episodes", id],
    queryFn: () => fetchAnimeConfiguredEpisodes(id),
    staleTime: 1000 * 60 * 2,
  });

  // Set of season numbers that have at least 1 configured live episode
  const configuredSeasonNumbers = useMemo(() => {
    const set = new Set<number>();
    (animeConfiguredEpisodes ?? []).forEach((ep) => {
      if (ep.season && (ep.server1?.url || ep.server2?.url)) {
        set.add(Number(ep.season));
      }
    });
    return set;
  }, [animeConfiguredEpisodes]);

  // Filter seasons: Only show seasons that have at least 1 live episode (or all for admin)
  const allSeasons = (data?.seasons ?? []).filter(
    (s) => s.seasonNumber > 0 && s.episodeCount > 0 && !s.name?.toLowerCase().includes("special"),
  );

  const availableSeasons = useMemo(() => {
    const filtered = allSeasons.filter((s) => configuredSeasonNumbers.has(s.seasonNumber));
    return filtered.length > 0 ? filtered : allSeasons.slice(0, 1);
  }, [allSeasons, configuredSeasonNumbers]);

  const activeSeason =
    seasonNumber ??
    (configuredSeasonNumbers.size > 0
      ? Array.from(configuredSeasonNumbers)[0]
      : (allSeasons[0]?.seasonNumber ?? 1));

  useEffect(() => {
    setSeasonNumber(null);
  }, [id]);

  useEffect(() => {
    if (autoPlay && data && configuredSeasonNumbers.size > 0) {
      void router.navigate({
        to: "/anime/$id/watch",
        params: { id: String(data.id) },
        search: { season: Number(activeSeason) || 1, episode: 1 },
      });
    }
  }, [autoPlay, data, activeSeason, router, configuredSeasonNumbers]);

  const seasonQuery = useQuery({
    queryKey: ["season", id, activeSeason],
    queryFn: () => fetchSeason({ data: { id, seasonNumber: activeSeason as number } }),
    enabled: activeSeason !== null && !isMovie,
    staleTime: 1000 * 60 * 10,
  });

  const { data: seasonFirebaseMap } = useQuery({
    queryKey: ["season-firebase", id, activeSeason],
    queryFn: () => fetchSeasonEpisodesConfig(id, activeSeason as number),
    enabled: activeSeason !== null,
    staleTime: 1000 * 60 * 2,
  });

  // Filter episodes: ONLY show episodes that have live streaming links added
  const visibleEpisodes = useMemo(() => {
    if (isMovie) return [];
    const rawEpisodes = seasonQuery.data?.episodes ?? [];

    const filtered = rawEpisodes.filter((ep) => {
      const epId = getEpisodeId(id, activeSeason as number, ep.episodeNumber);
      const epDoc = seasonFirebaseMap?.get(epId);
      return Boolean(epDoc?.server1?.url || epDoc?.server2?.url);
    });

    return filtered;
  }, [seasonQuery.data?.episodes, seasonFirebaseMap, id, activeSeason, isMovie]);

  // Movie stream availability check
  const movieEpisodeDoc = useMemo(() => {
    if (!isMovie) return null;
    const epId = getEpisodeId(id, 1, 1);
    return seasonFirebaseMap?.get(epId);
  }, [isMovie, id, seasonFirebaseMap]);

  const hasMovieStream = Boolean(movieEpisodeDoc?.server1?.url || movieEpisodeDoc?.server2?.url);

  // Fetch Added Anime on Website for Row 2 (Stream-Ready library)
  const { data: addedAnimeMap } = useQuery({
    queryKey: ["added-anime-map"],
    queryFn: () => fetchAddedAnimeMap(),
    staleTime: 1000 * 60 * 5,
  });

  const streamReadyItems = useMemo<CardItem[]>(() => {
    if (!addedAnimeMap || addedAnimeMap.size === 0) {
      return getStoredAddedAnime()
        .filter((d) => d.animeId !== id)
        .map((d) => ({
          id: d.animeId,
          title: d.title,
          originalTitle: d.originalTitle,
          poster: d.poster,
          backdrop: d.backdrop,
          rating: d.rating ?? 8.0,
          voteCount: d.voteCount ?? 0,
          year: d.year || "",
          type: d.type || "movie",
          genres: d.genres || [],
          overview: d.overview || "",
        }));
    }

    const list: CardItem[] = [];
    addedAnimeMap.forEach((d, animeIdKey) => {
      if (animeIdKey !== id) {
        list.push({
          id: d.animeId,
          title: d.title,
          originalTitle: d.originalTitle,
          poster: d.poster,
          backdrop: d.backdrop,
          rating: d.rating ?? 8.0,
          voteCount: d.voteCount ?? 0,
          year: d.year || "",
          type: d.type || "movie",
          genres: d.genres || [],
          overview: d.overview || "",
        });
      }
    });
    return list;
  }, [addedAnimeMap, id]);

  // Anime.js stagger animation when episodes load
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
          text: `Watch ${data.title} on Anime Hub India`,
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
    if (isMovie) {
      if (hasMovieStream) {
        void router.navigate({
          to: "/anime/$id/watch",
          params: { id: String(data.id) },
          search: { season: 1, episode: 1 },
        });
      } else {
        setComingSoonEpisode(1);
      }
    } else {
      if (visibleEpisodes.length > 0) {
        handleEpisodeClick(visibleEpisodes[0].episodeNumber);
      } else {
        setComingSoonEpisode(1);
      }
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
              {(isMovie ? hasMovieStream : visibleEpisodes.length > 0) ? (
                <button
                  type="button"
                  onClick={handleWatchNow}
                  className="flex items-center gap-2 rounded-full bg-[#6366f1] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#6366f1]/30 transition-all hover:bg-[#4f46e5] active:scale-95 cursor-pointer"
                >
                  <IconPlay width={15} height={15} /> {isMovie ? "Watch Movie" : "Watch Now"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setComingSoonEpisode(1)}
                  className="flex items-center gap-2 rounded-full bg-white/[0.08] border border-white/15 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#94a3b8] hover:text-white hover:bg-white/15 transition-all active:scale-95 cursor-pointer"
                >
                  <IconClock width={15} height={15} /> Coming Soon
                </button>
              )}
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
            <Info label="Format" value={isMovie ? "Full Anime Movie" : "TV Anime Series"} />
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

      {/* Movie Mode Direct Stream Backdrop Banner Card */}
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
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center text-[#818cf8] shadow-lg shadow-[#6366f1]/20">
                  <IconPlay width={20} height={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {data.title}
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    {data.runtime ? `${data.runtime} min · Anime Movie` : "Feature Film"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                {hasMovieStream ? (
                  <button
                    type="button"
                    onClick={handleWatchNow}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#4f46e5] transition shadow-lg shadow-[#6366f1]/30 cursor-pointer active:scale-95"
                  >
                    <IconPlay width={14} height={14} /> Start Movie
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setComingSoonEpisode(1)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white/[0.08] border border-white/15 px-5 py-2.5 text-xs sm:text-sm font-bold text-[#94a3b8] hover:text-white hover:bg-white/15 transition cursor-pointer active:scale-95"
                  >
                    <IconClock width={14} height={14} /> Coming Soon
                  </button>
                )}

                {isAdmin && (
                  <Link
                    to="/data/admin"
                    search={{ animeId: id, season: 1, episode: 1 }}
                    className="rounded-xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition whitespace-nowrap"
                  >
                    Admin Link
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* TV Series Seasons & Episodes */
        availableSeasons.length > 0 &&
        activeSeason !== null && (
          <section className="mx-auto mt-8 max-w-[1600px] px-4 md:px-8">
            <div className="rounded-2xl bg-[#0D111C]/80 border border-white/[0.08] backdrop-blur-xl p-4 sm:p-6 space-y-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">Live Episodes</h2>
                  <p className="text-[11px] text-[#94a3b8]">
                    Select an episode to watch on high-speed servers.
                  </p>
                </div>

                {availableSeasons.length > 1 && (
                  <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
                    {availableSeasons.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSeasonNumber(s.seasonNumber)}
                        className={cn(
                          "rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95",
                          s.seasonNumber === activeSeason
                            ? "bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/30"
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
                    <p>Stream links for this season are being prepared.</p>
                    {isAdmin && (
                      <Link
                        to="/data/admin"
                        search={{ animeId: id, season: Number(activeSeason) || 1 }}
                        className="inline-block rounded-xl bg-[#6366f1] px-4 py-2 text-xs font-bold text-white hover:bg-[#4f46e5]"
                      >
                        Add Links in Admin Panel →
                      </Link>
                    )}
                  </div>
                ) : (
                  <div
                    ref={epGridRef}
                    className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {visibleEpisodes.map((ep) => {
                      const epId = getEpisodeId(data.id, activeSeason as number, ep.episodeNumber);
                      const epDoc = seasonFirebaseMap?.get(epId);
                      const hasStream = Boolean(epDoc?.server1?.url || epDoc?.server2?.url);

                      return (
                        <button
                          key={ep.id}
                          type="button"
                          onClick={() => handleEpisodeClick(ep.episodeNumber)}
                          className="ep-card group flex w-full min-w-0 max-w-full items-start gap-2.5 rounded-2xl bg-[#111622]/70 border border-white/[0.06] p-2.5 text-left transition-all duration-250 hover:border-[#818cf8]/40 hover:bg-[#151b2a] cursor-pointer active:scale-[0.98] backdrop-blur-md overflow-hidden hover:shadow-[0_8px_20px_rgba(99,102,241,0.15)]"
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
                              <p className="truncate text-xs font-bold text-[#f1f5f9] group-hover:text-[#818cf8] transition break-words">
                                {ep.name || `Episode ${ep.episodeNumber}`}
                              </p>
                              <p className="line-clamp-2 mt-0.5 text-[10px] text-[#94a3b8] break-words leading-tight">
                                {ep.overview || "No synopsis available."}
                              </p>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] min-w-0 pt-0.5">
                              {hasStream ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                                  Live Stream
                                </span>
                              ) : (
                                <span className="text-neutral-500 font-medium shrink-0">
                                  No Stream
                                </span>
                              )}
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

      {/* Dual Row Recommendations: Line 1 Coming Soon & Recommendations, Line 2 Stream-Ready Available Titles */}
      <div className="mx-auto mt-8 max-w-[1600px] space-y-6">
        {data.recommendations && data.recommendations.length > 0 && (
          <Row
            title={isMovie ? "Coming Soon & Related Movies" : "Coming Soon & Recommendations"}
            items={data.recommendations}
          />
        )}

        {streamReadyItems.length > 0 && <Row title="Available Now" items={streamReadyItems} />}
      </div>

      {/* Coming Soon Modal */}
      {comingSoonEpisode !== null && (
        <ComingSoonModal
          isOpen={comingSoonEpisode !== null}
          onClose={() => setComingSoonEpisode(null)}
          animeTitle={data.title}
          animeId={data.id}
          seasonNumber={isMovie ? 1 : Number(activeSeason) || 1}
          episodeNumber={isMovie ? 1 : comingSoonEpisode}
          posterPath={data.poster}
          backdropPath={data.backdrop}
          isAdmin={isAdmin}
          isMovie={isMovie}
        />
      )}
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
    <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="shimmer h-20 rounded-2xl bg-white/[0.04]" />
      ))}
    </div>
  );
}
