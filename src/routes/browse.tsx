import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LoadMoreList } from "@/components/anime/list-page";
import {
  fetchBollywood,
  fetchHollywood,
  fetchIndianTrending,
  fetchPopular,
  fetchSouthCinema,
  fetchTopRated,
  fetchTrending,
} from "@/lib/anime.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse Indian & Global Cinema — 7Shows" },
      {
        name: "description",
        content:
          "Browse Bollywood, South Indian Cinema, Hollywood blockbusters, trending movies, and web series on 7Shows.",
      },
      { property: "og:title", content: "Browse Indian & Global Cinema — 7Shows" },
      {
        property: "og:description",
        content:
          "Browse Bollywood, South Indian Cinema, Hollywood blockbusters, trending movies, and web series on 7Shows.",
      },
    ],
  }),
  component: BrowsePage,
});

const TABS = [
  { key: "indian", label: "Trending India" },
  { key: "bollywood", label: "Bollywood" },
  { key: "south", label: "South Cinema" },
  { key: "hollywood", label: "Hollywood" },
  { key: "popular", label: "All Popular" },
  { key: "top", label: "Top Rated" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function BrowsePage() {
  const [tab, setTab] = useState<TabKey>("indian");

  const fetchPage = (page: number) => {
    if (tab === "indian") return fetchIndianTrending({ data: { page } });
    if (tab === "bollywood") return fetchBollywood({ data: { page } });
    if (tab === "south") return fetchSouthCinema({ data: { page } });
    if (tab === "hollywood") return fetchHollywood({ data: { page } });
    if (tab === "top") return fetchTopRated({ data: { page } });
    return fetchPopular({ data: { page } });
  };

  const tabsBar = (
    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#0D111C] border border-white/[0.08] shadow-inner overflow-x-auto no-scrollbar max-w-full">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={cn(
            "rounded-xl px-3 sm:px-4 py-1.5 text-xs font-semibold text-center whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95",
            tab === t.key
              ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/30 font-bold"
              : "text-[#94a3b8] hover:text-white hover:bg-white/[0.05]",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <LoadMoreList
      queryKey={`browse-${tab}`}
      fetchPage={fetchPage}
      eyebrow="Catalogue"
      title="Browse Movies & Series"
      description="Stream the biggest Indian and international blockbusters in Full HD."
      actions={tabsBar}
    />
  );
}
