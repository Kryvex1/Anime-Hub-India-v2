import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Film,
  Clock,
  BellRing,
  CheckCircle2,
  ShieldAlert,
  Flame,
  Frown,
} from "lucide-react";
import { fetchShow, fetchSeason } from "@/lib/anime.functions";
import {
  getEpisodeId,
  fetchEpisodeConfig,
  fetchSeasonEpisodesConfig,
} from "@/lib/episodes.firebase";
import { checkAdminSession } from "@/lib/admin-auth";
import { cleanStreamUrl } from "@/lib/stream-utils";
import { Img, img } from "./media";
import { ComingSoonModal } from "./coming-soon-modal";
import {
  IconBack,
  IconPlay,
  IconChevronLeft,
  IconChevronRight,
  IconRotateCw,
  IconAlert,
  IconStar,
  IconClock,
  IconCalendar,
  IconClose,
  IconSparkles,
} from "./icons";

interface AnimePlayerProps {
  animeId: number;
  initialSeasonNumber?: number;
  initialEpisodeNumber?: number;
}

const LOCAL_STORAGE_SERVER_KEY = "animehub_preferred_server";

const LOADER_STEPS = [
  { text: "Connecting to stream server..." },
  { text: "Loading video buffer..." },
  { text: "Starting HD playback..." },
];

