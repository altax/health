import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import Dashboard from "@/pages/dashboard";
import LogPage from "@/pages/log";
import NutrientsPage from "@/pages/nutrients";
import LabsPage from "@/pages/labs";
import MeasurementsPage from "@/pages/measurements";
import RecommendationsPage from "@/pages/recommendations";
import WeeklyPage from "@/pages/weekly";
import ProfilePage from "@/pages/profile";
import HistoryPage from "@/pages/history";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <SidebarLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/log" component={LogPage} />
        <Route path="/log/:date" component={LogPage} />
        <Route path="/recommendations" component={RecommendationsPage} />
        <Route path="/nutrients" component={NutrientsPage} />
        <Route path="/labs" component={LabsPage} />
        <Route path="/measurements" component={MeasurementsPage} />
        <Route path="/weekly" component={WeeklyPage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </SidebarLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
