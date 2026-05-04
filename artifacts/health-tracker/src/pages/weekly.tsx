import { useGetWeeklyReport } from "@workspace/api-client-react";
import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function Trend({ value, unit, good = "up" }: { value?: number | null; unit: string; good?: "up" | "down" }) {
  if (value == null || Math.abs(value) < 0.01) return <span className="text-muted-foreground text-xs flex items-center gap-0.5"><Minus className="h-3 w-3" />без изменений</span>;
  const isPositive = value > 0;
  const isGood = good === "up" ? isPositive : !isPositive;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isGood ? "text-emerald-500" : "text-amber-500";
  return (
    <span className={`text-xs flex items-center gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}{typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value} {unit} к прошлой неделе
    </span>
  );
}

export default function WeeklyPage() {
  const { data, isLoading } = useGetWeeklyReport();

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-medium">Данных за неделю пока нет</p>
          <p className="text-sm text-muted-foreground mt-1">Заполняйте дневник хотя бы несколько дней, чтобы сгенерировать недельный отчёт.</p>
        </CardContent>
      </Card>
    );
  }

  const barData = [
    { name: "Калории", value: data.averageCalories, target: 2200, unit: "ккал" },
    { name: "Белок", value: data.averageProtein, target: 130, unit: "г" },
    { name: "Вода", value: data.averageWaterMl / 100, target: 20, unit: "×100мл" },
    { name: "Сон", value: data.averageSleepHours, target: 8, unit: "ч" },
    { name: "Активность", value: data.totalActivityMinutes / 7, target: 30, unit: "мин/д" },
  ];

  const from = new Date(data.weekStart + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "short" });
  const to = new Date(data.weekEnd + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "short" });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Недельный отчёт</h1>
        <p className="text-muted-foreground text-sm">{from} — {to} · записано {data.daysLogged} {pluralDays(data.daysLogged)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Калории (среднее)</div>
            <div className="text-2xl font-bold">{Math.round(data.averageCalories)}</div>
            <div className="text-xs text-muted-foreground">ккал/день</div>
            <Trend value={data.comparedToPreviousWeek?.caloriesChange} unit="ккал" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Белок (среднее)</div>
            <div className="text-2xl font-bold">{Math.round(data.averageProtein)} г</div>
            <div className="text-xs text-muted-foreground">в день</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Вода (среднее)</div>
            <div className="text-2xl font-bold">{Math.round(data.averageWaterMl)}</div>
            <div className="text-xs text-muted-foreground">мл/день</div>
            <Trend value={data.comparedToPreviousWeek?.waterChange} unit="мл" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Сон (среднее)</div>
            <div className="text-2xl font-bold">{data.averageSleepHours.toFixed(1)} ч</div>
            <div className="text-xs text-muted-foreground">в ночь</div>
            <Trend value={data.comparedToPreviousWeek?.sleepChange} unit="ч" />
          </CardContent>
        </Card>
      </div>

      {data.daysLogged >= 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Средние показатели vs. нормы</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number, _name: string, props: { payload: { unit: string } }) => [`${v.toFixed(1)} ${props.payload.unit}`, ""]}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Факт" />
                <Bar dataKey="target" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Норма" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {(data.averageEnergyScore != null || data.averageMoodScore != null) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Самочувствие за неделю</CardTitle></CardHeader>
          <CardContent className="flex gap-8">
            {data.averageEnergyScore != null && (
              <div className="text-center">
                <div className="text-3xl font-bold">{data.averageEnergyScore.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Энергия /10</div>
              </div>
            )}
            {data.averageMoodScore != null && (
              <div className="text-center">
                <div className="text-3xl font-bold">{data.averageMoodScore.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Настроение /10</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-3xl font-bold">{data.totalActivityMinutes}</div>
              <div className="text-xs text-muted-foreground">Мин. активности</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {data.strengths.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Что получается хорошо</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{translateStrength(s)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {data.recurringIssues.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Повторяющиеся проблемы</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.recurringIssues.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{translateIssue(s)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function pluralDays(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "день";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "дня";
  return "дней";
}

function translateStrength(s: string): string {
  const map: Record<string, string> = {
    "Strong protein intake this week": "Высокое потребление белка на этой неделе",
    "Sleep duration meets minimum recommendation": "Продолжительность сна соответствует норме",
    "Hydration levels are adequate": "Гидратация в пределах нормы",
    "Physical activity meets WHO weekly recommendation (150+ min)": "Физическая активность соответствует рекомендациям ВОЗ (150+ мин)",
    "Consistent daily logging — good data foundation": "Стабильное ведение дневника — хорошая база данных",
  };
  return map[s] ?? s;
}

function translateIssue(s: string): string {
  const map: Record<string, string> = {
    "Low protein intake on multiple days": "Низкое потребление белка в нескольких днях",
    "Persistent sleep duration below 7h": "Сон систематически менее 7 часов",
    "Low daily water intake": "Недостаточное ежедневное потребление воды",
    "Physical activity below recommended levels": "Физическая активность ниже рекомендуемого уровня",
  };
  return map[s] ?? s;
}
