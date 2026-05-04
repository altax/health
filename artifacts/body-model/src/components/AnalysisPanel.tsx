import type { HealthMetrics } from "../lib/bodyMetrics";

interface Props {
  metrics: HealthMetrics;
  collapsed: boolean;
  onToggle: () => void;
}

function MetricRow({
  label,
  value,
  color,
  bar,
}: {
  label: string;
  value: string;
  color?: string;
  bar?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className="text-xs font-semibold"
          style={{ color: color ?? "hsl(220 15% 15%)" }}
        >
          {value}
        </span>
      </div>
      {bar != null && (
        <div className="metric-bar">
          <div
            className="metric-bar-fill"
            style={{
              width: `${Math.min(100, bar)}%`,
              background: color ?? "hsl(220 70% 45%)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {children}
    </div>
  );
}

export default function AnalysisPanel({ metrics: m, collapsed, onToggle }: Props) {
  const bmiPct = Math.min(100, ((m.bmi - 10) / 35) * 100);
  const bfPct = Math.min(100, (m.bodyFatEstimate / 50) * 100);

  return (
    <div className="absolute right-0 top-0 bottom-0 flex flex-row-reverse" style={{ zIndex: 10 }}>
      <div
        className="bg-white border-l border-border shadow-sm flex flex-col transition-all duration-300 overflow-hidden"
        style={{ width: collapsed ? 0 : 260 }}
      >
        {!collapsed && (
          <>
            <div className="px-4 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Анализ здоровья
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                На основе научных данных
              </p>
            </div>

            <div className="flex-1 overflow-y-auto panel-scroll px-4 py-4 flex flex-col gap-5">
              {/* COMPOSITION */}
              <Section title="Состав тела">
                <MetricRow
                  label="ИМТ"
                  value={`${m.bmi} — ${m.bmiCategory}`}
                  color={m.bmiColor}
                  bar={bmiPct}
                />
                <MetricRow
                  label="Жировая масса"
                  value={`${m.bodyFatEstimate}% — ${m.bodyFatCategory}`}
                  color={m.bodyFatColor}
                  bar={bfPct}
                />
              </Section>

              {/* ENERGY */}
              <Section title="Энергетика">
                <MetricRow
                  label="Основной обмен (BMR)"
                  value={`${m.bmr} ккал/сут`}
                />
                <MetricRow
                  label="Суточная потребность"
                  value={`${m.tdee} ккал/сут`}
                />
                <MetricRow
                  label="Идеальный вес"
                  value={`${m.idealWeightMin}–${m.idealWeightMax} кг`}
                />
              </Section>

              {/* RISKS */}
              <Section title="Факторы риска">
                {m.waistToHeightRatio != null && (
                  <MetricRow
                    label="Талия / Рост"
                    value={`${m.waistToHeightRatio} ${m.waistToHeightRatio > 0.5 ? "⚠" : "✓"}`}
                    color={m.waistToHeightRatio > 0.5 ? "#EF4444" : "#22C55E"}
                    bar={Math.min(100, (m.waistToHeightRatio / 0.7) * 100)}
                  />
                )}
                {m.waistToHipRatio != null && (
                  <MetricRow
                    label="Талия / Бёдра (ОТБ)"
                    value={`${m.waistToHipRatio} — ${m.whrRisk}`}
                    color={m.whrColor}
                    bar={Math.min(100, (m.waistToHipRatio / 1.1) * 100)}
                  />
                )}
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="risk-dot"
                    style={{ background: m.cardiovascularColor }}
                  />
                  <span className="text-xs text-muted-foreground">
                    Сердечно-сосудистый риск:{" "}
                    <span
                      className="font-semibold"
                      style={{ color: m.cardiovascularColor }}
                    >
                      {m.cardiovascularRisk}
                    </span>
                  </span>
                </div>
              </Section>

              {/* RECOMMENDATIONS */}
              <Section title="Рекомендации">
                <div className="flex flex-col gap-2">
                  {m.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex gap-2 text-xs text-foreground leading-relaxed p-2.5 rounded-lg"
                      style={{ background: "hsl(220 10% 96%)" }}
                    >
                      <span className="flex-shrink-0 mt-0.5 w-1 h-1 rounded-full bg-primary self-start mt-1.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* FOOTNOTE */}
              <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-3">
                Расчёты по формулам Mifflin–St Jeor (BMR), Deurenberg (% жира),
                ВОЗ (ИМТ). Данные носят информационный характер.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="self-center mr-0 w-6 h-14 flex items-center justify-center rounded-l-lg border border-r-0 border-border bg-white shadow-sm hover:bg-accent transition-colors"
        style={{ zIndex: 11 }}
        title={collapsed ? "Открыть анализ" : "Закрыть анализ"}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }}
        >
          <path d="M4 2L8 6L4 10" stroke="hsl(220 15% 40%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
