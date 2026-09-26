import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "My Library — CinePulse" },
      {
        name: "description",
        content: "Your saved watchlist and continue watching history on CinePulse.",
      },
    ],
  }),
  component: LibraryRedirect,
});

function LibraryRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/watchlist", replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E50914] border-t-transparent" />
    </div>
  );
}
