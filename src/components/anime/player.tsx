import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Film,
  Clock,
  CheckCircle2,
  Frown,
  Bookmark,
  Share2,
  Maximize2,
  RotateCw,
} from "lucide-react";
import { fetchShow, fetchSeason } from "@/lib/anime.functions";
import {
  getEpisodeId,
  fetchEpisodeConfig,
  fetchSeasonEpisodesConfig,
  fetchAnimeConfiguredEpisodes,
  fetchAddedAnimeMap,
  getStoredAddedAnime,
  type AddedAnimeDoc,
} from "@/lib/episodes.firebase";
import { checkAdminSession } from "@/lib/admin-auth";
import { cleanStreamUrl } from "@/lib/stream-utils";
import { useWatchlist } from "@/lib/watchlist";
import { recordWatchHistory } from "@/lib/watch-history";
import { cn } from "@/lib/utils";
import { Img, img } from "./media";
import { ComingSoonModal } from "./coming-soon-modal";
import { animateCardStagger } from "@/lib/anime-animation";
import { Row } from "./row";
import {
  IconBack,
  IconPlay,
  IconChevronLeft,
  IconChevronRight,
  IconStar,
  IconClock,
  IconCalendar,
} from "./icons";
import type { CardItem } from "@/lib/tmdb";

interface AnimePlayerProps {
  animeId: number;
  initialSeasonNumber?: number;
  initialEpisodeNumber?: number;
}

const LOCAL_STORAGE_SERVER_KEY = "animehub_preferred_server";

const LOADER_STEPS = [
  { text: "Connecting to secure stream..." },
  { text: "Optimizing video buffer..." },
  { text: "Playing HD quality..." },
];

// Helper to lock mobile orientation to landscape
async function lockLandscapeOrientation() {
  try {
    const s = screen as unknown as {
      orientation?: { lock?: (o: string) => Promise<void> };
      lockOrientation?: (o: string) => boolean;
      mozLockOrientation?: (o: string) => boolean;
      msLockOrientation?: (o: string) => boolean;
    };

    if (s.orientation?.lock) {
      try {
        await s.orientation.lock("landscape");
      } catch {
        try {
          await s.orientation.lock("landscape-primary");
        } catch {
          /* Fallback ignored */
        }
      }
    } else if (s.lockOrientation) {
      s.lockOrientation("landscape");
    } else if (s.mozLockOrientation) {
      s.mozLockOrientation("landscape");
    } else if (s.msLockOrientation) {
      s.msLockOrientation("landscape");
    }
  } catch {
    /* Ignore if restricted by browser or device */
  }
}

// Helper to unlock orientation when exiting fullscreen
function unlockScreenOrientation() {
  try {
    const s = screen as unknown as {
      orientation?: { unlock?: () => void };
      unlockOrientation?: () => boolean;
      mozUnlockOrientation?: () => boolean;
      msUnlockOrientation?: () => boolean;
    };

    if (s.orientation?.unlock) {
      s.orientation.unlock();
    } else if (s.unlockOrientation) {
      s.unlockOrientation();
    } else if (s.mozUnlockOrientation) {
      s.mozUnlockOrientation();
    } else if (s.msUnlockOrientation) {
      s.msUnlockOrientation();
    }
  } catch {
    /* Ignore */
  }
}

