import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Watch History — CinePulse" },
      {
        name: "description",
        content: "View and resume your recently watched movies, series, and anime on CinePulse.",
      },
    ],
  }),
  component: HistoryRedirect,
});

function HistoryRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/watchlist", search: { tab: "history" }, replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E50914] border-t-transparent" />
    </div>
  );
}
