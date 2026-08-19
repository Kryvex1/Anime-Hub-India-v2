import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@/lib/utils";

import {
  IconAnime,
  IconBookmark,
  IconGenres,
  IconHome,
  IconPopular,
  IconProfile,
  IconSearch,
  IconSettings,
  IconTrending,
} from "./icons";

export const LOGO_SRC = "https://imgh.in/host/vylifk";

const LINKS = [
  { to: "/", label: "Home", Icon: IconHome, exact: true },
  { to: "/browse", label: "Browse", Icon: IconAnime },
  { to: "/trending", label: "Trending", Icon: IconTrending },
  { to: "/popular", label: "Popular", Icon: IconPopular },
  { to: "/genres", label: "Genres", Icon: IconGenres },
  { to: "/watchlist", label: "Watchlist", Icon: IconBookmark },
] as const;

const MOBILE = [
  { to: "/", label: "Home", Icon: IconHome, exact: true },
  { to: "/browse", label: "Browse", Icon: IconAnime },
  { to: "/search", label: "Search", Icon: IconSearch },
  { to: "/genres", label: "Genres", Icon: IconGenres },
  { to: "/watchlist", label: "List", Icon: IconBookmark },
] as const;

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      {failed ? (
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#818cf8] text-xs font-black text-white shadow-md shadow-[#6366f1]/25">
          AH
        </span>
      ) : (
        <img
          src={LOGO_SRC}
          alt="Anime Hub India logo"
          onError={() => setFailed(true)}
          className={cn(
            "h-7 sm:h-8 md:h-9 w-auto object-contain drop-shadow-[0_2px_10px_rgba(99,102,241,0.3)] transition-all duration-200",
            compact ? "max-w-[100px] h-6" : "max-w-[140px] sm:max-w-[180px]",
          )}
        />
      )}
    </span>
  );
}

export function Header() {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = router.state.location.pathname;

  // Do not show header on search, genres, watchlist, or admin panel
  if (
    pathname === "/search" ||
    pathname.startsWith("/genres") ||
    pathname.startsWith("/watchlist") ||
    pathname.startsWith("/data/admin")
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

          {/* Right Side Group: Search Pill, Profile & Settings */}
          <div className="flex items-center gap-1.5">
            <Link
              to="/search"
              className="flex items-center gap-1.5 h-7 rounded-full bg-white/[0.08] border border-white/[0.1] px-2.5 text-[11px] text-[#94a3b8] transition-all hover:bg-white/[0.12] hover:text-white active:scale-95 cursor-pointer shadow-inner"
            >
              <IconSearch width={13} height={13} className="text-[var(--brand-glow)] shrink-0" />
              <span className="font-medium text-[#cbd5e1]">Search</span>
            </Link>

            <Link
              to="/settings"
              aria-label="Settings"
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.1] text-[#94a3b8] transition-transform active:scale-90 hover:text-white hover:rotate-45"
            >
              <IconSettings width={13} height={13} />
            </Link>

            <Link
              to="/watchlist"
              aria-label="Watchlist & Profile"
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/40 transition-transform active:scale-90 border border-white/20"
              style={{
                background: "var(--brand-gradient, var(--brand-primary))",
                boxShadow: "0 0 12px rgba(var(--brand-rgb), 0.45)",
              }}
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
              aria-label="Search anime"
              className="flex items-center gap-1.5 lg:gap-2 rounded-full bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-xs text-[#94a3b8] transition-all hover:bg-white/[0.1] hover:text-white active:scale-95 cursor-pointer backdrop-blur-md shrink-0 whitespace-nowrap"
            >
              <IconSearch width={14} height={14} className="text-[var(--brand-glow)] shrink-0" />
              <span className="text-xs whitespace-nowrap">
                Search<span className="hidden xl:inline"> anime</span>
              </span>
            </button>
            <Link
              to="/watchlist"
              aria-label="Profile"
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white transition-transform hover:scale-110 shadow-sm"
              style={{
                background: "var(--brand-gradient, var(--brand-primary))",
                boxShadow: "0 0 14px rgba(var(--brand-rgb), 0.4)",
              }}
            >
              <IconProfile width={15} height={15} />
            </Link>
            <Link
              to="/settings"
              aria-label="Settings"
              activeProps={{ className: "text-white bg-white/20 ring-1 ring-white/30 rotate-45" }}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.08] text-[#94a3b8] transition-all hover:rotate-45 hover:text-white backdrop-blur-md cursor-pointer"
            >
              <IconSettings width={15} height={15} />
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

  // Do not show bottom nav on admin panel
  if (pathname.startsWith("/data/admin")) {
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