export function AnimePlayer({
  animeId,
  initialSeasonNumber = 1,
  initialEpisodeNumber = 1,
}: AnimePlayerProps) {
  const navigate = useNavigate();
  const playerWrapperRef = useRef<HTMLDivElement | null>(null);
  const epGridRef = useRef<HTMLDivElement | null>(null);
  const { has, toggle, ready } = useWatchlist();

  const safeInitialSeason = Math.max(1, Number(initialSeasonNumber) || 1);
  const safeInitialEpisode = Math.max(1, Number(initialEpisodeNumber) || 1);

  const [currentSeasonNum, setCurrentSeasonNum] = useState<number>(safeInitialSeason);
  const [currentEpisodeNum, setCurrentEpisodeNum] = useState<number>(safeInitialEpisode);
  const [isAdmin, setIsAdmin] = useState(false);

  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [copied, setCopied] = useState(false);
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Fetch Anime details
  const { data: anime } = useQuery({
    queryKey: ["show", animeId],
    queryFn: () => fetchShow({ data: { id: animeId } }),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  // Determine if this title is a Movie vs TV Series
  const isMovie = useMemo(() => {
    if (!anime) return false;
    if (anime.isMovie || anime.type === "movie") return true;
    if (anime.numberOfEpisodes === 1 && (!anime.seasons || anime.seasons.length <= 1)) {
      return true;
    }
    if (anime.seasons?.length === 1 && anime.seasons[0]?.name?.toLowerCase().includes("movie")) {
      return true;
    }
    return false;
  }, [anime]);

  // Fetch Anime Configured Episodes to know live seasons
  const { data: animeConfiguredEpisodes } = useQuery({
    queryKey: ["anime-configured-episodes", animeId],
    queryFn: () => fetchAnimeConfiguredEpisodes(animeId),
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
  const allSeasons = (anime?.seasons ?? []).filter(
    (s) => s.seasonNumber > 0 && s.episodeCount > 0 && !s.name?.toLowerCase().includes("special"),
  );

  const availableSeasons = useMemo(() => {
    const filtered = allSeasons.filter((s) => configuredSeasonNumbers.has(s.seasonNumber));
    return filtered.length > 0 ? filtered : allSeasons.slice(0, 1);
  }, [allSeasons, configuredSeasonNumbers]);

  // Fetch Season details (for TV series)
  const { data: seasonData, isPending: seasonPending } = useQuery({
    queryKey: ["season", animeId, currentSeasonNum],
    queryFn: () => fetchSeason({ data: { id: animeId, seasonNumber: currentSeasonNum } }),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    enabled: !isMovie,
  });

  // Fetch Season Firebase Configs
  const { data: seasonFirebaseMap } = useQuery({
    queryKey: ["season-firebase", animeId, currentSeasonNum],
    queryFn: () => fetchSeasonEpisodesConfig(animeId, currentSeasonNum),
    staleTime: 1000 * 60 * 2,
  });

  // Filtered episodes: ONLY show live episodes in the grid (for TV shows)
  const visibleEpisodes = useMemo(() => {
    if (isMovie) return [];
    const rawEpisodes = seasonData?.episodes ?? [];
    const filtered = rawEpisodes.filter((ep) => {
      const epId = getEpisodeId(animeId, currentSeasonNum, ep.episodeNumber);
      const epDoc = seasonFirebaseMap?.get(epId);
      return Boolean(epDoc?.server1?.url || epDoc?.server2?.url);
    });

    return filtered;
  }, [seasonData?.episodes, seasonFirebaseMap, animeId, currentSeasonNum, isMovie]);

  // Auto-switch to first available episode if current selected episode has no stream (for TV shows)
  useEffect(() => {
    if (!isMovie && visibleEpisodes.length > 0) {
      const exists = visibleEpisodes.some((e) => e.episodeNumber === currentEpisodeNum);
      if (!exists) {
        const firstLive = visibleEpisodes[0];
        setCurrentEpisodeNum(firstLive.episodeNumber);
        void navigate({
          to: "/anime/$id/watch",
          params: { id: String(animeId) },
          search: { season: currentSeasonNum, episode: firstLive.episodeNumber },
          replace: true,
        });
      }
    }
  }, [visibleEpisodes, currentEpisodeNum, currentSeasonNum, animeId, navigate, isMovie]);

  // Stagger animation for episode selector
  useEffect(() => {
    if (epGridRef.current && visibleEpisodes.length > 0) {
      const cards = epGridRef.current.querySelectorAll<HTMLElement>(".player-ep-card");
      if (cards.length > 0) {
        animateCardStagger(Array.from(cards));
      }
    }
  }, [visibleEpisodes, currentSeasonNum]);

  // Current Episode Metadata
  const currentEpisode = isMovie
    ? null
    : seasonData?.episodes.find((e) => e.episodeNumber === currentEpisodeNum) ||
      seasonData?.episodes[0];

  // For Movie: episodeId is season 1, episode 1
  const effectiveEpisodeNum = isMovie ? 1 : currentEpisodeNum;
  const effectiveSeasonNum = isMovie ? 1 : currentSeasonNum;
  const episodeId = getEpisodeId(animeId, effectiveSeasonNum, effectiveEpisodeNum);

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

  // Auto-record Watch History in Local Storage
  useEffect(() => {
    if (anime && isStreamAvailable) {
      recordWatchHistory({
        animeId,
        animeTitle: anime.title || anime.originalTitle || "Anime",
        season: effectiveSeasonNum,
        episode: effectiveEpisodeNum,
        episodeTitle: currentEpisode?.name || "",
        poster: anime.poster,
        backdrop: anime.backdrop || currentEpisode?.still,
        type: isMovie ? "Movie" : "TV",
      });
    }
  }, [
    anime,
    animeId,
    effectiveSeasonNum,
    effectiveEpisodeNum,
    currentEpisode,
    isMovie,
    isStreamAvailable,
  ]);

  // Fast Stream Loader with instant dismiss
  useEffect(() => {
    if (!isStreamAvailable) {
      setLoaderVisible(false);
      return;
    }

    setLoaderVisible(true);
    setStepIndex(0);

    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADER_STEPS.length);
    }, 600);

    const timeout = setTimeout(() => {
      setLoaderVisible(false);
    }, 1500);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(timeout);
    };
  }, [currentStreamUrl, effectiveServer, iframeKey, isStreamAvailable]);

  // Handle iframe load instantly
  const handleIframeLoad = () => {
    setLoaderVisible(false);
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

  // Auto rotate to landscape when entering fullscreen (and unlock on exit)
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const doc = document as unknown as {
        fullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };

      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement,
      );

      setIsFullscreen(isFs);

      if (isFs) {
        await lockLandscapeOrientation();
      } else {
        unlockScreenOrientation();
      }
    };

    const handleOrientationChange = async () => {
      const doc = document as unknown as {
        fullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };

      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement,
      );

      if (isFs) {
        await lockLandscapeOrientation();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  // Toggle container native fullscreen with landscape orientation lock
  const handleToggleFullscreen = async () => {
    try {
      const doc = document as unknown as {
        fullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
        exitFullscreen?: () => Promise<void>;
        webkitExitFullscreen?: () => Promise<void>;
        mozCancelFullScreen?: () => Promise<void>;
        msExitFullscreen?: () => Promise<void>;
      };

      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement,
      );

      if (!isFs) {
        const target = playerWrapperRef.current as unknown as {
          requestFullscreen?: (options?: { navigationUI?: string }) => Promise<void>;
          webkitRequestFullscreen?: () => Promise<void>;
          mozRequestFullScreen?: () => Promise<void>;
          msRequestFullscreen?: () => Promise<void>;
        } | null;

        if (target) {
          if (target.requestFullscreen) {
            try {
              await target.requestFullscreen({ navigationUI: "hide" });
            } catch {
              await target.requestFullscreen();
            }
          } else if (target.webkitRequestFullscreen) {
            await target.webkitRequestFullscreen();
          } else if (target.mozRequestFullScreen) {
            await target.mozRequestFullScreen();
          } else if (target.msRequestFullscreen) {
            await target.msRequestFullscreen();
          }

          setIsFullscreen(true);

          // Automatically lock to landscape for mobile
          await lockLandscapeOrientation();
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }

        setIsFullscreen(false);
        unlockScreenOrientation();
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  // Share current anime / movie
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: anime?.title || "Watch Anime",
          text: `Watch ${anime?.title} in Full HD on Anime Hub India`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* ignore */
    }
  };

  // Episode switcher (for TV Series)
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

  // Previous & Next navigation among visible/available episodes
  const currentIndex =
    visibleEpisodes.findIndex((e) => e.episodeNumber === currentEpisodeNum) ?? -1;

  const prevEpisode = currentIndex > 0 ? visibleEpisodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex >= 0 && currentIndex < visibleEpisodes.length - 1
      ? visibleEpisodes[currentIndex + 1]
      : null;

  // Fetch Added Anime on Website for Row 2 (Stream-Ready library)
  const { data: addedAnimeMap } = useQuery({
    queryKey: ["added-anime-map"],
    queryFn: () => fetchAddedAnimeMap(),
    staleTime: 1000 * 60 * 5,
  });

  const streamReadyItems = useMemo<CardItem[]>(() => {
    if (!addedAnimeMap || addedAnimeMap.size === 0) {
      return getStoredAddedAnime()
        .filter((d) => d.animeId !== animeId)
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
    addedAnimeMap.forEach((d, id) => {
      if (id !== animeId) {
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
  }, [addedAnimeMap, animeId]);

  // Keyboard navigation for TV series
  useEffect(() => {
    if (isMovie) return;
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
  }, [prevEpisode, nextEpisode, currentSeasonNum, handleSwitchEpisode, isMovie]);

  const isSavedInWatchlist = ready && anime ? has(anime.id) : false;

  return (
    <div className="min-h-screen bg-[#070A12] text-[#f1f5f9] pt-2 pb-20">
      <div className="mx-auto max-w-[1240px] px-3 sm:px-6 md:px-8 space-y-3 sm:space-y-4">
        {/* 1. MINIMALIST STREAM HEADER */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/anime/$id"
              params={{ id: String(animeId) }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10 text-[#94a3b8] transition-all hover:bg-white/15 hover:text-white active:scale-95 shadow-sm"
              title="Back"
            >
              <IconBack width={17} height={17} />
            </Link>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold truncate bg-gradient-to-b from-white via-slate-100 to-[#a855f7] bg-clip-text text-transparent">
                {anime?.title || "Watch"}
              </h1>
              <p className="text-[11px] text-[#94a3b8] truncate">
                {isMovie
                  ? anime?.runtime
                    ? `${anime.runtime} min · Movie`
                    : "Anime Movie"
                  : currentEpisode?.name ||
                    `Season ${currentSeasonNum} · Episode ${currentEpisodeNum}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Link
                to="/data/admin"
                search={{
                  animeId,
                  season: effectiveSeasonNum,
                  episode: effectiveEpisodeNum,
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition active:scale-95"
                title="Admin Link Editor"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            )}
          </div>
        </div>

        {/* 2. FLAT CINEMATIC PLAYER CONTAINER WITH AMBIENT GLOW */}
        <div className="relative group">
          {/* Ambient Glow */}
          {!isFullscreen && (
            <div className="absolute -inset-1 bg-gradient-to-r from-[#6366f1]/20 via-[#a855f7]/15 to-[#6366f1]/20 rounded-3xl blur-2xl opacity-60 transition duration-500 pointer-events-none" />
          )}

          <div
            ref={playerWrapperRef}
            className={cn(
              "relative w-full bg-black overflow-hidden transition-all duration-300",
              isFullscreen
                ? "w-full h-full aspect-auto rounded-none border-0 shadow-none"
                : "aspect-video rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10",
            )}
          >
            {configPending ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070A12] gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
                <p className="text-xs text-[#94a3b8]">Loading stream...</p>
              </div>
            ) : isStreamAvailable ? (
              <>
                {/* Animated Blur Loader Overlay */}
                <div
                  onClick={() => setLoaderVisible(false)}
                  className={`absolute inset-0 bg-[#070A12]/90 backdrop-blur-md flex flex-col justify-center items-center gap-3.5 z-10 cursor-pointer transition-all duration-400 ${
                    loaderVisible
                      ? "opacity-100 visible"
                      : "opacity-0 invisible pointer-events-none"
                  }`}
                >
                  <div className="relative w-12 h-12 flex items-center justify-center bg-[#6366f1]/20 border border-[#6366f1]/40 rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.35)] animate-pulse">
                    <IconPlay width={20} height={20} className="text-[#818cf8]" />
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
              /* Streaming Soon Screen (Clean & Polished) */
              <div className="absolute inset-0 bg-[#070a14] flex flex-col justify-center items-center text-center p-4 sm:p-6 gap-3 z-20 overflow-hidden">
                {(currentEpisode?.still || anime?.backdrop || anime?.poster) && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <img
                      src={
                        img(currentEpisode?.still || anime?.backdrop || anime?.poster, "w1280") ||
                        ""
                      }
                      alt=""
                      className="w-full h-full object-cover object-center filter brightness-[0.2] blur-sm scale-105 opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070a14] via-[#070a14]/85 to-[#070a14]/95" />
                  </div>
                )}

                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6366f1]/20 border border-[#6366f1]/30 text-[#818cf8] shadow-lg shadow-[#6366f1]/20 backdrop-blur-md">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>

                <div className="max-w-xs space-y-1 relative z-10">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Streaming Soon
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {isMovie
                      ? "This movie is currently being added to the library."
                      : "This episode is currently being prepared for streaming."}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 relative z-10">
                  <button
                    type="button"
                    onClick={() => setShowComingSoonModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white transition-all duration-200 active:scale-95 cursor-pointer shadow-md bg-[#6366f1] hover:bg-[#4f46e5]"
                  >
                    <span>Request / Status Info</span>
                  </button>

                  {isAdmin && (
                    <Link
                      to="/data/admin"
                      search={{
                        animeId,
                        season: effectiveSeasonNum,
                        episode: effectiveEpisodeNum,
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition shadow-sm active:scale-95"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Admin Setup</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. MODERN FLAT CONTROL BAR */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-2xl">
          {/* Server Switcher (Reign / Noir / MAIN) */}
          <div className="flex items-center gap-1.5 min-w-0">
            {totalServersAvailable === 2 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSwitchServer(1)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-all duration-200 active:scale-95 ${
                    effectiveServer === 1
                      ? "bg-[#6366f1] text-white shadow-sm shadow-[#6366f1]/40"
                      : "bg-white/[0.05] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Reign
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchServer(2)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-all duration-200 active:scale-95 ${
                    effectiveServer === 2
                      ? "bg-[#6366f1] text-white shadow-sm shadow-[#6366f1]/40"
                      : "bg-white/[0.05] text-[#94a3b8] hover:text-white"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Noir
                </button>
              </div>
            ) : totalServersAvailable === 1 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span>MAIN</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] text-[#94a3b8] text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                <span>MAIN</span>
              </div>
            )}
          </div>

          {/* Quick Actions (Watchlist, Share, Reload, Fullscreen) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {anime && (
              <button
                type="button"
                onClick={() => toggle(anime.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                  isSavedInWatchlist
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-white/[0.05] text-[#94a3b8] hover:text-white hover:bg-white/10"
                }`}
                title="Bookmark"
              >
                <Bookmark
                  width={13}
                  height={13}
                  className={isSavedInWatchlist ? "fill-current" : ""}
                />
                <span className="hidden sm:inline">
                  {isSavedInWatchlist ? "Saved" : "Watchlist"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] text-[#94a3b8] hover:text-white hover:bg-white/10 text-xs font-bold transition active:scale-95 cursor-pointer"
              title="Share"
            >
              <Share2 width={13} height={13} />
              <span>{copied ? "Copied" : "Share"}</span>
            </button>

            <button
              type="button"
              onClick={handleReloadStream}
              className="p-1.5 sm:p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-white/[0.08] transition cursor-pointer active:scale-90"
              title="Reload Stream"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-white/[0.08] transition cursor-pointer active:scale-90"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4. PREV / NEXT BAR (ONLY FOR TV SERIES) */}
        {!isMovie && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <button
              onClick={() =>
                prevEpisode && handleSwitchEpisode(currentSeasonNum, prevEpisode.episodeNumber)
              }
              disabled={!prevEpisode}
              className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-[#94a3b8] transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95"
            >
              <IconChevronLeft width={14} height={14} />
              <span>Prev</span>
            </button>

            <div className="text-center truncate px-2 min-w-0">
              <span className="text-xs font-bold text-white truncate block">
                Episode {currentEpisodeNum} of {visibleEpisodes.length}
              </span>
            </div>

            <button
              onClick={() =>
                nextEpisode && handleSwitchEpisode(currentSeasonNum, nextEpisode.episodeNumber)
              }
              disabled={!nextEpisode}
              className="flex items-center gap-1.5 rounded-xl bg-[#6366f1] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#4f46e5] disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-md shadow-[#6366f1]/30 active:scale-95"
            >
              <span>Next</span>
              <IconChevronRight width={14} height={14} />
            </button>
          </div>
        )}

        {/* 5. SYNOPSIS & METADATA (WITH WHITE-TO-PURPLE GRADIENT TITLE) */}
        <div className="p-4 sm:p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black tracking-tight bg-gradient-to-b from-white via-slate-100 to-[#a855f7] bg-clip-text text-transparent">
                {isMovie
                  ? anime?.title
                  : currentEpisode?.name || `${anime?.title} · Episode ${currentEpisodeNum}`}
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
              {isMovie && anime?.runtime ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {anime.runtime}m
                </span>
              ) : currentEpisode?.runtime ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {currentEpisode.runtime}m
                </span>
              ) : null}

              {anime?.firstAirDate && (
                <span className="flex items-center gap-1">
                  <IconCalendar width={13} height={13} />
                  {anime.firstAirDate.slice(0, 4)}
                </span>
              )}

              {anime?.voteAverage ? (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <IconStar width={13} height={13} />
                  {anime.voteAverage.toFixed(1)}
                </span>
              ) : null}
            </div>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-[#94a3b8]">
            {isMovie
              ? anime?.overview || "No synopsis available."
              : currentEpisode?.overview ||
                anime?.overview ||
                "No synopsis available for this episode."}
          </p>

          {anime?.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {anime.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-lg bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-[#cbd5e1]"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 6. TV SHOW EPISODE GRID (ONLY FOR TV SERIES, NEVER FOR MOVIES) */}
        {!isMovie && (
          <div className="p-4 sm:p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-white">Live Episodes</h3>
                <p className="text-[11px] text-[#94a3b8]">
                  Select an available episode to start streaming.
                </p>
              </div>

              {/* Season Selector Tabs */}
              {availableSeasons.length > 1 && (
                <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
                  {availableSeasons.map((s) => (
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
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${
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
                  <div key={i} className="h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : visibleEpisodes.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#94a3b8] space-y-2">
                <p>No live stream links available for this season yet.</p>
                {isAdmin && (
                  <Link
                    to="/data/admin"
                    search={{ animeId, season: currentSeasonNum }}
                    className="inline-block rounded-xl bg-[#6366f1] px-4 py-2 text-xs font-bold text-white hover:bg-[#4f46e5]"
                  >
                    Add Links in Admin Panel →
                  </Link>
                )}
              </div>
            ) : (
              <div ref={epGridRef} className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleEpisodes.map((ep) => {
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
                      className={`player-ep-card group flex w-full min-w-0 max-w-full items-start gap-2.5 overflow-hidden rounded-2xl p-2.5 text-left transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        isCurrent
                          ? "border border-[#818cf8] bg-[#6366f1]/20 ring-1 ring-[#818cf8]/50 shadow-[0_4px_20px_rgba(99,102,241,0.25)]"
                          : "border border-white/[0.06] bg-[#0c101a]/70 hover:border-white/15 hover:bg-[#151b2a]"
                      }`}
                    >
                      <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-xl bg-black/60">
                        <Img
                          src={img(ep.still || anime?.poster, "w300")}
                          alt={ep.name}
                          className="h-full w-full object-cover"
                          rounded="rounded-xl"
                        />
                        <div className="absolute top-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-black text-white">
                          EP {ep.episodeNumber}
                        </div>
                        {isCurrent && (
                          <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-xs">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/50 animate-pulse">
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
                              HD Ready
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
        )}

        {/* 7. DUAL RECOMMENDATION ROWS (2 LINES AS REQUESTED) */}
        {/* ROW 1: RELATED & COMING SOON ANIME */}
        {anime?.recommendations && anime.recommendations.length > 0 && (
          <div className="pt-2">
            <Row
              title={isMovie ? "Coming Soon & Related Movies" : "Coming Soon & Recommendations"}
              items={anime.recommendations}
            />
          </div>
        )}

        {/* ROW 2: STREAM-READY ADDED TITLES FROM WEBSITE LIBRARY */}
        {streamReadyItems.length > 0 && (
          <div className="pt-1">
            <Row title="Available Now" items={streamReadyItems} />
          </div>
        )}
      </div>

      {/* Coming Soon Modal */}
      {showComingSoonModal && (
        <ComingSoonModal
          isOpen={showComingSoonModal}
          onClose={() => setShowComingSoonModal(false)}
          animeTitle={anime?.title || "Anime Title"}
          animeId={animeId}
          seasonNumber={effectiveSeasonNum}
          episodeNumber={effectiveEpisodeNum}
          posterPath={anime?.poster}
          backdropPath={anime?.backdrop}
          isAdmin={isAdmin}
          isMovie={isMovie}
        />
      )}
    </div>
  );
}
