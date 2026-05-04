import { useGetWeeklyReport } from "@workspace/api-client-react";
import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function Trend({ value, unit, good = "up" }: { value?: number | null; unit: string; good?: "up" | "down" }) {
  if (value == null || Math.abs(value) < 0.01) return <span className="text-muted-foreground text-xs flex items-center gap-0.5"><Minus className="h-3 w-3" />No change</span>;
  const isPositive = value > 0;
  const isGood = good === "up" ? isPositive : !isPositive;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isGood ? "text-emerald-500" : "text-amber-500";
  return (
    <span className={`text-xs flex items-center gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}{typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value} {unit} vs last week
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
          <p className="font-medium">No weekly data yet</p>
          <p className="text-sm text-muted-foreground mt-1">Log data for at least a few days to generate your weekly report.</p>
        </CardContent>
      </Card>
    );
  }

  const barData = [
    { name: "Calories", value: data.averageCalories, target: 2200, unit: "kcal" },
    { name: "Protein", value: data.averageProtein, target: 130, unit: "g" },
    { name: "Water", value: data.averageWaterMl / 100, target: 20, unit: "×100mL" },
    { name: "Sleep", value: data.averageSleepHours, target: 8, unit: "h" },
    { name: "Activity", value: data.totalActivityMinutes / 7, target: 30, unit: "min/d" },
  ];

  const from = new Date(data.weekStart + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });
  const to = new Date(data.weekEnd + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Weekly Report</h1>
        <p className="text-muted-foreground text-sm">{from} — {to} · {data.daysLogged} day{data.daysLogged !== 1 ? "s" : ""} logged</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Avg Calories</div>
            <div className="text-2xl font-bold">{Math.round(data.averageCalories)}</div>
            <div className="text-xs text-muted-foreground">kcal/day</div>
            <Trend value={data.comparedToPreviousWeek?.caloriesChange} unit="kcal" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Avg Protein</div>
            <div className="text-2xl font-bold">{Math.round(data.averageProtein)}g</div>
            <div className="text-xs text-muted-foreground">per day</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Avg Water</div>
            <div className="text-2xl font-bold">{Math.round(data.averageWaterMl)}</div>
            <div className="text-xs text-muted-foreground">mL/day</div>
            <Trend value={data.comparedToPreviousWeek?.waterChange} unit="mL" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-1">Avg Sleep</div>
            <div className="text-2xl font-bold">{data.averageSleepHours.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground">per night</div>
            <Trend value={data.comparedToPreviousWeek?.sleepChange} unit="h" />
          </CardContent>
        </Card>
      </div>

      {data.daysLogged >= 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Weekly Averages vs Targets</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number, name: string, props) => [`${v.toFixed(1)} ${props.payload.unit}`, name]}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Average" />
                <Bar dataKey="target" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {(data.averageEnergyScore != null || data.averageMoodScore != null) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Wellbeing Scores</CardTitle></CardHeader>
          <CardContent className="flex gap-8">
            {data.averageEnergyScore != null && (
              <div className="text-center">
                <div className="text-3xl font-bold">{data.averageEnergyScore.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg Energy /10</div>
              </div>
            )}
            {data.averageMoodScore != null && (
              <div className="text-center">
                <div className="text-3xl font-bold">{data.averageMoodScore.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg Mood /10</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-3xl font-bold">{data.totalActivityMinutes}</div>
              <div className="text-xs text-muted-foreground">Activity min</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {data.strengths.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">What's working</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {data.recurringIssues.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recurring issues</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.recurringIssues.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
