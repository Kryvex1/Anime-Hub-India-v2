import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "CinePulse" }],
  }),
  component: RedirectHome,
});

function RedirectHome() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-[#E50914] border-t-transparent animate-spin" />
    </div>
  );
}
