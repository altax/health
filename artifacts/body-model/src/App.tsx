import { useState, useMemo } from "react";
import HumanBody3D from "./components/HumanBody3D";
import ProfilePanel from "./components/ProfilePanel";
import AnalysisPanel from "./components/AnalysisPanel";
import { calculateProportions, calculateHealth } from "./lib/bodyMetrics";
import type { BodyProfile } from "./lib/bodyMetrics";

const DEFAULT_PROFILE: BodyProfile = {
  sex: "male",
  age: 30,
  height: 178,
  weight: 78,
  chest: undefined,
  waist: undefined,
  hips: undefined,
  neck: undefined,
  shoulder: undefined,
  thigh: undefined,
  calf: undefined,
};

export default function App() {
  const [profile, setProfile] = useState<BodyProfile>(DEFAULT_PROFILE);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rotating, setRotating] = useState(true);

  const proportions = useMemo(() => calculateProportions(profile), [profile]);
  const metrics = useMemo(() => calculateHealth(profile), [profile]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#F0F2F7" }}>
      {/* LEFT PANEL */}
      <ProfilePanel
        profile={profile}
        onChange={setProfile}
        collapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed((v) => !v)}
      />

      {/* 3D CANVAS — fills entire screen, panels float on top */}
      <div className="absolute inset-0">
        <HumanBody3D
          proportions={proportions}
          rotating={rotating}
          onStartManual={() => setRotating(false)}
        />
      </div>

      {/* BOTTOM INFO BAR */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur border border-white shadow-sm"
        style={{ zIndex: 20, whiteSpace: "nowrap" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">ИМТ</span>
          <span className="text-[13px] font-bold" style={{ color: metrics.bmiColor }}>
            {metrics.bmi} — {metrics.bmiCategory}
          </span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Жир~</span>
          <span className="text-[13px] font-bold" style={{ color: metrics.bodyFatColor }}>
            {metrics.bodyFatEstimate}%
          </span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">BMR</span>
          <span className="text-[13px] font-semibold text-foreground">
            {metrics.bmr} ккал
          </span>
        </div>
        <div className="w-px h-4 bg-border" />
        <button
          onClick={() => setRotating((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
          style={{ color: rotating ? "hsl(220 70% 45%)" : "hsl(220 10% 55%)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {rotating ? "Стоп" : "Вращение"}
        </button>
      </div>

      {/* RIGHT PANEL */}
      <AnalysisPanel
        metrics={metrics}
        collapsed={rightCollapsed}
        onToggle={() => setRightCollapsed((v) => !v)}
      />
    </div>
  );
}
