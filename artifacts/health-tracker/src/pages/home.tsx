import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  useGetDashboard, useGetNutrientAnalysis, useGetMeasurements,
} from "@workspace/api-client-react";
import {
  Home, BookOpen, FlaskConical, Ruler, Zap, TrendingUp,
  Droplets, Moon, Flame, Activity, ChevronRight, RotateCcw,
  Shield, Settings,
} from "lucide-react";

const BodyScene = lazy(() => import("@/components/body3d/BodyScene"));

interface UserProfile {
  name: string;
  sex: "male" | "female";
  age: number;
  height: number;
  weight: number;
  bodyFat?: number;
  activityLevel: string;
  goals: string[];
}

interface Props {
  profile: UserProfile;
  onResetProfile: () => void;
}

const NAV = [
  { id: "home", label: "Обзор", icon: Home, href: "/" },
  { id: "log", label: "Дневник", icon: BookOpen, href: "/log" },
  { id: "nutrients", label: "Нутриенты", icon: Zap, href: "/nutrients" },
  { id: "labs", label: "Анализы", icon: FlaskConical, href: "/labs" },
  { id: "measurements", label: "Замеры", icon: Ruler, href: "/measurements" },
  { id: "weekly", label: "Отчёт", icon: TrendingUp, href: "/weekly" },
];

