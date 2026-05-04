import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetDailyLog,
  usePatchDailyLog,
  useAddFoodEntry,
  useDeleteFoodEntry,
  useAddActivityEntry,
  useDeleteActivityEntry,
  useSearchFoods,
  getGetDailyLogQueryKey,
  getSearchFoodsQueryKey,
} from "@workspace/api-client-react";
import type {
  AddFoodEntryBody,
  AddActivityEntryBody,
  PatchDailyLogBody,
  FoodItem,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Utensils, Droplets, Moon, Activity, Heart, Plus, Trash2, Search,
  ChevronLeft, ChevronRight, Pill,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
function apiUrl(p: string) { return `${BASE}/api${p}`; }

function toDateStr(d: Date) { return format(d, "yyyy-MM-dd"); }
function prevDay(date: string) { const d = new Date(date); d.setDate(d.getDate() - 1); return toDateStr(d); }
function nextDay(date: string) { const d = new Date(date); d.setDate(d.getDate() + 1); return toDateStr(d); }

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Завтрак", lunch: "Обед", dinner: "Ужин", snack: "Перекус",
};

type SupplementEntry = {
  id: number; date: string; name: string; brand?: string | null;
  form: string; amountMg: number; unit: string; timeTaken?: string | null;
  nutrients?: Record<string, number> | null; notes?: string | null;
};

const QUICK_SUPPS = [
  { name: "Витамин D3", amount: 2000, unit: "МЕ", nutrients: { vitaminD: 50 } },
  { name: "Омега-3", amount: 1000, unit: "мг", nutrients: { omega3: 1.0 } },
  { name: "Витамин B12", amount: 500, unit: "мкг", nutrients: { vitaminB12: 0.5 } },
  { name: "Магний", amount: 200, unit: "мг", nutrients: { magnesium: 200 } },
  { name: "Железо", amount: 18, unit: "мг", nutrients: { iron: 18 } },
  { name: "Цинк", amount: 10, unit: "мг", nutrients: { zinc: 10 } },
  { name: "Витамин C", amount: 500, unit: "мг", nutrients: { vitaminC: 500 } },
  { name: "Кальций", amount: 500, unit: "мг", nutrients: { calcium: 500 } },
  { name: "Фолат (B9)", amount: 400, unit: "мкг", nutrients: { folate: 400 } },
  { name: "Мультивитамины", amount: 1, unit: "шт", nutrients: {} },
];

const GI_OPTIONS = [
  { value: "normal", label: "Норма" },
  { value: "bloating", label: "Вздутие" },
  { value: "discomfort", label: "Дискомфорт" },
  { value: "constipation", label: "Запор" },
  { value: "diarrhea", label: "Диарея" },
  { value: "nausea", label: "Тошнота" },
  { value: "pain", label: "Боль в животе" },
];

const SKIN_OPTIONS = [
  { value: "normal", label: "Норма" },
  { value: "oily", label: "Жирная" },
  { value: "dry", label: "Сухая" },
  { value: "rash", label: "Сыпь/раздражение" },
  { value: "acne", label: "Акне" },
  { value: "other", label: "Другое" },
];

const MORNING_OPTIONS = [
  { value: "rested", label: "Отдохнул(а)" },
  { value: "tired", label: "Устал(а)" },
  { value: "groggy", label: "Разбитый(ая)" },
  { value: "anxious", label: "Тревожно" },
  { value: "energized", label: "Бодро" },
];

const SYMPTOM_PRESETS = [
  "Головная боль", "Мигрень", "Усталость", "Сонливость", "Тревога",
  "Раздражительность", "Боль в суставах", "Боль в мышцах", "Отёки",
  "Головокружение", "Одышка", "Учащённое сердцебиение",
];

