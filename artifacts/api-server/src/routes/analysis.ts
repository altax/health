import { Router } from "express";
import { db } from "@workspace/db";
import {
  dailyLogTable,
  foodEntryTable,
  activityEntryTable,
  labResultTable,
  bodyMeasurementTable,
  userProfileTable,
} from "@workspace/db";
import { eq, desc, gte, lte, and } from "drizzle-orm";

const router = Router();

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ── Nutrient RDA targets (adult 30yo, moderately active) ──────────────────────
const NUTRIENT_TARGETS: Record<string, { target: number; unit: string; ul?: number }> = {
  calories:   { target: 2200, unit: "kcal" },
  protein:    { target: 130,  unit: "g" },
  fat:        { target: 78,   unit: "g" },
  carbs:      { target: 275,  unit: "g" },
  fiber:      { target: 28,   unit: "g" },
  sugar:      { target: 50,   unit: "g", ul: 50 },
  sodium:     { target: 2300, unit: "mg", ul: 2300 },
  potassium:  { target: 3500, unit: "mg" },
  calcium:    { target: 1000, unit: "mg", ul: 2500 },
  magnesium:  { target: 400,  unit: "mg", ul: 350 },
  iron:       { target: 18,   unit: "mg", ul: 45 },
  zinc:       { target: 11,   unit: "mg", ul: 40 },
  vitaminA:   { target: 900,  unit: "mcg", ul: 3000 },
  vitaminC:   { target: 90,   unit: "mg", ul: 2000 },
  vitaminD:   { target: 15,   unit: "mcg", ul: 100 },
  vitaminE:   { target: 15,   unit: "mg", ul: 1000 },
  vitaminK:   { target: 120,  unit: "mcg" },
  vitaminB1:  { target: 1.2,  unit: "mg" },
  vitaminB2:  { target: 1.3,  unit: "mg" },
  vitaminB3:  { target: 16,   unit: "mg", ul: 35 },
  vitaminB6:  { target: 1.7,  unit: "mg", ul: 100 },
  vitaminB12: { target: 2.4,  unit: "mcg" },
  folate:     { target: 400,  unit: "mcg", ul: 1000 },
  omega3:     { target: 1.6,  unit: "g" },
  saturatedFat: { target: 22, unit: "g", ul: 22 },
  cholesterol:  { target: 300, unit: "mg", ul: 300 },
};

type AnyNutrients = Record<string, number | undefined>;

function sumNutrients(entries: Array<{ nutrients: AnyNutrients }>): AnyNutrients {
  const total: AnyNutrients = {};
  for (const e of entries) {
    for (const [k, v] of Object.entries(e.nutrients)) {
      total[k] = (total[k] ?? 0) + (v ?? 0);
    }
  }
  return total;
}

function getNutrientStatus(
  avg: number,
  target: number,
  ul?: number
): string {
  const pct = target > 0 ? avg / target : 0;
  if (ul && avg > ul * 1.2) return "likely_excess";
  if (ul && avg > ul * 1.0) return "possibly_excess";
  if (pct < 0.5) return "likely_deficient";
  if (pct < 0.75) return "possibly_deficient";
  return "normal";
}

// ──────────────────────────────────────────────────────────────────────────────

