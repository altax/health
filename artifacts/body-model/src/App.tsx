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

  const proportions = useMemo(() => calculateProportions(profile), [profile]);
  const metrics = useMemo(() => calculateHealth(profile), [profile]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#F4F5F8" }}>
      {/* LEFT PANEL */}
      <ProfilePanel
        profile={profile}
        onChange={setProfile}
        collapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed((v) => !v)}
      />

      {/* CENTER — BODY MODEL */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="h-full"
          style={{
            width: "100%",
            paddingLeft: leftCollapsed ? 28 : 288,
            paddingRight: rightCollapsed ? 28 : 288,
            paddingTop: 16,
            paddingBottom: 64,
            transition: "padding 0.3s",
          }}
        >
          <HumanBody3D proportions={proportions} />
        </div>
      </div>

      {/* BOTTOM INFO BAR */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 rounded-full bg-white border border-border shadow-sm"
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
          <span className="text-[11px] text-muted-foreground">Жир ~</span>
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
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Идеал</span>
          <span className="text-[13px] font-semibold text-foreground">
            {metrics.idealWeightMin}–{metrics.idealWeightMax} кг
          </span>
        </div>
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
