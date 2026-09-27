import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { useWatchHistory } from "@/lib/watch-history";
import { ProfileDrawer } from "./profile-drawer";

import {
  IconAnime,
  IconBookmark,
  IconGenres,
  IconHome,
  IconPopular,
  IconProfile,
  IconSearch,
  IconTrending,
} from "./icons";

export const LOGO_SRC = "https://imgh.in/host/vylifk";

const LINKS = [
  { to: "/", label: "Home", Icon: IconHome, exact: true },
  { to: "/browse", label: "Browse", Icon: IconAnime },
  { to: "/trending", label: "Trending", Icon: IconTrending },
  { to: "/popular", label: "Popular", Icon: IconPopular },
  { to: "/watchlist", label: "Library", Icon: IconBookmark },
] as const;

const MOBILE = [
  { to: "/", label: "Home", Icon: IconHome, exact: true },
  { to: "/browse", label: "Browse", Icon: IconAnime },
  { to: "/search", label: "Search", Icon: IconSearch },
  { to: "/watchlist", label: "Library", Icon: IconBookmark },
] as const;

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 select-none group", className)}>
      <span className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E50914] via-[#b80710] to-[#f97316] p-0.5 shadow-lg shadow-[#E50914]/25 transition-transform duration-300 group-hover:scale-105">
        <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#141414]/95 backdrop-blur-xs">
          <span className="text-sm sm:text-base font-black tracking-tighter text-white">7</span>
        </span>
      </span>
      <div className="flex flex-col">
        <span className="text-base sm:text-lg font-black tracking-tight leading-none bg-gradient-to-r from-white via-neutral-100 to-[#E50914] bg-clip-text text-transparent">
          7Shows
        </span>
        {!compact && (
          <span className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase leading-none mt-0.5">
            Movies · Series · Anime
          </span>
        )}
      </div>
    </span>
  );
}

export function Header() {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = router.state.location.pathname;

  // Do not show header on search, watchlist, admin panel, or watch player page
  if (
    pathname === "/search" ||
    pathname.startsWith("/watchlist") ||
    pathname.startsWith("/data/admin") ||
    pathname.includes("/watch")
  ) {
    return null;
  }

  return (
    <>
      {/* 1. MOBILE: Apple iPhone Dynamic Island Pill (Completely floating, no full-bar behind it) */}
      <div className="relative z-40 flex w-full justify-center px-4 pt-3 pb-1 md:hidden pointer-events-none">
        <div className="pointer-events-auto flex h-11 w-full max-w-[380px] items-center justify-between gap-2.5 rounded-full border border-white/[0.16] bg-[#070A14]/90 px-3.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] backdrop-blur-3xl transition-all duration-300">
          {/* Left: Compact Logo */}
          <Link
            to="/"
            className="shrink-0 flex items-center transition-transform active:scale-90"
            aria-label="Go to Home"
          >
            <Logo compact />
          </Link>

          {/* Right Side Group: Search Pill & Profile */}
          <div className="flex items-center gap-1.5">
            <Link
              to="/search"
              className="flex items-center gap-1.5 h-7 rounded-full bg-white/[0.08] border border-white/[0.1] px-2.5 text-[11px] text-[#94a3b8] transition-all hover:bg-white/[0.12] hover:text-white active:scale-95 cursor-pointer shadow-inner"
            >
              <IconSearch width={13} height={13} className="text-[var(--brand-glow)] shrink-0" />
              <span className="font-medium text-[#cbd5e1]">Search</span>
            </Link>

            {/* Profile Button: Navigates directly to Library / Watchlist */}
            <Link
              to="/watchlist"
              aria-label="My Library & Watchlist"
              className="relative shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.12] hover:bg-white/[0.2] text-white border border-white/20 transition-all active:scale-90 cursor-pointer shadow-sm"
            >
              <IconProfile width={14} height={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. PC / DESKTOP: Full-Width Sleek Header (Non-sticky, scrolls with page) */}
      <header className="relative hidden w-full z-40 bg-gradient-to-b from-[#070A12] via-[#070A12]/95 to-[#070A12]/80 backdrop-blur-xl border-b border-white/[0.04] py-1 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] md:block">
        <nav className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-2 lg:gap-4 px-3 sm:px-4 md:px-6 lg:px-8">
          <Link
            to="/"
            className="shrink-0 flex items-center transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <Logo />
          </Link>

          {/* Desktop Links */}
          <ul className="flex items-center gap-0.5 lg:gap-1 shrink-0 overflow-x-auto no-scrollbar">
            {LINKS.map(({ to, label, Icon }) => (
              <li key={to} className="shrink-0">
                <Link
                  to={to}
                  activeOptions={{ exact: to === "/" }}
                  activeProps={{ className: "text-white bg-white/[0.08] shadow-sm font-semibold" }}
                  inactiveProps={{ className: "text-[#94a3b8]" }}
                  className="flex items-center gap-1.5 rounded-full px-2.5 lg:px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
                >
                  <Icon width={14} height={14} className="shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Search & Actions */}
          <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
            <button
              onClick={() => navigate({ to: "/search" })}
              aria-label="Search shows"
              className="flex items-center gap-1.5 lg:gap-2 rounded-full bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-xs text-[#94a3b8] transition-all hover:bg-white/[0.1] hover:text-white active:scale-95 cursor-pointer backdrop-blur-md shrink-0 whitespace-nowrap"
            >
              <IconSearch width={14} height={14} className="text-[var(--brand-glow)] shrink-0" />
              <span className="text-xs whitespace-nowrap">Search titles</span>
            </button>

            {/* Desktop Profile Icon: Navigates directly to Library / Watchlist */}
            <Link
              to="/watchlist"
              aria-label="My Library & Watchlist"
              className="relative shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            >
              <IconProfile width={15} height={15} />
            </Link>
          </div>
        </nav>
        {/* Soft gradient bottom fade border */}
        <div
          className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(var(--brand-rgb), 0.3) 50%, transparent 100%)",
          }}
        />
      </header>
    </>
  );
}

export function BottomNav() {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  // Do not show bottom nav on admin panel or watch player page
  if (pathname.startsWith("/data/admin") || pathname.includes("/watch")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-[#070A12]/90 backdrop-blur-2xl border-t border-white/[0.06] md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      <ul className="mx-auto flex max-w-lg items-center justify-between px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {MOBILE.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{
                className: "text-[var(--brand-glow)] font-bold",
              }}
              inactiveProps={{ className: "text-[#64748b]" }}
              className="flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold transition-all duration-200 active:scale-90"
            >
              <Icon width={19} height={19} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
