import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";

interface NativePlayerProps {
  src: string;
  title?: string;
  episodeTitle?: string;
  poster?: string;
  serverName?: string;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
  onPlay?: () => void;
  onSwitchToIframe?: () => void;
}

/**
 * Standard browser-native video player:
 * - Uses the browser's clean default controls (no custom buttons or overlays)
 * - Download button completely disabled (controlsList="nodownload")
 * - Long-press & right-click disabled (keeps direct link private, cannot extract link on hold)
 * - Instant stop on minimize, pagehide, or navigation
 */
export function NativeVideoPlayer({ src, poster, onEnded, onError, onPlay }: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isHlsUrl = src.toLowerCase().includes(".m3u8");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          const errMsg = `HLS Stream Error: ${data.type || ""} ${data.details || ""}`.trim();
          onErrorRef.current?.(errMsg);
        }
      });
      hlsRef.current = hls;
    } else if (isHlsUrl && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.load();
    } else {
      // Standard browser playback for MP4, MKV, WebM
      video.src = src;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  // Lifecycle Stop: Pause immediately when app is minimized, tab hidden, or unmounting
  useEffect(() => {
    const videoEl = videoRef.current;

    const handleVisibilityChange = () => {
      if (document.hidden && videoEl && !videoEl.paused) {
        videoEl.pause();
      }
    };

    const handlePageHide = () => {
      if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute("src");
        videoEl.load();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);

      if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute("src");
        videoEl.load();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="relative w-full h-full bg-black select-none overflow-hidden rounded-xl sm:rounded-2xl"
      style={{
        WebkitTouchCallout: "none",
        userSelect: "none",
      }}
    >
      <video
        ref={videoRef}
        controls
        controlsList="nodownload"
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        poster={poster}
        onPlay={() => onPlayRef.current?.()}
        onEnded={() => onEndedRef.current?.()}
        onError={() => {
          const mediaErr = videoRef.current?.error;
          // Code 1 is MEDIA_ERR_ABORTED (user paused or source switched), ignore it
          if (mediaErr && mediaErr.code !== 1) {
            const errorMsg =
              mediaErr.message || `Video playback error (MediaError code: ${mediaErr.code})`;
            onErrorRef.current?.(errorMsg);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={cn(
          "w-full h-full object-contain bg-black select-none",
          "[&::-webkit-media-controls-download-button]:hidden",
          "[&::-internal-media-controls-download-button]:hidden",
        )}
        style={{
          WebkitTouchCallout: "none",
        }}
      />
    </div>
  );
}
