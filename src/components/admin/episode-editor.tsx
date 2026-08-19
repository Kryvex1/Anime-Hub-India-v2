import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAdminDisplayName } from "@/lib/admin-auth";
import {
  type EpisodeDoc,
  getEpisodeId,
  saveEpisodeConfig,
  deleteEpisodeConfig,
} from "@/lib/episodes.firebase";
import { cleanStreamUrl } from "@/lib/stream-utils";
import { Img, img } from "@/components/anime/media";
import {
  IconClose,
  IconTrash,
  IconSparkles,
  IconPlay,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/anime/icons";

interface EpisodeEditorProps {
  anime: { id: number; title: string; poster: string | null };
  seasonNumber: number;
  episode: {
    id: number;
    episodeNumber: number;
    name: string;
    overview?: string;
    still?: string | null;
  };
  existingConfig?: EpisodeDoc | null;
  onClose: () => void;
  onSaved: () => void;
  onNavigateEpisode?: (direction: -1 | 1) => void;
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
}

export function EpisodeEditor({
  anime,
  seasonNumber,
  episode,
  existingConfig,
  onClose,
  onSaved,
  onNavigateEpisode,
  hasPrevEpisode,
  hasNextEpisode,
}: EpisodeEditorProps) {
  const episodeId = getEpisodeId(anime.id, seasonNumber, episode.episodeNumber);

  // Single primary link state by default
  const [streamUrl, setStreamUrl] = useState(
    existingConfig?.server1?.url || existingConfig?.server2?.url || "",
  );
  const [showBackupServer, setShowBackupServer] = useState(Boolean(existingConfig?.server2?.url));
  const [server2Url, setServer2Url] = useState(existingConfig?.server2?.url || "");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);

  // Sync state if episode or existingConfig changes
  useEffect(() => {
    const s1 = existingConfig?.server1?.url || "";
    const s2 = existingConfig?.server2?.url || "";
    setStreamUrl(s1 || s2 || "");
    setServer2Url(s2 || "");
    setShowBackupServer(Boolean(s2));
    setPreviewActive(false);
  }, [existingConfig, episode]);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setStreamUrl(cleanStreamUrl(text));
          toast.success("Link pasted from clipboard!");
        }
      }
    } catch {
      toast.error("Could not read clipboard. Please paste manually.");
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const s1 = cleanStreamUrl(streamUrl);
    const s2 = showBackupServer ? cleanStreamUrl(server2Url) : "";

    if (!s1 && !s2) {
      toast.error("Please enter a stream link.");
      return;
    }

    setSaving(true);
    try {
      const config: Omit<EpisodeDoc, "updatedAt"> = {
        id: episodeId,
        animeId: anime.id,
        animeTitle: anime.title,
        season: seasonNumber,
        episode: episode.episodeNumber,
        episodeTitle: episode.name || `Episode ${episode.episodeNumber}`,
        thumbnail: episode.still || anime.poster || null,
        server1: s1 ? { url: s1 } : s2 ? { url: s2 } : null,
        server2: s2 && s1 ? { url: s2 } : null,
        activeServer: 1,
        updatedBy: getAdminDisplayName(),
      };

      await saveEpisodeConfig(config);
      toast.success(`Episode ${episode.episodeNumber} link saved successfully!`);
      onSaved();

      // If next episode is available, auto advance or close
      if (hasNextEpisode && onNavigateEpisode) {
        onNavigateEpisode(1);
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save stream link.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete stream link for Episode ${episode.episodeNumber}?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteEpisodeConfig(episodeId);
      toast.success("Stream link deleted.");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete link.");
    } finally {
      setDeleting(false);
    }
  };

  const activeTestUrl = cleanStreamUrl(streamUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-3 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#0D111C] p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-[#f1f5f9]">
        {/* Header & Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <Img
              src={img(episode.still || anime.poster, "w300")}
              alt={episode.name}
              className="h-12 w-20 shrink-0 object-cover shadow-md ring-1 ring-white/10"
              rounded="rounded-xl"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#6366f1]/20 px-2 py-0.5 text-[10px] font-black text-[#818cf8] border border-[#6366f1]/30">
                  S{seasonNumber} : EP {episode.episodeNumber}
                </span>
                <span className="text-xs text-[#94a3b8] font-medium truncate">{anime.title}</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                {episode.name || `Episode ${episode.episodeNumber}`}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#94a3b8] hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>

        {/* Quick Episode Navigation */}
        {onNavigateEpisode && (
          <div className="flex items-center justify-between py-2.5 text-xs text-[#94a3b8] border-b border-white/[0.06]">
            <button
              type="button"
              disabled={!hasPrevEpisode}
              onClick={() => onNavigateEpisode(-1)}
              className="inline-flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <IconChevronLeft width={14} height={14} /> Previous Ep
            </button>
            <span className="font-semibold text-white">Episode {episode.episodeNumber}</span>
            <button
              type="button"
              disabled={!hasNextEpisode}
              onClick={() => onNavigateEpisode(1)}
              className="inline-flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              Next Ep <IconChevronRight width={14} height={14} />
            </button>
          </div>
        )}

        {/* Single Fast Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Stream Link / Embed URL:
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[11px] font-semibold text-[#818cf8] hover:text-white transition cursor-pointer"
              >
                📋 Paste from Clipboard
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://... (mp4, m3u8, abyss, streamwish, etc.)"
                autoFocus
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] focus:outline-none transition"
              />
            </div>
            <p className="text-[11px] text-[#94a3b8]">
              Bas ek link daal do, yeh automatic server ban jayega aur turant chalega.
            </p>
          </div>

          {/* Optional Backup Server Toggle */}
          {!showBackupServer ? (
            <button
              type="button"
              onClick={() => setShowBackupServer(true)}
              className="text-xs font-semibold text-[#94a3b8] hover:text-white transition cursor-pointer flex items-center gap-1"
            >
              + Add Backup Server 2 (Optional)
            </button>
          ) : (
            <div className="space-y-2 pt-1 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#94a3b8]">
                  Backup Server 2 URL (Optional):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowBackupServer(false);
                    setServer2Url("");
                  }}
                  className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                >
                  Remove Server 2
                </button>
              </div>
              <input
                type="text"
                value={server2Url}
                onChange={(e) => setServer2Url(e.target.value)}
                placeholder="https://backup-server..."
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-[#6366f1] focus:outline-none"
              />
            </div>
          )}

          {/* Live Stream Quick Test Preview */}
          {activeTestUrl && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setPreviewActive(!previewActive)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#818cf8] hover:text-white transition cursor-pointer"
              >
                <IconPlay width={12} height={12} />
                {previewActive ? "Hide Test Preview" : "▶ Test Stream Player Here"}
              </button>

              {previewActive && (
                <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/10">
                  <iframe
                    src={activeTestUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            {existingConfig?.server1?.url || existingConfig?.server2?.url ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <IconTrash width={14} height={14} className="inline mr-1" />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-xs font-bold text-[#94a3b8] hover:bg-white/10 hover:text-white transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !streamUrl.trim()}
                className="rounded-xl bg-[#6366f1] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#4f46e5] transition shadow-lg shadow-[#6366f1]/30 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <IconSparkles width={14} height={14} />
                {saving ? "Saving..." : "⚡ Save Stream"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
