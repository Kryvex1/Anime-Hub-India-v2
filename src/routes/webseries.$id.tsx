import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/webseries/$id")({
  component: WebSeriesLayout,
});

function WebSeriesLayout() {
  return <Outlet />;
}
