import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconProfile } from "./icons";

const IMG = "https://image.tmdb.org/t/p/";

export function img(path: string | null | undefined, size = "w500") {
  if (!path || typeof path !== "string" || !path.trim()) return null;
  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${IMG}${size}${cleanPath}`;
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

  const cleanSrc = typeof src === "string" && src.trim().length > 0 ? src.trim() : null;
  const hasImage = Boolean(cleanSrc && !failed);

  return (
    <div className={cn("relative overflow-hidden bg-[#0e1320]", rounded, className)}>
      {/* Background shimmer placeholder when image is loading */}
      {hasImage && !loaded && (
        <div className={cn("absolute inset-0 shimmer bg-white/[0.04]", rounded)} />
      )}

      {hasImage && cleanSrc ? (
        <img
          src={cleanSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "h-full w-full object-cover transition-all duration-700 ease-out",
            loaded ? "scale-100 opacity-100 blur-0" : "scale-110 opacity-40 blur-md",
            imgClassName,
          )}
        />
      ) : isAvatar ? (
        /* Stylish Unknown Person / Avatar Icon */
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#1a2236] to-[#0d111c] text-[#818cf8]/70">
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
