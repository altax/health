import { useState, useEffect } from "react";
import { useGetProfile, useUpsertProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import type { UpsertProfileBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const GOAL_OPTIONS = [
  "Снижение веса", "Набор мышечной массы", "Больше энергии", "Улучшить сон",
  "Улучшить концентрацию", "Ускорить восстановление", "Оптимизировать питание",
  "Улучшить показатели анализов", "Снизить стресс", "Общее здоровье",
];

const RESTRICTION_OPTIONS = [
  "Вегетарианство", "Веганство", "Без глютена", "Без лактозы", "Без орехов",
  "Халяль", "Кошерное", "Низкоуглеводное", "Кето",
];

function TagInput({ values, options, onChange, placeholder }: {
  values: string[]; options?: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function add(v: string) {
    const trimmed = v.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput("");
  }

  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => add(input)}>Добавить</Button>
      </div>
      {options && (
        <div className="flex flex-wrap gap-1">
          {options.filter((o) => !values.includes(o)).map((o) => (
            <button key={o} onClick={() => add(o)}
              className="text-xs border rounded-full px-2.5 py-0.5 hover:bg-muted transition-colors">
              + {o}
            </button>
          ))}
        </div>
      )}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 cursor-pointer" onClick={() => remove(v)}>
              {v} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const { data: profile } = useGetProfile();
  const upsert = useUpsertProfile();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<UpsertProfileBody>({
    sex: "male",
    age: 30,
    height: 170,
    weight: 70,
    activityLevel: "moderately_active",
    sleepGoalHours: 8,
    goals: [],
    chronicConditions: [],
    medications: [],
    allergies: [],
    dietaryRestrictions: [],
  });

  useEffect(() => {
    if (profile) {
      setForm({
        sex: profile.sex as UpsertProfileBody["sex"],
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        waistCircumference: profile.waistCircumference ?? undefined,
        bodyFatPercent: profile.bodyFatPercent ?? undefined,
        muscleMass: profile.muscleMass ?? undefined,
        restingHeartRate: profile.restingHeartRate ?? undefined,
        activityLevel: profile.activityLevel as UpsertProfileBody["activityLevel"],
        workType: profile.workType ?? undefined,
        sleepGoalHours: profile.sleepGoalHours,
        timezone: profile.timezone ?? undefined,
        goals: profile.goals,
        chronicConditions: profile.chronicConditions,
        medications: profile.medications,
        allergies: profile.allergies,
        dietaryRestrictions: profile.dietaryRestrictions,
      });
    }
  }, [profile]);

  function set<K extends keyof UpsertProfileBody>(key: K, value: UpsertProfileBody[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    await upsert.mutateAsync({ data: form });
    qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Профиль здоровья</h1>
          <p className="text-muted-foreground text-sm">Ваши биометрические данные — основа для персонального анализа</p>
        </div>
        <User className="h-8 w-8 text-muted-foreground" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Основные данные</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Пол</label>
            <Select value={form.sex} onValueChange={(v) => set("sex", v as UpsertProfileBody["sex"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Мужской</SelectItem>
                <SelectItem value="female">Женский</SelectItem>
                <SelectItem value="other">Другой</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Возраст</label>
            <Input type="number" value={form.age} onChange={(e) => set("age", Number(e.target.value))} min={10} max={120} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Рост (см)</label>
            <Input type="number" value={form.height} onChange={(e) => set("height", Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Вес (кг)</label>
            <Input type="number" step="0.1" value={form.weight} onChange={(e) => set("weight", Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Талия (см)</label>
            <Input type="number" step="0.1" placeholder="необязательно" value={form.waistCircumference ?? ""} onChange={(e) => set("waistCircumference", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Жир (%)</label>
            <Input type="number" step="0.1" placeholder="необязательно" value={form.bodyFatPercent ?? ""} onChange={(e) => set("bodyFatPercent", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Мышечная масса (кг)</label>
            <Input type="number" step="0.1" placeholder="необязательно" value={form.muscleMass ?? ""} onChange={(e) => set("muscleMass", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Пульс в покое (уд/мин)</label>
            <Input type="number" placeholder="необязательно" value={form.restingHeartRate ?? ""} onChange={(e) => set("restingHeartRate", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Образ жизни</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Уровень активности</label>
              <Select value={form.activityLevel} onValueChange={(v) => set("activityLevel", v as UpsertProfileBody["activityLevel"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Сидячий (офис, без спорта)</SelectItem>
                  <SelectItem value="lightly_active">Слабоактивный (1-3 дня/нед.)</SelectItem>
                  <SelectItem value="moderately_active">Умеренно активный (3-5 дней/нед.)</SelectItem>
                  <SelectItem value="very_active">Высокоактивный (6-7 дней/нед.)</SelectItem>
                  <SelectItem value="extremely_active">Очень активный (спортсмен/физ. труд)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Цель по сну (ч)</label>
              <Input type="number" step="0.25" min={4} max={12} value={form.sleepGoalHours} onChange={(e) => set("sleepGoalHours", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Тип работы</label>
            <Input placeholder="офисная, физическая, сменная..." value={form.workType ?? ""} onChange={(e) => set("workType", e.target.value || undefined)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Цели</CardTitle>
          <CardDescription>Что вы хотите оптимизировать?</CardDescription>
        </CardHeader>
        <CardContent>
          <TagInput
            values={form.goals}
            options={GOAL_OPTIONS}
            onChange={(v) => set("goals", v)}
            placeholder="Введите цель и нажмите Enter"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Медицинский контекст</CardTitle>
          <CardDescription>Используется только для персонализации — не передаётся третьим лицам</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground font-medium">Хронические заболевания</label>
            <TagInput values={form.chronicConditions} onChange={(v) => set("chronicConditions", v)} placeholder="гипотиреоз, СРК..." />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground font-medium">Принимаемые препараты</label>
            <TagInput values={form.medications} onChange={(v) => set("medications", v)} placeholder="метформин, левотироксин..." />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground font-medium">Аллергии</label>
            <TagInput values={form.allergies} onChange={(v) => set("allergies", v)} placeholder="арахис, морепродукты..." />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground font-medium">Диетические ограничения</label>
            <TagInput values={form.dietaryRestrictions} options={RESTRICTION_OPTIONS} onChange={(v) => set("dietaryRestrictions", v)} placeholder="вегетарианство..." />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={upsert.isPending} className="w-full" size="lg">
        {saved ? (
          <><CheckCircle2 className="h-4 w-4 mr-2" />Профиль сохранён</>
        ) : "Сохранить профиль"}
      </Button>
    </div>
  );
}
