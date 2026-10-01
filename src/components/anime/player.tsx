import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Bookmark,
  Share2,
  Maximize2,
  RotateCw,
  Tv,
  Film,
  Layers,
  ExternalLink,
  Server,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  X,
  Edit,
  Sparkles,
} from "lucide-react";
import { fetchShow, fetchSeason } from "@/lib/anime.functions";
import { getKnownCard, type ShowDetails } from "@/lib/tmdb";
import { useWatchlist } from "@/lib/watchlist";
import { recordWatchHistory } from "@/lib/watch-history";
import { cn } from "@/lib/utils";
import { Img, img } from "./media";
import { animateCardStagger } from "@/lib/anime-animation";
import { Row } from "./row";
import { CastCrewSection, PersonWorksModal, type SelectedPerson } from "./cast-crew";
import {
  DEFAULT_PLAY_SERVERS,
  ALL_PLAY_SERVERS,
  resolveStreamUrl,
  getNextServer,
  getNextVidukiApi,
  type ServerOption,
} from "@/lib/viduki";
import {
  useAuthUser,
  fetchCustomStream,
  fetchGlobalServerConfig,
  useTvEpisodeCustomLinks,
  hasValidCustomStream,
} from "@/lib/firebase";
import { isDirectMediaUrl, getSafeStreamUrl } from "@/lib/stream-utils";
import { NativeVideoPlayer } from "./native-player";
import { CustomStreamModal } from "./custom-stream-modal";
import { BrandBadge } from "./brand-badge";
import { getAniListIdByTitle } from "@/lib/anilist";
import { getMediaCategory } from "@/lib/routes-helper";
import {
  IconBack,
  IconPlay,
  IconChevronLeft,
  IconChevronRight,
  IconStar,
  IconCalendar,
} from "./icons";

