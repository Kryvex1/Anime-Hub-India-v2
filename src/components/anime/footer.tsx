import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./nav";
import {
  IconAnime,
  IconBookmark,
  IconClose,
  IconGenres,
  IconHome,
  IconPopular,
  IconTrending,
  IconShield,
  IconSparkles,
} from "./icons";

export function Footer() {
  const [modalContent, setModalContent] = useState<"dmca" | "terms" | "privacy" | null>(null);

  return (
    <footer className="relative mt-6 sm:mt-10 border-t border-white/[0.08] bg-[#070A12]/95 pt-10 pb-20 text-xs backdrop-blur-xl lg:pb-12 text-[#94a3b8]">
      {/* Top subtle gradient line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6366f1]/60 to-transparent" />

      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="space-y-3 lg:col-span-2">
            <Link to="/" className="inline-block transition hover:opacity-90 active:scale-95">
              <Logo className="scale-100" />
            </Link>
            <p className="max-w-md text-xs leading-relaxed text-[#94a3b8]">
              <strong className="text-[#f1f5f9]">Anime Hub India</strong> is your ultimate platform
              for anime streaming, exploration, and watchlist management. Experience high-speed
              multi-server CDN streaming, curated collections, and comprehensive episode guides.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
                Fast CDN Active
              </span>
              <a
                href="https://t.me/+zq2bSX8u785jZDg1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 text-[11px] font-bold text-sky-400 hover:bg-sky-500/25 transition-all cursor-pointer"
              >
                <IconSparkles width={12} height={12} />
                Join Telegram
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-[#f1f5f9] tracking-wider uppercase text-[11px]">
              Explore
            </h4>
            <ul className="mt-3 space-y-2 text-[#94a3b8]">
              <li>
                <Link
                  to="/"
                  className="flex items-center gap-1.5 transition hover:text-[#818cf8] hover:translate-x-0.5 duration-200"
                >
                  <IconHome width={13} height={13} /> Home
                </Link>
              </li>
              <li>
                <Link
                  to="/browse"
                  className="flex items-center gap-1.5 transition hover:text-[#818cf8] hover:translate-x-0.5 duration-200"
                >
                  <IconAnime width={13} height={13} /> Browse Catalog
                </Link>
              </li>
              <li>
                <Link
                  to="/trending"
                  className="flex items-center gap-1.5 transition hover:text-[#818cf8] hover:translate-x-0.5 duration-200"
                >
                  <IconTrending width={13} height={13} /> Trending Anime
                </Link>
              </li>
              <li>
                <Link
                  to="/popular"
                  className="flex items-center gap-1.5 transition hover:text-[#818cf8] hover:translate-x-0.5 duration-200"
                >
                  <IconPopular width={13} height={13} /> Popular Series
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & DMCA */}
          <div>
            <h4 className="font-bold text-[#f1f5f9] tracking-wider uppercase text-[11px]">
              Legal & Policy
            </h4>
            <ul className="mt-3 space-y-2 text-[#94a3b8]">
              <li>
                <button
                  onClick={() => setModalContent("dmca")}
                  className="text-left font-medium transition hover:text-[#818cf8] hover:translate-x-0.5 duration-200 cursor-pointer"
                >
                  DMCA Disclaimer
                </button>
              </li>
              <li>
                <button
                  onClick={() => setModalContent("terms")}
                  className="text-left font-medium transition hover:text-[#818cf8] hover:translate-x-0.5 duration-200 cursor-pointer"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => setModalContent("privacy")}
                  className="text-left font-medium transition hover:text-[#818cf8] hover:translate-x-0.5 duration-200 cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <Link
                  to="/watchlist"
                  className="flex items-center gap-1.5 transition hover:text-[#818cf8] hover:translate-x-0.5 duration-200"
                >
                  <IconBookmark width={13} height={13} /> My Watchlist
                </Link>
              </li>
            </ul>
          </div>

          {/* DMCA Statement Box */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D111C]/70 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[#818cf8] font-bold text-xs">
              <IconShield width={15} height={15} />
              DMCA Disclaimer
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#94a3b8]">
              Anime Hub India does not host or store media files on its servers. All streams and
              content are linked through third-party services.
            </p>
            <button
              onClick={() => setModalContent("dmca")}
              className="mt-2.5 inline-block font-semibold text-[#818cf8] underline underline-offset-4 hover:text-white transition cursor-pointer"
            >
              Read full policy →
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/[0.08] pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-[11px] text-[#94a3b8]">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-[#f1f5f9]">Anime Hub India</span>. All rights
            reserved.
          </p>

          <div className="flex items-center gap-5 text-[11px] text-[#94a3b8]">
            <button
              onClick={() => setModalContent("dmca")}
              className="hover:text-white transition cursor-pointer"
            >
              DMCA
            </button>
            <button
              onClick={() => setModalContent("terms")}
              className="hover:text-white transition cursor-pointer"
            >
              Terms
            </button>
            <button
              onClick={() => setModalContent("privacy")}
              className="hover:text-white transition cursor-pointer"
            >
              Privacy
            </button>
            <Link to="/browse" className="hover:text-white transition">
              Catalog
            </Link>
          </div>
        </div>
      </div>

      {/* Policy Modals with Animated Background Blur */}
      {modalContent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-2xl transition-all duration-300 animate-in fade-in"
          onClick={() => setModalContent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#0D111C]/95 p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl md:p-8 animate-modal-in text-[#f1f5f9]"
          >
            <button
              onClick={() => setModalContent(null)}
              className="absolute top-4 right-4 rounded-full p-2 text-[#94a3b8] transition hover:bg-white/10 hover:text-white cursor-pointer"
              title="Close modal"
            >
              <IconClose width={18} height={18} />
            </button>

            {modalContent === "dmca" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#6366f1]/20 text-[#818cf8] border border-[#6366f1]/30">
                    <IconShield width={20} height={20} />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">DMCA & Copyright Policy</h3>
                    <p className="text-xs text-[#94a3b8]">Notice and Takedown Procedure</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-[#94a3b8] pt-2">
                  <p>
                    <strong className="text-white">Anime Hub India</strong> operates as an index and
                    media discovery search engine. None of the video files, multimedia streams, or
                    copyrighted materials are hosted, stored, uploaded, or transmitted on our own
                    servers.
                  </p>
                  <p>
                    All video links, iframes, and embeds displayed on this platform are provided by
                    independent, third-party internet streaming providers. Anime Hub India has no
                    control over the copyright compliance, legality, or hosting of content hosted on
                    third-party servers.
                  </p>
                  <p>
                    If you are a copyright owner or an authorized agent and believe that content
                    available through third-party embeds infringes your copyright, please direct
                    your takedown notice to the respective third-party hosting service to ensure the
                    source file is removed.
                  </p>
                  <p>
                    To request the removal of a specific indexing reference from Anime Hub India,
                    please provide verifiable proof of ownership and the exact URL link.
                  </p>
                </div>
              </div>
            )}

            {modalContent === "terms" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Terms of Service</h3>
                <div className="space-y-3 text-xs leading-relaxed text-[#94a3b8]">
                  <p>
                    By accessing or using Anime Hub India, you agree to comply with and be bound by
                    these Terms of Service. If you do not agree to these terms, please do not use
                    the website.
                  </p>
                  <p>
                    This service is provided &quot;as is&quot; and &quot;as available&quot; for
                    informational and entertainment discovery purposes only. We make no
                    representations or warranties of any kind regarding the accuracy, reliability,
                    or availability of the website or third-party content.
                  </p>
                  <p>
                    You agree not to use the service for any unlawful purposes or to interfere with
                    the proper working of the site.
                  </p>
                </div>
              </div>
            )}

            {modalContent === "privacy" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Privacy Policy</h3>
                <div className="space-y-3 text-xs leading-relaxed text-[#94a3b8]">
                  <p>
                    Your privacy is important to us. Anime Hub India respects your personal
                    information and is committed to protecting it.
                  </p>
                  <p>
                    We do not collect or sell your personal information. Watchlists and playback
                    server preferences are stored locally in your browser (LocalStorage) for your
                    convenience.
                  </p>
                  <p>
                    Standard anonymous web traffic analytics may be used to measure site stability
                    and optimize streaming performance.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end border-t border-white/[0.08] pt-4">
              <button
                onClick={() => setModalContent(null)}
                className="rounded-xl bg-[#6366f1] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#4f46e5] active:scale-95 cursor-pointer shadow-md shadow-[#6366f1]/25"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
