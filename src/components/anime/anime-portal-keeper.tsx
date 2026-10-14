import { useState, useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const DEFAULT_ANIME_URL = "https://www.desidubanime.me/";

function normalizeUrl(url?: string | null): string {
  if (!url || !url.trim()) return DEFAULT_ANIME_URL;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Modern Clean Skeleton Loader (Replaces default spinning loader)
 */
function AnimeHubSkeleton() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#070A12] overflow-hidden p-3 sm:p-5 select-none animate-in fade-in duration-300">
      {/* Top Subtle Status Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-[11px] font-bold text-neutral-300 tracking-wide">
            Connecting to Anime Hub...
          </span>
        </div>
        <span className="text-[10px] text-neutral-500 font-mono">In-App Native View</span>
      </div>

      <div className="flex-1 mt-3 space-y-4 overflow-hidden">
        {/* Skeleton Hero Banner */}
        <div className="relative w-full h-36 sm:h-52 rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden shimmer flex flex-col justify-end p-4">
          <div className="h-5 w-2/5 rounded-lg bg-white/10 mb-2 shimmer" />
          <div className="h-3 w-3/5 rounded bg-white/[0.06] mb-1.5 shimmer" />
          <div className="h-3 w-1/4 rounded bg-white/[0.05] shimmer" />
        </div>

        {/* Skeleton Category Pills */}
        <div className="flex items-center gap-2 overflow-hidden py-1">
          <div className="h-7 w-20 rounded-full bg-white/[0.05] shimmer shrink-0" />
          <div className="h-7 w-24 rounded-full bg-white/[0.05] shimmer shrink-0" />
          <div className="h-7 w-16 rounded-full bg-white/[0.05] shimmer shrink-0" />
          <div className="h-7 w-28 rounded-full bg-white/[0.05] shimmer shrink-0" />
          <div className="h-7 w-20 rounded-full bg-white/[0.05] shimmer shrink-0" />
        </div>

        {/* Skeleton Poster Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-[2/3] w-full rounded-xl bg-white/[0.04] border border-white/[0.05] shimmer" />
              <div className="h-3 w-3/4 rounded bg-white/[0.06] shimmer" />
              <div className="h-2.5 w-1/2 rounded bg-white/[0.04] shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Persistent In-Memory Anime Hub Webview Keeper
 * - Remains permanently loaded in memory across tab switching
 * - NO top wrapper bar (back button, title, reload icon removed per user instructions)
 * - Container clipping cleanly strips external website's top header and bottom footer
 * - Zero bottom margin gap above bottom navigation bar
 * - Clean Skeleton Loader UI (spinning wheel removed)
 */
export function AnimePortalKeeper() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const search = (routerState.location.search || {}) as { url?: string; title?: string };

  const isPortalActive = pathname === "/desidubanime" || pathname.startsWith("/desidubanime");

  const [targetUrl, setTargetUrl] = useState<string>(DEFAULT_ANIME_URL);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync target URL when navigating to /desidubanime with specific URL query param
  useEffect(() => {
    if (isPortalActive) {
      const requestedUrl = normalizeUrl(search.url);
      if (requestedUrl !== targetUrl) {
        setTargetUrl(requestedUrl);
        setIsLoaded(false);
      }
    }
  }, [isPortalActive, search.url, targetUrl]);

  return (
    <div
      aria-hidden={!isPortalActive}
      className={cn(
        "fixed inset-x-0 top-0 bottom-16 md:bottom-0 z-30 bg-[#070A12] overflow-hidden select-none transition-opacity duration-150",
        isPortalActive
          ? "opacity-100 pointer-events-auto visible"
          : "opacity-0 pointer-events-none invisible hidden",
      )}
    >
      {/* 1. SKELETON LOADER (Replaces spinning circle loader) */}
      {!isLoaded && <AnimeHubSkeleton />}

      {/* 2. CLIPPED NATIVE IFRAME CONTAINER
          - Top offset (-56px) clips out the external site's native header (hamburger, logo, search, login)
          - Bottom offset (+116px) clips out the external site's footer copyright
          - Perfectly aligns to bottom navigation bar with zero black gap
      */}
      <div className="relative w-full h-full overflow-hidden bg-[#0a0d14]">
        <iframe
          ref={iframeRef}
          src={targetUrl}
          title="Anime Hub Webview"
          onLoad={() => setIsLoaded(true)}
          allow="accelerometer; autoplay *; clipboard-write *; encrypted-media *; gyroscope; picture-in-picture *; web-share *; fullscreen *"
          allowFullScreen
          referrerPolicy="no-referrer"
          className="absolute inset-x-0 -top-[56px] w-full h-[calc(100%+116px)] border-0 block bg-[#0a0d14]"
        />
      </div>
    </div>
  );
}
