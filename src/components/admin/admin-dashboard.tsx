import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getAdminDisplayName } from "@/lib/admin-auth";
import {
  type EpisodeDoc,
  fetchAllConfiguredEpisodes,
  fetchSeasonEpisodesConfig,
  getEpisodeId,
  saveEpisodeConfig,
  deleteEpisodeConfig,
} from "@/lib/episodes.firebase";
import { fetchSearch, fetchShow, fetchSeason } from "@/lib/anime.functions";
import type { CardItem } from "@/lib/tmdb";
import { EpisodeEditor } from "./episode-editor";
import { AdminRolesManager } from "./admin-roles";
import { Img, img } from "@/components/anime/media";
import { cleanStreamUrl } from "@/lib/stream-utils";
import {
  IconSearch,
  IconEdit,
  IconPlay,
  IconLogOut,
  IconShield,
  IconDatabase,
  IconRotateCw,
  IconSparkles,
  IconClose,
  IconTrash,
} from "@/components/anime/icons";

interface AdminDashboardProps {
  onSignOut: () => void;
  initialAnimeId?: number;
  initialSeason?: number;
  initialEpisode?: number;
}

const POPULAR_SHORTCUTS = [
  "Solo Leveling",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "Attack on Titan",
  "One Piece",
  "Bleach",
  "Naruto",
];

