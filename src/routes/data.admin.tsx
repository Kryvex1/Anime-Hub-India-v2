import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { checkAdminSession, clearAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

const adminSearchSchema = z.object({
  animeId: z.number().optional().catch(undefined),
  season: z.number().optional().catch(undefined),
  episode: z.number().optional().catch(undefined),
});

export const Route = createFileRoute("/data/admin")({
  validateSearch: (search) => adminSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Control Center — Anime Hub India" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  const search = Route.useSearch();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const isAuth = checkAdminSession();
    setIsAuthenticated(isAuth);
  }, []);

  const handleSignOut = () => {
    clearAdminSession();
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <p className="text-xs font-semibold text-muted-foreground">
            Verifying security credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <AdminDashboard
      onSignOut={handleSignOut}
      initialAnimeId={search.animeId}
      initialSeason={search.season}
      initialEpisode={search.episode}
    />
  );
}