export default function HomePage({ profile, onResetProfile }: Props) {
  const [, navigate] = useLocation();
  const [activeNav, setActiveNav] = useState("home");
  const [bodyRotating, setBodyRotating] = useState(false);

  const { data: dashboard } = useGetDashboard();
  const { data: nutrients } = useGetNutrientAnalysis({ period: "7d" });
  const { data: measurements } = useGetMeasurements();

  const latestMeasure = measurements?.[0];
  const displayWeight = latestMeasure?.weight ?? profile.weight;
  const displayFat = latestMeasure?.bodyFatPercent ?? profile.bodyFat;

  const bmi = displayWeight / ((profile.height / 100) ** 2);
  const bmiLabel = bmi < 18.5 ? "Недовес" : bmi < 25 ? "Норма" : bmi < 30 ? "Избыток" : "Ожирение";
  const bmiColor = bmi < 18.5 ? "text-blue-400" : bmi < 25 ? "text-emerald-400" : bmi < 30 ? "text-amber-400" : "text-red-400";

  const waterMl = dashboard?.today?.waterMl ?? 0;
  const waterGoal = dashboard?.waterTarget ?? 2000;
  const sleepH = (dashboard?.today?.sleep as { durationHours?: number } | null)?.durationHours;
  const calories = dashboard?.today?.totalNutrients?.calories ?? 0;
  const calorieTarget = dashboard?.calorieTarget ?? 2000;

  const deficientCount = nutrients?.nutrients?.filter((n) => n.status.includes("deficient")).length ?? 0;

  function goTo(href: string, id: string) {
    setActiveNav(id);
    navigate(href);
  }

  const bodyParams = {
    heightCm: profile.height,
    weightKg: displayWeight,
    bodyFatPct: displayFat,
    sex: profile.sex,
  };

  return (
    <div className="fixed inset-0 bg-[#020209] overflow-hidden flex flex-col">
      <div className="aurora" />

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-20 flex items-center justify-between px-6 pt-5 pb-2"
      >
        <div>
          <div className="text-xs text-white/30 tracking-widest uppercase mb-0.5">Здравствуй</div>
          <div className="text-lg font-light text-white">{profile.name}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-sm font-mono ${bmiColor}`}>
            БМИ {bmi.toFixed(1)} · <span className="text-white/40">{bmiLabel}</span>
          </div>
          <button
            onClick={onResetProfile}
            className="p-2 rounded-xl glass hover:border-white/15 transition-colors"
          >
            <Settings className="h-4 w-4 text-white/30" />
          </button>
        </div>
      </motion.div>

      {/* 3D Body + floating metrics */}
      <div className="relative flex-1 z-10">
        {/* 3D Canvas */}
        <Suspense fallback={<BodyPlaceholder />}>
          <BodyScene params={bodyParams} className="absolute inset-0 w-full h-full" />
        </Suspense>

        {/* Floating metric cards */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Left cards */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="absolute left-4 top-1/4 space-y-3 pointer-events-auto"
          >
            <MetricCard
              icon={<Droplets className="h-3.5 w-3.5 text-blue-400" />}
              label="Вода"
              value={`${Math.round(waterMl)}`}
              unit="мл"
              progress={Math.min((waterMl / waterGoal) * 100, 100)}
              progressColor="bg-blue-400"
              className="float-1"
            />
            <MetricCard
              icon={<Moon className="h-3.5 w-3.5 text-indigo-400" />}
              label="Сон"
              value={sleepH ? sleepH.toString() : "—"}
              unit="ч"
              progress={sleepH ? Math.min((sleepH / 8) * 100, 100) : 0}
              progressColor="bg-indigo-400"
              className="float-2"
            />
          </motion.div>

          {/* Right cards */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="absolute right-4 top-1/4 space-y-3 pointer-events-auto"
          >
            <MetricCard
              icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}
              label="Калории"
              value={`${Math.round(calories)}`}
              unit="ккал"
              progress={Math.min((calories / calorieTarget) * 100, 100)}
              progressColor="bg-orange-400"
              className="float-3"
            />
            {deficientCount > 0 && (
              <MetricCard
                icon={<Shield className="h-3.5 w-3.5 text-amber-400" />}
                label="Дефициты"
                value={deficientCount.toString()}
                unit="нутр."
                progress={0}
                progressColor="bg-amber-400"
                className="float-4"
                onClick={() => goTo("/nutrients", "nutrients")}
              />
            )}
            {displayFat != null && (
              <MetricCard
                icon={<Activity className="h-3.5 w-3.5 text-purple-400" />}
                label="Жир"
                value={displayFat.toFixed(1)}
                unit="%"
                progress={Math.max(0, 100 - (displayFat / 35) * 100)}
                progressColor="bg-purple-400"
                className="float-2"
              />
            )}
          </motion.div>
        </div>

        {/* Bottom body stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xs px-4"
        >
          <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between gap-6">
            <BodyStat label="Рост" value={`${profile.height}`} unit="см" />
            <div className="w-px h-8 bg-white/10" />
            <BodyStat label="Вес" value={`${displayWeight}`} unit="кг" />
            <div className="w-px h-8 bg-white/10" />
            <BodyStat label="Возраст" value={`${profile.age}`} unit="лет" />
          </div>
          <p className="text-center text-white/20 text-xs mt-2">
            Потяни модель чтобы крутить
          </p>
        </motion.div>

        {/* Drag hint rings around body */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-48 h-48">
            <svg className="ring-1 absolute inset-0 w-full h-full opacity-10" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="90" fill="none" stroke="#6ee7f7" strokeWidth="0.5" strokeDasharray="8 16" />
            </svg>
            <svg className="ring-2 absolute inset-0 w-full h-full opacity-5" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="70" fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="12 20" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <motion.nav
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="relative z-20 px-4 pb-5 pt-2"
      >
        <div className="glass-strong rounded-2xl px-2 py-2 flex items-center justify-around">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTo(item.href, item.id)}
                className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive ? "bg-cyan-400/10" : "hover:bg-white/5"
                }`}
              >
                <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-cyan-400" : "text-white/35"}`} />
                <span className={`text-[10px] transition-colors ${isActive ? "text-cyan-400" : "text-white/25"}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
                    style={{ boxShadow: "0 0 6px rgba(110,231,247,0.8)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}

function MetricCard({ icon, label, value, unit, progress, progressColor, className, onClick }: {
  icon: React.ReactNode; label: string; value: string; unit: string;
  progress: number; progressColor: string; className?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`glass rounded-xl p-3 w-[120px] ${className ?? ""} ${onClick ? "cursor-pointer hover:border-white/15" : ""} transition-all`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-lg font-light text-white">{value}</span>
        <span className="text-xs text-white/30">{unit}</span>
      </div>
      {progress > 0 && (
        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${progressColor}`}
            style={{ width: `${progress}%`, opacity: 0.7 }}
          />
        </div>
      )}
    </div>
  );
}

function BodyStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-white/30 mb-0.5">{label}</div>
      <div className="text-sm font-light text-white">
        {value}<span className="text-white/30 text-xs ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function BodyPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative w-20 h-20">
        <svg className="ring-1 w-20 h-20" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(110,231,247,0.3)" strokeWidth="1"
            strokeDasharray="60 53" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
