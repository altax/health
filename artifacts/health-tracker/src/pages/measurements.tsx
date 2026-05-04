import { useState } from "react";
import { useGetMeasurements, useAddMeasurement, getGetMeasurementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function MeasurementsPage() {
  const qc = useQueryClient();
  const { data: measurements, isLoading } = useGetMeasurements();
  const addMeasurement = useAddMeasurement();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [notes, setNotes] = useState("");

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetMeasurementsQueryKey() });
  }

  async function handleAdd() {
    await addMeasurement.mutateAsync([{
      date,
      weight: weight ? parseFloat(weight) : null,
      bodyFatPercent: bodyFat ? parseFloat(bodyFat) : null,
      muscleMass: muscle ? parseFloat(muscle) : null,
      waistCm: waist ? parseFloat(waist) : null,
      hipCm: hip ? parseFloat(hip) : null,
      notes: notes || null,
    }]);
    setOpen(false);
    setWeight(""); setBodyFat(""); setMuscle(""); setWaist(""); setHip(""); setNotes("");
    invalidate();
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-48" />)}</div>;

  const sorted = [...(measurements ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.map((m) => ({
    date: new Date(m.date + "T12:00:00").toLocaleDateString("ru", { month: "short", day: "numeric" }),
    weight: m.weight,
    bodyFat: m.bodyFatPercent,
    muscle: m.muscleMass,
    waist: m.waistCm,
  }));

  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  function Trend({ current, previous, unit }: { current?: number | null; previous?: number | null; unit: string }) {
    if (current == null || previous == null) return <span className="text-muted-foreground text-xs">—</span>;
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return <span className="text-muted-foreground text-xs flex items-center gap-1"><Minus className="h-3 w-3" />стабильно</span>;
    const isDown = diff < 0;
    const Icon = isDown ? TrendingDown : TrendingUp;
    const color = isDown ? "text-emerald-500" : "text-amber-500";
    return (
      <span className={`text-xs flex items-center gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        {diff > 0 ? "+" : ""}{diff.toFixed(1)} {unit}
      </span>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Замеры тела</h1>
          <p className="text-muted-foreground text-sm">Отслеживание состава тела в динамике</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Добавить замер</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Новый замер</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Дата</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Вес (кг)</label>
                  <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Жир (%)</label>
                  <Input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Мышечная масса (кг)</label>
                  <Input type="number" step="0.1" value={muscle} onChange={(e) => setMuscle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Талия (см)</label>
                  <Input type="number" step="0.1" value={waist} onChange={(e) => setWaist(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Бёдра (см)</label>
                  <Input type="number" step="0.1" value={hip} onChange={(e) => setHip(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Заметки</label>
                <Input placeholder="необязательно" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button onClick={handleAdd} disabled={addMeasurement.isPending} className="w-full">Сохранить</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Вес", value: latest.weight, prev: prev?.weight, unit: "кг" },
            { label: "Жир", value: latest.bodyFatPercent, prev: prev?.bodyFatPercent, unit: "%" },
            { label: "Мышечная масса", value: latest.muscleMass, prev: prev?.muscleMass, unit: "кг" },
            { label: "Талия", value: latest.waistCm, prev: prev?.waistCm, unit: "см" },
          ].map(({ label, value, prev: p, unit }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground font-medium mb-1">{label}</div>
                <div className="text-2xl font-bold">{value != null ? `${value}` : "—"}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></div>
                <Trend current={value} previous={p} unit={unit} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {chartData.length >= 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Динамика веса</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [`${v} кг`, "Вес"]}
                />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Вес (кг)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {sorted.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">История замеров</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {[...sorted].reverse().map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span className="text-muted-foreground text-xs">
                    {new Date(m.date + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <div className="flex items-center gap-4 font-mono text-xs">
                    {m.weight != null && <span>{m.weight} кг</span>}
                    {m.bodyFatPercent != null && <span>{m.bodyFatPercent}% жира</span>}
                    {m.muscleMass != null && <span>{m.muscleMass} кг мышц</span>}
                    {m.waistCm != null && <span>{m.waistCm} см талия</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!measurements || measurements.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-medium">Замеров пока нет</p>
            <p className="text-sm text-muted-foreground mt-1">Добавьте первый замер, чтобы начать отслеживать состав тела.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