interface AnimePlayerProps {
  animeId: number;
  initialSeasonNumber?: number;
  initialEpisodeNumber?: number;
}

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

  const [copied, setCopied] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(null);
  const [showServerTip, setShowServerTip] = useState(() => {
    try {
      return localStorage.getItem("7shows_hide_server_tip") !== "1";
    } catch {
      return true;
    }
  });

  const handleDismissTip = () => {
    setShowServerTip(false);
    try {
      localStorage.setItem("7shows_hide_server_tip", "1");
    } catch {
      // ignore
    }
  };

  const handleOpenTip = () => {
    setShowServerTip(true);
    try {
      localStorage.removeItem("7shows_hide_server_tip");
    } catch {
      // ignore
    }
  };

  // Sync state if initial props change
  useEffect(() => {
    if (initialSeasonNumber && initialSeasonNumber > 0) {
      setCurrentSeasonNum(initialSeasonNumber);
    }
    if (initialEpisodeNumber && initialEpisodeNumber > 0) {
      setCurrentEpisodeNum(initialEpisodeNumber);
    }
  }, [initialSeasonNumber, initialEpisodeNumber]);

  // Fetch Anime details with card cache placeholder to prevent undefined flashes
  const { data: anime, isPending: animePending } = useQuery({
    queryKey: ["show", animeId],
    queryFn: () => fetchShow({ data: { id: animeId } }),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    placeholderData: () => {
      const c = getKnownCard(animeId);
      if (!c) return undefined;
      return {
        id: c.id,
        title: c.title,
        originalTitle: c.originalTitle,
        overview: c.overview,
        poster: c.poster,
        backdrop: c.backdrop,
        rating: c.rating,
        voteAverage: c.rating,
        voteCount: c.voteCount ?? 0,
        firstAirDate: c.year,
        status: "Released",
        genres: c.genres,
        seasons: [],
        cast: [],
        crew: [],
        recommendations: [],
        trailerUrl: null,
        countries: [],
        companies: [],
        isMovie: c.type === "Movie",
        type: c.type === "Movie" ? "movie" : "tv",
      } as unknown as ShowDetails;
    },
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

  // All valid seasons for TV series (excluding bonus/specials)
  const allSeasons = useMemo(() => {
    return (anime?.seasons ?? []).filter(
      (s) =>
        s.seasonNumber > 0 &&
        !s.name?.toLowerCase().includes("special") &&
        !s.name?.toLowerCase().includes("bonus") &&
        !s.name?.toLowerCase().includes("recap") &&
        !s.name?.toLowerCase().includes("extra"),
    );
  }, [anime?.seasons]);

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

  // Fetch Season details (for TV series)
  const { data: seasonData, isPending: seasonPending } = useQuery({
    queryKey: ["season", animeId, currentSeasonNum],
    queryFn: () => fetchSeason({ data: { id: animeId, seasonNumber: currentSeasonNum } }),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    enabled: !isMovie,
  });

  // Visible episodes for TV shows
  const visibleEpisodes = useMemo(() => {
    if (isMovie) return [];
    return seasonData?.episodes ?? [];
  }, [seasonData?.episodes, isMovie]);

  const [playerEpLimit, setPlayerEpLimit] = useState(32);

  useEffect(() => {
    setPlayerEpLimit(32);
  }, [currentSeasonNum]);

  const renderedPlayerEpisodes = useMemo(() => {
    return visibleEpisodes.slice(0, playerEpLimit);
  }, [visibleEpisodes, playerEpLimit]);

  const isEpCustomLinked = useTvEpisodeCustomLinks(!isMovie ? animeId : null, currentSeasonNum);

  // Initial animation on season change
  useEffect(() => {
    if (epGridRef.current && visibleEpisodes.length > 0) {
      const cards = epGridRef.current.querySelectorAll<HTMLElement>(".player-ep-card");
      if (cards.length > 0) {
        animateCardStagger(Array.from(cards).slice(0, 18));
      }
    }
  }, [currentSeasonNum]);

  // Current Episode Metadata
  const currentEpisode = isMovie
    ? null
    : seasonData?.episodes.find((e) => e.episodeNumber === currentEpisodeNum) ||
      seasonData?.episodes[0];

  const effectiveEpisodeNum = isMovie ? 1 : currentEpisodeNum;
  const effectiveSeasonNum = isMovie ? 1 : currentSeasonNum;

  // Resolve AniList ID for anime titles (Vidy.st anime endpoint)
  const { data: anilistId } = useQuery({
    queryKey: ["anilist", anime?.title],
    queryFn: () => getAniListIdByTitle(anime?.title || ""),
    enabled: Boolean(anime?.title),
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Auth state for admin features
  const { user, isAdmin } = useAuthUser();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch Custom Stream from Firebase Firestore
  const {
    data: customStream,
    isPending: isCustomPending,
    refetch: refetchCustomStream,
  } = useQuery({
    queryKey: ["custom-stream", animeId, effectiveSeasonNum, effectiveEpisodeNum],
    queryFn: () =>
      fetchCustomStream(isMovie ? "movie" : "tv", animeId, effectiveSeasonNum, effectiveEpisodeNum),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch Global Server Config (server names & hidden list) from Firebase
  const { data: globalConfig, isPending: isConfigPending } = useQuery({
    queryKey: ["global-server-config"],
    queryFn: () => fetchGlobalServerConfig(),
    staleTime: 1000 * 60 * 10,
  });

  // Compute Active Servers list dynamically
  const activeServers = useMemo<ServerOption[]>(() => {
    const list: ServerOption[] = [];

    // 1. If multiple custom streams exist from Firebase, add all of them
    if (customStream) {
      if (Array.isArray(customStream.streams) && customStream.streams.length > 0) {
        customStream.streams.forEach((st, idx) => {
          if (st.customUrl && st.customUrl.trim()) {
            list.push({
              id: st.id || `custom-stream-${idx}`,
              provider: "custom",
              name: st.serverName || (idx === 0 ? "VIP Server" : `VIP Server ${idx + 1}`),
              badge: st.badge || (idx === 0 ? "Custom VIP" : `VIP ${idx + 1}`),
              description: "Custom iframe embed configured for this title",
              customUrl: st.customUrl.trim(),
              isSpecial: true,
            });
          }
        });
      } else if (customStream.customUrl && customStream.customUrl.trim()) {
        // Fallback for single custom stream
        list.push({
          id: "custom-stream",
          provider: "custom",
          name: customStream.serverName || "VIP Server",
          badge: customStream.badge || "Custom VIP",
          description: "Custom iframe embed configured for this title",
          customUrl: customStream.customUrl.trim(),
          isSpecial: true,
        });
      }
    }

    // 2. If all default servers are hidden (either globally or for this specific title)
    const isGloballyHidden = Boolean(globalConfig?.allHidden);
    const isPerMediaHidden = Boolean(customStream?.hideDefaultServers);
    if ((isGloballyHidden || isPerMediaHidden) && list.length > 0) {
      return list;
    }

    // 3. Process default servers with custom names and combined global + per-media hidden filters
    const globalHidden = globalConfig?.hiddenServers || [];
    const mediaHidden = customStream?.hiddenServers || [];
    const combinedHiddenSet = new Set([...globalHidden, ...mediaHidden]);

    for (const s of DEFAULT_PLAY_SERVERS) {
      if (!combinedHiddenSet.has(s.id)) {
        const renamed = customStream?.serverNames?.[s.id] || globalConfig?.serverNames?.[s.id];
        const customBadge =
          customStream?.serverBadges?.[s.id] !== undefined
            ? customStream.serverBadges[s.id]
            : globalConfig?.serverBadges?.[s.id];
        list.push({
          ...s,
          name: renamed || s.name,
          badge: customBadge !== undefined ? customBadge : s.badge,
        });
      }
    }

    return list.length > 0 ? list : DEFAULT_PLAY_SERVERS;
  }, [customStream, globalConfig]);

  // Selected Streaming Server (Default to Custom Stream if present, else first active server)
  const [selectedServer, setSelectedServer] = useState<ServerOption>(() => {
    return DEFAULT_PLAY_SERVERS[0];
  });
  const [allServersFailed, setAllServersFailed] = useState<boolean>(false);

  // Sync selected server when activeServers updates or new media loads
  useEffect(() => {
    if (activeServers.length > 0) {
      // If custom stream was just loaded, select it immediately
      if (hasValidCustomStream(customStream)) {
        setSelectedServer(activeServers[0]);
      } else if (!activeServers.some((s) => s.id === selectedServer.id)) {
        setSelectedServer(activeServers[0]);
      }
    }
    setAllServersFailed(false);
  }, [animeId, activeServers, customStream]);

  // Stream URL calculation supporting Custom Embeds, Viduki, Vidy.st, VidLink
  const currentStreamUrl = useMemo(() => {
    const raw = resolveStreamUrl(
      selectedServer,
      isMovie ? "movie" : "tv",
      animeId,
      effectiveSeasonNum,
      effectiveEpisodeNum,
      anilistId,
    );
    return getSafeStreamUrl(raw);
  }, [selectedServer, isMovie, animeId, effectiveSeasonNum, effectiveEpisodeNum, anilistId]);

  // Check if current stream is a direct video link (MP4, MKV, M3U8, WebM)
  const isDirectStream = useMemo(() => {
    return isDirectMediaUrl(currentStreamUrl);
  }, [currentStreamUrl]);

  // Automatic server rotation when a server fails
  const switchToNextServer = useCallback(
    (reason?: string) => {
      // Never switch away from a custom configured stream
      if (selectedServer.provider === "custom") {
        setAllServersFailed(true);
        return;
      }
      const next = getNextServer(selectedServer.id, activeServers);
      if (next && next.id !== selectedServer.id) {
        setSelectedServer(next);
        setIframeKey((k) => k + 1);
      } else {
        setAllServersFailed(true);
      }
    },
    [selectedServer, activeServers],
  );

  // Automatic timeout fallback: Only for IFRAME embeds when multiple servers exist (never for custom streams or direct video)
  useEffect(() => {
    if (isDirectStream || selectedServer.provider === "custom" || activeServers.length <= 1) {
      setLoaderVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      if (loaderVisible && !allServersFailed) {
        switchToNextServer();
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [
    selectedServer.id,
    selectedServer.provider,
    loaderVisible,
    allServersFailed,
    switchToNextServer,
    isDirectStream,
    activeServers.length,
  ]);

  const [hasStartedWatching, setHasStartedWatching] = useState(false);

  // Reset playback start state when episode or title changes
  useEffect(() => {
    setHasStartedWatching(false);
  }, [animeId, effectiveSeasonNum, effectiveEpisodeNum]);

  // PostMessage Listener for Automatic Fallback from providers and playback detection
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "viduki:all-servers-failed" ||
        event.data?.type === "player:error" ||
        event.data?.type === "vidy:error"
      ) {
        console.warn("Provider reported playback error for:", selectedServer.name);
        switchToNextServer(
          `${selectedServer.name} reported stream failure. Switched to next server.`,
        );
      } else if (
        event.data?.event === "play" ||
        event.data?.type === "player:play" ||
        event.data?.type === "media:play" ||
        event.data?.type === "playing" ||
        event.data?.event === "timeupdate" ||
        event.data?.type === "player:timeupdate"
      ) {
        setHasStartedWatching(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [selectedServer, switchToNextServer]);

  // Record Watch History ONLY once the video actually starts playing
  useEffect(() => {
    if (hasStartedWatching && anime && anime.title) {
      const cat = getMediaCategory(animeId, anime);
      recordWatchHistory({
        animeId,
        title: anime.title,
        animeTitle: anime.title,
        poster: anime.poster,
        backdrop: anime.backdrop,
        seasonNumber: effectiveSeasonNum,
        episodeNumber: effectiveEpisodeNum,
        episodeTitle: isMovie
          ? "Full Movie"
          : currentEpisode?.name || `Episode ${effectiveEpisodeNum}`,
        isMovie,
        category: cat,
      });
    }
  }, [
    hasStartedWatching,
    anime,
    animeId,
    effectiveSeasonNum,
    effectiveEpisodeNum,
    currentEpisode,
    isMovie,
  ]);

  // Fast Stream Loader with instant dismiss
  useEffect(() => {
    setLoaderVisible(true);
    setStepIndex(0);

    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADER_STEPS.length);
    }, 500);

    const timeout = setTimeout(() => {
      setLoaderVisible(false);
    }, 1200);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(timeout);
    };
  }, [currentStreamUrl, iframeKey]);

  const handleIframeLoad = () => {
    setLoaderVisible(false);
    // Mark as started watching after user actually streams for at least 15s
    const timer = setTimeout(() => {
      setHasStartedWatching(true);
    }, 15000);
    return () => clearTimeout(timer);
  };

  const handleReloadStream = () => {
    setIframeKey((k) => k + 1);
  };

  // Auto rotate to landscape when entering fullscreen
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

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      const doc = document as unknown as {
        fullscreenElement?: Element;
        exitFullscreen?: () => Promise<void>;
        webkitExitFullscreen?: () => Promise<void>;
      };

      if (doc.fullscreenElement) {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } else if (playerWrapperRef.current) {
        const el = playerWrapperRef.current as unknown as {
          requestFullscreen?: () => Promise<void>;
          webkitRequestFullscreen?: () => Promise<void>;
        };
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  const handleShare = async () => {
    try {
      const showTitle = anime?.title || "Anime";
      if (navigator.share) {
        await navigator.share({
          title: showTitle,
          text: `Watch ${showTitle} in Full HD on 7Shows`,
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

  const mediaCat = getMediaCategory(animeId, anime);

  const handleSwitchEpisode = useCallback(
    (sNum: number, eNum: number) => {
      setCurrentSeasonNum(sNum);
      setCurrentEpisodeNum(eNum);
      setIframeKey((k) => k + 1);

      const cat = getMediaCategory(animeId, anime);
      if (cat === "movie") {
        void navigate({
          to: "/movie/$id/watch",
          params: { id: String(animeId) },
          search: { season: 1, episode: 1 },
        });
      } else if (cat === "webseries") {
        void navigate({
          to: "/webseries/$id/watch",
          params: { id: String(animeId) },
          search: { season: sNum, episode: eNum },
        });
      } else {
        void navigate({
          to: "/anime/$id/watch",
          params: { id: String(animeId) },
          search: { season: sNum, episode: eNum },
        });
      }

      if (playerWrapperRef.current) {
        playerWrapperRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [animeId, anime, navigate],
  );

  // Next / Prev Episode navigation
  const currentEpIndex = visibleEpisodes.findIndex((e) => e.episodeNumber === currentEpisodeNum);
  const prevEpisode = currentEpIndex > 0 ? visibleEpisodes[currentEpIndex - 1] : null;
  const nextEpisode =
    currentEpIndex >= 0 && currentEpIndex < visibleEpisodes.length - 1
      ? visibleEpisodes[currentEpIndex + 1]
      : null;

  // Stable callbacks for Native Video Player to avoid re-rendering re-attachment
  const handleNativePlay = useCallback(() => {
    setHasStartedWatching(true);
    setLoaderVisible(false);
  }, []);

  const handleNativeEnded = useCallback(() => {
    if (nextEpisode) {
      handleSwitchEpisode(currentSeasonNum, nextEpisode.episodeNumber);
    }
  }, [nextEpisode, currentSeasonNum, handleSwitchEpisode]);

  const handleNativeError = useCallback((err: unknown) => {
    console.warn("Direct video error in player:", err);
    setAllServersFailed(true);
  }, []);

  const isSavedInWatchlist = ready && anime ? has(anime.id) : false;

  const backButtonContent = (
    <span className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-white transition active:scale-95 shrink-0 cursor-pointer">
      <IconBack width={16} height={16} />
    </span>
  );

  return (
    <div className="relative min-h-screen bg-[#070A12] text-[#f1f5f9] pb-16">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-[500px] bg-gradient-to-b from-[#E50914]/15 via-transparent to-transparent blur-3xl opacity-70" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-3 sm:px-4 md:px-8 pt-3 sm:pt-4 space-y-4">
        {/* 1. TOP NAVIGATION & EPISODE TITLE BAR */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {mediaCat === "movie" ? (
              <Link to="/movie/$id" params={{ id: String(animeId) }} title="Back to Details">
                {backButtonContent}
              </Link>
            ) : mediaCat === "webseries" ? (
              <Link to="/webseries/$id" params={{ id: String(animeId) }} title="Back to Details">
                {backButtonContent}
              </Link>
            ) : (
              <Link to="/anime/$id" params={{ id: String(animeId) }} title="Back to Details">
                {backButtonContent}
              </Link>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {anime?.title ? (
                  <h1 className="text-sm sm:text-base font-extrabold truncate text-white">
                    {anime.title}
                  </h1>
                ) : (
                  <span className="inline-block h-5 w-40 rounded-lg bg-white/10 shimmer" />
                )}
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] border border-white/10 text-slate-300">
                  {isMovie ? "Movie" : `S${currentSeasonNum} E${currentEpisodeNum}`}
                </span>
              </div>
              <div className="text-[11px] text-[#94a3b8] truncate mt-0.5">
                {isMovie ? (
                  anime?.runtime ? (
                    `${anime.runtime} min · Full Movie`
                  ) : (
                    "Full Movie"
                  )
                ) : currentEpisode?.name ? (
                  currentEpisode.name
                ) : animePending || seasonPending ? (
                  <span className="inline-block h-3 w-28 rounded bg-white/10 shimmer" />
                ) : (
                  `Season ${currentSeasonNum} · Episode ${currentEpisodeNum}`
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="hidden sm:inline">Server</span> Main
            </div>
          </div>
        </div>

        {/* 2. CINEMATIC VIDEO PLAYER (16:9 CONTAINER) */}
        <div className="relative">
          <div
            ref={playerWrapperRef}
            className={cn(
              "player-container relative w-full bg-black overflow-hidden transition-all duration-300",
              isFullscreen
                ? "w-full h-full aspect-auto rounded-none border-0 shadow-none"
                : "aspect-video rounded-xl sm:rounded-2xl border border-white/10",
            )}
          >
            {/* Animated Blur Loader Overlay (Only for iframe embeds) */}
            {!isDirectStream && (
              <div
                onClick={() => setLoaderVisible(false)}
                className={`absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col justify-center items-center gap-3 z-10 cursor-pointer transition-all duration-300 ${
                  loaderVisible && !allServersFailed
                    ? "opacity-100 visible"
                    : "opacity-0 invisible pointer-events-none"
                }`}
              >
                <div className="relative w-11 h-11 flex items-center justify-center bg-[#E50914]/20 border border-[#E50914]/40 rounded-2xl animate-pulse">
                  <IconPlay width={18} height={18} className="text-[#E50914]" />
                </div>

                <div className="h-5 text-center">
                  <span className="text-white text-xs sm:text-sm font-semibold tracking-tight">
                    {LOADER_STEPS[stepIndex]?.text}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/[0.05] border border-white/10 rounded-full text-neutral-400 text-[11px]">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  {selectedServer.name}
                </div>
              </div>
            )}

            {/* Error / Offline Playback Banner */}
            {allServersFailed ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E50914]/20 border border-[#E50914]/40 text-[#E50914] mb-3">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Video Currently Unavailable
                </h3>
                <p className="mt-1 max-w-md text-xs sm:text-sm text-neutral-400">
                  The stream could not be loaded. Please click below to reload or check your
                  connection.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAllServersFailed(false);
                      setIframeKey((k) => k + 1);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#E50914] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#b80710] cursor-pointer active:scale-95 shadow-lg shadow-[#E50914]/20"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Reload Video
                  </button>
                </div>
              </div>
            ) : isDirectStream ? (
              /* Protected Browser Native Video Player */
              <NativeVideoPlayer
                key={`${currentStreamUrl}_${iframeKey}`}
                src={currentStreamUrl}
                poster={img(anime?.backdrop || anime?.poster, "original")}
                onPlay={handleNativePlay}
                onEnded={handleNativeEnded}
                onError={handleNativeError}
              />
            ) : (
              /* Direct Iframe Stream */
              <div className="player-container w-full h-full relative">
                <iframe
                  key={`${currentStreamUrl}_${iframeKey}`}
                  id="videoFrame"
                  src={currentStreamUrl}
                  onLoad={handleIframeLoad}
                  onError={() => setAllServersFailed(true)}
                  referrerPolicy="no-referrer"
                  scrolling="no"
                  allow="encrypted-media; autoplay *; fullscreen *"
                  allowFullScreen
                  className="w-full h-full border-0 block bg-black"
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. SERVER SELECTOR & PLAYER CONTROLS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-[#0D1017] border border-white/[0.08] rounded-xl">
          {/* Server Selector Tabs */}
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            {isCustomPending || isConfigPending ? (
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-16 rounded-lg bg-white/[0.06] shimmer" />
                <div className="h-6 w-20 rounded-lg bg-white/[0.06] shimmer" />
              </div>
            ) : (
              activeServers.map((server) => {
                const isSelected = selectedServer.id === server.id;
                const isCustom =
                  server.provider === "custom" || server.id.startsWith("custom-stream");

                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => {
                      setSelectedServer(server);
                      setAllServersFailed(false);
                      setIframeKey((k) => k + 1);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 active:scale-95",
                      isSelected
                        ? isCustom
                          ? "bg-amber-500 text-black font-bold border border-amber-400"
                          : "bg-[#E50914] text-white font-bold border border-[#ff3b47]"
                        : isCustom
                          ? "bg-amber-500/10 text-amber-300 hover:text-amber-100 hover:bg-amber-500/20 border border-amber-500/30"
                          : "bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]",
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isSelected
                          ? isCustom
                            ? "bg-black"
                            : "bg-white"
                          : isCustom
                            ? "bg-amber-400"
                            : "bg-emerald-400",
                      )}
                    />
                    <span className="truncate max-w-[120px]">{server.name}</span>
                    {server.badge && (
                      <span
                        className={cn(
                          "text-[9px] px-1 py-0.2 rounded font-bold tracking-tight",
                          isSelected
                            ? isCustom
                              ? "bg-black/20 text-black"
                              : "bg-black/30 text-white/90"
                            : isCustom
                              ? "bg-amber-500/20 text-amber-200"
                              : "bg-white/[0.08] text-neutral-400",
                        )}
                      >
                        {server.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#E50914]/20 hover:bg-[#E50914]/35 text-[#ff4d56] border border-[#E50914]/40 text-[11px] font-bold transition active:scale-95 cursor-pointer"
                title="Admin: Edit or Add Custom Stream Embed"
              >
                <Edit className="w-3 h-3" />
                <span>{customStream ? "Edit Stream" : "Add Stream"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] text-neutral-300 hover:text-white hover:bg-white/10 border border-white/[0.06] text-xs font-bold transition active:scale-95 cursor-pointer"
              title="Share"
            >
              <Share2 width={13} height={13} />
              <span>{copied ? "Copied" : "Share"}</span>
            </button>

            <button
              type="button"
              onClick={handleReloadStream}
              className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer active:scale-90 border border-white/[0.06]"
              title="Reload Stream"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer active:scale-90 border border-white/[0.06]"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4. PREV / NEXT BAR (ONLY FOR TV SERIES) */}
        {!isMovie && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#181818] border border-white/[0.08] rounded-xl">
            <button
              onClick={() =>
                prevEpisode && handleSwitchEpisode(currentSeasonNum, prevEpisode.episodeNumber)
              }
              disabled={!prevEpisode}
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3.5 py-1.5 text-xs font-bold text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95"
            >
              <IconChevronLeft width={14} height={14} />
              <span>Previous Episode</span>
            </button>

            <div className="text-center truncate px-2 min-w-0">
              <span className="text-xs font-bold text-white truncate block">
                Episode {currentEpisodeNum}{" "}
                {visibleEpisodes.length > 0 ? `of ${visibleEpisodes.length}` : ""}
              </span>
            </div>

            <button
              onClick={() =>
                nextEpisode && handleSwitchEpisode(currentSeasonNum, nextEpisode.episodeNumber)
              }
              disabled={!nextEpisode}
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3.5 py-1.5 text-xs font-bold text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95"
            >
              <span>Next Episode</span>
              <IconChevronRight width={14} height={14} />
            </button>
          </div>
        )}

        {/* 5. SYNOPSIS & METADATA */}
        <div className="p-4 sm:p-5 bg-[#181818] border border-white/[0.08] rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              {isMovie ? (
                anime?.title ? (
                  <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                    {anime.title}
                  </h2>
                ) : (
                  <div className="h-6 w-48 rounded-lg bg-white/10 shimmer mb-1" />
                )
              ) : currentEpisode?.name ? (
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  {currentEpisode.name}
                </h2>
              ) : anime?.title ? (
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  {anime.title} · Episode {currentEpisodeNum}
                </h2>
              ) : (
                <div className="h-6 w-56 rounded-lg bg-white/10 shimmer mb-1" />
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-neutral-400">
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

              {anime?.contentRating ? (
                <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  {anime.contentRating}
                </span>
              ) : null}

              {anime?.voteAverage ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <IconStar width={13} height={13} className="text-amber-400 fill-amber-400" />
                  {Math.round(anime.voteAverage * 10)}% Match
                </span>
              ) : null}
            </div>
          </div>

          <div className="text-xs sm:text-sm leading-relaxed text-neutral-300">
            {animePending && !anime?.overview ? (
              <div className="space-y-1.5 py-1">
                <div className="h-3 w-full rounded bg-white/[0.05] shimmer" />
                <div className="h-3 w-5/6 rounded bg-white/[0.04] shimmer" />
                <div className="h-3 w-2/3 rounded bg-white/[0.03] shimmer" />
              </div>
            ) : isMovie ? (
              anime?.overview || "No synopsis available."
            ) : (
              currentEpisode?.overview ||
              anime?.overview ||
              "No synopsis available for this episode."
            )}
          </div>

          {anime?.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {anime.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-md bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-neutral-300"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 6. TV SHOW EPISODE GRID (FOR TV SERIES) */}
        {!isMovie && (
          <div className="p-4 sm:p-5 bg-[#181818] border border-white/[0.08] rounded-xl space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-white">Episodes</h3>
                <p className="text-[11px] text-neutral-400">
                  Select an episode to stream instantly in Full HD.
                </p>
              </div>

              {/* Season Selector Tabs */}
              {availableSeasons.length > 0 && (
                <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {availableSeasons.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setCurrentSeasonNum(s.seasonNumber);
                        setCurrentEpisodeNum(1);
                        const cat = getMediaCategory(animeId, anime);
                        if (cat === "webseries") {
                          void navigate({
                            to: "/webseries/$id/watch",
                            params: { id: String(animeId) },
                            search: { season: s.seasonNumber, episode: 1 },
                          });
                        } else {
                          void navigate({
                            to: "/anime/$id/watch",
                            params: { id: String(animeId) },
                            search: { season: s.seasonNumber, episode: 1 },
                          });
                        }
                      }}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 shrink-0 ${
                        s.seasonNumber === currentSeasonNum
                          ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/40"
                          : "bg-white/[0.06] text-neutral-300 hover:text-white"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Skeleton Loading State for Episodes */}
            {seasonPending ? (
              <PlayerEpisodeSkeleton />
            ) : (
              <div
                ref={epGridRef}
                className="max-h-[600px] overflow-y-auto scrollbar-none no-scrollbar pr-0.5 space-y-3"
              >
                <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {renderedPlayerEpisodes.map((ep) => {
                    const isCurrent = ep.episodeNumber === currentEpisodeNum;
                    const hasCustomStream = isEpCustomLinked(ep.episodeNumber);
                    return (
                      <button
                        key={ep.id}
                        onClick={() => handleSwitchEpisode(currentSeasonNum, ep.episodeNumber)}
                        style={{ contentVisibility: "auto", containIntrinsicSize: "0 80px" }}
                        className={`player-ep-card group relative flex items-start gap-3 rounded-xl p-2.5 text-left transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.98] ${
                          isCurrent
                            ? "bg-[#E50914]/15 border-2 border-[#E50914] shadow-lg shadow-[#E50914]/20"
                            : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/20"
                        }`}
                      >
                        <div className="relative aspect-video w-24 sm:w-28 shrink-0 overflow-hidden rounded-lg bg-black shadow-sm">
                          <Img
                            src={img(ep.still, "w300")}
                            alt={ep.name || `Episode ${ep.episodeNumber}`}
                            rounded="rounded-lg"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-1 left-1 rounded bg-black/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white">
                            EP {ep.episodeNumber}
                          </div>
                          {isCurrent && (
                            <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-xs">
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#E50914] text-white shadow-md shadow-[#E50914]/50 animate-pulse">
                                <IconPlay width={12} height={12} />
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 flex flex-col justify-between h-full py-0.5 overflow-hidden">
                          <div className="min-w-0 overflow-hidden">
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <p className="truncate text-xs font-bold text-white group-hover:text-[#ff4d55] transition flex-1">
                                {ep.name || `Episode ${ep.episodeNumber}`}
                              </p>
                              {hasCustomStream && <BrandBadge />}
                            </div>
                            <p className="line-clamp-2 mt-0.5 text-[10px] text-neutral-400 break-words leading-tight">
                              {ep.overview || "No synopsis available."}
                            </p>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[10px] min-w-0 pt-0.5">
                            <span className="text-neutral-400 font-medium shrink-0">
                              Ep {ep.episodeNumber}
                            </span>

                            {ep.runtime && (
                              <span className="text-neutral-400 shrink-0">{ep.runtime}m</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {visibleEpisodes.length > playerEpLimit && (
                  <div className="pt-2 pb-1 text-center">
                    <button
                      type="button"
                      onClick={() => setPlayerEpLimit((prev) => prev + 32)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 px-4 py-2 text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-md"
                    >
                      <span>+ Load More ({visibleEpisodes.length - playerEpLimit} remaining)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 7. CAST & CREW SECTION (SIDE-SCROLLABLE) */}
        {animePending && (!anime?.cast || anime.cast.length === 0) ? (
          <div className="p-4 sm:p-5 bg-[#181818] border border-white/[0.08] rounded-xl space-y-3">
            <div className="h-4 w-28 rounded bg-white/[0.08] shimmer" />
            <div className="flex gap-4 overflow-x-auto pb-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 shrink-0 w-20">
                  <div className="h-16 w-16 rounded-full bg-white/[0.06] shimmer" />
                  <div className="h-2.5 w-14 rounded bg-white/[0.05] shimmer" />
                </div>
              ))}
            </div>
          </div>
        ) : (anime?.cast && anime.cast.length > 0) || (anime?.crew && anime.crew.length > 0) ? (
          <div className="p-4 sm:p-5 bg-[#181818] border border-white/[0.08] rounded-xl">
            <CastCrewSection
              cast={anime.cast}
              crew={anime.crew}
              onSelectPerson={setSelectedPerson}
            />
          </div>
        ) : null}

        {/* 8. RECOMMENDATIONS ROW */}
        {anime?.recommendations && anime.recommendations.length > 0 && (
          <div className="pt-2">
            <Row
              title={isMovie ? "More Like This" : "More Like This"}
              items={anime.recommendations}
            />
          </div>
        )}
      </div>

      {/* 9. PERSON WORKS MODAL */}
      <PersonWorksModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />

      {/* 10. ADMIN CUSTOM STREAM MODAL */}
      {isAdmin && (
        <CustomStreamModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mediaId={animeId}
          mediaType={isMovie ? "movie" : "tv"}
          season={effectiveSeasonNum}
          episode={effectiveEpisodeNum}
          title={anime?.title}
          onSaved={() => {
            refetchCustomStream();
          }}
        />
      )}
    </div>
  );
}

function PlayerEpisodeSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#ff2a34]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E50914]" />
        </span>
        <span className="text-[#94a3b8] text-[11px]">Loading episode list...</span>
      </div>
      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`player-ep-skel-${i}`}
            className="flex w-full min-w-0 items-start gap-2.5 rounded-2xl bg-[#111622]/60 border border-white/[0.05] p-2.5 overflow-hidden animate-pulse"
          >
            <div className="relative aspect-video w-24 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-white/[0.05] shimmer flex items-center justify-center">
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
