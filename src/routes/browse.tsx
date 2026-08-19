import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LoadMoreList } from "@/components/anime/list-page";
import { fetchLatest, fetchPopular, fetchTopRated, fetchTrending } from "@/lib/anime.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse All Anime — Anime Hub India" },
      {
        name: "description",
        content: "Browse anime by popularity, rating, trend or latest releases on Anime Hub India.",
      },
      { property: "og:title", content: "Browse All Anime — Anime Hub India" },
      {
        property: "og:description",
        content: "Browse anime by popularity, rating, trend or latest releases on Anime Hub India.",
      },
    ],
  }),
  component: BrowsePage,
});

const TABS = [
  { key: "popular", label: "Popular" },
  { key: "top", label: "Top Rated" },
  { key: "trending", label: "Trending" },
  { key: "latest", label: "Latest" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function BrowsePage() {
  const [tab, setTab] = useState<TabKey>("popular");

  const fetchPage = (page: number) => {
    if (tab === "top") return fetchTopRated({ data: { page } });
    if (tab === "trending") return fetchTrending({ data: { page } });
    if (tab === "latest") return fetchLatest({ data: { page } });
    return fetchPopular({ data: { page } });
  };

  const tabsBar = (
    <div className="grid grid-cols-4 w-full sm:w-auto p-1 gap-1 rounded-2xl bg-[#0D111C] border border-white/[0.08] shadow-inner">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={cn(
            "rounded-xl px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-center whitespace-nowrap transition-all duration-200 cursor-pointer",
            tab === t.key
              ? "bg-[#6366f1] text-white shadow-md shadow-[#6366f1]/30 font-bold"
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
      eyebrow="Browse"
      title="All Anime"
      description="Every series in the catalogue, sorted the way you like it."
      actions={tabsBar}
    />
  );
}
