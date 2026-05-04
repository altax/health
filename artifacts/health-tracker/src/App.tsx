import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import JarvisOnboarding, { type OnboardingData } from "@/components/onboarding/JarvisOnboarding";

const HomePage         = lazy(() => import("@/pages/home"));
const LogPage          = lazy(() => import("@/pages/log"));
const NutrientsPage    = lazy(() => import("@/pages/nutrients"));
const LabsPage         = lazy(() => import("@/pages/labs"));
const MeasurementsPage = lazy(() => import("@/pages/measurements"));
const RecommendationsPage = lazy(() => import("@/pages/recommendations"));
const WeeklyPage       = lazy(() => import("@/pages/weekly"));
const ProfilePage      = lazy(() => import("@/pages/profile"));
const HistoryPage      = lazy(() => import("@/pages/history"));
const NotFound         = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const PAGE_TITLES: Record<string, string> = {
  "/log": "Дневник", "/nutrients": "Нутриенты", "/labs": "Анализы",
  "/measurements": "Замеры", "/recommendations": "Рекомендации",
  "/weekly": "Недельный отчёт", "/history": "История", "/profile": "Профиль",
};

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <svg className="ring-1 w-10 h-10" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(110,231,247,0.15)" strokeWidth="1"/>
        <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(110,231,247,0.65)" strokeWidth="1.5"
          strokeDasharray="28 79" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function InnerRouter({ profile, onReset }: { profile: OnboardingData; onReset: () => void }) {
  const [location] = useLocation();
  const isHome = location === "/" || location === "";
  const title = Object.entries(PAGE_TITLES).find(([k]) => location.startsWith(k))?.[1];

  if (isHome) {
    return (
      <Suspense fallback={<Spinner />}>
        <HomePage profile={profile} onResetProfile={onReset} />
      </Suspense>
    );
  }

  return (
    <AppShell title={title}>
      <Suspense fallback={<Spinner />}>
        <Switch>
          <Route path="/log"            component={LogPage} />
          <Route path="/log/:date"      component={LogPage} />
          <Route path="/nutrients"      component={NutrientsPage} />
          <Route path="/labs"           component={LabsPage} />
          <Route path="/measurements"   component={MeasurementsPage} />
          <Route path="/recommendations" component={RecommendationsPage} />
          <Route path="/weekly"         component={WeeklyPage} />
          <Route path="/history"        component={HistoryPage} />
          <Route path="/profile"        component={ProfilePage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AppShell>
  );
}

function ProfileSaver({ data, onDone }: { data: OnboardingData; onDone: () => void }) {
  useEffect(() => {
    const base = import.meta.env.BASE_URL ?? "/";
    fetch(`${base}api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sex: data.sex,
        age: data.age,
        height: data.height,
        weight: data.weight,
        bodyFatPercent: data.bodyFat ?? null,
        activityLevel: data.activityLevel,
        sleepGoalHours: 8,
        goals: data.goals,
        chronicConditions: [],
        medications: [],
        allergies: [],
        dietaryRestrictions: [],
      }),
    }).finally(() => onDone());
  }, []);
  return null;
}

function AppWithProfile({ profile, onReset }: { profile: OnboardingData; onReset: () => void }) {
  const [saved, setSaved] = useState(false);
  const needsSave = !localStorage.getItem("jarvis_profile_saved");

  useEffect(() => {
    if (!needsSave) setSaved(true);
  }, []);

  function handleSaved() {
    localStorage.setItem("jarvis_profile_saved", "1");
    setSaved(true);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {!saved && <ProfileSaver data={profile} onDone={handleSaved} />}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <InnerRouter profile={profile} onReset={onReset} />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  const [profile, setProfile] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("jarvis_profile");
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch { /* */ }
    }
    setLoading(false);
  }, []);

  function handleComplete(data: OnboardingData) {
    localStorage.setItem("jarvis_profile", JSON.stringify(data));
    localStorage.removeItem("jarvis_profile_saved");
    setProfile(data);
  }

  function handleReset() {
    localStorage.removeItem("jarvis_profile");
    localStorage.removeItem("jarvis_profile_saved");
    setProfile(null);
  }

  if (loading) return null;

  if (!profile) {
    return (
      <QueryClientProvider client={queryClient}>
        <JarvisOnboarding onComplete={handleComplete} />
      </QueryClientProvider>
    );
  }

  return <AppWithProfile profile={profile} onReset={handleReset} />;
}

export default App;
