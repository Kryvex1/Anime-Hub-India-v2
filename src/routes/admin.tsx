import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  Server,
  Tv,
  Trash2,
  Edit,
  Save,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
  Tag,
  Check,
} from "lucide-react";
import {
  auth,
  useAuthUser,
  signOut,
  fetchAllCustomStreams,
  fetchGlobalServerConfig,
  saveGlobalServerConfig,
  saveCustomStream,
  deleteCustomStream,
  fetchCustomStream,
  type CustomStreamData,
} from "@/lib/firebase";
import { DEFAULT_PLAY_SERVERS } from "@/lib/viduki";
import { searchAnime } from "@/lib/tmdb";
import { fetchShow, fetchSeason } from "@/lib/anime.functions";
import { cleanStreamUrl } from "@/lib/stream-utils";
import { LoginModal } from "@/components/anime/login-modal";
import { Img, img } from "@/components/anime/media";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin Portal — 7Shows" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading: authLoading, isAdmin } = useAuthUser();
  const [activeTab, setActiveTab] = useState<"servers" | "streams">("servers");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Global Server Config State
  const [serverNames, setServerNames] = useState<Record<string, string>>({});
  const [serverBadges, setServerBadges] = useState<Record<string, string>>({});
  const [hiddenServers, setHiddenServers] = useState<string[]>([]);
  const [allHidden, setAllHidden] = useState<boolean>(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  // Custom Streams State
  const [customStreams, setCustomStreams] = useState<CustomStreamData[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [streamFilter, setStreamFilter] = useState("");

  // Media Search & Embed Configuration State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: number;
      title: string;
      poster?: string | null;
      type: "Movie" | "TV Show";
      year?: string;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // Active Selected Media
  const [selectedMedia, setSelectedMedia] = useState<{
    id: number;
    title: string;
    poster?: string | null;
    isMovie: boolean;
    seasons?: Array<{ seasonNumber: number; name: string; episodeCount: number }>;
  } | null>(null);
  const [loadingMediaDetails, setLoadingMediaDetails] = useState(false);

  // Episode Selection for TV Series
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState<
    Array<{ episodeNumber: number; name: string }>
  >([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Embed Editor State
  const [embedUrl, setEmbedUrl] = useState("");
  const [embedServerName, setEmbedServerName] = useState("VIP Server");
  const [embedBadge, setEmbedBadge] = useState("Custom VIP");
  const [perMediaHiddenServers, setPerMediaHiddenServers] = useState<string[]>([]);
  const [perMediaHideAllDefaults, setPerMediaHideAllDefaults] = useState(false);
  const [savingStream, setSavingStream] = useState(false);
  const [streamSaveMessage, setStreamSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      // Load global config
      fetchGlobalServerConfig().then((cfg) => {
        setServerNames(cfg.serverNames || {});
        setServerBadges(cfg.serverBadges || {});
        setHiddenServers(cfg.hiddenServers || []);
        setAllHidden(Boolean(cfg.allHidden));
      });

      // Load all custom streams
      loadStreams();
    }
  }, [isAdmin]);

  const loadStreams = () => {
    setStreamsLoading(true);
    fetchAllCustomStreams().then((list) => {
      setCustomStreams(list);
      setStreamsLoading(false);
    });
  };

  // Live TMDB Search Debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const numericId = parseInt(trimmed, 10);
        if (!isNaN(numericId) && String(numericId) === trimmed) {
          try {
            const show = await fetchShow({ data: { id: numericId } });
            if (show) {
              setSearchResults([
                {
                  id: show.id,
                  title: show.title,
                  poster: show.poster,
                  type: show.isMovie ? "Movie" : "TV Show",
                  year: show.firstAirDate ? show.firstAirDate.slice(0, 4) : "",
                },
              ]);
              setIsSearching(false);
              return;
            }
          } catch {
            // fallback
          }
        }

        const res = await searchAnime(trimmed);
        const mapped = (res.items || []).slice(0, 8).map((item) => ({
          id: item.id,
          title: item.title,
          poster: item.poster,
          type: item.type as "Movie" | "TV Show",
          year: item.year ? String(item.year) : "",
        }));
        setSearchResults(mapped);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Full Details on Media Selection
  const handleSelectMedia = async (item: { id: number; title: string; poster?: string | null }) => {
    setLoadingMediaDetails(true);
    setStreamSaveMessage(null);
    try {
      const details = await fetchShow({ data: { id: item.id } });
      const isMovie = Boolean(details?.isMovie || details?.type === "movie");

      const rawSeasons = (details?.seasons || []).filter(
        (s) =>
          s.seasonNumber > 0 &&
          !s.name?.toLowerCase().includes("special") &&
          !s.name?.toLowerCase().includes("bonus") &&
          !s.name?.toLowerCase().includes("recap") &&
          !s.name?.toLowerCase().includes("extra"),
      );

      const totalSeasons = Math.max(details?.numberOfSeasons || 1, rawSeasons.length);
      let canonicalSeasons = rawSeasons;
      if (totalSeasons > rawSeasons.length) {
        const sMap = new Map(rawSeasons.map((s) => [s.seasonNumber, s]));
        canonicalSeasons = [];
        for (let i = 1; i <= totalSeasons; i++) {
          if (sMap.has(i)) {
            canonicalSeasons.push(sMap.get(i)!);
          } else {
            canonicalSeasons.push({
              seasonNumber: i,
              name: `Season ${i}`,
              episodeCount: 1,
            });
          }
        }
      }

      setSelectedMedia({
        id: item.id,
        title: details?.title || item.title,
        poster: details?.poster || item.poster,
        isMovie,
        seasons: canonicalSeasons.length > 0 ? canonicalSeasons : undefined,
      });

      setSelectedSeason(1);
      setSelectedEpisode(1);

      if (isMovie) {
        loadExistingStreamData("movie", item.id, 1, 1);
      } else {
        loadSeasonEpisodes(item.id, 1);
      }
    } catch {
      alert("Failed to load show details.");
    } finally {
      setLoadingMediaDetails(false);
    }
  };

  const loadSeasonEpisodes = async (mediaId: number, sNum: number) => {
    setLoadingEpisodes(true);
    try {
      const sData = await fetchSeason({ data: { id: mediaId, seasonNumber: sNum } });
      const eps = (sData?.episodes || [])
        .filter((e) => {
          if (e.episodeNumber <= 0) return false;
          const name = (e.name || "").toLowerCase();
          if (
            name.includes("special recap") ||
            name.includes("bonus clip") ||
            name.includes("sp-") ||
            name.includes("extra footage")
          ) {
            return false;
          }
          return true;
        })
        .map((e) => ({
          episodeNumber: e.episodeNumber,
          name: e.name || `Episode ${e.episodeNumber}`,
        }));
      setSeasonEpisodes(eps);
      const firstEp = eps[0]?.episodeNumber || 1;
      setSelectedEpisode(firstEp);
      loadExistingStreamData("tv", mediaId, sNum, firstEp);
    } catch {
      setSeasonEpisodes([{ episodeNumber: 1, name: "Episode 1" }]);
      loadExistingStreamData("tv", mediaId, sNum, 1);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const loadExistingStreamData = async (
    type: "movie" | "tv",
    mediaId: number,
    s: number,
    ep: number,
  ) => {
    const data = await fetchCustomStream(type, mediaId, s, ep);
    if (data) {
      setEmbedUrl(data.customUrl || "");
      setEmbedServerName(data.serverName || "VIP Server");
      setEmbedBadge(data.badge || "Custom VIP");
      setPerMediaHiddenServers(data.hiddenServers || []);
      setPerMediaHideAllDefaults(Boolean(data.hideDefaultServers));
    } else {
      setEmbedUrl("");
      setEmbedServerName("VIP Server");
      setEmbedBadge("Custom VIP");
      setPerMediaHiddenServers([]);
      setPerMediaHideAllDefaults(false);
    }
  };

  const handleSaveGlobalServers = async () => {
    setConfigSaving(true);
    setConfigMessage(null);
    try {
      await saveGlobalServerConfig({
        serverNames,
        serverBadges,
        hiddenServers,
        allHidden,
      });
      setConfigMessage("Server settings & badges saved to Firebase!");
      setTimeout(() => setConfigMessage(null), 3000);
    } catch {
      setConfigMessage("Failed to save settings.");
    } finally {
      setConfigSaving(false);
    }
  };

  const toggleGlobalHide = (id: string) => {
    setHiddenServers((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const togglePerMediaHide = (id: string) => {
    setPerMediaHiddenServers((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSaveCustomStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia) return;
    if (!embedUrl.trim()) {
      setStreamSaveMessage({
        type: "error",
        text: "Please enter a valid embed URL or iframe code.",
      });
      return;
    }

    const cleaned = cleanStreamUrl(embedUrl.trim());
    if (!cleaned) {
      setStreamSaveMessage({ type: "error", text: "Invalid stream URL format." });
      return;
    }

    setSavingStream(true);
    setStreamSaveMessage(null);

    try {
      const docId = selectedMedia.isMovie
        ? `movie_${selectedMedia.id}`
        : `tv_${selectedMedia.id}_${selectedSeason}_${selectedEpisode}`;

      await saveCustomStream({
        id: docId,
        mediaId: selectedMedia.id,
        mediaType: selectedMedia.isMovie ? "movie" : "tv",
        season: selectedMedia.isMovie ? 1 : selectedSeason,
        episode: selectedMedia.isMovie ? 1 : selectedEpisode,
        title: selectedMedia.title,
        poster: selectedMedia.poster,
        customUrl: cleaned,
        serverName: embedServerName.trim() || "VIP Server",
        badge: embedBadge.trim() || "Custom VIP",
        hiddenServers: perMediaHiddenServers,
        hideDefaultServers: perMediaHideAllDefaults,
      });

      setStreamSaveMessage({
        type: "success",
        text: `Custom stream saved for ${selectedMedia.title} ${
          !selectedMedia.isMovie ? `(S${selectedSeason} E${selectedEpisode})` : ""
        }`,
      });
      loadStreams();
      setTimeout(() => setStreamSaveMessage(null), 4000);
    } catch {
      setStreamSaveMessage({ type: "error", text: "Failed to save stream link to Firebase." });
    } finally {
      setSavingStream(false);
    }
  };

  const handleDeleteStream = async (id: string) => {
    if (!confirm("Are you sure you want to remove this custom stream?")) return;
    try {
      await deleteCustomStream(id);
      loadStreams();
    } catch {
      alert("Failed to delete stream link.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 bg-[#070A12]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 pt-16 bg-[#070A12]">
        <div className="w-full max-w-md rounded-3xl bg-[#121620] border border-white/10 p-8 text-center space-y-5 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914]">
            <Shield className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white">Admin Access Only</h1>
            <p className="text-xs text-neutral-400">
              Sign in with your authorized Firebase administrator credentials.
            </p>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full rounded-xl bg-[#E50914] hover:bg-[#b80710] py-3 text-sm font-bold text-white shadow-lg shadow-[#E50914]/25 transition cursor-pointer"
          >
            Login to 7Shows
          </button>
        </div>
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </div>
    );
  }

  const filteredStreams = customStreams.filter((s) => {
    const q = streamFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.title || "").toLowerCase().includes(q) ||
      String(s.mediaId).includes(q) ||
      (s.serverName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#070A12] text-white pt-16 sm:pt-20 pb-16 px-3 sm:px-6 max-w-5xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914] shadow-md shadow-[#E50914]/20 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              7Shows Admin Panel
            </h1>
            <p className="text-[11px] text-neutral-400 truncate">
              Logged in as <span className="text-neutral-200 font-medium">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/"
            className="rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-neutral-300 transition"
          >
            Website Home
          </Link>
          <button
            onClick={() => void signOut(auth)}
            className="flex items-center gap-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.03] border border-white/10 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab("servers")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "servers"
              ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/30"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Server className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Server Settings</span>
        </button>
        <button
          onClick={() => setActiveTab("streams")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "streams"
              ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/30"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Tv className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Custom Streams ({customStreams.length})</span>
        </button>
      </div>

      {/* TAB 1: Global Server Settings (Clean, Compact, Auto-Fit Sizing) */}
      {activeTab === "servers" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#121620] border border-white/10 p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Streaming Server Names & Badges
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Edit names, badges, or hide servers across the platform. Stored in Firebase.
                </p>
              </div>

              {/* Custom Styled Global Switch (No HTML checkbox) */}
              <button
                type="button"
                onClick={() => setAllHidden(!allHidden)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                  allHidden
                    ? "bg-red-500/15 border-red-500/30 text-red-400 shadow-sm"
                    : "bg-white/[0.04] border-white/10 text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${allHidden ? "bg-red-500" : "bg-emerald-400"}`}
                />
                <span>
                  {allHidden
                    ? "All Default Servers Hidden"
                    : "Hide All Defaults (Only Show Custom)"}
                </span>
              </button>
            </div>

            {configMessage && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{configMessage}</span>
              </div>
            )}

            {/* Compact Dynamic Server Rows */}
            <div className="space-y-2">
              {DEFAULT_PLAY_SERVERS.map((server) => {
                const isHidden = hiddenServers.includes(server.id) || allHidden;
                const customName = serverNames[server.id] ?? server.name;
                const customBadge = serverBadges[server.id] ?? (server.badge || "");

                return (
                  <div
                    key={server.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all duration-200 ${
                      isHidden
                        ? "bg-white/[0.015] border-white/5 opacity-60"
                        : "bg-white/[0.035] border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.08] text-[10px] font-mono font-bold text-neutral-300 shrink-0">
                        {server.id}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block">
                          {server.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 truncate block">
                          {server.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 md:pt-0">
                      <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                        <span className="text-[11px] text-neutral-400 shrink-0">Name:</span>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) =>
                            setServerNames((prev) => ({
                              ...prev,
                              [server.id]: e.target.value,
                            }))
                          }
                          placeholder="Server Name"
                          className="w-full sm:w-36 rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-1 focus:ring-[#E50914]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                        <span className="text-[11px] text-neutral-400 shrink-0">Badge:</span>
                        <input
                          type="text"
                          value={customBadge}
                          onChange={(e) =>
                            setServerBadges((prev) => ({
                              ...prev,
                              [server.id]: e.target.value,
                            }))
                          }
                          placeholder="Badge"
                          className="w-full sm:w-28 rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-1 focus:ring-[#E50914]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleGlobalHide(server.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border shrink-0 ${
                          hiddenServers.includes(server.id)
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        }`}
                      >
                        {hiddenServers.includes(server.id) ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hidden</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visible</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveGlobalServers}
                disabled={configSaving}
                className="flex items-center gap-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#E50914]/25 transition disabled:opacity-60 cursor-pointer"
              >
                {configSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save All Server Configs to Firebase</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Custom Streams Manager (With Clean, Non-Overflowing Episode Selectors) */}
      {activeTab === "streams" && (
        <div className="space-y-5">
          {/* Search / Select Media Box */}
          <div className="rounded-2xl bg-[#121620] border border-white/10 p-4 sm:p-5 space-y-4 shadow-xl">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Add or Edit Custom Stream
              </h2>
              <p className="text-[11px] text-neutral-400">
                Search any Movie, Web Series, or Anime by Title or TMDB ID.
              </p>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type movie/series title or enter TMDB ID (e.g. 95479, Breaking Bad)..."
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 pl-10 pr-10 py-2 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914]"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 animate-spin text-[#E50914] absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Search Results Grid */}
            {searchResults.length > 0 && (
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 pt-1">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleSelectMedia(item);
                      setSearchResults([]);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-left transition cursor-pointer min-w-0"
                  >
                    <div className="h-12 w-9 shrink-0 rounded-lg overflow-hidden bg-black/60">
                      <Img
                        src={img(item.poster, "w200")}
                        alt={item.title}
                        className="h-full w-full object-cover"
                        rounded="rounded-lg"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white truncate block">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono block">
                        {item.type} {item.year ? `· ${item.year}` : ""} · ID: {item.id}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Media Embed Editor */}
            {loadingMediaDetails ? (
              <div className="py-8 flex items-center justify-center gap-2 text-neutral-400">
                <Loader2 className="w-5 h-5 animate-spin text-[#E50914]" />
                <span className="text-xs">Loading media configuration...</span>
              </div>
            ) : selectedMedia ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4 animate-in fade-in overflow-hidden">
                {/* Media Banner */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-14 w-10 shrink-0 rounded-xl overflow-hidden bg-black shadow-md border border-white/10">
                      <Img
                        src={img(selectedMedia.poster, "w200")}
                        alt={selectedMedia.title}
                        className="h-full w-full object-cover"
                        rounded="rounded-xl"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-black text-white truncate">
                        {selectedMedia.title}
                      </h3>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30 mt-0.5">
                        {selectedMedia.isMovie ? "Full Movie" : "TV Series"} · TMDB #
                        {selectedMedia.id}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMedia(null)}
                    className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition shrink-0"
                  >
                    Change Media
                  </button>
                </div>

                {/* Season & Episode Selector for TV Series (Fixed Width & No Overflow) */}
                {!selectedMedia.isMovie && selectedMedia.seasons && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-neutral-300 block">
                        Select Season:
                      </span>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                        {selectedMedia.seasons.map((s) => (
                          <button
                            key={s.seasonNumber}
                            type="button"
                            onClick={() => {
                              setSelectedSeason(s.seasonNumber);
                              loadSeasonEpisodes(selectedMedia.id, s.seasonNumber);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                              selectedSeason === s.seasonNumber
                                ? "bg-[#E50914] text-white shadow-sm"
                                : "bg-white/[0.05] text-neutral-400 hover:text-white"
                            }`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 max-w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-300">Select Episode:</span>
                        {loadingEpisodes && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E50914]" />
                        )}
                      </div>
                      <div className="w-full max-w-full overflow-hidden">
                        <select
                          value={selectedEpisode}
                          onChange={(e) => {
                            const epNum = Number(e.target.value);
                            setSelectedEpisode(epNum);
                            loadExistingStreamData("tv", selectedMedia.id, selectedSeason, epNum);
                          }}
                          className="w-full max-w-full rounded-xl bg-[#141822] border border-white/10 px-3 py-2 text-xs sm:text-sm text-white outline-none focus:ring-2 focus:ring-[#E50914] truncate"
                        >
                          {seasonEpisodes.map((ep) => (
                            <option key={ep.episodeNumber} value={ep.episodeNumber}>
                              Episode {ep.episodeNumber}: {ep.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Embed Form */}
                <form onSubmit={handleSaveCustomStream} className="space-y-3.5">
                  {streamSaveMessage && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-xl text-xs animate-in fade-in ${
                        streamSaveMessage.type === "success"
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : "bg-red-500/10 border border-red-500/20 text-red-400"
                      }`}
                    >
                      {streamSaveMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{streamSaveMessage.text}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-300 block">
                      Custom Embed Iframe URL or Stream Link{" "}
                      <span className="text-[#E50914]">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={embedUrl}
                      onChange={(e) => setEmbedUrl(e.target.value)}
                      placeholder='Paste <iframe src="..."></iframe> or direct stream link'
                      className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914] font-mono resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-300 block">
                        Display Server Name
                      </label>
                      <input
                        type="text"
                        value={embedServerName}
                        onChange={(e) => setEmbedServerName(e.target.value)}
                        placeholder="VIP Server"
                        className="w-full rounded-lg bg-white/[0.05] border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#E50914]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-300 block">
                        Badge Label
                      </label>
                      <input
                        type="text"
                        value={embedBadge}
                        onChange={(e) => setEmbedBadge(e.target.value)}
                        placeholder="Custom VIP"
                        className="w-full rounded-lg bg-white/[0.05] border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#E50914]"
                      />
                    </div>
                  </div>

                  {/* Per-Media Server Visibility Controls with Custom Pill Toggles */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-neutral-300">
                        Default Server Visibility for this title:
                      </span>
                      <button
                        type="button"
                        onClick={() => setPerMediaHideAllDefaults(!perMediaHideAllDefaults)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer self-start sm:self-auto ${
                          perMediaHideAllDefaults
                            ? "bg-red-500/15 border-red-500/30 text-red-400"
                            : "bg-white/[0.04] border-white/10 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            perMediaHideAllDefaults ? "bg-red-500" : "bg-neutral-500"
                          }`}
                        />
                        <span>
                          {perMediaHideAllDefaults
                            ? "Only Custom Stream Visible"
                            : "Hide All Defaults for this"}
                        </span>
                      </button>
                    </div>

                    {!perMediaHideAllDefaults && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {DEFAULT_PLAY_SERVERS.map((s) => {
                          const isHidden = perMediaHiddenServers.includes(s.id);
                          return (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => togglePerMediaHide(s.id)}
                              className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                                isHidden
                                  ? "bg-red-500/15 border-red-500/30 text-red-300"
                                  : "bg-white/[0.04] border-white/[0.08] text-neutral-300 hover:text-white"
                              }`}
                            >
                              <span className="truncate">{s.name}</span>
                              {isHidden ? (
                                <EyeOff className="w-3 h-3 text-red-400 shrink-0" />
                              ) : (
                                <Eye className="w-3 h-3 text-emerald-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={savingStream}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] py-2.5 text-xs font-bold text-white shadow-lg shadow-[#E50914]/25 transition disabled:opacity-60 cursor-pointer"
                    >
                      {savingStream ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Save Custom Stream to Firebase</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>

          {/* All Stored Custom Streams in Firebase */}
          <div className="rounded-2xl bg-[#121620] border border-white/10 p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Active Custom Streams in Firebase
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Custom stream links currently active in your Firestore database.
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={streamFilter}
                  onChange={(e) => setStreamFilter(e.target.value)}
                  placeholder="Filter saved streams..."
                  className="rounded-xl bg-white/[0.05] border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914] w-full sm:w-56"
                />
              </div>
            </div>

            {streamsLoading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#E50914]" />
                <span className="text-xs">Loading streams from Firebase...</span>
              </div>
            ) : filteredStreams.length === 0 ? (
              <div className="py-8 text-center space-y-2 border border-dashed border-white/10 rounded-2xl">
                <Tv className="w-7 h-7 text-neutral-500 mx-auto" />
                <p className="text-xs font-semibold text-neutral-300">No Custom Streams Stored</p>
                <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                  Use the search box above to find any movie or series and attach your custom embed.
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5 grid-cols-1 md:grid-cols-2">
                {filteredStreams.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block">
                          {item.title || `Media #${item.mediaId}`}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {item.mediaType.toUpperCase()} · ID: {item.mediaId}{" "}
                          {item.mediaType === "tv" && `(S${item.season} E${item.episode})`}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#E50914] font-bold border border-[#E50914]/30 shrink-0">
                        {item.serverName || "Custom"}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 text-[10px] font-mono text-neutral-400 truncate">
                      {item.customUrl}
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <Link
                        to={
                          item.mediaType === "movie" ? "/movie/$id/watch" : "/webseries/$id/watch"
                        }
                        params={{ id: String(item.mediaId) }}
                        search={
                          item.mediaType === "tv"
                            ? { season: item.season, episode: item.episode }
                            : {}
                        }
                        className="text-[11px] font-semibold text-sky-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Open in Player</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            handleSelectMedia({
                              id: item.mediaId,
                              title: item.title || `Media #${item.mediaId}`,
                              poster: item.poster,
                            });
                            if (item.mediaType === "tv" && item.season) {
                              setSelectedSeason(item.season);
                              if (item.episode) setSelectedEpisode(item.episode);
                            }
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStream(item.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
