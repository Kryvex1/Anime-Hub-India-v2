import { useState, useEffect } from "react";
import { X, Tv, Save, Trash2, Loader2, CheckCircle2, AlertCircle, EyeOff, Eye } from "lucide-react";
import { cleanStreamUrl } from "@/lib/stream-utils";
import {
  saveCustomStream,
  deleteCustomStream,
  fetchCustomStream,
  type CustomStreamData,
} from "@/lib/firebase";
import { DEFAULT_PLAY_SERVERS } from "@/lib/viduki";

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
  const [customUrl, setCustomUrl] = useState("");
  const [serverName, setServerName] = useState("Custom Server");
  const [badge, setBadge] = useState("Custom VIP");
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
        setCustomUrl(data.customUrl || "");
        setServerName(data.serverName || "Custom Server");
        setBadge(data.badge || "Custom VIP");
        setHiddenServers(data.hiddenServers || []);
        setHideDefaultServers(Boolean(data.hideDefaultServers));
      } else {
        setCustomUrl("");
        setServerName("Custom Server");
        setBadge("Custom VIP");
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

  if (!isOpen) return null;

  const handleToggleServerHide = (serverId: string) => {
    setHiddenServers((prev) =>
      prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId],
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) {
      setError("Please paste a valid video URL or iframe embed code.");
      return;
    }

    const cleanedUrl = cleanStreamUrl(customUrl.trim());
    if (!cleanedUrl) {
      setError("Invalid stream URL format.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await saveCustomStream({
        id: mediaType === "movie" ? `movie_${mediaId}` : `tv_${mediaId}_${season}_${episode}`,
        mediaId,
        mediaType,
        season,
        episode,
        title,
        poster,
        customUrl: cleanedUrl,
        serverName: serverName.trim() || "Custom Server",
        badge: badge.trim() || "Custom VIP",
        hiddenServers,
        hideDefaultServers,
      });

      setSuccess("Custom stream & visibility settings saved to Firebase!");
      setTimeout(() => {
        setLoading(false);
        onClose();
        if (onSaved) onSaved();
      }, 700);
    } catch {
      setLoading(false);
      setError("Failed to save stream link to Firebase. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!existingData) return;
    if (!confirm("Are you sure you want to remove this custom stream link?")) return;

    setLoading(true);
    try {
      await deleteCustomStream(existingData.id);
      setSuccess("Custom stream removed.");
      setTimeout(() => {
        setLoading(false);
        onClose();
        if (onSaved) onSaved();
      }, 500);
    } catch {
      setLoading(false);
      setError("Failed to delete custom stream link.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden overscroll-none touch-none select-none transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-lg max-h-[92vh] overflow-y-auto scrollbar-none rounded-3xl bg-[#12141A] border border-white/10 p-5 sm:p-7 shadow-2xl shadow-black/90 transition-all scale-in touch-auto select-text"
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
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">
              {existingData ? "Edit Custom Stream" : "Add Custom Stream"}
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 block">
                Custom Iframe Embed URL or Video Link <span className="text-[#E50914]">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder='Paste <iframe src="..."></iframe> or direct stream link'
                className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914] focus:border-[#E50914] font-mono resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">Server Name</label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="VIP Server"
                  className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">Badge Label</label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Custom VIP"
                  className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-[#E50914]"
                />
              </div>
            </div>

            {/* Per-Media Server Visibility Controls */}
            <div className="space-y-2 pt-1 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300">
                  Hide Default Servers for this Title:
                </span>
                <label className="flex items-center gap-2 text-[11px] text-neutral-400 cursor-pointer">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {DEFAULT_PLAY_SERVERS.map((s) => {
                    const isHidden = hiddenServers.includes(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => handleToggleServerHide(s.id)}
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

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#E50914]/25 transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save to Firebase</span>
              </button>

              {existingData && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 border border-white/10 px-4 py-2.5 text-xs font-semibold text-neutral-300 transition cursor-pointer"
                  title="Remove custom link"
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
