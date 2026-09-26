import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconProfile } from "./icons";

const TMDB_BASE = "https://image.tmdb.org/t/p/";

/**
 * Fast direct TMDB global image CDN generator (100% reliable on Vercel & all domains)
 */
export function img(path: string | null | undefined, size = "w500"): string | null {
  if (!path || typeof path !== "string" || !path.trim()) return null;
  const trimmed = path.trim();

  // If already a full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${TMDB_BASE}${size}${cleanPath}`;
}

/**
 * Direct TMDB image URL
 */
export function directImg(path: string | null | undefined, size = "w500"): string | null {
  return img(path, size);
}

export function Img({
  src,
  alt,
  className,
  imgClassName,
  rounded = "rounded-xl",
  isAvatar = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string | undefined;
  imgClassName?: string | undefined;
  rounded?: string;
  isAvatar?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const cleanSrc = typeof src === "string" && src.trim().length > 0 ? src.trim() : null;

  // If wsrv.nl fails, try falling back to direct URL without proxy
  const activeSrc =
    useFallback && cleanSrc
      ? cleanSrc
          .replace(/https:\/\/wsrv\.nl\/\?url=(https?:\/\/)?/, "https://")
          .replace(/&output=webp&q=80/, "")
      : cleanSrc;

  const hasImage = Boolean(activeSrc && !failed);

  return (
    <div className={cn("relative overflow-hidden bg-[#0e1320]", rounded, className)}>
      {/* Background shimmer placeholder when image is loading */}
      {hasImage && !loaded && (
        <div className={cn("absolute inset-0 shimmer bg-white/[0.04]", rounded)} />
      )}

      {hasImage && activeSrc ? (
        <img
          src={activeSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (!useFallback && activeSrc.includes("wsrv.nl")) {
              setUseFallback(true);
            } else {
              setFailed(true);
            }
          }}
          className={cn(
            "h-full w-full object-cover transition-all duration-500 ease-out",
            loaded ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-40 blur-xs",
            imgClassName,
          )}
        />
      ) : isAvatar ? (
        /* Stylish Unknown Person / Avatar Icon */
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#1a2236] to-[#0d111c] text-[#ff2a34]/70">
          <IconProfile width={26} height={26} />
        </div>
      ) : (
        /* Title / Generic Fallback */
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#1a2236] to-[#0d111c] p-2 text-center text-[10px] font-semibold tracking-wide text-[#94a3b8] uppercase">
          <span className="line-clamp-2">{alt}</span>
        </div>
      )}
    </div>
  );
}
