import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { lazy } from "react";
import { useAuth } from "./auth";
import { AppShell } from "./components/AppShell";
import { LoginScreen } from "./components/LoginScreen";
import { PageSkeleton } from "./components/QueryState";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const FacilitiesPage = lazy(() =>
  import("./pages/FacilitiesPage").then((module) => ({ default: module.FacilitiesPage })),
);
const AssetsPage = lazy(() =>
  import("./pages/AssetsPage").then((module) => ({ default: module.AssetsPage })),
);
const TroubleshootingPage = lazy(() =>
  import("./pages/TroubleshootingPage").then((module) => ({
    default: module.TroubleshootingPage,
  })),
);

function RootComponent() {
  const { loading, user } = useAuth();
  if (loading)
    return (
      <div className="p-10">
        <PageSkeleton />
      </div>
    );
  return user ? <AppShell /> : <LoginScreen />;
}
const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-navy-950 text-white">
      <div className="text-center">
        <p className="text-6xl font-bold text-cyan-400">404</p>
        <h1 className="mt-3 text-xl font-bold">Route not found</h1>
        <a href="/" className="mt-5 inline-block text-cyan-300 underline">
          Return to operations
        </a>
      </div>
    </div>
  ),
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});
const facilitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/facilities",
  component: FacilitiesPage,
});
const assetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assets",
  component: AssetsPage,
});
const troubleshootingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/troubleshoot",
  component: TroubleshootingPage,
});
const routeTree = rootRoute.addChildren([
  indexRoute,
  facilitiesRoute,
  assetsRoute,
  troubleshootingRoute,
]);
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
