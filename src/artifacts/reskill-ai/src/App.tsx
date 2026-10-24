import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/shell";
import { Rows } from "@/components/kit";
import { LangProvider } from "@/i18n";
import { AuthProvider, portalHome, useAuth } from "@/lib/auth";
import { PwaInstall } from "@/components/pwa-install";
import { Landing, Login, NotFound, Register } from "@/pages/public";
const { Outlook, Workspace } = {
  Outlook: lazy(() => import("@/pages/me").then((m) => ({ default: m.Outlook }))),
  Workspace: lazy(() => import("@/pages/me").then((m) => ({ default: m.Workspace }))),
};
const Jobs = lazy(()=>import("@/pages/jobs"));
const CertificatePage = lazy(() => import("@/pages/certificate"));
const ProfileWorkspace = lazy(() => import("@/pages/profile"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const Courses = lazy(() => import("@/pages/catalog").then((m) => ({ default: m.Courses })));
const RoleDetail = lazy(() => import("@/pages/catalog").then((m) => ({ default: m.RoleDetail })));
const Roles = lazy(() => import("@/pages/catalog").then((m) => ({ default: m.Roles })));
const Market = lazy(() => import("@/pages/market").then((m) => ({ default: m.Market })));
const Sources = lazy(() => import("@/pages/market").then((m) => ({ default: m.Sources })));
const TvetMarket = lazy(() => import("@/pages/market").then((m) => ({ default: m.TvetMarket })));
const CohortDashboard = lazy(() => import("@/pages/cohort").then((m) => ({ default: m.CohortDashboard })));
const Members = lazy(() => import("@/pages/cohort").then((m) => ({ default: m.Members })));
const Programmes = lazy(() => import("@/pages/cohort").then((m) => ({ default: m.Programmes })));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, refetchOnWindowFocus: false } } });

function Gate({ role, children }: { role: "individual" | "hr" | "tvet"; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Rows n={4} h="h-20" />;
  if (role === "individual") {
    if (user && user.role !== "individual") return <Redirect to={portalHome(user.role)} />;
    return <>{children}</>;
  }
  if (!user || user.role !== role) return <Redirect to={`/login?role=${role}`} />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/onboarding/:step?"><RoutedErrorBoundary><Onboarding /></RoutedErrorBoundary></Route>
      <Route path="/tvet/certificates/:id"><Gate role="tvet"><RoutedErrorBoundary><CertificatePage /></RoutedErrorBoundary></Gate></Route>
      <Route path="/hr/certificates/:id"><Gate role="hr"><RoutedErrorBoundary><CertificatePage /></RoutedErrorBoundary></Gate></Route>
      <Route path="/me/certificates/:id"><Gate role="individual"><RoutedErrorBoundary><CertificatePage /></RoutedErrorBoundary></Gate></Route>
      <Route>
        <Shell>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/me"><Gate role="individual"><Workspace /></Gate></Route>
              <Route path="/me/jobs/:id"><Gate role="individual"><Jobs/></Gate></Route>
              <Route path="/me/outlook"><Gate role="individual"><Outlook /></Gate></Route>
              <Route path="/me/profiles/:id/:module?"><Gate role="individual"><ProfileWorkspace base="/me/profiles" listHref="/me" /></Gate></Route>
              <Route path="/roles" component={Roles} />
              <Route path="/roles/:id" component={RoleDetail} />
              <Route path="/courses"><Courses /></Route>
              <Route path="/market" component={Market} />
              <Route path="/sources" component={Sources} />

              <Route path="/hr"><Gate role="hr"><CohortDashboard kind="hr" /></Gate></Route>
              <Route path="/hr/members"><Gate role="hr"><Members kind="hr" /></Gate></Route>
              <Route path="/hr/members/:id/:module?"><Gate role="hr"><ProfileWorkspace base="/hr/members" listHref="/hr/members" /></Gate></Route>
              <Route path="/hr/courses"><Gate role="hr"><Courses hr /></Gate></Route>

              <Route path="/tvet"><Gate role="tvet"><CohortDashboard kind="tvet" /></Gate></Route>
              <Route path="/tvet/students"><Gate role="tvet"><Members kind="tvet" /></Gate></Route>
              <Route path="/tvet/students/:id/:module?"><Gate role="tvet"><ProfileWorkspace base="/tvet/students" listHref="/tvet/students" /></Gate></Route>
              <Route path="/tvet/courses"><Gate role="tvet"><Programmes /></Gate></Route>
              <Route path="/tvet/programmes"><Redirect to="/tvet/courses"/></Route>
              <Route path="/tvet/market"><Gate role="tvet"><TvetMarket /></Gate></Route>
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
        </Shell>
      </Route>
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <PwaInstall />
              <Suspense fallback={<main className="mx-auto max-w-5xl p-6"><Rows n={4} h="h-20" /></main>}><AppRoutes /></Suspense>
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default App;