export function AnimePlayer({
  animeId,
  initialSeasonNumber = 1,
  initialEpisodeNumber = 1,
}: AnimePlayerProps) {
  const navigate = useNavigate();
  const playerWrapperRef = useRef<HTMLDivElement | null>(null);

  const safeInitialSeason = Math.max(1, Number(initialSeasonNumber) || 1);
  const safeInitialEpisode = Math.max(1, Number(initialEpisodeNumber) || 1);

  const [currentSeasonNum, setCurrentSeasonNum] = useState<number>(safeInitialSeason);
  const [currentEpisodeNum, setCurrentEpisodeNum] = useState<number>(safeInitialEpisode);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requestedPriority, setRequestedPriority] = useState(false);

  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [preferredServer, setPreferredServer] = useState<1 | 2>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SERVER_KEY);
      return saved === "2" ? 2 : 1;
    } catch {
      return 1;
    }
  });

  const [loaderVisible, setLoaderVisible] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);

  // Check admin state
  useEffect(() => {
    setIsAdmin(checkAdminSession());
  }, []);

  // Sync state if initial props change
  useEffect(() => {
    if (initialSeasonNumber && initialSeasonNumber > 0) {
      setCurrentSeasonNum(initialSeasonNumber);
    }
    if (initialEpisodeNumber && initialEpisodeNumber > 0) {
      setCurrentEpisodeNum(initialEpisodeNumber);
    }
  }, [initialSeasonNumber, initialEpisodeNumber]);

  // Fetch Anime details with high staleTime and aggressive cache
  const { data: anime } = useQuery({
    queryKey: ["show", animeId],
    queryFn: () => fetchShow({ data: { id: animeId } }),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  // Fetch Season details
  const { data: seasonData, isPending: seasonPending } = useQuery({
    queryKey: ["season", animeId, currentSeasonNum],
    queryFn: () => fetchSeason({ data: { id: animeId, seasonNumber: currentSeasonNum } }),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  // Fetch Season Firebase Configs
  const { data: seasonFirebaseMap } = useQuery({
    queryKey: ["season-firebase", animeId, currentSeasonNum],
    queryFn: () => fetchSeasonEpisodesConfig(animeId, currentSeasonNum),
    staleTime: 1000 * 60 * 2,
  });

  // Current Episode Metadata
  const currentEpisode =
    seasonData?.episodes.find((e) => e.episodeNumber === currentEpisodeNum) ||
    seasonData?.episodes[0];

  const episodeId = getEpisodeId(animeId, currentSeasonNum, currentEpisodeNum);

  // Fetch Active Episode Firebase Config
  const { data: episodeConfig, isPending: configPending } = useQuery({
    queryKey: ["episode-config", episodeId],
    queryFn: () => fetchEpisodeConfig(episodeId),
    staleTime: 1000 * 60 * 1,
  });

  // Check admin configured stream URLs
  const configuredS1 = cleanStreamUrl(episodeConfig?.server1?.url || "");
  const configuredS2 = cleanStreamUrl(episodeConfig?.server2?.url || "");
  const s1Available = Boolean(configuredS1);
  const s2Available = Boolean(configuredS2);
  const totalServersAvailable = (s1Available ? 1 : 0) + (s2Available ? 1 : 0);

  // Intelligent active server determination:
  // If only Server 1 is available -> Active is 1
  // If only Server 2 is available -> Active is 2
  // If both available -> Respect user's preferred server
  let effectiveServer: 1 | 2 = 1;
  if (s1Available && !s2Available) {
    effectiveServer = 1;
  } else if (!s1Available && s2Available) {
    effectiveServer = 2;
  } else if (s1Available && s2Available) {
    effectiveServer = preferredServer;
  } else {
    effectiveServer = 1;
  }

  // Active Stream URL
  const currentStreamUrl = effectiveServer === 1 ? configuredS1 : configuredS2;
  const isStreamAvailable = Boolean(currentStreamUrl);

  // Step Animation Interval & Auto Loader
  useEffect(() => {
    if (!isStreamAvailable) {
      setLoaderVisible(false);
      return;
    }

    setLoaderVisible(true);
    setStepIndex(0);

    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADER_STEPS.length);
    }, 1800);

    const timeout = setTimeout(() => {
      setLoaderVisible(false);
    }, 12000);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(timeout);
    };
  }, [currentStreamUrl, effectiveServer, iframeKey, isStreamAvailable]);

  // Handle iframe load - completely fade out loader
  const handleIframeLoad = () => {
    setTimeout(() => {
      setLoaderVisible(false);
    }, 600);
  };

  // Handle server switch
  const handleSwitchServer = (serverNum: 1 | 2) => {
    if (serverNum === preferredServer) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_SERVER_KEY, String(serverNum));
    } catch {
      /* ignore */
    }
    setPreferredServer(serverNum);
    setIframeKey((k) => k + 1);
  };

  // Reload current stream
  const handleReloadStream = () => {
    setIframeKey((k) => k + 1);
  };

  // Toggle container native fullscreen
  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (playerWrapperRef.current?.requestFullscreen) {
          await playerWrapperRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  // Episode switcher
  const handleSwitchEpisode = useCallback(
    (seasonNum: number, epNum: number) => {
      const sNum = Math.max(1, Number(seasonNum) || 1);
      const eNum = Math.max(1, Number(epNum) || 1);

      setCurrentSeasonNum(sNum);
      setCurrentEpisodeNum(eNum);
      setIframeKey((k) => k + 1);

      void navigate({
        to: "/anime/$id/watch",
        params: { id: String(animeId) },
        search: { season: sNum, episode: eNum },
      });
    },
    [animeId, navigate],
  );

  // Previous & Next navigation
  const currentIndex =
    seasonData?.episodes.findIndex((e) => e.episodeNumber === currentEpisodeNum) ?? -1;

  const prevEpisode = currentIndex > 0 ? seasonData?.episodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex >= 0 && seasonData?.episodes && currentIndex < seasonData.episodes.length - 1
      ? seasonData.episodes[currentIndex + 1]
      : null;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && prevEpisode) {
        handleSwitchEpisode(currentSeasonNum, prevEpisode.episodeNumber);
      } else if (e.key === "ArrowRight" && nextEpisode) {
        handleSwitchEpisode(currentSeasonNum, nextEpisode.episodeNumber);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevEpisode, nextEpisode, currentSeasonNum, handleSwitchEpisode]);

  const seasons = (anime?.seasons ?? []).filter(
    (s) => s.seasonNumber > 0 && s.episodeCount > 0 && !s.name?.toLowerCase().includes("special"),
  );

  return (
    <div className="bg-[#070A12] text-[#f1f5f9] pt-3 sm:pt-6 pb-12">
      <div className="mx-auto max-w-[1140px] px-3 sm:px-6 space-y-4">
        {/* 1. EPISODE HEADER (Clean & Non-overlapping) */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              to="/anime/$id"
              params={{ id: String(animeId) }}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-[#94a3b8] transition hover:bg-white/15 hover:text-white active:scale-95 shadow-sm"
              title="Back to anime details"
            >
              <IconBack width={16} height={16} />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#818cf8] truncate">
                  {anime?.title || "Anime"}
                </span>
                <span className="text-white/20 text-[10px] hidden sm:inline">•</span>
                <span className="text-[11px] text-[#94a3b8] font-medium hidden sm:inline">
                  Season {currentSeasonNum} · Episode {currentEpisodeNum}
                </span>
              </div>
              <h1 className="text-xs sm:text-base font-bold text-white truncate">
                {currentEpisode?.name || `Episode ${currentEpisodeNum}`}
              </h1>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="rounded-lg bg-[#6366f1]/15 border border-[#6366f1]/30 px-2.5 py-1 text-[11px] font-bold text-[#818cf8]">
              S{currentSeasonNum} : E{currentEpisodeNum}
            </span>
          </div>
        </div>

        {/* 2. CINEMATIC PLAYER CONTAINER WITH AMBIENT GLOW */}
        <div className="relative group">
          {/* Ambient Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#6366f1]/20 via-[#a855f7]/15 to-[#6366f1]/20 rounded-3xl blur-xl opacity-60 transition duration-500 pointer-events-none" />

          <div
            ref={playerWrapperRef}
            className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/10"
          >
            {configPending ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070A12] gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
                <p className="text-xs text-[#94a3b8]">Initializing player stream...</p>
              </div>
            ) : isStreamAvailable ? (
              <>
                {/* Animated Blur Loader Overlay */}
                <div
                  onClick={() => setLoaderVisible(false)}
                  className={`absolute inset-0 bg-[#070A12]/92 backdrop-blur-md flex flex-col justify-center items-center gap-3.5 z-10 cursor-pointer transition-all duration-400 ${
                    loaderVisible
                      ? "opacity-100 visible"
                      : "opacity-0 invisible pointer-events-none"
                  }`}
                >
                  <div className="relative w-12 h-12 flex items-center justify-center bg-[#6366f1]/20 border border-[#6366f1]/40 rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.3)] animate-pulse">
                    <svg
                      className="h-6 w-6 stroke-[#818cf8] fill-none stroke-[2]"
                      viewBox="0 0 24 24"
                    >
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </div>

                  <div className="h-5 text-center">
                    <span className="text-[#f1f5f9] text-xs sm:text-sm font-semibold tracking-tight">
                      {LOADER_STEPS[stepIndex]?.text}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.05] border border-white/10 rounded-full text-[#94a3b8] text-[11px]">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_6px_#34d399]" />
                    Fast Buffer Active
                  </div>
                </div>

                {/* Iframe Stream */}
                <iframe
                  key={`${effectiveServer}_${currentStreamUrl}_${iframeKey}`}
                  id="videoIframe"
                  src={currentStreamUrl}
                  onLoad={handleIframeLoad}
                  referrerPolicy="no-referrer"
                  scrolling="no"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  className="w-full h-full border-0 block bg-black"
                />
              </>
            ) : (
              /* Ultra-Clean Stream Unavailable Screen with Red Sad Face Emblem */
              <div className="absolute inset-0 bg-[#070a14] flex flex-col justify-center items-center text-center p-4 sm:p-6 gap-3 z-20 overflow-hidden">
                {/* Background episode/anime backdrop with smooth dark gradient fade */}
                {(currentEpisode?.still || anime?.backdrop || anime?.poster) && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <img
                      src={
                        img(currentEpisode?.still || anime?.backdrop || anime?.poster, "w1280") ||
                        ""
                      }
                      alt=""
                      className="w-full h-full object-cover object-center filter brightness-[0.22] blur-sm scale-105 opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070a14] via-[#070a14]/85 to-[#070a14]/95" />
                  </div>
                )}

                {/* Red Sad Face Emblem */}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/20 backdrop-blur-md">
                  <Frown className="w-6 h-6 animate-pulse" />
                </div>

                <div className="max-w-xs space-y-1 relative z-10">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 text-[10px] font-bold text-rose-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    <span>
                      S{currentSeasonNum} · EP{currentEpisodeNum}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Stream Unavailable
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto">
                    This episode has no active stream link configured yet.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 relative z-10">
                  {/* Clean Info / Popup Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setShowComingSoonModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white transition-all duration-200 active:scale-95 cursor-pointer shadow-md"
                    style={{
                      background: "var(--brand-gradient, var(--brand-primary))",
                      boxShadow: "0 0 16px rgba(var(--brand-rgb), 0.35)",
                    }}
                  >
                    <span>Episode Info & Status</span>
                  </button>

                  {isAdmin && (
                    <Link
                      to="/data/admin"
                      search={{
                        animeId,
                        season: currentSeasonNum,
                        episode: currentEpisodeNum,
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition shadow-sm active:scale-95"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. STREAM STATUS & CONTROLS BAR (Sleek, No Overlap) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-[#0D111C]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl sm:rounded-2xl shadow-sm">
          {/* Server status / switch */}
          <div className="flex items-center gap-2 min-w-0">
            {totalServersAvailable === 2 ? (
              // If 2 servers configured: Show sleek multi-server switcher
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSwitchServer(1)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${
                    effectiveServer === 1
                      ? "bg-[#6366f1] text-white shadow-sm shadow-[#6366f1]/40"
                      : "bg-white/[0.05] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Server 1 (HD)
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchServer(2)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${
                    effectiveServer === 2
                      ? "bg-[#6366f1] text-white shadow-sm shadow-[#6366f1]/40"
                      : "bg-white/[0.05] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Server 2 (Backup)
                </button>
              </div>
            ) : totalServersAvailable === 1 ? (
              // If only 1 server configured: Clean single status badge without confusing secondary buttons
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span>HD Stream Ready</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-[#94a3b8] text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                <span>No Server Configured</span>
              </div>
            )}
          </div>

          {/* Controls: Reload, Fullscreen, Admin Quick Edit */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <Link
                to="/data/admin"
                search={{
                  animeId,
                  season: currentSeasonNum,
                  episode: currentEpisodeNum,
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition active:scale-95"
                title="Edit this episode link in Admin"
              >
                <IconSparkles width={13} height={13} />
                <span className="hidden sm:inline">Admin Edit</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleReloadStream}
              className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/[0.08] transition cursor-pointer active:scale-90"
              title="Reload Stream"
            >
              <IconRotateCw width={15} height={15} />
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/[0.08] transition cursor-pointer active:scale-90"
              title="Fullscreen"
            >
              <svg className="h-4 w-4 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          </div>
        </div>

        {/* 4. PREV / NEXT NAVIGATION */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#0D111C]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl sm:rounded-2xl">
          <button
            onClick={() =>
              prevEpisode && handleSwitchEpisode(currentSeasonNum, prevEpisode.episodeNumber)
            }
            disabled={!prevEpisode}
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 sm:px-4 py-2 text-xs font-bold text-[#94a3b8] transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95"
          >
            <IconChevronLeft width={14} height={14} />
            <span>Previous Ep</span>
          </button>

          <div className="text-center truncate px-2 min-w-0">
            <span className="text-xs font-bold text-white truncate block">
              S{String(currentSeasonNum).padStart(2, "0")} · E
              {String(currentEpisodeNum).padStart(2, "0")}
            </span>
          </div>

          <button
            onClick={() =>
              nextEpisode && handleSwitchEpisode(currentSeasonNum, nextEpisode.episodeNumber)
            }
            disabled={!nextEpisode}
            className="flex items-center gap-1.5 rounded-xl bg-[#6366f1] px-3.5 sm:px-4 py-2 text-xs font-bold text-white transition hover:bg-[#4f46e5] disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-md shadow-[#6366f1]/30 active:scale-95"
          >
            <span>Next Ep</span>
            <IconChevronRight width={14} height={14} />
          </button>
        </div>

        {/* 5. EPISODE INFO & SYNOPSIS */}
        <div className="bg-[#0D111C]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#6366f1]/20 px-2 py-0.5 text-[10px] font-black text-[#818cf8] border border-[#6366f1]/30">
                S{currentSeasonNum} E{currentEpisodeNum}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {currentEpisode?.name || `Episode ${currentEpisodeNum}`}
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
              {currentEpisode?.runtime ? (
                <span className="flex items-center gap-1">
                  <IconClock width={13} height={13} />
                  {currentEpisode.runtime}m
                </span>
              ) : null}

              {currentEpisode?.airDate ? (
                <span className="flex items-center gap-1">
                  <IconCalendar width={13} height={13} />
                  {currentEpisode.airDate}
                </span>
              ) : null}

              {anime?.voteAverage ? (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <IconStar width={13} height={13} />
                  {anime.voteAverage.toFixed(1)}
                </span>
              ) : null}
            </div>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-[#94a3b8]">
            {currentEpisode?.overview ||
              anime?.overview ||
              "No synopsis available for this episode."}
          </p>
        </div>

        {/* 6. EPISODES & SEASONS SELECTOR GRID */}
        <div className="bg-[#0D111C]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-white">Episodes & Seasons</h3>
              <p className="text-[11px] text-[#94a3b8]">
                Select any episode to start streaming immediately.
              </p>
            </div>

            {/* Season Selector Tabs */}
            {seasons.length > 1 && (
              <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
                {seasons.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentSeasonNum(s.seasonNumber);
                      setCurrentEpisodeNum(1);
                      void navigate({
                        to: "/anime/$id/watch",
                        params: { id: String(animeId) },
                        search: { season: s.seasonNumber, episode: 1 },
                      });
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                      s.seasonNumber === currentSeasonNum
                        ? "bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/30"
                        : "bg-white/[0.05] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episode Cards Grid */}
          {seasonPending ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {seasonData?.episodes.map((ep) => {
                const isCurrent = ep.episodeNumber === currentEpisodeNum;
                const epId = getEpisodeId(animeId, currentSeasonNum, ep.episodeNumber);
                const epFbConfig = seasonFirebaseMap?.get(epId);
                const hasS1 = Boolean(epFbConfig?.server1?.url?.trim());
                const hasS2 = Boolean(epFbConfig?.server2?.url?.trim());
                const hasAny = hasS1 || hasS2;

                return (
                  <button
                    key={ep.id}
                    onClick={() => handleSwitchEpisode(currentSeasonNum, ep.episodeNumber)}
                    className={`group flex w-full min-w-0 max-w-full items-start gap-2.5 overflow-hidden rounded-xl p-2 text-left transition-all duration-200 bg-[#111622]/70 backdrop-blur-md border cursor-pointer active:scale-[0.98] ${
                      isCurrent
                        ? "border-[#818cf8] bg-[#6366f1]/15 ring-1 ring-[#818cf8]/50"
                        : "border-white/[0.06] hover:border-white/15 hover:bg-[#151b2a]"
                    }`}
                  >
                    <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-lg bg-black/60">
                      <Img
                        src={img(ep.still || anime?.poster, "w300")}
                        alt={ep.name}
                        className="h-full w-full object-cover"
                        rounded="rounded-lg"
                      />
                      <div className="absolute top-1 left-1 rounded bg-black/70 px-1 py-0.2 text-[9px] font-bold text-white">
                        EP {ep.episodeNumber}
                      </div>
                      {isCurrent && (
                        <div className="absolute inset-0 grid place-items-center bg-black/60">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/50">
                            <IconPlay width={12} height={12} />
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col justify-between h-full py-0.5 overflow-hidden">
                      <div className="min-w-0 overflow-hidden">
                        <p className="truncate text-xs font-bold text-[#f1f5f9] group-hover:text-[#818cf8] transition break-words">
                          {ep.name || `Episode ${ep.episodeNumber}`}
                        </p>
                        <p className="line-clamp-2 mt-0.5 text-[10px] text-[#94a3b8] break-words leading-tight">
                          {ep.overview || "No synopsis available."}
                        </p>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] min-w-0 pt-0.5">
                        {hasAny ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
                            Stream Ready
                          </span>
                        ) : (
                          <span className="text-neutral-500 font-medium shrink-0">Available</span>
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
          )}
        </div>
      </div>

      {/* Episode Status & Request Modal */}
      {showComingSoonModal && (
        <ComingSoonModal
          isOpen={showComingSoonModal}
          onClose={() => setShowComingSoonModal(false)}
          animeTitle={anime?.title || "Anime"}
          animeId={animeId}
          seasonNumber={currentSeasonNum}
          episodeNumber={currentEpisodeNum}
          episodeTitle={currentEpisode?.name}
          posterPath={anime?.poster}
          backdropPath={currentEpisode?.still || anime?.backdrop}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
