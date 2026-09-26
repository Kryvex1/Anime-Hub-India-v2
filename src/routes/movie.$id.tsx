import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/movie/$id")({
  component: MovieLayout,
});

function MovieLayout() {
  return <Outlet />;
}
