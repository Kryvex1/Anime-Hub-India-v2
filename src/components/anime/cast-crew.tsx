import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  X,
  Film,
  Tv,
  Star,
  Calendar,
  User,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPerson } from "@/lib/anime.functions";
import { getMediaCategory } from "@/lib/routes-helper";
import { img, Img } from "./media";
import type { CardItem } from "@/lib/tmdb";

export type CastMember = {
  id: number;
  name: string;
  character: string | null;
  profile: string | null;
};

export type CrewMember = {
  id: number;
  name: string;
  job: string | null;
  department: string | null;
  profile: string | null;
};

export type SelectedPerson = {
  id: number;
  name: string;
  role?: string;
  profile?: string | null;
};

interface CastCrewSectionProps {
  cast?: CastMember[] | null;
  crew?: CrewMember[] | null;
  onSelectPerson: (person: SelectedPerson) => void;
  className?: string;
}

export function CastCrewSection({
  cast = [],
  crew = [],
  onSelectPerson,
  className,
}: CastCrewSectionProps) {
  const [activeTab, setActiveTab] = useState<"cast" | "crew">("cast");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const validCast = useMemo(() => {
    const map = new Map<number, CastMember>();
    for (const c of cast || []) {
      if (!c || !c.id || !c.name) continue;
      const existing = map.get(c.id);
      if (!existing) {
        map.set(c.id, { ...c });
      } else {
        if (c.character && existing.character && !existing.character.includes(c.character)) {
          existing.character = `${existing.character}, ${c.character}`;
        } else if (!existing.character && c.character) {
          existing.character = c.character;
        }
      }
    }
    return Array.from(map.values());
  }, [cast]);

  const validCrew = useMemo(() => {
    const map = new Map<number, CrewMember>();
    for (const c of crew || []) {
      if (!c || !c.id || !c.name) continue;
      const existing = map.get(c.id);
      if (!existing) {
        map.set(c.id, { ...c });
      } else {
        if (c.job && existing.job && !existing.job.includes(c.job)) {
          existing.job = `${existing.job}, ${c.job}`;
        } else if (!existing.job && c.job) {
          existing.job = c.job;
        }
      }
    }
    return Array.from(map.values());
  }, [crew]);

  // Auto-switch to available tab
  useEffect(() => {
    if (validCast.length === 0 && validCrew.length > 0 && activeTab !== "crew") {
      setActiveTab("crew");
    } else if (validCrew.length === 0 && validCast.length > 0 && activeTab !== "cast") {
      setActiveTab("cast");
    }
  }, [validCast.length, validCrew.length, activeTab]);

  if (validCast.length === 0 && validCrew.length === 0) {
    return null;
  }

  const items =
    activeTab === "cast"
      ? validCast.length > 0
        ? validCast
        : validCrew
      : validCrew.length > 0
        ? validCrew
        : validCast;

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -350 : 350;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <div className={cn("space-y-3.5", className)}>
      {/* Header and Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E50914]/20 text-[#E50914]">
            <User className="h-4 w-4" />
          </div>
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
            {validCast.length > 0 && validCrew.length > 0
              ? "Cast & Crew"
              : validCast.length > 0
                ? "Cast"
                : "Crew"}
          </h3>
          <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
            (Scroll & click to view filmography)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab switchers - Only show toggle if BOTH exist */}
          {validCast.length > 0 && validCrew.length > 0 ? (
            <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-1 border border-white/[0.07]">
              <button
                type="button"
                onClick={() => setActiveTab("cast")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  activeTab === "cast"
                    ? "bg-[#E50914] text-white shadow-sm shadow-[#E50914]/40"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.04]",
                )}
              >
                Cast ({validCast.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("crew")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  activeTab === "crew"
                    ? "bg-[#E50914] text-white shadow-sm shadow-[#E50914]/40"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.04]",
                )}
              >
                Crew ({validCrew.length})
              </button>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-neutral-300">
              {validCast.length > 0 ? `Cast (${validCast.length})` : `Crew (${validCrew.length})`}
            </span>
          )}

          {/* Left/Right Scroll Arrows */}
          {items.length > 4 && (
            <div className="hidden sm:flex items-center gap-1 pl-1">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                aria-label="Scroll cast left"
                className="h-7 w-7 rounded-lg bg-white/[0.06] border border-white/10 text-neutral-300 hover:text-white hover:bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                aria-label="Scroll cast right"
                className="h-7 w-7 rounded-lg bg-white/[0.06] border border-white/10 text-neutral-300 hover:text-white hover:bg-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Side Scrolling Cards Row */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none scroll-smooth snap-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((person, index) => {
          const role =
            "character" in person ? person.character : "job" in person ? person.job : null;

          return (
            <button
              key={`${activeTab}-${person.id}-${role || index}`}
              type="button"
              onClick={() =>
                onSelectPerson({
                  id: person.id,
                  name: person.name,
                  role: role || undefined,
                  profile: person.profile,
                })
              }
              className="group shrink-0 w-[124px] sm:w-[140px] snap-start flex flex-col items-center text-center p-3 rounded-xl bg-[#141414] hover:bg-[#202020] border border-white/[0.06] hover:border-white/20 transition-all duration-200 cursor-pointer text-left active:scale-[0.98]"
              title={`View titles with ${person.name}`}
            >
              <div className="relative mb-2.5 h-20 w-20 sm:h-22 sm:w-22 overflow-hidden rounded-full ring-2 ring-white/10 group-hover:ring-[#E50914]/80 transition-all shadow-md">
                <Img
                  src={img(person.profile, "w185")}
                  alt={person.name}
                  rounded="rounded-full"
                  isAvatar
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                  <span className="text-[9px] text-white font-bold bg-[#E50914] px-1.5 py-0.5 rounded-full backdrop-blur-xs">
                    Works
                  </span>
                </div>
              </div>

              <div className="w-full min-w-0">
                <span className="block text-xs font-bold text-white group-hover:text-[#a5b4fc] transition-colors truncate">
                  {person.name}
                </span>
                {role && (
                  <span className="block text-[11px] text-[#94a3b8] truncate mt-0.5" title={role}>
                    {role}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PersonWorksModalProps {
  person: SelectedPerson | null;
  onClose: () => void;
}

export function PersonWorksModal({ person, onClose }: PersonWorksModalProps) {
  const navigate = useNavigate();

  const { data, isPending } = useQuery({
    queryKey: ["person-works", person?.id],
    queryFn: () => fetchPerson({ data: { id: person!.id } }),
    enabled: Boolean(person?.id),
    staleTime: 1000 * 60 * 60,
  });

  if (!person) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-[#0c101c] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 border-b border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-transparent flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl ring-2 ring-[#E50914]/40 shadow-lg">
              <Img
                src={img(data?.profilePath || person.profile, "w185")}
                alt={person.name}
                rounded="rounded-2xl"
                isAvatar
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate">
                  {person.name}
                </h2>
                <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E50914]/20 text-[#ff2a34] border border-[#E50914]/30">
                  {data?.knownForDepartment || person.role || "Artist"}
                </span>
              </div>

              {person.role && (
                <p className="text-xs text-[#94a3b8] mt-0.5 truncate">Role: {person.role}</p>
              )}

              {data?.placeOfBirth && (
                <p className="text-[11px] text-[#64748b] mt-0.5 truncate">
                  From: {data.placeOfBirth}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/[0.06] hover:bg-white/15 text-[#94a3b8] hover:text-white transition cursor-pointer active:scale-90"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none no-scrollbar p-4 sm:p-6 space-y-6">
          {/* Biography snippet if available */}
          {data?.biography && (
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs sm:text-sm text-[#94a3b8] leading-relaxed max-h-32 overflow-y-auto scrollbar-none no-scrollbar">
              {data.biography}
            </div>
          )}

          {/* Works Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ff2a34]" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                All Movies & Series {data?.works ? `(${data.works.length})` : ""}
              </h3>
            </div>
            <span className="text-[11px] text-[#64748b]">Click any title to watch / explore</span>
          </div>

          {/* Loading State */}
          {isPending && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-2.5 space-y-2 animate-pulse"
                >
                  <div className="aspect-[2/3] w-full rounded-xl bg-white/[0.06] shimmer" />
                  <div className="h-3 w-3/4 rounded bg-white/[0.06] shimmer" />
                  <div className="h-2.5 w-1/2 rounded bg-white/[0.04] shimmer" />
                </div>
              ))}
            </div>
          )}

          {/* Works Grid */}
          {!isPending && data?.works && data.works.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {data.works.map((item, index) => (
                <button
                  key={`${item.id}-${item.character || item.job || "work"}-${index}`}
                  type="button"
                  onClick={() => {
                    onClose();
                    const cat = getMediaCategory(item.id, item);
                    if (cat === "movie") {
                      void navigate({
                        to: "/movie/$id",
                        params: { id: String(item.id) },
                      });
                    } else if (cat === "webseries") {
                      void navigate({
                        to: "/webseries/$id",
                        params: { id: String(item.id) },
                      });
                    } else {
                      void navigate({
                        to: "/anime/$id",
                        params: { id: String(item.id) },
                      });
                    }
                  }}
                  className="group relative flex flex-col rounded-2xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/[0.06] hover:border-[#E50914]/50 p-2 transition-all duration-200 text-left active:scale-[0.98] cursor-pointer"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#090d16] mb-2 shadow-md">
                    <Img
                      src={img(item.poster, "w342")}
                      alt={item.title}
                      rounded="rounded-xl"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/20">
                      <Star className="w-2.5 h-2.5 fill-amber-300" />
                      {item.rating > 0 ? item.rating.toFixed(1) : "—"}
                    </div>

                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-semibold text-slate-300">
                      {item.type === "Movie" ? "Movie" : "Series"}
                    </div>
                  </div>

                  <span className="text-xs font-bold text-white group-hover:text-[#ff2a34] transition-colors line-clamp-1">
                    {item.title}
                  </span>

                  {(item.character || item.job) && (
                    <span className="text-[10px] text-[#94a3b8] line-clamp-1 mt-0.5">
                      {item.character ? `as ${item.character}` : item.job}
                    </span>
                  )}

                  {item.year && (
                    <span className="text-[10px] text-[#64748b] mt-auto pt-1">{item.year}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isPending && (!data?.works || data.works.length === 0) && (
            <div className="py-12 text-center text-[#94a3b8]">
              <p className="text-sm">No titles found for this person.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