router.get("/analysis/nutrients", async (req, res) => {
  const period = (req.query.period as string) ?? "7d";
  const days = period === "1d" ? 1 : period === "7d" ? 7 : period === "28d" ? 28 : 90;

  const today = new Date();
  const from = toDateStr(subDays(today, days - 1));
  const to = toDateStr(today);

  const foods = await db
    .select()
    .from(foodEntryTable)
    .where(and(gte(foodEntryTable.date, from), lte(foodEntryTable.date, to)));

  const logs = await db
    .select()
    .from(dailyLogTable)
    .where(and(gte(dailyLogTable.date, from), lte(dailyLogTable.date, to)));

  const labs = await db.select().from(labResultTable).orderBy(desc(labResultTable.date));

  const daysWithData = logs.length;

  // Group foods by date and sum per day
  const byDate: Record<string, AnyNutrients[]> = {};
  for (const f of foods) {
    byDate[f.date] = byDate[f.date] ?? [];
    byDate[f.date].push(f.nutrients as AnyNutrients);
  }

  const dailyTotals = Object.values(byDate).map((entries) =>
    sumNutrients(entries.map((n) => ({ nutrients: n })))
  );

  const nutrientKeys = Object.keys(NUTRIENT_TARGETS);
  const results = nutrientKeys.map((key) => {
    const { target, unit, ul } = NUTRIENT_TARGETS[key];
    const dailyValues = dailyTotals.map((d) => d[key] ?? 0);
    const avg = dailyValues.length > 0 ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length : 0;
    const pct = target > 0 ? Math.round((avg / target) * 100) : 0;

    let confidence: string = "very_low";
    if (dailyValues.length >= 7) confidence = "medium";
    else if (dailyValues.length >= 3) confidence = "low";
    if (dailyValues.length >= 14) confidence = "high";

    const status = dailyValues.length === 0 ? "insufficient_data" : getNutrientStatus(avg, target, ul);

    // Check for relevant lab biomarker
    const biomarkerMap: Record<string, string[]> = {
      vitaminD: ["vitamin_d", "25(oh)d", "25ohd"],
      vitaminB12: ["b12", "vitamin_b12", "cobalamin"],
      iron: ["ferritin", "iron", "serum_iron"],
      folate: ["folate", "folic_acid"],
      calcium: ["calcium"],
      magnesium: ["magnesium"],
    };
    const labKeys = biomarkerMap[key] ?? [];
    const matchingLab = labs.find((l) =>
      labKeys.some((k) => l.marker.toLowerCase().replace(/[^a-z0-9]/g, "").includes(k.replace(/[^a-z0-9]/g, "")))
    );

    return {
      nutrient: key,
      averageIntake: Math.round(avg * 10) / 10,
      target,
      unit,
      percentOfTarget: pct,
      status,
      confidence,
      trend: "insufficient_data" as const,
      labValue: matchingLab?.value ?? null,
      labDate: matchingLab?.date ?? null,
    };
  });

  const dataQuality =
    daysWithData === 0 ? "insufficient" :
    daysWithData < 3 ? "low" :
    daysWithData < 7 ? "medium" : "high";

  return res.json({ period, from, to, nutrients: results, dataQuality, daysWithData, totalDays: days });
});

