import type { DashboardStats } from "@/lib/episodes.firebase";
import {
  IconDatabase,
  IconServer,
  IconCheckCircle,
  IconAlert,
  IconSparkles,
} from "@/components/anime/icons";

interface AdminStatsProps {
  stats: DashboardStats;
  loading?: boolean;
}

export function AdminStats({ stats, loading }: AdminStatsProps) {
  const cards = [
    {
      title: "Configured Episodes",
      value: stats.totalConfigured,
      description: "Total stream records in database",
      icon: IconDatabase,
      color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/20",
    },
    {
      title: "Server 1 (Direct)",
      value: stats.withServer1,
      description: "Direct HTML5 video sources",
      icon: IconServer,
      color: "from-sky-500/20 to-cyan-500/10 text-sky-400 border-sky-500/20",
    },
    {
      title: "Server 2 (Embed)",
      value: stats.withServer2,
      description: "Iframe embed sources",
      icon: IconServer,
      color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/20",
    },
    {
      title: "Both Servers Ready",
      value: stats.withBothServers,
      description: "Dual-redundancy episodes",
      icon: IconCheckCircle,
      color: "from-emerald-500/20 to-green-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      title: "No Active Server",
      value: stats.withNoServer,
      description: "Drafts or pending configs",
      icon: IconAlert,
      color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/20",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass shimmer h-32 rounded-2xl p-5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`glass relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${card.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{card.title}</span>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 backdrop-blur-sm">
                <Icon width={17} height={17} />
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {card.value}
              </span>
              <span className="text-[10px] text-muted-foreground">episodes</span>
            </div>

            <p className="mt-1 text-[11px] text-muted-foreground/80 line-clamp-1">
              {card.description}
            </p>

            {/* Subtle corner light */}
            <div className="pointer-events-none absolute -right-6 -bottom-6 h-16 w-16 rounded-full bg-white/5 blur-xl" />
          </div>
        );
      })}
    </div>
  );
}
