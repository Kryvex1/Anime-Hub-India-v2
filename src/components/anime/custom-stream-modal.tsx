import { useState, useEffect, useMemo } from "react";
import {
  X,
  Tv,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Eye,
  Plus,
} from "lucide-react";
import { cleanStreamUrl } from "@/lib/stream-utils";
import {
  saveCustomStream,
  deleteCustomStream,
  fetchCustomStream,
  type CustomStreamData,
  type CustomStreamLink,
} from "@/lib/firebase";
import { DEFAULT_PLAY_SERVERS } from "@/lib/viduki";
import { cn } from "@/lib/utils";

interface CustomStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  title?: string;
  poster?: string | null;
  onSaved?: () => void;
}

export function CustomStreamModal({
  isOpen,
  onClose,
  mediaId,
  mediaType,
  season = 1,
  episode = 1,
  title = "Media Title",
  poster = null,
  onSaved,
}: CustomStreamModalProps) {
  const [streams, setStreams] = useState<CustomStreamLink[]>([
    { id: "stream-1", serverName: "VIP Server 1", customUrl: "", badge: "Custom VIP" },
  ]);
  const [perMediaServerNames, setPerMediaServerNames] = useState<Record<string, string>>({});
  const [perMediaServerBadges, setPerMediaServerBadges] = useState<Record<string, string>>({});
  const [hiddenServers, setHiddenServers] = useState<string[]>([]);
  const [hideDefaultServers, setHideDefaultServers] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingData, setExistingData] = useState<CustomStreamData | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    setFetching(true);
    setError(null);
    setSuccess(null);

    fetchCustomStream(mediaType, mediaId, season, episode).then((data) => {
      setExistingData(data);
      if (data) {
        if (Array.isArray(data.streams) && data.streams.length > 0) {
          setStreams(
            data.streams.map((s, idx) => ({
              id: s.id || `stream-${idx + 1}`,
              serverName: s.serverName || `VIP Server ${idx + 1}`,
              customUrl: s.customUrl || "",
              badge: s.badge || "VIP",
            })),
          );
        } else if (data.customUrl) {
          setStreams([
            {
              id: "stream-1",
              serverName: data.serverName || "VIP Server",
              customUrl: data.customUrl || "",
              badge: data.badge || "Custom VIP",
            },
          ]);
        } else {
          setStreams([
            { id: "stream-1", serverName: "VIP Server 1", customUrl: "", badge: "Custom VIP" },
          ]);
        }
        setPerMediaServerNames(data.serverNames || {});
        setPerMediaServerBadges(data.serverBadges || {});
        setHiddenServers(data.hiddenServers || []);
        setHideDefaultServers(Boolean(data.hideDefaultServers));
      } else {
        setStreams([
          { id: "stream-1", serverName: "VIP Server 1", customUrl: "", badge: "Custom VIP" },
        ]);
        setPerMediaServerNames({});
        setPerMediaServerBadges({});
        setHiddenServers([]);
        setHideDefaultServers(false);
      }
      setFetching(false);
    });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, mediaId, mediaType, season, episode]);

  // Dirty checking to enable Save button only when actual changes are made
  const isDirty = useMemo(() => {
    if (fetching) return false;

    // Check visibility flags
    const prevHideAll = Boolean(existingData?.hideDefaultServers);
    if (hideDefaultServers !== prevHideAll) return true;

    const prevHidden = (existingData?.hiddenServers || []).slice().sort();
    const currHidden = hiddenServers.slice().sort();
    if (prevHidden.length !== currHidden.length) return true;
    for (let i = 0; i < prevHidden.length; i++) {
      if (prevHidden[i] !== currHidden[i]) return true;
    }

    // Check per-media server names and badges
    const prevNames = existingData?.serverNames || {};
    for (const key of Object.keys({ ...prevNames, ...perMediaServerNames })) {
      if ((perMediaServerNames[key] || "").trim() !== (prevNames[key] || "").trim()) return true;
    }

    const prevBadges = existingData?.serverBadges || {};
    for (const key of Object.keys({ ...prevBadges, ...perMediaServerBadges })) {
      if ((perMediaServerBadges[key] || "").trim() !== (prevBadges[key] || "").trim()) return true;
    }

    // Check custom streams
    const existingStreams =
      Array.isArray(existingData?.streams) && existingData!.streams.length > 0
        ? existingData!.streams
        : existingData?.customUrl
          ? [
              {
                serverName: existingData.serverName || "VIP Server",
                customUrl: existingData.customUrl,
                badge: existingData.badge || "VIP",
              },
            ]
          : [];

    const activeStreams = streams.filter((s) => s.customUrl && s.customUrl.trim());

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
    fetching,
    existingData,
    hideDefaultServers,
    hiddenServers,
    perMediaServerNames,
    perMediaServerBadges,
    streams,
  ]);

  if (!isOpen) return null;

  const handleAddStream = () => {
    setStreams((prev) => [
      ...prev,
      {
        id: `stream-${Date.now()}`,
        serverName: `VIP Server ${prev.length + 1}`,
        customUrl: "",
        badge: "VIP",
      },
    ]);
  };

  const handleRemoveStream = (index: number) => {
    setStreams((prev) => {
      if (prev.length <= 1) {
        return [{ id: "stream-1", serverName: "VIP Server 1", customUrl: "", badge: "Custom VIP" }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleStreamChange = (
    index: number,
    field: "serverName" | "customUrl" | "badge",
    val: string,
  ) => {
    setStreams((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleToggleServerHide = (serverId: string) => {
    setHiddenServers((prev) =>
      prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId],
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;

    // Validate streams if user entered anything in customUrl
    const validStreams: CustomStreamLink[] = [];
    for (let i = 0; i < streams.length; i++) {
      const st = streams[i];
      if (st.customUrl && st.customUrl.trim()) {
        const cleaned = cleanStreamUrl(st.customUrl.trim());
        if (!cleaned) {
          setError(`Invalid embed format for Server #${i + 1}`);
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

    const docId = mediaType === "movie" ? `movie_${mediaId}` : `tv_${mediaId}_${season}_${episode}`;

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

    // If no streams, no hidden servers, not hideAll, and no overrides, clean up doc if exists
    if (
      validStreams.length === 0 &&
      hiddenServers.length === 0 &&
      !hideDefaultServers &&
      !hasNames &&
      !hasBadges
    ) {
      if (existingData) {
        setLoading(true);
        try {
          await deleteCustomStream(docId);
          setSuccess("Settings cleared.");
          setTimeout(() => {
            setLoading(false);
            onClose();
            if (onSaved) onSaved();
          }, 500);
        } catch {
          setLoading(false);
          setError("Failed to clear settings.");
        }
        return;
      } else {
        onClose();
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const primary = validStreams[0];
      await saveCustomStream({
        id: docId,
        mediaId,
        mediaType,
        season,
        episode,
        title,
        poster,
        customUrl: primary ? primary.customUrl : "",
        serverName: primary ? primary.serverName : "",
        badge: primary ? primary.badge : "",
        streams: validStreams,
        serverNames: cleanedNames,
        serverBadges: cleanedBadges,
        hiddenServers,
        hideDefaultServers,
      });

      setSuccess("Changes saved successfully to Firebase!");
      setTimeout(() => {
        setLoading(false);
        onClose();
        if (onSaved) onSaved();
      }, 600);
    } catch {
      setLoading(false);
      setError("Failed to save to Firebase. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove all custom settings for this title?")) return;

    setLoading(true);
    try {
      const docId = getStreamDocId(mediaType, mediaId, season, episode);
      await deleteCustomStream(docId);
      if (existingData?.id && existingData.id !== docId) {
        await deleteCustomStream(existingData.id).catch(() => {});
      }
      if (mediaType === "tv") {
        await deleteCustomStream(`tv_${mediaId}`).catch(() => {});
      }
      setSuccess("Custom settings removed.");
      setTimeout(() => {
        setLoading(false);
        onClose();
        if (onSaved) onSaved();
      }, 500);
    } catch {
      setLoading(false);
      setError("Failed to delete custom stream.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden overscroll-none touch-none select-none transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-none rounded-3xl bg-[#12141A] border border-white/10 p-4 sm:p-6 shadow-2xl shadow-black/90 transition-all scale-in touch-auto select-text"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pr-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E50914]/20 text-[#E50914]">
              <Tv className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white truncate">
              {existingData ? "Edit Custom Streams & Servers" : "Add Custom Streams & Servers"}
            </h2>
          </div>
          <p className="text-xs text-neutral-400 truncate">
            {title} {mediaType === "tv" ? `(Season ${season}, Episode ${episode})` : "(Movie)"}
          </p>
        </div>

        {fetching ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#E50914]" />
            <span className="text-xs">Fetching current configuration...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Multiple Custom Stream List (Optional) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-neutral-300">
                    Custom Embed Links ({streams.length})
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Optional: Leave empty if you only want to rename or hide default servers.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddStream}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E50914]/20 hover:bg-[#E50914]/35 text-[#ff4d56] border border-[#E50914]/40 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Server</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[36vh] overflow-y-auto pr-1">
                {streams.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Custom Server #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStream(idx)}
                        className="text-neutral-400 hover:text-red-400 p-1 transition cursor-pointer"
                        title="Clear/Remove this server"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-neutral-300 block">
                        Direct Video Link (MP4, MKV, M3U8, WebM) or Embed Iframe URL
                      </label>
                      <textarea
                        rows={2}
                        value={st.customUrl}
                        onChange={(e) => handleStreamChange(idx, "customUrl", e.target.value)}
                        placeholder='https://.../video.mp4, .mkv, .m3u8 or <iframe src="https://..."></iframe>'
                        className="w-full rounded-xl bg-black/40 border border-white/[0.08] px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914] font-mono resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-neutral-300 block">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={st.serverName}
                          onChange={(e) => handleStreamChange(idx, "serverName", e.target.value)}
                          placeholder={`VIP Server ${idx + 1}`}
                          className="w-full rounded-xl bg-black/40 border border-white/[0.08] px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-neutral-300 block">
                          Badge Label
                        </label>
                        <input
                          type="text"
                          value={st.badge || ""}
                          onChange={(e) => handleStreamChange(idx, "badge", e.target.value)}
                          placeholder="VIP / HD / Hindi"
                          className="w-full rounded-xl bg-black/40 border border-white/[0.08] px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-Media Default Servers Custom Names, Badges & Visibility */}
            <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-300 block">
                    Default Servers (Names, Badges & Visibility for this title):
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Customize names or hide specific default servers only for this title.
                  </span>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-neutral-400 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={hideDefaultServers}
                    onChange={(e) => setHideDefaultServers(e.target.checked)}
                    className="accent-[#E50914] rounded cursor-pointer"
                  />
                  <span>Hide All Defaults</span>
                </label>
              </div>

              {!hideDefaultServers && (
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                  {DEFAULT_PLAY_SERVERS.map((s) => {
                    const isHidden = hiddenServers.includes(s.id);
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
                            onClick={() => handleToggleServerHide(s.id)}
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

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={loading || !isDirty}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer",
                  isDirty && !loading
                    ? "bg-[#E50914] hover:bg-[#b80710] text-white shadow-lg shadow-[#E50914]/25 active:scale-95"
                    : "bg-white/[0.06] text-neutral-500 border border-white/[0.06] cursor-not-allowed opacity-60",
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isDirty ? "Save to Firebase" : "No Changes to Save"}</span>
              </button>

              {existingData && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 border border-white/10 px-4 py-2.5 text-xs font-semibold text-neutral-300 transition cursor-pointer"
                  title="Remove all custom links"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
