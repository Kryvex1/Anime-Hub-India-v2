import { useState, useEffect, useMemo } from "react";
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
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
  Plus,
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
  type CustomStreamLink,
  type GlobalServerConfig,
} from "@/lib/firebase";
import { DEFAULT_PLAY_SERVERS } from "@/lib/viduki";
import { searchAnime } from "@/lib/tmdb";
import { fetchShow, fetchSeason } from "@/lib/anime.functions";
import { cleanStreamUrl } from "@/lib/stream-utils";
import { LoginModal } from "@/components/anime/login-modal";
import { Img, img } from "@/components/anime/media";
import { cn } from "@/lib/utils";

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
  const [initialGlobalConfig, setInitialGlobalConfig] = useState<GlobalServerConfig | null>(null);
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

  // Multiple Embed Streams State
  const [adminStreams, setAdminStreams] = useState<CustomStreamLink[]>([
    { id: "stream-1", serverName: "VIP Server 1", customUrl: "", badge: "Custom VIP" },
  ]);
  const [perMediaServerNames, setPerMediaServerNames] = useState<Record<string, string>>({});
  const [perMediaServerBadges, setPerMediaServerBadges] = useState<Record<string, string>>({});
  const [perMediaHiddenServers, setPerMediaHiddenServers] = useState<string[]>([]);
  const [perMediaHideAllDefaults, setPerMediaHideAllDefaults] = useState(false);
  const [initialMediaData, setInitialMediaData] = useState<CustomStreamData | null>(null);
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
        setInitialGlobalConfig(cfg);
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

  // Check if global server settings have changed
  const isConfigDirty = useMemo(() => {
    if (!initialGlobalConfig) return false;

    if (Boolean(allHidden) !== Boolean(initialGlobalConfig.allHidden)) return true;

    const prevHidden = (initialGlobalConfig.hiddenServers || []).slice().sort();
    const currHidden = hiddenServers.slice().sort();
    if (prevHidden.length !== currHidden.length) return true;
    for (let i = 0; i < prevHidden.length; i++) {
      if (prevHidden[i] !== currHidden[i]) return true;
    }

    const prevNames = initialGlobalConfig.serverNames || {};
    for (const key of Object.keys({ ...prevNames, ...serverNames })) {
      if ((serverNames[key] || "").trim() !== (prevNames[key] || "").trim()) return true;
    }

    const prevBadges = initialGlobalConfig.serverBadges || {};
    for (const key of Object.keys({ ...prevBadges, ...serverBadges })) {
      if ((serverBadges[key] || "").trim() !== (prevBadges[key] || "").trim()) return true;
    }

    return false;
  }, [initialGlobalConfig, allHidden, hiddenServers, serverNames, serverBadges]);

  // Check if media stream or visibility settings have changed
  const isMediaDirty = useMemo(() => {
    const prevHideAll = Boolean(initialMediaData?.hideDefaultServers);
    if (perMediaHideAllDefaults !== prevHideAll) return true;

    const prevHidden = (initialMediaData?.hiddenServers || []).slice().sort();
    const currHidden = perMediaHiddenServers.slice().sort();
    if (prevHidden.length !== currHidden.length) return true;
    for (let i = 0; i < prevHidden.length; i++) {
      if (prevHidden[i] !== currHidden[i]) return true;
    }

    // Check per-media custom server names and badges
    const prevNames = initialMediaData?.serverNames || {};
    for (const key of Object.keys({ ...prevNames, ...perMediaServerNames })) {
      if ((perMediaServerNames[key] || "").trim() !== (prevNames[key] || "").trim()) return true;
    }

    const prevBadges = initialMediaData?.serverBadges || {};
    for (const key of Object.keys({ ...prevBadges, ...perMediaServerBadges })) {
      if ((perMediaServerBadges[key] || "").trim() !== (prevBadges[key] || "").trim()) return true;
    }

    const existingStreams =
      Array.isArray(initialMediaData?.streams) && initialMediaData!.streams.length > 0
        ? initialMediaData!.streams
        : initialMediaData?.customUrl
          ? [
              {
                serverName: initialMediaData.serverName || "VIP Server",
                customUrl: initialMediaData.customUrl,
                badge: initialMediaData.badge || "VIP",
              },
            ]
          : [];

    const activeStreams = adminStreams.filter((s) => s.customUrl && s.customUrl.trim());

    if (activeStreams.length !== existingStreams.length) return true;

    for (let i = 0; i < activeStreams.length; i++) {
      const a = activeStreams[i];
      const b = existingStreams[i];
      if (!b) return true;
      if (a.customUrl.trim() !== (b.customUrl || "").trim()) return true;
      if ((a.serverName || "").trim() !== (b.serverName || "").trim()) return true;
      if ((a.badge || "").trim() !== (b.badge || "").trim()) return true;
    }

    return false;
  }, [
    initialMediaData,
    perMediaHideAllDefaults,
    perMediaHiddenServers,
    perMediaServerNames,
    perMediaServerBadges,
    adminStreams,
  ]);

  const [publicRuleStatus, setPublicRuleStatus] = useState<"checking" | "allowed" | "blocked">(
    "checking",
  );
  const [copiedRules, setCopiedRules] = useState(false);

  useEffect(() => {
    fetch(
      "https://firestore.googleapis.com/v1/projects/gyaanxai/databases/(default)/documents/customStreams?pageSize=1",
    )
      .then((res) => {
        if (res.status === 403) setPublicRuleStatus("blocked");
        else setPublicRuleStatus("allowed");
      })
      .catch(() => setPublicRuleStatus("blocked"));
  }, []);

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
    setInitialMediaData(data);
    if (data) {
      if (Array.isArray(data.streams) && data.streams.length > 0) {
        setAdminStreams(
          data.streams.map((st, idx) => ({
            id: st.id || `stream-${idx + 1}`,
            serverName: st.serverName || `VIP Server ${idx + 1}`,
            customUrl: st.customUrl || "",
            badge: st.badge || "VIP",
          })),
        );
      } else if (data.customUrl) {
        setAdminStreams([
          {
            id: "stream-1",
            serverName: data.serverName || "VIP Server",
            customUrl: data.customUrl || "",
            badge: data.badge || "Custom VIP",
          },
        ]);
      } else {
        setAdminStreams([
          { id: "stream-1", serverName: "VIP Server 1", customUrl: "", badge: "Custom VIP" },
        ]);
      }
      setPerMediaServerNames(data.serverNames || {});
      setPerMediaServerBadges(data.serverBadges || {});
      setPerMediaHiddenServers(data.hiddenServers || []);
      setPerMediaHideAllDefaults(Boolean(data.hideDefaultServers));
    } else {
      setAdminStreams([
        { id: "stream-1", serverName: "VIP Server 1", customUrl: "", badge: "Custom VIP" },
      ]);
      setPerMediaServerNames({});
      setPerMediaServerBadges({});
      setPerMediaHiddenServers([]);
      setPerMediaHideAllDefaults(false);
    }
  };

  const handleAddAdminStream = () => {
    setAdminStreams((prev) => [
      ...prev,
      {
        id: `stream-${Date.now()}`,
        serverName: `VIP Server ${prev.length + 1}`,
        customUrl: "",
        badge: "VIP",
      },
    ]);
  };

  const handleRemoveAdminStream = (index: number) => {
    setAdminStreams((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdminStreamChange = (
    index: number,
    field: "serverName" | "customUrl" | "badge",
    val: string,
  ) => {
    setAdminStreams((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSaveGlobalServers = async () => {
    if (!isConfigDirty) return;
    setConfigSaving(true);
    setConfigMessage(null);
    try {
      const payload: GlobalServerConfig = {
        serverNames,
        serverBadges,
        hiddenServers,
        allHidden,
      };
      await saveGlobalServerConfig(payload);
      setInitialGlobalConfig(payload);
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
    if (!selectedMedia || !isMediaDirty) return;

    // Validate streams if user entered any URL
    const validStreams: CustomStreamLink[] = [];
    for (let i = 0; i < adminStreams.length; i++) {
      const st = adminStreams[i];
      if (st.customUrl && st.customUrl.trim()) {
        const cleaned = cleanStreamUrl(st.customUrl.trim());
        if (!cleaned) {
          setStreamSaveMessage({
            type: "error",
            text: `Invalid stream URL format for Server #${i + 1}`,
          });
          return;
        }
        validStreams.push({
          id: st.id || `stream-${i + 1}`,
          serverName: st.serverName?.trim() || `VIP Server ${i + 1}`,
          customUrl: cleaned,
          badge: st.badge?.trim() || "VIP",
        });
      }
    }

    const docId = selectedMedia.isMovie
      ? `movie_${selectedMedia.id}`
      : `tv_${selectedMedia.id}_${selectedSeason}_${selectedEpisode}`;

    // Clean empty server names & badges
    const cleanedNames: Record<string, string> = {};
    for (const [k, v] of Object.entries(perMediaServerNames)) {
      if (v && v.trim()) cleanedNames[k] = v.trim();
    }
    const cleanedBadges: Record<string, string> = {};
    for (const [k, v] of Object.entries(perMediaServerBadges)) {
      if (v && v.trim()) cleanedBadges[k] = v.trim();
    }

    const hasNames = Object.keys(cleanedNames).length > 0;
    const hasBadges = Object.keys(cleanedBadges).length > 0;

    // If no custom embeds, no hidden servers, not hideAll, and no overrides, clean up doc
    if (
      validStreams.length === 0 &&
      perMediaHiddenServers.length === 0 &&
      !perMediaHideAllDefaults &&
      !hasNames &&
      !hasBadges
    ) {
      if (initialMediaData) {
        setSavingStream(true);
        try {
          await deleteCustomStream(docId);
          setInitialMediaData(null);
          setStreamSaveMessage({ type: "success", text: "Custom settings cleared." });
          loadStreams();
          setTimeout(() => setStreamSaveMessage(null), 3000);
        } catch {
          setStreamSaveMessage({ type: "error", text: "Failed to clear settings." });
        } finally {
          setSavingStream(false);
        }
        return;
      } else {
        return;
      }
    }

    setSavingStream(true);
    setStreamSaveMessage(null);

    try {
      const primary = validStreams[0];

      const payload: CustomStreamData = {
        id: docId,
        mediaId: selectedMedia.id,
        mediaType: selectedMedia.isMovie ? "movie" : "tv",
        season: selectedMedia.isMovie ? 1 : selectedSeason,
        episode: selectedMedia.isMovie ? 1 : selectedEpisode,
        title: selectedMedia.title,
        poster: selectedMedia.poster,
        customUrl: primary ? primary.customUrl : "",
        serverName: primary ? primary.serverName : "",
        badge: primary ? primary.badge : "",
        streams: validStreams,
        serverNames: cleanedNames,
        serverBadges: cleanedBadges,
        hiddenServers: perMediaHiddenServers,
        hideDefaultServers: perMediaHideAllDefaults,
      };

      await saveCustomStream(payload);
      setInitialMediaData(payload);

      setStreamSaveMessage({
        type: "success",
        text: `Settings saved for ${selectedMedia.title} ${
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
    if (!confirm("Are you sure you want to remove all custom settings for this title?")) return;
    try {
      await deleteCustomStream(id);
      loadStreams();
      if (selectedMedia) {
        const docId = selectedMedia.isMovie
          ? `movie_${selectedMedia.id}`
          : `tv_${selectedMedia.id}_${selectedSeason}_${selectedEpisode}`;
        if (id === docId) {
          setInitialMediaData(null);
          setAdminStreams([
            { id: "stream-1", serverName: "VIP Server 1", customUrl: "", badge: "Custom VIP" },
          ]);
          setPerMediaServerNames({});
          setPerMediaServerBadges({});
          setPerMediaHiddenServers([]);
          setPerMediaHideAllDefaults(false);
        }
      }
    } catch {
      alert("Failed to delete stream link.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-4 bg-[#070A12]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 pt-4 bg-[#070A12]">
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
    <div className="min-h-screen bg-[#070A12] text-white pt-3 sm:pt-4 pb-16 px-3 sm:px-5 max-w-5xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914] shrink-0">
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

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-neutral-300 transition"
          >
            Back to App
          </Link>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Firestore Public Read Access Alert Banner */}
      {publicRuleStatus === "blocked" && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1">
              <p className="font-bold text-white text-xs sm:text-sm">
                Firebase Firestore Rules Blocking Unauthenticated Visitors
              </p>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Aapke Firebase Console me public read rules block hain. Is wajah se sirf aapke
                browser me data dikh raha hai (jahan aap admin login hain), aur doosre browsers /
                normal users ko default servers dikh rahe hain.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-400 pb-1.5 border-b border-white/10">
              <span className="font-semibold text-neutral-300">
                Fix in 1 Minute: Firebase Console ➔ Firestore Database ➔ Rules me paste karein:
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read: if true;\n      allow write: if request.auth != null;\n    }\n  }\n}`,
                  );
                  setCopiedRules(true);
                  setTimeout(() => setCopiedRules(false), 2500);
                }}
                className="text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition shrink-0"
              >
                {copiedRules ? "✓ Copied Rules!" : "Copy Rules"}
              </button>
            </div>
            <pre className="text-[10px] sm:text-[11px] leading-relaxed text-amber-300 font-mono overflow-x-auto p-1">
              {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}`}
            </pre>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => setActiveTab("servers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "servers"
              ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/30"
              : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Server Settings & Badges</span>
        </button>

        <button
          onClick={() => setActiveTab("streams")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "streams"
              ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/30"
              : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Custom Streams ({customStreams.length})</span>
        </button>
      </div>

      {/* TAB 1: Global Server Settings */}
      {activeTab === "servers" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="rounded-2xl bg-[#121620] border border-white/10 p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">Default Video Servers</h2>
                <p className="text-[11px] text-neutral-400">
                  Edit display names, badge labels, or hide individual servers globally across the
                  platform.
                </p>
              </div>

              {/* Global Hide Toggle */}
              <button
                type="button"
                onClick={() => setAllHidden(!allHidden)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 ${
                  allHidden
                    ? "bg-red-500/20 text-red-400 border-red-500/40"
                    : "bg-white/[0.05] text-neutral-300 border-white/10 hover:text-white"
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>{allHidden ? "All Default Servers Hidden" : "Hide All Default Servers"}</span>
              </button>
            </div>

            {configMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{configMessage}</span>
              </div>
            )}

            {/* Compact Servers Rows */}
            <div className="space-y-2">
              {DEFAULT_PLAY_SERVERS.map((server) => {
                const isCustomizedName = serverNames[server.id] !== undefined;
                const isCustomizedBadge = serverBadges[server.id] !== undefined;
                const currentName = isCustomizedName ? serverNames[server.id] : server.name;
                const currentBadge = isCustomizedBadge
                  ? serverBadges[server.id]
                  : server.badge || "";

                return (
                  <div
                    key={server.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition"
                  >
                    <div className="flex items-center gap-2 min-w-[130px] shrink-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-neutral-300">
                        <Server className="w-3.5 h-3.5 text-[#E50914]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block">
                          {server.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          ID: {server.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Name Input */}
                      <input
                        type="text"
                        value={currentName}
                        onChange={(e) =>
                          setServerNames((prev) => ({ ...prev, [server.id]: e.target.value }))
                        }
                        placeholder="Server Name"
                        className="flex-1 min-w-[110px] rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-[#E50914]"
                      />

                      {/* Badge Input */}
                      <input
                        type="text"
                        value={currentBadge}
                        onChange={(e) =>
                          setServerBadges((prev) => ({ ...prev, [server.id]: e.target.value }))
                        }
                        placeholder="Badge (HD/VIP)"
                        className="w-24 sm:w-28 rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-[#E50914]"
                      />

                      {/* Toggle Hide */}
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
                disabled={configSaving || !isConfigDirty}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition cursor-pointer",
                  isConfigDirty && !configSaving
                    ? "bg-[#E50914] hover:bg-[#b80710] text-white shadow-lg shadow-[#E50914]/25 active:scale-95"
                    : "bg-white/[0.06] text-neutral-500 border border-white/[0.06] cursor-not-allowed opacity-60",
                )}
              >
                {configSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {isConfigDirty ? "Save All Server Configs to Firebase" : "No Changes to Save"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Custom Streams Manager */}
      {activeTab === "streams" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Search / Select Media Box */}
          <div className="rounded-2xl bg-[#121620] border border-white/10 p-4 sm:p-5 space-y-4 shadow-xl">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Add or Edit Custom Streams & Server Overrides
              </h2>
              <p className="text-[11px] text-neutral-400">
                Search any Movie, Web Series, or Anime by Title or TMDB ID. You can attach embed
                links, rename default servers for this title, or hide servers.
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
                    <div className="h-14 w-10 shrink-0 rounded-xl overflow-hidden bg-black border border-white/10">
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

                {/* Season & Episode Selector for TV Series */}
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

                {/* Multiple Custom Embeds Form */}
                <form onSubmit={handleSaveCustomStream} className="space-y-4">
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

                  {/* Multiple Embed List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-300">
                          Custom Embed Links ({adminStreams.length})
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Optional: Leave URL blank if you only want to rename or hide default
                          servers.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAdminStream}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E50914]/20 hover:bg-[#E50914]/35 text-[#ff4d56] border border-[#E50914]/40 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Server</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {adminStreams.map((st, idx) => (
                        <div
                          key={st.id || idx}
                          className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Custom Server #{idx + 1}
                            </span>
                            {adminStreams.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAdminStream(idx)}
                                className="text-neutral-400 hover:text-red-400 p-1 transition cursor-pointer"
                                title="Remove server"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-neutral-300 block">
                              Direct Video Link (MP4, MKV, M3U8, WebM) or Embed Iframe URL
                            </label>
                            <textarea
                              rows={2}
                              value={st.customUrl}
                              onChange={(e) =>
                                handleAdminStreamChange(idx, "customUrl", e.target.value)
                              }
                              placeholder='Paste direct MP4, MKV, M3U8 video link or <iframe src="..."></iframe>'
                              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914] font-mono resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-neutral-300 block">
                                Server Display Name
                              </label>
                              <input
                                type="text"
                                value={st.serverName}
                                onChange={(e) =>
                                  handleAdminStreamChange(idx, "serverName", e.target.value)
                                }
                                placeholder={`VIP Server ${idx + 1}`}
                                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#E50914]"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-neutral-300 block">
                                Badge Label
                              </label>
                              <input
                                type="text"
                                value={st.badge || ""}
                                onChange={(e) =>
                                  handleAdminStreamChange(idx, "badge", e.target.value)
                                }
                                placeholder="VIP / HD / Hindi"
                                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#E50914]"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Per-Media Default Server Names, Badges & Visibility */}
                  <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-neutral-300 block">
                          Default Servers (Names, Badges & Visibility for this title):
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Rename or hide default servers specifically for this title.
                        </span>
                      </div>
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
                            ? "Only Custom Streams Visible"
                            : "Hide All Defaults for this"}
                        </span>
                      </button>
                    </div>

                    {!perMediaHideAllDefaults && (
                      <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                        {DEFAULT_PLAY_SERVERS.map((s) => {
                          const isHidden = perMediaHiddenServers.includes(s.id);
                          const currentName = perMediaServerNames[s.id] ?? "";
                          const currentBadge = perMediaServerBadges[s.id] ?? "";

                          return (
                            <div
                              key={s.id}
                              className={cn(
                                "flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border transition",
                                isHidden
                                  ? "bg-red-500/10 border-red-500/20"
                                  : "bg-white/[0.03] border-white/[0.06]",
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-[120px] shrink-0">
                                <span className="text-xs font-bold text-white truncate block">
                                  {s.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={currentName}
                                  onChange={(e) =>
                                    setPerMediaServerNames((prev) => ({
                                      ...prev,
                                      [s.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={s.name}
                                  className="flex-1 min-w-[90px] rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-1 focus:ring-[#E50914]"
                                />

                                <input
                                  type="text"
                                  value={currentBadge}
                                  onChange={(e) =>
                                    setPerMediaServerBadges((prev) => ({
                                      ...prev,
                                      [s.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={s.badge || "Badge"}
                                  className="w-20 sm:w-24 rounded-lg bg-black/40 border border-white/10 px-2 py-1 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-1 focus:ring-[#E50914]"
                                />

                                <button
                                  type="button"
                                  onClick={() => togglePerMediaHide(s.id)}
                                  className={cn(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border shrink-0",
                                    isHidden
                                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
                                  )}
                                >
                                  {isHidden ? (
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
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={savingStream || !isMediaDirty}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer",
                        isMediaDirty && !savingStream
                          ? "bg-[#E50914] hover:bg-[#b80710] text-white shadow-lg shadow-[#E50914]/25 active:scale-95"
                          : "bg-white/[0.06] text-neutral-500 border border-white/[0.06] cursor-not-allowed opacity-60",
                      )}
                    >
                      {savingStream ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>
                        {isMediaDirty
                          ? `Save Settings to Firebase (${adminStreams.filter((s) => s.customUrl?.trim()).length} stream(s))`
                          : "No Changes to Save"}
                      </span>
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
                  Active Custom Configurations in Firebase
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Custom stream links and server overrides currently active in Firestore.
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
                <p className="text-xs font-semibold text-neutral-300">
                  No Custom Configurations Stored
                </p>
                <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                  Use the search box above to find any movie or series and attach your custom embed
                  or customize servers.
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5 grid-cols-1 md:grid-cols-2">
                {filteredStreams.map((item) => {
                  const streamCount =
                    Array.isArray(item.streams) && item.streams.length > 0
                      ? item.streams.length
                      : item.customUrl
                        ? 1
                        : 0;

                  return (
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
                          {streamCount > 1
                            ? `${streamCount} Streams`
                            : streamCount === 1
                              ? item.serverName || "Custom Stream"
                              : "Overrides Only"}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-black/50 border border-white/5 text-[10px] font-mono text-neutral-400 truncate">
                        {item.customUrl ||
                          (item.streams && item.streams[0]?.customUrl) ||
                          (item.hideDefaultServers
                            ? "All Default Servers Hidden"
                            : `${item.hiddenServers?.length || 0} Default Server(s) Hidden`)}
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