export default function LogPage() {
  const today = toDateStr(new Date());
  const [, params] = useRoute("/log/:date");
  const date = params?.date ?? today;
  const [, navigate] = useLocation();

  const qc = useQueryClient();
  const { data: log, isLoading } = useGetDailyLog(date, {
    query: { queryKey: getGetDailyLogQueryKey(date) },
  });

  const patchLog = usePatchDailyLog();
  const addFood = useAddFoodEntry();
  const deleteFood = useDeleteFoodEntry();
  const addActivity = useAddActivityEntry();
  const deleteActivity = useDeleteActivityEntry();

  // Supplements direct fetch
  const { data: supplements = [], refetch: refetchSupps } = useQuery<SupplementEntry[]>({
    queryKey: ["supplements", date],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/logs/${date}/supplements`));
      if (!r.ok) return [];
      return r.json();
    },
  });

  const addSuppMut = useMutation({
    mutationFn: async (body: object) => {
      const r = await fetch(apiUrl(`/logs/${date}/supplements`), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      return r.json();
    },
    onSuccess: () => refetchSupps(),
  });

  const deleteSuppMut = useMutation({
    mutationFn: async (id: number) => {
      await fetch(apiUrl(`/logs/${date}/supplements/${id}`), { method: "DELETE" });
    },
    onSuccess: () => refetchSupps(),
  });

  // Food state
  const [waterInput, setWaterInput] = useState("");
  const [foodQuery, setFoodQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState(100);
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [manualFood, setManualFood] = useState("");

  const { data: foodResults } = useSearchFoods(
    { q: foodQuery },
    { query: { queryKey: getSearchFoodsQueryKey({ q: foodQuery }), enabled: foodQuery.length >= 2 } }
  );

  // Activity state
  const [actType, setActType] = useState("");
  const [actCategory, setActCategory] = useState<"cardio" | "strength" | "flexibility" | "sports" | "other">("cardio");
  const [actDuration, setActDuration] = useState(30);
  const [actIntensity, setActIntensity] = useState<"light" | "moderate" | "vigorous">("moderate");
  const [actCalories, setActCalories] = useState("");
  const [actSteps, setActSteps] = useState("");

  // Sleep state
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState(7);
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [wakeUps, setWakeUps] = useState(0);
  const [daytimeSleepiness, setDaytimeSleepiness] = useState(3);
  const [morningFeeling, setMorningFeeling] = useState("");

  // Wellbeing state
  const [energy, setEnergy] = useState(7);
  const [mood, setMood] = useState(7);
  const [focus, setFocus] = useState(7);
  const [stress, setStress] = useState(3);
  const [hunger, setHunger] = useState(5);
  const [motivation, setMotivation] = useState(7);
  const [clarity, setClarity] = useState(7);
  const [cravings, setCravings] = useState("");
  const [giState, setGiState] = useState("");
  const [muscleSoreness, setMuscleSoreness] = useState(0);
  const [skinState, setSkinState] = useState("");
  const [swelling, setSwelling] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);

  // Supplement state
  const [suppName, setSuppName] = useState("");
  const [suppAmount, setSuppAmount] = useState("");
  const [suppUnit, setSuppUnit] = useState("мг");
  const [suppForm, setSuppForm] = useState("capsule");
  const [suppTime, setSuppTime] = useState("morning");
  const [suppNutrients, setSuppNutrients] = useState<Record<string, number>>({});

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetDailyLogQueryKey(date) });
  }

  async function handleAddWater() {
    const ml = parseFloat(waterInput);
    if (isNaN(ml) || ml <= 0) return;
    const current = log?.waterMl ?? 0;
    await patchLog.mutateAsync({ date, data: { waterMl: current + ml } });
    setWaterInput("");
    invalidate();
  }

  async function handleQuickWater(ml: number) {
    const current = log?.waterMl ?? 0;
    await patchLog.mutateAsync({ date, data: { waterMl: current + ml } });
    invalidate();
  }

  async function handleAddFood() {
    const name = selectedFood ? selectedFood.name : manualFood;
    if (!name) return;
    const scale = amount / (selectedFood?.servingSize ?? 100);
    const n = selectedFood?.nutrients ?? { calories: 0, protein: 0, fat: 0, carbs: 0 };
    const scaled: AddFoodEntryBody["nutrients"] = {
      calories: Math.round((n.calories ?? 0) * scale),
      protein: Math.round((n.protein ?? 0) * scale * 10) / 10,
      fat: Math.round((n.fat ?? 0) * scale * 10) / 10,
      carbs: Math.round((n.carbs ?? 0) * scale * 10) / 10,
      fiber: Math.round(((n.fiber ?? 0) * scale) * 10) / 10,
      sodium: Math.round((n.sodium ?? 0) * scale),
      potassium: Math.round((n.potassium ?? 0) * scale),
      vitaminC: Math.round(((n.vitaminC ?? 0) * scale) * 10) / 10,
      vitaminD: Math.round(((n.vitaminD ?? 0) * scale) * 10) / 10,
      iron: Math.round(((n.iron ?? 0) * scale) * 10) / 10,
      calcium: Math.round(((n.calcium ?? 0) * scale) * 10) / 10,
      magnesium: Math.round(((n.magnesium ?? 0) * scale) * 10) / 10,
      vitaminB12: Math.round(((n.vitaminB12 ?? 0) * scale) * 100) / 100,
      folate: Math.round(((n.folate ?? 0) * scale) * 10) / 10,
      omega3: Math.round(((n.omega3 ?? 0) * scale) * 100) / 100,
    };
    await addFood.mutateAsync({ date, data: { foodId: selectedFood?.id ?? null, foodName: name, mealType, amount, nutrients: scaled } });
    setSelectedFood(null); setFoodQuery(""); setManualFood(""); setAmount(100);
    invalidate();
  }

  async function handleDeleteFood(entryId: number) {
    await deleteFood.mutateAsync({ date, entryId });
    invalidate();
  }

  async function handleAddActivity() {
    if (!actType) return;
    const body: AddActivityEntryBody = {
      type: actType, category: actCategory, durationMinutes: actDuration,
      intensity: actIntensity,
      caloriesBurned: actCalories ? parseFloat(actCalories) : null,
      steps: actSteps ? parseInt(actSteps, 10) : null,
    };
    await addActivity.mutateAsync({ date, data: body });
    setActType(""); setActCalories(""); setActSteps("");
    invalidate();
  }

  async function handleDeleteActivity(entryId: number) {
    await deleteActivity.mutateAsync({ date, entryId });
    invalidate();
  }

  async function handleSaveSleep() {
    const patch: PatchDailyLogBody = {
      sleep: {
        bedtime: bedtime || undefined,
        wakeTime: wakeTime || undefined,
        durationHours: sleepHours ? parseFloat(sleepHours) : undefined,
        qualityScore: sleepQuality,
        wakeUps,
        daytimeSleepiness,
        morningFeeling: morningFeeling || undefined,
      },
    };
    await patchLog.mutateAsync({ date, data: patch });
    invalidate();
  }

  async function handleSaveWellbeing() {
    await patchLog.mutateAsync({
      date,
      data: {
        wellbeing: {
          energyLevel: energy,
          moodScore: mood,
          focusScore: focus,
          stressLevel: stress,
          hungerLevel: hunger,
          motivationScore: motivation,
          clarityScore: clarity,
          cravings: cravings || undefined,
          giState: giState || undefined,
          muscleSoreness,
          skinState: skinState || undefined,
          swelling,
          symptoms: symptoms.length > 0 ? symptoms : undefined,
        },
      },
    });
    invalidate();
  }

  async function handleAddSupplement() {
    if (!suppName) return;
    await addSuppMut.mutateAsync({
      name: suppName,
      amountMg: suppAmount ? parseFloat(suppAmount) : 0,
      unit: suppUnit,
      form: suppForm,
      timeTaken: suppTime,
      nutrients: Object.keys(suppNutrients).length > 0 ? suppNutrients : null,
    });
    setSuppName(""); setSuppAmount(""); setSuppNutrients({});
  }

  function applyQuickSupp(supp: typeof QUICK_SUPPS[number]) {
    setSuppName(supp.name);
    setSuppAmount(String(supp.amount));
    setSuppUnit(supp.unit);
    setSuppNutrients(supp.nutrients);
  }

  function toggleSymptom(s: string) {
    setSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  const isToday = date === today;
  const calories = log?.totalNutrients?.calories ?? 0;
  const protein = log?.totalNutrients?.protein ?? 0;
  const waterMl = log?.waterMl ?? 0;
  const waterGoal = log?.waterGoalMl ?? 2000;
  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("ru", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const meals = ["breakfast", "lunch", "dinner", "snack"] as const;
  const mealEntries = (meal: string) => log?.foodEntries?.filter((e) => e.mealType === meal) ?? [];

  const sleepData = log?.sleep as {
    durationHours?: number; qualityScore?: number; bedtime?: string; wakeTime?: string;
    wakeUps?: number; daytimeSleepiness?: number; morningFeeling?: string;
  } | null;

  const wellbeingData = log?.wellbeing as {
    energyLevel?: number; moodScore?: number; focusScore?: number; stressLevel?: number;
    hungerLevel?: number; motivationScore?: number; clarityScore?: number; cravings?: string;
    giState?: string; muscleSoreness?: number; skinState?: string; swelling?: boolean; symptoms?: string[];
  } | null;

  const suppEntries = supplements as SupplementEntry[];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Дневник</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {dateLabel}
            {isToday && <Badge variant="secondary" className="ml-2">Сегодня</Badge>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(`/log/${prevDay(date)}`)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/log/${today}`)}>Сегодня</Button>
          <Button variant="outline" size="icon" onClick={() => navigate(`/log/${nextDay(date)}`)} disabled={isToday}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-muted-foreground font-medium">Калории</span>
            </div>
            <div className="text-xl font-bold">{Math.round(calories)}</div>
            <div className="text-xs text-muted-foreground">ккал записано</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground font-medium">Белок</span>
            </div>
            <div className="text-xl font-bold">{Math.round(protein)} г</div>
            <div className="text-xs text-muted-foreground">цель ~130 г</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground font-medium">Вода</span>
            </div>
            <div className="text-xl font-bold">{Math.round(waterMl)} мл</div>
            <Progress value={Math.min((waterMl / waterGoal) * 100, 100)} className="h-1 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="h-4 w-4 text-indigo-400" />
              <span className="text-xs text-muted-foreground font-medium">Сон</span>
            </div>
            <div className="text-xl font-bold">
              {sleepData?.durationHours ? `${sleepData.durationHours} ч` : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {sleepData?.qualityScore ? `качество: ${sleepData.qualityScore}/10` : "не записан"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="food">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="food"><Utensils className="h-3.5 w-3.5 mr-1.5" />Питание</TabsTrigger>
          <TabsTrigger value="water"><Droplets className="h-3.5 w-3.5 mr-1.5" />Вода</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="h-3.5 w-3.5 mr-1.5" />Активность</TabsTrigger>
          <TabsTrigger value="sleep"><Moon className="h-3.5 w-3.5 mr-1.5" />Сон</TabsTrigger>
          <TabsTrigger value="wellbeing"><Heart className="h-3.5 w-3.5 mr-1.5" />Самочувствие</TabsTrigger>
          <TabsTrigger value="supplements"><Pill className="h-3.5 w-3.5 mr-1.5" />Добавки</TabsTrigger>
        </TabsList>

        {/* ПИТАНИЕ */}
        <TabsContent value="food" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Добавить продукт</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск продукта (курица, овсянка...)"
                    className="pl-9"
                    value={foodQuery}
                    onChange={(e) => { setFoodQuery(e.target.value); setSelectedFood(null); }}
                  />
                </div>
                <Select value={mealType} onValueChange={(v) => setMealType(v as typeof mealType)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meals.map((m) => (<SelectItem key={m} value={m}>{MEAL_LABELS[m]}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {foodResults && foodResults.length > 0 && !selectedFood && (
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {foodResults.map((f) => (
                    <button key={f.id} onClick={() => { setSelectedFood(f); setFoodQuery(f.name); setAmount(f.servingSize); }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-center justify-between text-sm">
                      <span>{f.name}</span>
                      <span className="text-muted-foreground text-xs">{f.nutrients.calories} ккал/{f.servingSize}г</span>
                    </button>
                  ))}
                </div>
              )}
              {!selectedFood && foodQuery.length < 2 && (
                <Input placeholder="Или введите название вручную..." value={manualFood} onChange={(e) => setManualFood(e.target.value)} />
              )}
              {selectedFood && (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-sm space-y-1">
                  <div className="font-medium">{selectedFood.name}</div>
                  <div className="text-xs text-muted-foreground">
                    На {amount}г: {Math.round(selectedFood.nutrients.calories * amount / selectedFood.servingSize)} ккал ·{" "}
                    {Math.round(selectedFood.nutrients.protein * amount / selectedFood.servingSize * 10) / 10}г белка
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground whitespace-nowrap">Количество (г):</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-24" min={1} />
                <Button onClick={handleAddFood} disabled={addFood.isPending || (!selectedFood && !manualFood)} className="ml-auto">
                  <Plus className="h-4 w-4 mr-1" /> Добавить
                </Button>
              </div>
            </CardContent>
          </Card>
          {meals.map((meal) => {
            const entries = mealEntries(meal);
            if (entries.length === 0) return null;
            return (
              <Card key={meal}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{MEAL_LABELS[meal]}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {entries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <div>
                        <span className="font-medium">{e.foodName}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{e.amount}г</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs font-mono">
                          {Math.round(e.nutrients.calories)} ккал · {Math.round(e.nutrients.protein)}г белка
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteFood(e.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ВОДА */}
        <TabsContent value="water" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Потребление воды</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-5xl font-bold tabular-nums">{Math.round(waterMl)}</div>
                <div className="text-muted-foreground">мл из {waterGoal} мл (цель)</div>
                <Progress value={Math.min((waterMl / waterGoal) * 100, 100)} className="h-3 mt-4" />
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                {[150, 250, 330, 500].map((ml) => (
                  <Button key={ml} variant="outline" onClick={() => handleQuickWater(ml)}>+{ml} мл</Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input type="number" placeholder="Свой объём (мл)" value={waterInput} onChange={(e) => setWaterInput(e.target.value)} />
                <Button onClick={handleAddWater}>Добавить</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* АКТИВНОСТЬ */}
        <TabsContent value="activity" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Записать активность</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Вид активности (бег, йога, силовая...)" value={actType} onChange={(e) => setActType(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={actCategory} onValueChange={(v) => setActCategory(v as typeof actCategory)}>
                  <SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cardio">Кардио</SelectItem>
                    <SelectItem value="strength">Силовая</SelectItem>
                    <SelectItem value="flexibility">Гибкость</SelectItem>
                    <SelectItem value="sports">Спорт</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={actIntensity} onValueChange={(v) => setActIntensity(v as typeof actIntensity)}>
                  <SelectTrigger><SelectValue placeholder="Интенсивность" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Лёгкая</SelectItem>
                    <SelectItem value="moderate">Умеренная</SelectItem>
                    <SelectItem value="vigorous">Высокая</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Длительность: {actDuration} мин</label>
                <Slider value={[actDuration]} min={5} max={180} step={5} onValueChange={([v]) => setActDuration(v)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Сожжено калорий (опционально)" value={actCalories} onChange={(e) => setActCalories(e.target.value)} type="number" />
                <Input placeholder="Шаги (опционально)" value={actSteps} onChange={(e) => setActSteps(e.target.value)} type="number" />
              </div>
              <Button onClick={handleAddActivity} disabled={!actType || addActivity.isPending} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Добавить активность
              </Button>
            </CardContent>
          </Card>
          {log?.activityEntries && log.activityEntries.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Активность за день</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {log.activityEntries.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div>
                      <span className="font-medium">{a.type}</span>
                      <span className="text-muted-foreground ml-2 text-xs capitalize">{a.category} · {a.intensity}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">{a.durationMinutes} мин{a.steps ? ` · ${a.steps.toLocaleString("ru")} шаг.` : ""}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteActivity(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* СОН */}
        <TabsContent value="sleep" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Сон и восстановление</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Время отхода ко сну</label>
                  <Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Время пробуждения</label>
                  <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Продолжительность (часы)</label>
                <Input type="number" step="0.25" min={0} max={24} placeholder="напр. 7.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Качество сна</span>
                  <span className="font-mono font-medium">{sleepQuality}/10</span>
                </div>
                <Slider value={[sleepQuality]} min={1} max={10} step={1} onValueChange={([v]) => setSleepQuality(v)} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Пробуждений за ночь</span>
                  <span className="font-mono font-medium">{wakeUps}</span>
                </div>
                <Slider value={[wakeUps]} min={0} max={10} step={1} onValueChange={([v]) => setWakeUps(v)} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Дневная сонливость</span>
                  <span className="font-mono font-medium">{daytimeSleepiness}/10</span>
                </div>
                <Slider value={[daytimeSleepiness]} min={0} max={10} step={1} onValueChange={([v]) => setDaytimeSleepiness(v)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Утреннее состояние</label>
                <Select value={morningFeeling} onValueChange={setMorningFeeling}>
                  <SelectTrigger><SelectValue placeholder="Как проснулись?" /></SelectTrigger>
                  <SelectContent>
                    {MORNING_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {sleepData && (
                <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                  <div className="font-medium text-xs text-muted-foreground">СОХРАНЕНО</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Длительность", sleepData.durationHours ? `${sleepData.durationHours} ч` : "—"],
                      ["Качество", sleepData.qualityScore ? `${sleepData.qualityScore}/10` : "—"],
                      ["Пробуждений", sleepData.wakeUps != null ? String(sleepData.wakeUps) : "—"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="text-xs text-muted-foreground">{k}</div>
                        <div className="font-bold text-sm">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={handleSaveSleep} disabled={patchLog.isPending} className="w-full">Сохранить сон</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* САМОЧУВСТВИЕ */}
        <TabsContent value="wellbeing" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Субъективное самочувствие</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1">Ментальный статус</div>
              {([
                ["Энергия", energy, setEnergy],
                ["Настроение", mood, setMood],
                ["Концентрация", focus, setFocus],
                ["Ясность мышления", clarity, setClarity],
                ["Мотивация", motivation, setMotivation],
                ["Стресс", stress, setStress],
                ["Голод", hunger, setHunger],
              ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-medium">{val}/10</span>
                  </div>
                  <Slider value={[val]} min={1} max={10} step={1} onValueChange={([v]) => setter(v)} />
                </div>
              ))}

              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Физическое состояние</div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Мышечная болезненность</span>
                  <span className="font-mono font-medium">{muscleSoreness}/10</span>
                </div>
                <Slider value={[muscleSoreness]} min={0} max={10} step={1} onValueChange={([v]) => setMuscleSoreness(v)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Состояние ЖКТ</label>
                  <Select value={giState} onValueChange={setGiState}>
                    <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                    <SelectContent>
                      {GI_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Состояние кожи</label>
                  <Select value={skinState} onValueChange={setSkinState}>
                    <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                    <SelectContent>
                      {SKIN_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="swelling" checked={swelling} onCheckedChange={(c) => setSwelling(!!c)} />
                <label htmlFor="swelling" className="text-sm text-muted-foreground cursor-pointer">Есть отёки (лицо, ноги, руки)</label>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Тяга / крейвинги</label>
                <Input placeholder="Сладкое, солёное, кофе..." value={cravings} onChange={(e) => setCravings(e.target.value)} />
              </div>

              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1">Симптомы</div>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOM_PRESETS.map((s) => (
                  <button key={s} onClick={() => toggleSymptom(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${symptoms.includes(s) ? "bg-red-500/20 border-red-400/50 text-red-300" : "border-white/10 text-muted-foreground hover:bg-muted"}`}>
                    {s}
                  </button>
                ))}
              </div>

              {wellbeingData && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <div className="text-xs text-muted-foreground font-medium mb-2">СОХРАНЕНО</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      ["Энергия", wellbeingData.energyLevel],
                      ["Настроение", wellbeingData.moodScore],
                      ["Концентрация", wellbeingData.focusScore],
                      ["Стресс", wellbeingData.stressLevel],
                      ["Голод", wellbeingData.hungerLevel],
                      ["Мотивация", wellbeingData.motivationScore],
                      ["Ясность", wellbeingData.clarityScore],
                      ["Боль мышц", wellbeingData.muscleSoreness],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="text-center">
                        <div className="text-xs text-muted-foreground">{k}</div>
                        <div className="font-bold">{v != null ? String(v) : "—"}</div>
                      </div>
                    ))}
                  </div>
                  {wellbeingData.symptoms && wellbeingData.symptoms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {wellbeingData.symptoms.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <Button onClick={handleSaveWellbeing} disabled={patchLog.isPending} className="w-full">Сохранить самочувствие</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ДОБАВКИ */}
        <TabsContent value="supplements" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Добавить добавку / БАД</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground font-medium">Быстрый выбор:</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUPPS.map((s) => (
                  <button key={s.name} onClick={() => applyQuickSupp(s)}
                    className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-muted-foreground hover:bg-muted transition-colors">
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Название добавки</label>
                <Input placeholder="Витамин D3, Омега-3, Магний..." value={suppName} onChange={(e) => setSuppName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Количество</label>
                  <Input type="number" placeholder="500" value={suppAmount} onChange={(e) => setSuppAmount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Единица</label>
                  <Select value={suppUnit} onValueChange={setSuppUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="мг">мг</SelectItem>
                      <SelectItem value="мкг">мкг</SelectItem>
                      <SelectItem value="МЕ">МЕ</SelectItem>
                      <SelectItem value="г">г</SelectItem>
                      <SelectItem value="мл">мл</SelectItem>
                      <SelectItem value="шт">шт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Форма</label>
                  <Select value={suppForm} onValueChange={setSuppForm}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="capsule">Капсула</SelectItem>
                      <SelectItem value="tablet">Таблетка</SelectItem>
                      <SelectItem value="powder">Порошок</SelectItem>
                      <SelectItem value="liquid">Жидкость</SelectItem>
                      <SelectItem value="gummy">Жевательная</SelectItem>
                      <SelectItem value="other">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Время приёма</label>
                  <Select value={suppTime} onValueChange={setSuppTime}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Утром</SelectItem>
                      <SelectItem value="afternoon">Днём</SelectItem>
                      <SelectItem value="evening">Вечером</SelectItem>
                      <SelectItem value="with_meal">С едой</SelectItem>
                      <SelectItem value="bedtime">Перед сном</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {Object.keys(suppNutrients).length > 0 && (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Вклад в нутриенты: {Object.entries(suppNutrients).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </div>
              )}
              <Button onClick={handleAddSupplement} disabled={!suppName || addSuppMut.isPending} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Добавить добавку
              </Button>
            </CardContent>
          </Card>

          {suppEntries.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Добавки за день</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {suppEntries.map((s) => {
                  const timeLabels: Record<string, string> = { morning: "Утром", afternoon: "Днём", evening: "Вечером", with_meal: "С едой", bedtime: "Перед сном" };
                  return (
                    <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <div>
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {s.amountMg} {s.unit} · {timeLabels[s.timeTaken ?? ""] ?? s.timeTaken ?? ""}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteSuppMut.mutate(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {suppEntries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Pill className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Нет добавок за этот день</p>
              <p className="text-xs mt-1">Добавьте витамины, минералы или другие БАДы выше</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