export function AdminDashboard({
  onSignOut,
  initialAnimeId,
  initialSeason,
  initialEpisode,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"manager" | "bulk" | "directory" | "security">(
    "manager",
  );

  // Search & TMDB State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CardItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<{
    id: number;
    title: string;
    poster: string | null;
    seasons: { id: number; seasonNumber: number; name: string; episodeCount: number }[];
  } | null>(null);

  const [loadingShow, setLoadingShow] = useState(false);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<
    {
      id: number;
      episodeNumber: number;
      name: string;
      overview?: string;
      still?: string | null;
      airDate?: string;
      runtime?: number | null;
    }[]
  >([]);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [seasonFirebaseMap, setSeasonFirebaseMap] = useState<Map<string, EpisodeDoc>>(new Map());

  // Configured Episodes Directory Tab State
  const [allConfigured, setAllConfigured] = useState<EpisodeDoc[]>([]);
  const [loadingConfigured, setLoadingConfigured] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  // Editor Modal State
  const [editingEpisodeIndex, setEditingEpisodeIndex] = useState<number | null>(null);

  // Bulk Importer Modal & Tab State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkStartEp, setBulkStartEp] = useState(1);
  const [bulkSaving, setBulkSaving] = useState(false);

  const adminName = getAdminDisplayName();

  const refreshConfiguredList = async () => {
    setLoadingConfigured(true);
    try {
      const list = await fetchAllConfiguredEpisodes();
      setAllConfigured(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConfigured(false);
    }
  };

  useEffect(() => {
    if (activeTab === "directory") {
      void refreshConfiguredList();
    }
  }, [activeTab]);

  // Auto load anime & episode when redirected from "Add Link in Admin"
  useEffect(() => {
    if (!initialAnimeId) return;

    const autoLoadTarget = async () => {
      setLoadingShow(true);
      try {
        const details = await fetchShow({ data: { id: initialAnimeId } });
        if (details) {
          setSelectedAnime({
            id: details.id,
            title: details.title,
            poster: details.poster,
            seasons: details.seasons,
          });

          const targetSeason = initialSeason || details.seasons[0]?.seasonNumber || 1;
          setSelectedSeasonNumber(targetSeason);

          // Fetch Season Data
          setLoadingSeason(true);
          const [seasonRes, fbMap] = await Promise.all([
            fetchSeason({ data: { id: details.id, seasonNumber: targetSeason } }),
            fetchSeasonEpisodesConfig(details.id, targetSeason),
          ]);

          setSeasonEpisodes(seasonRes.episodes);
          setSeasonFirebaseMap(fbMap);

          // Find episode index to open
          if (initialEpisode) {
            const idx = seasonRes.episodes.findIndex((e) => e.episodeNumber === initialEpisode);
            if (idx !== -1) {
              setEditingEpisodeIndex(idx);
            }
          }
        }
      } catch (err) {
        console.error("Auto load failed:", err);
      } finally {
        setLoadingShow(false);
        setLoadingSeason(false);
      }
    };

    void autoLoadTarget();
  }, [initialAnimeId, initialSeason, initialEpisode]);

  // Search Anime (Bypassing safe/adult mode filter so admin can find EVERYTHING)
  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = (customQuery ?? searchQuery).trim();
    if (!q) return;

    setSearching(true);
    try {
      const res = await fetchSearch({ data: { q, bypassFilter: true } });
      setSearchResults(res.items);
      if (res.items.length === 0) {
        toast.info(`No anime found for "${q}". Try searching in English or Romanized title.`);
      }
    } catch {
      toast.error("Failed to search anime. Please check network connection.");
    } finally {
      setSearching(false);
    }
  };

  // Select an Anime from Search
  const handleSelectAnime = async (animeItem: CardItem) => {
    setLoadingShow(true);
    setSelectedAnime(null);
    setSelectedSeasonNumber(null);
    setSeasonEpisodes([]);
    try {
      const details = await fetchShow({ data: { id: animeItem.id } });
      setSelectedAnime({
        id: details.id,
        title: details.title,
        poster: details.poster,
        seasons: details.seasons,
      });

      const firstSeason = details.seasons[0]?.seasonNumber || 1;
      setSelectedSeasonNumber(firstSeason);
      await loadSeasonData(details.id, firstSeason);
    } catch {
      toast.error("Failed to load anime details.");
    } finally {
      setLoadingShow(false);
    }
  };

  // Load Season Data & Configs
  const loadSeasonData = async (animeId: number, seasonNum: number) => {
    setLoadingSeason(true);
    try {
      const [seasonRes, fbMap] = await Promise.all([
        fetchSeason({ data: { id: animeId, seasonNumber: seasonNum } }),
        fetchSeasonEpisodesConfig(animeId, seasonNum),
      ]);
      setSeasonEpisodes(seasonRes.episodes);
      setSeasonFirebaseMap(fbMap);
    } catch {
      toast.error("Failed to load season episodes.");
    } finally {
      setLoadingSeason(false);
    }
  };

  const handleSelectSeason = (seasonNum: number) => {
    if (!selectedAnime) return;
    setSelectedSeasonNumber(seasonNum);
    void loadSeasonData(selectedAnime.id, seasonNum);
  };

  // Parse bulk lines helper
  const parsedBulkLinks = useMemo(() => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((rawLine, idx) => {
      const match = rawLine.match(/(?:https?:\/\/[^\s]+)/i);
      const url = match ? match[0] : rawLine;
      const cleaned = cleanStreamUrl(url);
      const targetEpNum = bulkStartEp + idx;
      const matchedEp = seasonEpisodes.find((e) => e.episodeNumber === targetEpNum);

      return {
        line: idx + 1,
        raw: rawLine,
        url: cleaned,
        episodeNumber: targetEpNum,
        episodeTitle: matchedEp?.name || `Episode ${targetEpNum}`,
        isValid: Boolean(cleaned),
      };
    });
  }, [bulkText, bulkStartEp, seasonEpisodes]);

  // Handle Bulk Links Save
  const handleBulkSave = async () => {
    if (!selectedAnime || selectedSeasonNumber === null) {
      toast.error("Please select an Anime and Season first.");
      return;
    }

    const validItems = parsedBulkLinks.filter((item) => item.isValid);
    if (validItems.length === 0) {
      toast.error("Please paste at least one valid stream URL.");
      return;
    }

    setBulkSaving(true);
    try {
      let savedCount = 0;
      for (const item of validItems) {
        const epData = seasonEpisodes.find((e) => e.episodeNumber === item.episodeNumber);
        const epId = getEpisodeId(selectedAnime.id, selectedSeasonNumber, item.episodeNumber);

        const config: Omit<EpisodeDoc, "updatedAt"> = {
          id: epId,
          animeId: selectedAnime.id,
          animeTitle: selectedAnime.title,
          season: selectedSeasonNumber,
          episode: item.episodeNumber,
          episodeTitle: epData?.name || `Episode ${item.episodeNumber}`,
          thumbnail: epData?.still || selectedAnime.poster || null,
          server1: { url: item.url },
          server2: null,
          activeServer: 1,
          updatedBy: adminName,
        };

        await saveEpisodeConfig(config);
        savedCount++;
      }

      toast.success(`Successfully saved links for ${savedCount} episodes!`);
      setBulkText("");
      setBulkModalOpen(false);
      await loadSeasonData(selectedAnime.id, selectedSeasonNumber);
      if (activeTab === "bulk") {
        setActiveTab("manager");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save bulk episodes.");
    } finally {
      setBulkSaving(false);
    }
  };

  // Episode currently being edited in modal
  const activeEditingEpisode =
    editingEpisodeIndex !== null && seasonEpisodes[editingEpisodeIndex]
      ? seasonEpisodes[editingEpisodeIndex]
      : null;

  const activeExistingConfig =
    activeEditingEpisode && selectedAnime && selectedSeasonNumber !== null
      ? seasonFirebaseMap.get(
          getEpisodeId(selectedAnime.id, selectedSeasonNumber, activeEditingEpisode.episodeNumber),
        )
      : null;

  // Filtered active links for Directory tab
  const filteredActiveLinks = useMemo(() => {
    if (!filterQuery.trim()) return allConfigured;
    const q = filterQuery.toLowerCase().trim();
    return allConfigured.filter(
      (ep) =>
        ep.animeTitle.toLowerCase().includes(q) ||
        ep.episodeTitle.toLowerCase().includes(q) ||
        `ep ${ep.episode}`.includes(q) ||
        `s${ep.season}e${ep.episode}`.includes(q) ||
        (ep.server1?.url && ep.server1.url.toLowerCase().includes(q)),
    );
  }, [allConfigured, filterQuery]);

  return (
    <div className="min-h-screen bg-[#070A12] text-[#f1f5f9] pb-20 w-full max-w-full overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070A12]/95 backdrop-blur-xl px-3 sm:px-6 py-3 w-full">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] border border-white/10 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition shrink-0"
            >
              ← <span className="hidden xs:inline">Back to</span> Site
            </Link>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">
                Admin Panel
              </span>
              <span className="hidden sm:inline-block rounded-md bg-[#6366f1]/20 px-2 py-0.5 text-[10px] font-black text-[#818cf8] border border-[#6366f1]/30 truncate">
                {adminName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer active:scale-95"
            >
              <IconLogOut width={14} height={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-6 pt-5 space-y-5 w-full">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none w-full min-w-0">
          <button
            onClick={() => setActiveTab("manager")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 active:scale-95 ${
              activeTab === "manager"
                ? "bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/30"
                : "bg-white/[0.04] text-[#94a3b8] hover:text-white"
            }`}
          >
            <IconEdit width={14} height={14} />
            Stream Editor
          </button>

          <button
            onClick={() => setActiveTab("bulk")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 active:scale-95 ${
              activeTab === "bulk"
                ? "bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/30"
                : "bg-white/[0.04] text-[#94a3b8] hover:text-white"
            }`}
          >
            <IconSparkles width={14} height={14} />
            Bulk Paste
          </button>

          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 active:scale-95 ${
              activeTab === "directory"
                ? "bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/30"
                : "bg-white/[0.04] text-[#94a3b8] hover:text-white"
            }`}
          >
            <IconDatabase width={14} height={14} />
            Active Links ({allConfigured.length})
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 active:scale-95 ${
              activeTab === "security"
                ? "bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/30"
                : "bg-white/[0.04] text-[#94a3b8] hover:text-white"
            }`}
          >
            <IconShield width={14} height={14} />
            Passwords
          </button>
        </div>

        {/* TAB 1: STREAM EDITOR */}
        {activeTab === "manager" && (
          <div className="space-y-5 w-full">
            {/* Search Anime Box */}
            <div className="rounded-3xl border border-white/10 bg-[#0c101a] p-4 sm:p-6 space-y-3.5 w-full overflow-hidden">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <IconSearch width={16} height={16} className="text-[#818cf8]" />
                  Search Anime to Configure Links
                </h2>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Type any anime title below. Bas 1 link paste karein aur live play karein.
                </p>
              </div>

              <form onSubmit={handleSearch} className="flex gap-2 w-full">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search anime (e.g. Jujutsu Kaisen, Solo Leveling, Bleach)..."
                    className="w-full rounded-2xl bg-white/[0.05] border border-white/10 pl-9 pr-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-white placeholder:text-neutral-500 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] focus:outline-none transition"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                    <IconSearch width={15} height={15} />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="rounded-2xl bg-[#6366f1] px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#4f46e5] transition shadow-md shadow-[#6366f1]/30 cursor-pointer disabled:opacity-50 shrink-0 active:scale-95"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </form>

              {/* Popular quick shortcuts */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-[#94a3b8] font-medium mr-1">Quick:</span>
                {POPULAR_SHORTCUTS.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => {
                      setSearchQuery(title);
                      void handleSearch(undefined, title);
                    }}
                    className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-[#cbd5e1] hover:bg-[#6366f1]/20 hover:border-[#6366f1]/50 hover:text-white transition cursor-pointer active:scale-95"
                  >
                    {title}
                  </button>
                ))}
              </div>

              {/* Search Results Grid */}
              {searchResults.length > 0 && (
                <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                      Select Anime ({searchResults.length} results):
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSearchResults([])}
                      className="text-[11px] text-[#94a3b8] hover:text-white"
                    >
                      Clear Results
                    </button>
                  </div>

                  <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          void handleSelectAnime(item);
                          setSearchResults([]);
                        }}
                        className={`flex items-center gap-3 rounded-2xl p-2.5 text-left border transition cursor-pointer active:scale-[0.98] w-full min-w-0 overflow-hidden ${
                          selectedAnime?.id === item.id
                            ? "bg-[#6366f1]/20 border-[#818cf8] ring-1 ring-[#818cf8]/50"
                            : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                        }`}
                      >
                        <Img
                          src={img(item.poster, "w185")}
                          alt={item.title}
                          className="h-14 w-10 shrink-0 object-cover rounded-xl shadow-md"
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="text-xs sm:text-sm font-bold text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[#94a3b8] mt-0.5 truncate">
                            {item.year || "Anime"} · Rating {item.rating || "N/A"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Anime Episodes List */}
            {selectedAnime && (
              <div className="rounded-3xl border border-white/10 bg-[#0c101a] p-4 sm:p-6 space-y-4 w-full overflow-hidden animate-in fade-in duration-300">
                {/* Anime Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-4 border-b border-white/10 w-full min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Img
                      src={img(selectedAnime.poster, "w185")}
                      alt={selectedAnime.title}
                      className="h-14 w-11 shrink-0 object-cover rounded-xl shadow-md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-white truncate">
                          {selectedAnime.title}
                        </h2>
                        <Link
                          to="/anime/$id"
                          params={{ id: String(selectedAnime.id) }}
                          className="text-[11px] text-[#818cf8] hover:underline shrink-0"
                        >
                          View Site Page ↗
                        </Link>
                      </div>
                      <p className="text-xs text-[#94a3b8] truncate mt-0.5">
                        Season {selectedSeasonNumber || 1} · {seasonEpisodes.length} Episodes Total
                      </p>
                    </div>
                  </div>

                  {/* Bulk Paste Quick Trigger Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBulkModalOpen(true)}
                      className="rounded-xl bg-[#6366f1]/20 border border-[#6366f1]/40 px-3 py-2 text-xs font-bold text-[#a5b4fc] hover:bg-[#6366f1] hover:text-white transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                    >
                      <IconSparkles width={14} height={14} /> ⚡ Bulk Paste Season Links
                    </button>
                  </div>
                </div>

                {/* Season Pills Tabs (Safe Horizontal Scroll) */}
                <div className="w-full min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1.5 w-full">
                    {selectedAnime.seasons.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSeason(s.seasonNumber)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 active:scale-95 ${
                          selectedSeasonNumber === s.seasonNumber
                            ? "bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/30"
                            : "bg-white/[0.04] text-[#94a3b8] hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {s.name} ({s.episodeCount} eps)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Episodes Grid - No Horizontal Overflow */}
                {loadingSeason ? (
                  <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-16 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse"
                      />
                    ))}
                  </div>
                ) : seasonEpisodes.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#94a3b8]">
                    No episode list found for this season.
                  </div>
                ) : (
                  <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
                    {seasonEpisodes.map((ep, idx) => {
                      const epId = getEpisodeId(
                        selectedAnime.id,
                        selectedSeasonNumber || 1,
                        ep.episodeNumber,
                      );
                      const epConfig = seasonFirebaseMap.get(epId);
                      const s1 = Boolean(epConfig?.server1?.url);
                      const s2 = Boolean(epConfig?.server2?.url);
                      const hasStream = s1 || s2;

                      return (
                        <div
                          key={ep.id}
                          className={`flex items-center justify-between gap-2.5 p-2.5 rounded-2xl border transition w-full min-w-0 overflow-hidden ${
                            hasStream
                              ? "border-emerald-500/30 bg-[#0a151b]/70"
                              : "border-white/10 bg-[#0e1320] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                            <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-xl bg-black">
                              <Img
                                src={img(ep.still || selectedAnime.poster, "w185")}
                                alt={ep.name}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/85 px-1 py-0.2 text-[9px] font-black text-white">
                                E{ep.episodeNumber}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="truncate text-xs font-bold text-white leading-tight">
                                {ep.name || `Episode ${ep.episodeNumber}`}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5">
                                {hasStream ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 truncate">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399] shrink-0" />
                                    Link Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-neutral-500 font-medium">
                                    No Link Yet
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setEditingEpisodeIndex(idx)}
                            className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer active:scale-95 shrink-0 flex items-center justify-center gap-1 ${
                              hasStream
                                ? "bg-white/[0.08] text-white hover:bg-white/20 border border-white/10"
                                : "bg-[#6366f1] text-white hover:bg-[#4f46e5] shadow-md shadow-[#6366f1]/30"
                            }`}
                          >
                            <IconEdit width={11} height={11} />
                            <span>{hasStream ? "Edit" : "+ Link"}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BULK SEASON PASTE (SUPER SIMPLE & CLEAR) */}
        {activeTab === "bulk" && (
          <div className="rounded-3xl border border-white/10 bg-[#0c101a] p-4 sm:p-6 space-y-4 w-full max-w-3xl overflow-hidden">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <IconSparkles width={18} height={18} className="text-[#818cf8]" /> ⚡ Bulk Episode
                Links Importer
              </h2>
              <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                Poore season ke saare links ek sath paste karein. System automatic har episode ko
                link assign kar dega.
              </p>
            </div>

            {/* Step-by-Step Hindi Guide */}
            <div className="rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/25 p-3.5 space-y-1.5 text-xs text-[#cbd5e1]">
              <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                💡 Kaise use karein? (Simple 3 Steps):
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#94a3b8] pl-1">
                <li>
                  <strong className="text-white">Step 1:</strong> Apne video links copy karein (mp4,
                  m3u8, abyss, ya iframe url).
                </li>
                <li>
                  <strong className="text-white">Step 2:</strong> Yahan line-by-line paste karein:
                  <code className="text-[#818cf8] ml-1 bg-black/40 px-1.5 py-0.5 rounded">
                    Line 1 = Ep 1, Line 2 = Ep 2...
                  </code>
                </li>
                <li>
                  <strong className="text-white">Step 3:</strong> "Auto-Save All Episodes" dabayein.
                  Bas, saare episodes ek sath live!
                </li>
              </ul>
            </div>

            {!selectedAnime ? (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 text-xs text-amber-300 space-y-3">
                <p>
                  ⚠️ Pehle koi <strong>Anime</strong> search karke select karein jiske episodes me
                  links daalne hain.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("manager")}
                    className="rounded-xl bg-[#6366f1] px-4 py-2 text-xs font-bold text-white hover:bg-[#4f46e5] transition"
                  >
                    Go to Search Anime →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                {/* Target Anime Info Card */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider block">
                      Target Anime:
                    </span>
                    <p className="text-sm font-bold text-white truncate">{selectedAnime.title}</p>
                    <p className="text-xs text-[#818cf8] font-semibold mt-0.5">
                      Season {selectedSeasonNumber || 1} ({seasonEpisodes.length} Episodes)
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("manager")}
                    className="text-xs text-[#818cf8] hover:underline px-2.5 py-1 rounded-lg bg-white/[0.05]"
                  >
                    Change Anime
                  </button>
                </div>

                {/* Starting Episode Config */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-white">Start from Episode:</label>
                  <input
                    type="number"
                    min={1}
                    max={seasonEpisodes.length || 100}
                    value={bulkStartEp}
                    onChange={(e) => setBulkStartEp(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 rounded-xl bg-white/[0.05] border border-white/10 px-3 py-1.5 text-xs text-white font-bold text-center focus:border-[#6366f1] focus:outline-none"
                  />
                  <span className="text-[11px] text-[#94a3b8]">
                    (Agar Episode 1 se shuru karna hai to 1 rehne dein)
                  </span>
                </div>

                {/* Textarea for Bulk Links */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#94a3b8]">
                      Paste Links Here (1 Line = 1 Episode):
                    </label>
                    <span className="text-[11px] text-[#818cf8] font-bold">
                      {parsedBulkLinks.filter((p) => p.isValid).length} valid links detected
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`https://as-cdn21.top/video/ep1.mp4\nhttps://as-cdn21.top/video/ep2.mp4\nhttps://as-cdn21.top/video/ep3.mp4`}
                    className="w-full rounded-2xl bg-white/[0.05] border border-white/10 p-3.5 text-xs font-mono text-white placeholder:text-neutral-600 focus:border-[#6366f1] focus:outline-none"
                  />
                </div>

                {/* Live Assignment Preview */}
                {parsedBulkLinks.length > 0 && (
                  <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-3 space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                      Assignment Preview:
                    </p>
                    <div className="space-y-1.5">
                      {parsedBulkLinks.map((item) => (
                        <div
                          key={item.line}
                          className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-white/[0.04]"
                        >
                          <span className="font-bold text-[#818cf8] shrink-0">
                            Ep {item.episodeNumber}:
                          </span>
                          <span className="text-[#cbd5e1] truncate flex-1 font-mono">
                            {item.url || <span className="text-rose-400">Invalid link</span>}
                          </span>
                          <span className="text-[10px] text-neutral-400 truncate max-w-[120px]">
                            {item.episodeTitle}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={bulkSaving || parsedBulkLinks.filter((p) => p.isValid).length === 0}
                  className="w-full sm:w-auto rounded-2xl bg-[#6366f1] px-6 py-3 text-xs font-bold text-white hover:bg-[#4f46e5] transition shadow-lg shadow-[#6366f1]/30 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  <IconSparkles width={15} height={15} />
                  {bulkSaving
                    ? "Saving All Episodes..."
                    : `⚡ Auto-Save All ${parsedBulkLinks.filter((p) => p.isValid).length} Episodes`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ALL ACTIVE LINKS DIRECTORY */}
        {activeTab === "directory" && (
          <div className="rounded-3xl border border-white/10 bg-[#0c101a] p-4 sm:p-6 space-y-4 w-full overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  All Configured Streaming Episodes
                </h2>
                <p className="text-xs text-[#94a3b8]">
                  Total {allConfigured.length} active episodes saved in database.
                </p>
              </div>
              <button
                onClick={refreshConfiguredList}
                className="p-2 rounded-xl bg-white/[0.05] text-[#94a3b8] hover:text-white transition cursor-pointer active:scale-95"
                title="Refresh List"
              >
                <IconRotateCw width={16} height={16} />
              </button>
            </div>

            {/* Filter Input */}
            <div className="relative w-full">
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search by anime name, episode title, or number (e.g. Bleach, S1E2)..."
                className="w-full rounded-2xl bg-white/[0.05] border border-white/10 pl-9 pr-9 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:border-[#6366f1] focus:outline-none"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                <IconSearch width={14} height={14} />
              </div>
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <IconClose width={14} height={14} />
                </button>
              )}
            </div>

            {loadingConfigured ? (
              <div className="py-12 text-center text-xs text-[#94a3b8]">
                Loading active links from database...
              </div>
            ) : filteredActiveLinks.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#94a3b8]">
                {filterQuery
                  ? `No active episodes match "${filterQuery}".`
                  : "No stream links configured yet."}
              </div>
            ) : (
              <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
                {filteredActiveLinks.map((ep) => (
                  <div
                    key={ep.id}
                    className="rounded-2xl border border-white/10 bg-[#0e1320] p-3 flex items-center justify-between gap-2.5 w-full min-w-0 overflow-hidden hover:border-white/20 transition"
                  >
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-[#6366f1]/20 px-1.5 py-0.5 text-[9px] font-black text-[#818cf8] shrink-0">
                          S{ep.season} E{ep.episode}
                        </span>
                        <p className="text-xs font-bold text-white truncate">{ep.animeTitle}</p>
                      </div>
                      <p className="text-[10px] text-[#94a3b8] truncate mt-1">
                        {ep.episodeTitle || `Episode ${ep.episode}`}
                      </p>
                      <p className="text-[9px] text-[#64748b] truncate mt-0.5 font-mono">
                        {ep.server1?.url || ep.server2?.url}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        to="/anime/$id/watch"
                        params={{ id: String(ep.animeId) }}
                        search={{ season: ep.season, episode: ep.episode }}
                        className="p-2 rounded-xl bg-white/[0.05] text-[#818cf8] hover:bg-[#6366f1] hover:text-white transition"
                        title="Watch Stream"
                      >
                        <IconPlay width={14} height={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SECURITY & PASSWORDS */}
        {activeTab === "security" && <AdminRolesManager />}
      </main>

      {/* INLINE BULK MODAL (When triggered from anime episode list) */}
      {bulkModalOpen && selectedAnime && selectedSeasonNumber !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-3 sm:p-4 backdrop-blur-md">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0c101a] p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-[#f1f5f9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <IconSparkles width={16} height={16} className="text-[#818cf8]" /> ⚡ Bulk Paste
                  Links for {selectedAnime.title}
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Season {selectedSeasonNumber} ({seasonEpisodes.length} Episodes)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 rounded-full text-[#94a3b8] hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <IconClose width={18} height={18} />
              </button>
            </div>

            {/* Quick explanation */}
            <div className="rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/25 p-3 text-xs text-[#cbd5e1] space-y-1">
              <p className="font-bold text-white">💡 Easy Rule:</p>
              <p className="text-[11px] text-[#94a3b8]">
                Har line ek episode hai. Line 1 = Ep 1, Line 2 = Ep 2. Saare links ek sath paste
                karke Save kar dein.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">Paste Video Stream Links:</label>
                <span className="text-[11px] text-[#818cf8] font-bold">
                  {parsedBulkLinks.filter((p) => p.isValid).length} Links Ready
                </span>
              </div>
              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`https://as-cdn21.top/video/ep1.mp4\nhttps://as-cdn21.top/video/ep2.mp4\nhttps://as-cdn21.top/video/ep3.mp4`}
                className="w-full rounded-2xl bg-white/[0.05] border border-white/10 p-3.5 text-xs font-mono text-white placeholder:text-neutral-600 focus:border-[#6366f1] focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2 text-xs font-bold text-[#94a3b8] hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkSave}
                disabled={bulkSaving || parsedBulkLinks.filter((p) => p.isValid).length === 0}
                className="rounded-xl bg-[#6366f1] px-5 py-2 text-xs font-bold text-white hover:bg-[#4f46e5] transition shadow-md shadow-[#6366f1]/30 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
              >
                <IconSparkles width={14} height={14} />
                {bulkSaving ? "Saving..." : "⚡ Save All Episodes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Fast Episode Editor Modal */}
      {activeEditingEpisode && selectedAnime && selectedSeasonNumber !== null && (
        <EpisodeEditor
          anime={selectedAnime}
          seasonNumber={selectedSeasonNumber}
          episode={activeEditingEpisode}
          existingConfig={activeExistingConfig}
          onClose={() => setEditingEpisodeIndex(null)}
          onSaved={() => {
            void loadSeasonData(selectedAnime.id, selectedSeasonNumber);
          }}
          hasPrevEpisode={editingEpisodeIndex !== null && editingEpisodeIndex > 0}
          hasNextEpisode={
            editingEpisodeIndex !== null && editingEpisodeIndex < seasonEpisodes.length - 1
          }
          onNavigateEpisode={(dir) => {
            if (editingEpisodeIndex !== null) {
              const newIdx = editingEpisodeIndex + dir;
              if (newIdx >= 0 && newIdx < seasonEpisodes.length) {
                setEditingEpisodeIndex(newIdx);
              }
            }
          }}
        />
      )}
    </div>
  );
}
