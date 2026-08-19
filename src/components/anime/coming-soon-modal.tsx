import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, BellRing, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { img } from "./media";

export interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeTitle: string;
  animeId: number;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  isAdmin?: boolean;
}

export function ComingSoonModal({
  isOpen,
  onClose,
  animeTitle,
  animeId,
  seasonNumber = 1,
  episodeNumber = 1,
  episodeTitle,
  posterPath,
  backdropPath,
  isAdmin = false,
}: ComingSoonModalProps) {
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRequested(false);
    }
  }, [isOpen, animeId, episodeNumber]);

  if (!isOpen) return null;

  const handleRequestClick = () => {
    if (requested) return;
    setRequested(true);
  };

  const bgImageUrl =
    img(backdropPath || posterPath, "w780") ||
    img(posterPath, "w500") ||
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=780&auto=format&fit=crop&q=80";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[370px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c101a] shadow-2xl backdrop-blur-xl animate-modal-in text-[#f1f5f9]"
      >
        {/* Top Fade Backdrop Image Container */}
        <div className="relative h-36 w-full overflow-hidden bg-black/50">
          <img
            src={bgImageUrl}
            alt={animeTitle}
            className="h-full w-full object-cover object-center scale-105 filter brightness-90"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=780&auto=format&fit=crop&q=80";
            }}
          />
          {/* Smooth multi-layer bottom gradient to blend seamlessly into card */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c101a] via-[#0c101a]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white/80 backdrop-blur-md transition hover:bg-black/80 hover:text-white active:scale-95 cursor-pointer border border-white/10 shadow"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Floating Episode / Coming Soon Tag */}
          <div className="absolute bottom-2 left-4 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 backdrop-blur-md">
              <Clock
                className="w-3 h-3 text-indigo-400 animate-spin"
                style={{ animationDuration: "8s" }}
              />
              COMING SOON
            </span>
            <span className="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-slate-300 backdrop-blur-md">
              S{seasonNumber} · EP{episodeNumber}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 pt-2 space-y-3">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white truncate leading-tight">{animeTitle}</h3>
            {episodeTitle && (
              <p className="text-[11px] font-medium text-indigo-300/90 truncate">{episodeTitle}</p>
            )}
            <p className="text-xs text-slate-400 leading-relaxed pt-0.5">
              We are sorry! This episode has not been uploaded to the stream servers yet. It will be
              available shortly.
            </p>
          </div>

          {/* Buttons Area */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleRequestClick}
              disabled={requested}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 active:scale-98 cursor-pointer shadow-md ${
                requested
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25"
              }`}
            >
              {requested ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Request Received!
                </>
              ) : (
                <>
                  <BellRing className="w-3.5 h-3.5" />
                  Request Fast Upload
                </>
              )}
            </button>

            {isAdmin && (
              <Link
                to="/data/admin"
                search={{ animeId, season: seasonNumber, episode: episodeNumber }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition active:scale-98"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Panel (Add Link)
              </Link>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-98 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
