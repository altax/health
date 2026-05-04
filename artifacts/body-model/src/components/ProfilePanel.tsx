import { useState } from "react";
import type { BodyProfile } from "../lib/bodyMetrics";

interface Props {
  profile: BodyProfile;
  onChange: (p: BodyProfile) => void;
  collapsed: boolean;
  onToggle: () => void;
}

function Field({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-foreground">
          {value != null ? `${value} ${unit}` : `— ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, hsl(220 70% 45%) 0%, hsl(220 70% 45%) ${
            ((((value ?? min) - min) / (max - min)) * 100).toFixed(1)
          }%, hsl(220 10% 88%) ${
            ((((value ?? min) - min) / (max - min)) * 100).toFixed(1)
          }%, hsl(220 10% 88%) 100%)`,
        }}
      />
    </div>
  );
}

export default function ProfilePanel({ profile, onChange, collapsed, onToggle }: Props) {
  const set = (key: keyof BodyProfile) => (v: number | undefined) =>
    onChange({ ...profile, [key]: v });

  return (
    <div
      className="absolute left-0 top-0 bottom-0 flex"
      style={{ zIndex: 10 }}
    >
      <div
        className="bg-white border-r border-border shadow-sm flex flex-col transition-all duration-300 overflow-hidden"
        style={{ width: collapsed ? 0 : 260 }}
      >
        {!collapsed && (
          <>
            <div className="px-4 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Параметры тела
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Основные и дополнительные замеры
              </p>
            </div>

            <div className="flex-1 overflow-y-auto panel-scroll px-4 py-4 flex flex-col gap-5">
              {/* SEX */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Пол
                </p>
                <div className="flex rounded-lg overflow-hidden border border-border">
                  {(["male", "female"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => onChange({ ...profile, sex: s })}
                      className="flex-1 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        background:
                          profile.sex === s
                            ? "hsl(220 70% 45%)"
                            : "transparent",
                        color:
                          profile.sex === s
                            ? "white"
                            : "hsl(220 15% 40%)",
                      }}
                    >
                      {s === "male" ? "Мужской" : "Женский"}
                    </button>
                  ))}
                </div>
              </div>

              {/* BASICS */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Основное
                </p>
                <Field label="Возраст" unit="лет" value={profile.age} min={15} max={90} step={1} onChange={(v) => onChange({ ...profile, age: v ?? 30 })} />
                <Field label="Рост" unit="см" value={profile.height} min={140} max={220} step={1} onChange={(v) => onChange({ ...profile, height: v ?? 175 })} />
                <Field label="Вес" unit="кг" value={profile.weight} min={40} max={200} step={1} onChange={(v) => onChange({ ...profile, weight: v ?? 75 })} />
              </div>

              {/* MEASUREMENTS */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Замеры (опционально)
                </p>
                <Field label="Грудь" unit="см" value={profile.chest} min={60} max={160} step={1} onChange={set("chest")} />
                <Field label="Талия" unit="см" value={profile.waist} min={50} max={180} step={1} onChange={set("waist")} />
                <Field label="Бёдра" unit="см" value={profile.hips} min={60} max={180} step={1} onChange={set("hips")} />
                <Field label="Шея" unit="см" value={profile.neck} min={25} max={65} step={1} onChange={set("neck")} />
                <Field label="Плечи" unit="см" value={profile.shoulder} min={30} max={80} step={1} onChange={set("shoulder")} />
                <Field label="Бедро" unit="см" value={profile.thigh} min={30} max={100} step={1} onChange={set("thigh")} />
                <Field label="Голень" unit="см" value={profile.calf} min={20} max={60} step={1} onChange={set("calf")} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="self-center ml-0 w-6 h-14 flex items-center justify-center rounded-r-lg border border-l-0 border-border bg-white shadow-sm hover:bg-accent transition-colors"
        style={{ zIndex: 11 }}
        title={collapsed ? "Открыть панель" : "Закрыть панель"}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.3s" }}
        >
          <path d="M4 2L8 6L4 10" stroke="hsl(220 15% 40%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