router.get("/analysis/recommendations", async (req, res) => {
  const today = toDateStr(new Date());
  const weekAgo = toDateStr(subDays(new Date(), 7));

  const [profile] = await db.select().from(userProfileTable).limit(1);
  const recentFoods = await db
    .select()
    .from(foodEntryTable)
    .where(gte(foodEntryTable.date, weekAgo));
  const recentLogs = await db
    .select()
    .from(dailyLogTable)
    .where(gte(dailyLogTable.date, weekAgo));
  const labs = await db.select().from(labResultTable).orderBy(desc(labResultTable.date));

  const recs: Array<{
    id: string;
    priority: string;
    category: string;
    title: string;
    finding: string;
    importance: string;
    confidence: string;
    actionToday: string;
    actionWeek: string;
    reviewIn: string;
    dataNeeded?: string | null;
  }> = [];

  if (!profile) {
    recs.push({
      id: "setup_profile",
      priority: "safety",
      category: "lifestyle",
      title: "Заполните профиль здоровья",
      finding: "Данные профиля не найдены. Без них невозможно рассчитать персональные нормы нутриентов, целевые калории и объём воды.",
      importance: "Для персонализированного анализа необходимы возраст, пол, вес, рост и уровень активности.",
      confidence: "high",
      actionToday: "Перейдите в раздел «Профиль» и заполните демографические данные и цели.",
      actionWeek: "Добавьте медицинский контекст: хронические заболевания, принимаемые препараты, ограничения в питании.",
      reviewIn: "Немедленно — необходимо для генерации всех остальных рекомендаций.",
      dataNeeded: "Возраст, пол, рост, вес, уровень активности, цели.",
    });
  }

  // Log streak
  if (recentLogs.length < 3) {
    recs.push({
      id: "log_consistency",
      priority: "stabilization",
      category: "nutrition",
      title: "Ведите дневник питания регулярно",
      finding: `За последние 7 дней заполнено только ${recentLogs.length} дн. дневника. Анализ нутриентов требует стабильных данных.`,
      importance: "Для выявления трендов необходимо минимум 7 дней записей.",
      confidence: "high",
      actionToday: "Запишите всё, что едите сегодня — даже приблизительные данные лучше, чем ничего.",
      actionWeek: "Стремитесь к 7 подряд дням записей, чтобы разблокировать анализ трендов нутриентов.",
      reviewIn: "1 неделя",
      dataNeeded: null,
    });
  }

  // Protein check
  if (recentFoods.length > 0 && profile) {
    const nutrients = recentFoods.reduce(
      (acc: Record<string, number>, f) => {
        const n = f.nutrients as Record<string, number>;
        for (const k of Object.keys(n)) acc[k] = (acc[k] ?? 0) + (n[k] ?? 0);
        return acc;
      },
      {}
    );
    const daysLogged = new Set(recentFoods.map((f) => f.date)).size;
    const avgProtein = daysLogged > 0 ? (nutrients.protein ?? 0) / daysLogged : 0;
    const proteinTarget = profile.weight * 1.6;

    if (avgProtein < proteinTarget * 0.75) {
      recs.push({
        id: "protein_low",
        priority: "deficiency",
        category: "nutrition",
        title: "Потребление белка ниже нормы",
        finding: `Среднее потребление белка: ${Math.round(avgProtein)} г/день, цель — ${Math.round(proteinTarget)} г (1,6 г/кг массы тела).`,
        importance: "Достаточный белок поддерживает мышечную массу, насыщение и восстановление. Хронический дефицит ведёт к потере мышц.",
        confidence: daysLogged >= 3 ? "medium" : "low",
        actionToday: "Добавьте высокобелковый продукт в следующий приём пищи: куриная грудка, греческий йогурт, яйца или бобовые.",
        actionWeek: "Планируйте минимум 2 источника белка на каждый основной приём пищи. Цель — 25–40 г белка на приём.",
        reviewIn: "2 недели",
        dataNeeded: null,
      });
    }

    // Calorie check
    const avgCalories = daysLogged > 0 ? (nutrients.calories ?? 0) / daysLogged : 0;
    const calorieTarget = profile ? Math.round(profile.weight * 30) : 2000;
    if (avgCalories < calorieTarget * 0.8 && avgCalories > 0) {
      recs.push({
        id: "calories_low",
        priority: "stabilization",
        category: "nutrition",
        title: "Калорийность рациона может быть ниже поддерживающей",
        finding: `В среднем ${Math.round(avgCalories)} ккал/день при расчётном поддерживающем значении ${calorieTarget} ккал.`,
        importance: "Длительный дефицит калорий снижает метаболизм, нарушает восстановление и ведёт к потере мышечной массы.",
        confidence: daysLogged >= 3 ? "medium" : "low",
        actionToday: "Добавьте нутриентно-плотный приём пищи или перекус: орехи, авокадо, цельнозерновые продукты.",
        actionWeek: "Убедитесь, что дефицит калорий намеренный (цель — снижение веса). Если нет — увеличьте объём пищи.",
        reviewIn: "4 недели — следите за динамикой веса.",
        dataNeeded: "Уточните: дефицит калорий намеренный или нет.",
      });
    }
  }

  // Sleep check
  const logsWithSleep = recentLogs.filter((l) => {
    const s = l.sleep as { durationHours?: number } | null;
    return s?.durationHours != null;
  });
  if (logsWithSleep.length >= 3) {
    const avgSleep =
      logsWithSleep.reduce((acc, l) => {
        const s = l.sleep as { durationHours?: number };
        return acc + (s.durationHours ?? 0);
      }, 0) / logsWithSleep.length;
    if (avgSleep < 7) {
      recs.push({
        id: "sleep_deficit",
        priority: "stabilization",
        category: "sleep",
        title: "Продолжительность сна ниже рекомендуемого минимума",
        finding: `Средний сон: ${avgSleep.toFixed(1)} ч при рекомендации ВОЗ ≥7 ч для взрослых.`,
        importance: "Хронический недосып нарушает метаболизм глюкозы, гормоны аппетита (лептин/грелин), когнитивные функции и восстановление.",
        confidence: logsWithSleep.length >= 5 ? "medium" : "low",
        actionToday: "Установите фиксированное время отхода ко сну сегодня. Цель — 7–9 ч.",
        actionWeek: "Отслеживайте сон 7 дней. Замечайте, что коррелирует с более коротким сном.",
        reviewIn: "2 недели",
        dataNeeded: null,
      });
    }
  } else {
    recs.push({
      id: "track_sleep",
      priority: "optimization",
      category: "sleep",
      title: "Начните отслеживать сон",
      finding: "Данные о сне отсутствуют. Качество сна — один из самых значимых факторов для энергии, когниции и восстановления.",
      importance: "Сон влияет на чувство голода, концентрацию, иммунитет и метаболизм сильнее, чем почти любой другой фактор.",
      confidence: "high",
      actionToday: "Запишите сегодняшний сон в дневник: время отхода ко сну, время пробуждения, субъективное качество.",
      actionWeek: "Записывайте сон каждый день 7 дней, чтобы включить анализ трендов.",
      reviewIn: "1 неделя",
      dataNeeded: "Время засыпания, время пробуждения, оценка качества (1–10).",
    });
  }

  // Lab alerts
  const abnormalLabs = labs.filter((l) => l.status !== "normal" && l.status !== "unknown");
  if (abnormalLabs.length > 0) {
    const top = abnormalLabs[0];
    const statusMap: Record<string, string> = {
      low: "низкий", high: "высокий", critical_low: "критически низкий", critical_high: "критически высокий",
    };
    recs.push({
      id: `lab_${top.marker}`,
      priority: "safety",
      category: "labs",
      title: `Отклонение в анализах: ${top.marker.replace(/_/g, " ")}`,
      finding: `${top.marker}: ${top.value} ${top.unit} — статус: ${statusMap[top.status] ?? top.status}. Референс: ${top.refMin ?? "?"} – ${top.refMax ?? "?"} ${top.unit}.`,
      importance: "Отклонения биомаркеров требуют контекста и возможно консультации врача.",
      confidence: "high",
      actionToday: "Обсудите этот результат с лечащим врачом, если ещё не сделали.",
      actionWeek: "Оцените диетические факторы, которые могут влиять. Запланируйте повторную сдачу.",
      reviewIn: "По рекомендации врача.",
      dataNeeded: "Интерпретация врача и возможная дата повторного анализа.",
    });
  }

  // Vitamin D check (common deficiency)
  const vitaminDLab = labs.find((l) =>
    ["vitamin_d", "25ohd", "25(oh)d"].some((k) =>
      l.marker.toLowerCase().replace(/[^a-z0-9]/g, "").includes(k.replace(/[^a-z0-9]/g, ""))
    )
  );
  if (!vitaminDLab) {
    recs.push({
      id: "check_vitamin_d",
      priority: "optimization",
      category: "labs",
      title: "Рекомендуется проверить витамин D (25(OH)D)",
      finding: "Результат анализа на витамин D отсутствует. Дефицит крайне распространён (>40% взрослых) и часто протекает бессимптомно.",
      importance: "Витамин D поддерживает здоровье костей, иммунитет, настроение и функцию мышц. Только из пищи потребность редко покрывается.",
      confidence: "medium",
      actionToday: "Оцените, сколько времени вы проводите на солнце. При минимальном солнечном воздействии — обсудите тест с врачом.",
      actionWeek: "Запросите анализ 25(OH)D при следующем визите в лабораторию.",
      reviewIn: "После получения результата.",
      dataNeeded: "Уровень 25(OH)D в сыворотке крови.",
    });
  }

  return res.json(recs);
});

