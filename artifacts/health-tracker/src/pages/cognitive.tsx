import { useQuery } from "@tanstack/react-query";
import { Brain, Zap, Moon, Droplets, Dumbbell, Utensils, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function apiUrl(path: string) {
  return `${BASE}/api${path}`;
}

function useCognitive() {
  return useQuery({
    queryKey: ["cognitive"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/analysis/cognitive"));
      if (!r.ok) throw new Error("cognitive fetch failed");
      return r.json();
    },
    staleTime: 60_000,
  });
}

const FACTOR_ICONS: Record<string, React.ElementType> = {
  sleep: Moon,
  nutrition: Utensils,
  hydration: Droplets,
  activity: Dumbbell,
  stress: Brain,
  micronutrients: Zap,
};

const FACTOR_LABELS: Record<string, string> = {
  sleep: "Сон",
  nutrition: "Питание (белок/ккал)",
  hydration: "Гидратация",
  activity: "Активность",
  stress: "Стресс",
  micronutrients: "Микронутриенты",
};

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#6ee7f7" : score >= 45 ? "#fbbf24" : "#f87171";

  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="rotate-[-90deg]">
      <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle
        cx="65" cy="65" r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: "stroke-dasharray 0.8s ease" }}
      />
    </svg>
  );
}

function FactorBar({ factor, score, impact }: { factor: string; score: number; impact: "positive" | "neutral" | "negative" }) {
  const Icon = FACTOR_ICONS[factor] ?? Brain;
  const colors = {
    positive: "text-cyan-400",
    neutral: "text-white/40",
    negative: "text-red-400",
  };
  const barColors = {
    positive: "bg-cyan-400/70",
    neutral: "bg-white/20",
    negative: "bg-red-400/70",
  };
  const ImpactIcon = impact === "positive" ? TrendingUp : impact === "negative" ? TrendingDown : Minus;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${colors[impact]}`} />
          <span className="text-white/70">{FACTOR_LABELS[factor] ?? factor}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ImpactIcon className={`h-3 w-3 ${colors[impact]}`} />
          <span className={`font-mono text-xs ${colors[impact]}`}>{score}/100</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColors[impact]} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function CognitivePage() {
  const { data, isLoading, error } = useCognitive();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-red-400/60" />
        <p className="text-white/40 text-sm">Недостаточно данных для анализа когнитивного статуса</p>
        <p className="text-white/25 text-xs">Запишите сон, питание и самочувствие за несколько дней</p>
      </div>
    );
  }

  const { cognitiveScore, grade, gradeText, factors, keyFindings, recommendations, trendData, dataQuality } = data;

  const gradeColors: Record<string, string> = {
    A: "text-cyan-400",
    B: "text-emerald-400",
    C: "text-yellow-400",
    D: "text-orange-400",
    F: "text-red-400",
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Когниция и Витальность</h1>
        <p className="text-white/40 text-sm">Анализ факторов, влияющих на энергию, ясность и продуктивность</p>
      </div>

      {/* Score card */}
      <Card className="glass border-white/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <ScoreRing score={cognitiveScore} />
              <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                <span className={`text-3xl font-black ${gradeColors[grade] ?? "text-white"}`}>{grade}</span>
                <span className="text-white/40 text-xs">{cognitiveScore}/100</span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">{gradeText}</h2>
              <p className="text-white/40 text-xs mt-1 leading-relaxed">
                Интегральная оценка когнитивного потенциала на основе сна, питания, гидратации, стресса и активности
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-xs border-white/20 text-white/50">
                  Достоверность: {dataQuality}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Factor breakdown */}
      <Card className="glass border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white/70">Факторный анализ</CardTitle>
          <CardDescription className="text-xs">Что влияет на когнитивную функцию сегодня</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {factors.map((f: { factor: string; score: number; impact: "positive" | "neutral" | "negative" }) => (
            <FactorBar key={f.factor} {...f} />
          ))}
        </CardContent>
      </Card>

      {/* Key findings */}
      {keyFindings && keyFindings.length > 0 && (
        <Card className="glass border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70">Ключевые наблюдения</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {keyFindings.map((f: { text: string; type: "positive" | "negative" | "neutral"; source?: string }, i: number) => {
              const colors = {
                positive: "border-l-emerald-400/60 bg-emerald-400/5",
                negative: "border-l-red-400/60 bg-red-400/5",
                neutral: "border-l-white/20 bg-white/3",
              };
              return (
                <div key={i} className={`border-l-2 pl-3 py-2 rounded-r-md ${colors[f.type]}`}>
                  <p className="text-sm text-white/80">{f.text}</p>
                  {f.source && <p className="text-xs text-white/30 mt-0.5">{f.source}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 7-day trend */}
      {trendData && trendData.length > 0 && (
        <Card className="glass border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70">Динамика за 7 дней</CardTitle>
            <CardDescription className="text-xs">Энергия · Концентрация · Настроение</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendData.map((d: { date: string; energy?: number; focus?: number; mood?: number }, i: number) => {
                const label = new Date(d.date + "T12:00:00").toLocaleDateString("ru", { weekday: "short", day: "numeric" });
                const avg = [d.energy, d.focus, d.mood].filter(Boolean) as number[];
                const score = avg.length > 0 ? Math.round(avg.reduce((a, b) => a + b, 0) / avg.length * 10) : 0;
                return (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-white/30 w-14 flex-shrink-0 capitalize">{label}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-400/60"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-white/40 w-8 text-right">{score > 0 ? score : "—"}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card className="glass border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white/70">Действия для улучшения когниции</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.map((r: { text: string; priority: "high" | "medium" | "low"; source?: string }, i: number) => {
              const priorityColors = { high: "bg-red-400/20 text-red-300", medium: "bg-yellow-400/20 text-yellow-300", low: "bg-white/10 text-white/40" };
              const priorityLabels = { high: "Срочно", medium: "Важно", low: "Рекомендую" };
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <Badge className={`text-[9px] mt-0.5 flex-shrink-0 ${priorityColors[r.priority]}`}>
                    {priorityLabels[r.priority]}
                  </Badge>
                  <div>
                    <p className="text-sm text-white/80">{r.text}</p>
                    {r.source && <p className="text-xs text-white/25 mt-0.5">{r.source}</p>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
