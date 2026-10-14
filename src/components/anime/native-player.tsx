import { useEffect, useRef, useState, useMemo } from "react";
import { getSafeStreamUrl } from "@/lib/stream-utils";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwplayer?: (targetId: string | HTMLElement) => any;
  }
}

interface NativePlayerProps {
  src: string;
  title?: string;
  episodeTitle?: string;
  poster?: string;
  serverName?: string;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
  onPlay?: () => void;
  onNextEpisode?: () => void;
}

function getJwStreamType(url: string): string {
  if (!url) return "mp4";
  const lower = url.trim().toLowerCase();
  if (lower.includes(".m3u8") || lower.includes("format=m3u8") || lower.includes("type=m3u8")) {
    return "hls";
  }
  if (lower.includes(".webm")) return "webm";
  if (lower.includes(".mkv")) return "mp4";
  return "mp4";
}

/**
 * Official JW Player 8 Direct CDN Integration:
 * - Uses stable DOM structure (no conditional React mounting next to JW Player container)
 * - Shows TMDB backdrop image during loading, fades to solid black on playback
 * - Prevents React insertBefore / removeChild DOM reconciliation errors
 */
export function NativeVideoPlayer({
  src,
  poster,
  onEnded,
  onError,
  onPlay,
  onNextEpisode,
}: NativePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [triedProxy, setTriedProxy] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);

  // Normalize HTTP URLs to avoid browser HTTPS mixed-content blocks
  const safeSrc = useMemo(() => {
    return getSafeStreamUrl(src);
  }, [src]);

  const streamType = useMemo(() => {
    return getJwStreamType(src);
  }, [src]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || !safeSrc) return;

    setHasError(false);
    setTriedProxy(false);
    setHasStartedPlayback(false);

    const initPlayer = () => {
      if (!window.jwplayer || !containerRef.current) return;

      // Clean up any existing instance first
      try {
        window.jwplayer(containerRef.current).remove();
      } catch {
        // ignore
      }

      const player = window.jwplayer(containerRef.current);

      player.setup({
        playlist: [
          {
            image: poster || "",
            sources: [
              {
                file: safeSrc,
                type: streamType,
              },
            ],
          },
        ],
        width: "100%",
        height: "100%",
        autostart: true,
        mute: false,
        controls: true,
        stretching: "uniform",
        preload: "auto",
        playbackRateControls: true,
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      });

      // Fix controlbar positioning immediately on ready & attempt unmuted audio
      player.on("ready", () => {
        try {
          player.resize("100%", "100%");
          player.setMute(false);
        } catch {
          // ignore
        }
      });

      // Automatically unmute upon any user click or touch interaction on the website
      const handleUserInteraction = () => {
        try {
          if (player && typeof player.setMute === "function") {
            player.setMute(false);
            if (typeof player.setVolume === "function") {
              player.setVolume(85);
            }
          }
        } catch {
          // ignore
        }
      };

      window.addEventListener("click", handleUserInteraction, { once: true });
      window.addEventListener("touchstart", handleUserInteraction, { once: true });

      // Track when video actually starts displaying video frames to hide loading backdrop
      player.on("firstFrame", () => {
        setHasStartedPlayback(true);
      });

      player.on("play", () => {
        setHasStartedPlayback(true);
        try {
          player.setMute(false);
        } catch {
          // ignore
        }
        onPlay?.();
      });

      player.on("timeupdate", (e: { position?: number }) => {
        if (e?.position && e.position > 0.1) {
          setHasStartedPlayback(true);
        }
      });

      if (onEnded || onNextEpisode) {
        player.on("complete", () => {
          onEnded?.();
          if (onNextEpisode) {
            onNextEpisode();
          }
        });
      }

      // Handle JW Player Error 102630 with automatic proxy fallback
      player.on("error", (err: { code?: number; message?: string }) => {
        console.warn("JW Player stream error:", err);

        if (!triedProxy && src && !safeSrc.startsWith("/api/stream-proxy")) {
          setTriedProxy(true);
          const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(src)}`;
          try {
            player.load([
              {
                file: proxyUrl,
                type: streamType,
                image: poster || "",
              },
            ]);
            player.play();
            return;
          } catch {
            // ignore
          }
        }

        setHasError(true);
        if (onError) {
          onError(err?.message || "JW Player Error 102630: Source file invalid or blocked.");
        }
      });
    };

    const targetContainer = containerRef.current;

    if (!window.jwplayer) {
      const interval = setInterval(() => {
        if (window.jwplayer) {
          clearInterval(interval);
          initPlayer();
        }
      }, 100);

      return () => {
        clearInterval(interval);
        try {
          if (targetContainer && window.jwplayer) {
            window.jwplayer(targetContainer).remove();
          }
        } catch {
          // ignore
        }
      };
    }

    initPlayer();

    return () => {
      try {
        if (targetContainer && window.jwplayer) {
          window.jwplayer(targetContainer).remove();
        }
      } catch {
        // ignore
      }
    };
  }, [src, safeSrc, streamType, poster, triedProxy, onPlay, onEnded, onNextEpisode, onError]);

  return (
    <div className="w-full h-full relative bg-black rounded-xl overflow-hidden group">
      {/* TMDB Backdrop artwork layer — always kept in DOM, hidden via CSS opacity once video plays */}
      <div
        className={cn(
          "absolute inset-0 z-0 overflow-hidden pointer-events-none transition-opacity duration-500",
          poster && !hasStartedPlayback
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none",
        )}
      >
        {poster && (
          <img
            src={poster}
            alt="Loading Backdrop"
            className="w-full h-full object-cover scale-105 filter blur-[3px] brightness-[0.55] saturate-125"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-black/30 to-black/50" />
      </div>

      {/* JW Player Container — DOM node remains completely stable */}
      <div ref={containerRef} className="w-full h-full relative z-10 bg-transparent" />

      {/* Error Fallback Overlay — CSS visibility toggled to keep DOM tree constant */}
      <div
        className={cn(
          "absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-4 text-center transition-opacity duration-300",
          hasError
            ? "opacity-100 pointer-events-auto visible"
            : "opacity-0 pointer-events-none invisible",
        )}
      >
        <p className="text-sm font-bold text-white mb-2">JW Player Stream Unavailable</p>
        <p className="text-xs text-neutral-400 max-w-sm mb-4">
          The media link could not be loaded directly. You can try reloading or opening the source.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-lg bg-[#E50914] text-white text-xs font-bold hover:bg-[#b80710] transition"
        >
          Open Source Link
        </a>
      </div>
    </div>
  );
}