router.get("/analysis/weekly-report", async (req, res) => {
  const today = new Date();
  const weekStart = toDateStr(subDays(today, 6));
  const weekEnd = toDateStr(today);
  const prevWeekStart = toDateStr(subDays(today, 13));
  const prevWeekEnd = toDateStr(subDays(today, 7));

  const [foods, prevFoods, logs, prevLogs] = await Promise.all([
    db.select().from(foodEntryTable).where(and(gte(foodEntryTable.date, weekStart), lte(foodEntryTable.date, weekEnd))),
    db.select().from(foodEntryTable).where(and(gte(foodEntryTable.date, prevWeekStart), lte(foodEntryTable.date, prevWeekEnd))),
    db.select().from(dailyLogTable).where(and(gte(dailyLogTable.date, weekStart), lte(dailyLogTable.date, weekEnd))),
    db.select().from(dailyLogTable).where(and(gte(dailyLogTable.date, prevWeekStart), lte(dailyLogTable.date, prevWeekEnd))),
  ]);

  const daysLogged = logs.length;

  function avg(arr: number[]): number {
    if (!arr.length) return 0;
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
  }

  const nutrientsByDay: Record<string, Record<string, number>> = {};
  for (const f of foods) {
    nutrientsByDay[f.date] = nutrientsByDay[f.date] ?? {};
    const n = f.nutrients as Record<string, number>;
    for (const k of Object.keys(n)) {
      nutrientsByDay[f.date][k] = (nutrientsByDay[f.date][k] ?? 0) + (n[k] ?? 0);
    }
  }
  const days = Object.values(nutrientsByDay);
  const avgCalories = avg(days.map((d) => d.calories ?? 0));
  const avgProtein = avg(days.map((d) => d.protein ?? 0));

  const sleepLogs = logs.filter((l) => {
    const s = l.sleep as { durationHours?: number } | null;
    return s?.durationHours != null;
  });
  const avgSleepHours = avg(sleepLogs.map((l) => {
    const s = l.sleep as { durationHours: number };
    return s.durationHours;
  }));

  const avgWater = avg(logs.map((l) => l.waterMl ?? 0));

  const wellbeingLogs = logs.filter((l) => {
    const w = l.wellbeing as { energyLevel?: number } | null;
    return w?.energyLevel != null;
  });
  const avgEnergy = wellbeingLogs.length > 0
    ? avg(wellbeingLogs.map((l) => {
        const w = l.wellbeing as { energyLevel: number };
        return w.energyLevel;
      }))
    : null;
  const moodLogs = logs.filter((l) => {
    const w = l.wellbeing as { moodScore?: number } | null;
    return w?.moodScore != null;
  });
  const avgMood = moodLogs.length > 0
    ? avg(moodLogs.map((l) => {
        const w = l.wellbeing as { moodScore: number };
        return w.moodScore;
      }))
    : null;

  const activities = await db
    .select()
    .from(activityEntryTable)
    .where(and(gte(activityEntryTable.date, weekStart), lte(activityEntryTable.date, weekEnd)));
  const totalActivityMinutes = activities.reduce((a, b) => a + b.durationMinutes, 0);

  // Prev week comparison
  const prevNutrientsByDay: Record<string, Record<string, number>> = {};
  for (const f of prevFoods) {
    prevNutrientsByDay[f.date] = prevNutrientsByDay[f.date] ?? {};
    const n = f.nutrients as Record<string, number>;
    for (const k of Object.keys(n)) {
      prevNutrientsByDay[f.date][k] = (prevNutrientsByDay[f.date][k] ?? 0) + (n[k] ?? 0);
    }
  }
  const prevDays = Object.values(prevNutrientsByDay);
  const prevAvgCalories = avg(prevDays.map((d) => d.calories ?? 0));
  const prevSleepLogs = prevLogs.filter((l) => {
    const s = l.sleep as { durationHours?: number } | null;
    return s?.durationHours != null;
  });
  const prevAvgSleep = avg(prevSleepLogs.map((l) => {
    const s = l.sleep as { durationHours: number };
    return s.durationHours;
  }));
  const prevAvgWater = avg(prevLogs.map((l) => l.waterMl ?? 0));

  const strengths: string[] = [];
  const recurringIssues: string[] = [];

  if (avgProtein >= 100) strengths.push("Высокое потребление белка на этой неделе");
  if (avgSleepHours >= 7) strengths.push("Продолжительность сна соответствует норме");
  if (avgWater >= 1500) strengths.push("Гидратация в пределах нормы");
  if (totalActivityMinutes >= 150) strengths.push("Физическая активность соответствует рекомендациям ВОЗ (150+ мин)");
  if (daysLogged >= 5) strengths.push("Стабильное ведение дневника — хорошая база данных");

  if (avgProtein < 80 && days.length > 0) recurringIssues.push("Низкое потребление белка в нескольких днях");
  if (avgSleepHours > 0 && avgSleepHours < 7) recurringIssues.push("Сон систематически менее 7 часов");
  if (avgWater < 1000 && logs.length > 0) recurringIssues.push("Недостаточное ежедневное потребление воды");
  if (totalActivityMinutes < 75 && activities.length > 0) recurringIssues.push("Физическая активность ниже рекомендуемого уровня");

  return res.json({
    weekStart,
    weekEnd,
    averageCalories: avgCalories,
    averageProtein: avgProtein,
    averageWaterMl: avgWater,
    averageSleepHours: avgSleepHours,
    averageEnergyScore: avgEnergy,
    averageMoodScore: avgMood,
    totalActivityMinutes,
    nutrientHighlights: [],
    recurringIssues,
    strengths,
    daysLogged,
    comparedToPreviousWeek: {
      caloriesChange: Math.round(avgCalories - prevAvgCalories),
      sleepChange: Math.round((avgSleepHours - prevAvgSleep) * 10) / 10,
      waterChange: Math.round(avgWater - prevAvgWater),
    },
  });
});

