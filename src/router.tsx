import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { lazy } from "react";
import { useAuth } from "./auth";
import { AppShell } from "./components/AppShell";
import { ActivationPendingScreen } from "./components/ActivationPendingScreen";
import { WelcomeScreen } from "./components/WelcomeScreen";

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
const MaintenancePage = lazy(() =>
  import("./pages/MaintenancePage").then((module) => ({
    default: module.MaintenancePage,
  })),
);
const InformationPage = lazy(() =>
  import("./pages/InformationPage").then((module) => ({
    default: module.InformationPage,
  })),
);
const BillingPage = lazy(() =>
  import("./pages/BillingPage").then((module) => ({ default: module.BillingPage })),
);
const AdminServicePage = lazy(() =>
  import("./pages/AdminServicePage").then((module) => ({
    default: module.AdminServicePage,
  })),
);
const OwnerSettingsPage = lazy(() =>
  import("./pages/OwnerSettingsPage").then((module) => ({
    default: module.OwnerSettingsPage,
  })),
);
const PrivacyPage = lazy(() =>
  import("./pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })),
);
const SupportPage = lazy(() =>
  import("./pages/SupportPage").then((module) => ({ default: module.SupportPage })),
);
const TermsPage = lazy(() =>
  import("./pages/TermsPage").then((module) => ({ default: module.TermsPage })),
);

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { loading, user } = useAuth();
  if (["/privacy", "/support", "/terms"].includes(pathname)) return <Outlet />;
  if (loading || !user) return <WelcomeScreen />;
  if (!user.workspaceAccess) return <ActivationPendingScreen />;
  return <AppShell />;
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
const maintenanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/maintenance",
  component: MaintenancePage,
});
const informationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/information",
  component: InformationPage,
});
const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing",
  component: BillingPage,
});
const adminServiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminServicePage,
});
const ownerSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/owner-settings",
  component: OwnerSettingsPage,
});
const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: PrivacyPage,
});
const supportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/support",
  component: SupportPage,
});
const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsPage,
});
const routeTree = rootRoute.addChildren([
  indexRoute,
  facilitiesRoute,
  assetsRoute,
  troubleshootingRoute,
  maintenanceRoute,
  informationRoute,
  billingRoute,
  adminServiceRoute,
  ownerSettingsRoute,
  privacyRoute,
  supportRoute,
  termsRoute,
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