router.get("/dashboard", async (req, res) => {
  const today = toDateStr(new Date());
  const weekAgo = toDateStr(subDays(new Date(), 6));
  const monthAgo = toDateStr(subDays(new Date(), 27));

  const [profile] = await db.select().from(userProfileTable).limit(1);

  // Today's log
  const todayLogs = await db.select().from(dailyLogTable).where(eq(dailyLogTable.date, today));
  const todayFoods = await db.select().from(foodEntryTable).where(eq(foodEntryTable.date, today));
  const todayActivities = await db.select().from(activityEntryTable).where(eq(activityEntryTable.date, today));

  type AnyNutrients = Record<string, number | undefined>;
  const sumNutrients = (entries: Array<{ nutrients: unknown }>) =>
    entries.reduce<AnyNutrients>((acc, e) => {
      const n = e.nutrients as AnyNutrients;
      for (const k of Object.keys(n)) acc[k] = (acc[k] ?? 0) + (n[k] ?? 0);
      return acc;
    }, {} as AnyNutrients);

  const todayNutrients = sumNutrients(todayFoods);
  const todayLog = todayLogs[0] ?? null;
  const todayFull = todayLog
    ? { ...todayLog, foodEntries: todayFoods, activityEntries: todayActivities, totalNutrients: todayNutrients }
    : null;

  // Recent labs
  const labs = await db.select().from(labResultTable).orderBy(desc(labResultTable.date)).limit(10);
  const recentLabAlerts = labs.filter((l) => l.status !== "normal" && l.status !== "unknown");

  // Body trend
  const measurements = await db
    .select()
    .from(bodyMeasurementTable)
    .where(gte(bodyMeasurementTable.date, monthAgo))
    .orderBy(desc(bodyMeasurementTable.date))
    .limit(30);

  const latestWeight = measurements[0]?.weight ?? profile?.weight ?? null;
  const measure7dAgo = measurements.find((m) => m.date <= toDateStr(subDays(new Date(), 7)));
  const measure28dAgo = measurements.find((m) => m.date <= monthAgo);
  const weightChange7d = latestWeight && measure7dAgo?.weight ? latestWeight - measure7dAgo.weight : null;
  const weightChange28d = latestWeight && measure28dAgo?.weight ? latestWeight - measure28dAgo.weight : null;

  // Streaks
  const recentLogs = await db
    .select()
    .from(dailyLogTable)
    .orderBy(desc(dailyLogTable.date))
    .limit(30);

  let logStreak = 0;
  for (let i = 0; i < recentLogs.length; i++) {
    const expected = toDateStr(subDays(new Date(), i));
    if (recentLogs[i]?.date === expected) logStreak++;
    else break;
  }

  const waterLogs = recentLogs.filter((l) => l.waterMl > 0);
  let waterStreak = 0;
  for (let i = 0; i < recentLogs.length; i++) {
    const expected = toDateStr(subDays(new Date(), i));
    const log = recentLogs.find((l) => l.date === expected);
    if (log && log.waterMl > 0) waterStreak++;
    else break;
  }

  const sleepLogs = recentLogs.filter((l) => {
    const s = l.sleep as { durationHours?: number } | null;
    return s?.durationHours != null;
  });
  let sleepStreak = 0;
  for (let i = 0; i < recentLogs.length; i++) {
    const expected = toDateStr(subDays(new Date(), i));
    const log = recentLogs.find((l) => l.date === expected);
    const s = log?.sleep as { durationHours?: number } | null;
    if (s?.durationHours != null) sleepStreak++;
    else break;
  }

  // Top risks & strengths
  const todayTopRisks: string[] = [];
  const todayTopStrengths: string[] = [];

  if (todayFoods.length === 0) todayTopRisks.push("Питание сегодня ещё не записано");
  if (!todayLog || todayLog.waterMl < 500) todayTopRisks.push("Мало воды выпито сегодня");
  if (!profile) todayTopRisks.push("Профиль не заполнен — персонализация отключена");

  if (todayNutrients.protein && todayNutrients.protein > 60) todayTopStrengths.push("Хорошее потребление белка сегодня");
  if (todayLog && todayLog.waterMl >= 1500) todayTopStrengths.push("Хорошая гидратация сегодня");
  if (todayActivities.length > 0) todayTopStrengths.push("Физическая активность отмечена");

  // Weekly nutrient highlights
  const recentFoods = await db
    .select()
    .from(foodEntryTable)
    .where(gte(foodEntryTable.date, weekAgo));

  const weeklyNutrientsByDay: Record<string, AnyNutrients> = {};
  for (const f of recentFoods) {
    weeklyNutrientsByDay[f.date] = weeklyNutrientsByDay[f.date] ?? {};
    const n = f.nutrients as AnyNutrients;
    for (const k of Object.keys(n)) {
      weeklyNutrientsByDay[f.date][k] = ((weeklyNutrientsByDay[f.date][k] ?? 0) as number) + (n[k] ?? 0);
    }
  }
  const weeklyDays = Object.values(weeklyNutrientsByDay);
  const weeklyAvg = (key: string) =>
    weeklyDays.length > 0 ? weeklyDays.reduce((acc, d) => acc + ((d[key] as number) ?? 0), 0) / weeklyDays.length : 0;

  const keyNutrients = ["calories", "protein", "vitaminD", "iron", "vitaminB12", "magnesium"];
  const weeklyNutrientHighlights = keyNutrients.map((key) => {
    const t = NUTRIENT_TARGETS[key];
    const avg = weeklyAvg(key);
    const pct = t.target > 0 ? Math.round((avg / t.target) * 100) : 0;
    return {
      nutrient: key,
      averageIntake: Math.round(avg * 10) / 10,
      target: t.target,
      unit: t.unit,
      percentOfTarget: pct,
      status: weeklyDays.length === 0 ? "insufficient_data" : (pct < 75 ? "possibly_deficient" : pct > 130 ? "possibly_excess" : "normal"),
      confidence: weeklyDays.length >= 3 ? "medium" : "low",
      trend: "insufficient_data" as const,
      labValue: null,
      labDate: null,
    };
  });

  return res.json({
    today: todayFull,
    todayTopRisks,
    todayTopStrengths,
    calorieTarget: profile ? Math.round(profile.weight * 30) : 2000,
    waterTarget: 2000,
    sleepTarget: profile?.sleepGoalHours ?? 8,
    weeklyNutrientHighlights,
    recentLabAlerts,
    bodyTrend: {
      currentWeight: latestWeight,
      weightChange7d: weightChange7d !== null ? Math.round(weightChange7d * 10) / 10 : null,
      weightChange28d: weightChange28d !== null ? Math.round(weightChange28d * 10) / 10 : null,
    },
    streak: { logStreak, waterStreak, sleepStreak },
    profileSetup: !!profile,
  });
});

export default router;
