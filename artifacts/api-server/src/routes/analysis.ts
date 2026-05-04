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
      title: "Complete your health profile",
      finding: "No profile data found. Without it, personalized nutrient targets, calorie goals, and hydration ranges cannot be calculated.",
      importance: "Personalized targets require your age, sex, weight, height, and activity level.",
      confidence: "high",
      actionToday: "Fill in your profile: go to Profile and enter your demographics and goals.",
      actionWeek: "Add your medical context: any chronic conditions, medications, or dietary restrictions.",
      reviewIn: "Immediately — needed to generate all other recommendations.",
      dataNeeded: "Age, sex, height, weight, activity level, goals.",
    });
  }

  // Log streak
  if (recentLogs.length < 3) {
    recs.push({
      id: "log_consistency",
      priority: "stabilization",
      category: "nutrition",
      title: "Log your food consistently",
      finding: `Only ${recentLogs.length} log day(s) in the past 7 days. Nutrient analysis requires consistent data.`,
      importance: "Trend analysis needs at least 7 days of data to generate meaningful insights.",
      confidence: "high",
      actionToday: "Log everything you eat today — even rough estimates are better than nothing.",
      actionWeek: "Aim for 7 consecutive log days to unlock nutrient trend analysis.",
      reviewIn: "1 week",
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
        title: "Protein intake is below target",
        finding: `Average protein: ${Math.round(avgProtein)}g/day vs target ${Math.round(proteinTarget)}g (1.6g/kg body weight).`,
        importance: "Adequate protein supports muscle maintenance, satiety, and recovery. Chronic shortfall leads to muscle loss.",
        confidence: daysLogged >= 3 ? "medium" : "low",
        actionToday: `Add a high-protein food to your next meal: chicken breast, Greek yogurt, eggs, or legumes.`,
        actionWeek: "Plan at least 2 protein sources per main meal. Target 25-40g protein per meal.",
        reviewIn: "2 weeks",
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
        title: "Calorie intake may be below maintenance",
        finding: `Average ${Math.round(avgCalories)} kcal/day vs estimated maintenance ${calorieTarget} kcal.`,
        importance: "Sustained calorie deficit can reduce metabolic rate, impair recovery, and cause muscle loss.",
        confidence: daysLogged >= 3 ? "medium" : "low",
        actionToday: "Add a nutrient-dense meal or snack: nuts, avocado, whole grains.",
        actionWeek: "Check if calorie deficit is intentional (weight loss goal). If not, increase food volume.",
        reviewIn: "4 weeks — monitor weight trend.",
        dataNeeded: "Confirm intentional calorie restriction or not.",
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
        title: "Sleep duration is below recommended minimum",
        finding: `Average ${avgSleep.toFixed(1)}h sleep vs CDC recommendation of ≥7h for adults.`,
        importance: "Chronic sleep debt impairs glucose metabolism, appetite hormones (leptin/ghrelin), cognition, and recovery.",
        confidence: logsWithSleep.length >= 5 ? "medium" : "low",
        actionToday: "Set a fixed bedtime tonight and protect it. Aim for 7-9h.",
        actionWeek: "Track sleep for 7 days. Note what factors correlate with shorter sleep.",
        reviewIn: "2 weeks",
        dataNeeded: null,
      });
    }
  } else {
    recs.push({
      id: "track_sleep",
      priority: "optimization",
      category: "sleep",
      title: "Start tracking your sleep",
      finding: "Sleep data is missing. Sleep quality is one of the highest-impact levers for energy, cognition, and recovery.",
      importance: "Sleep affects hunger, focus, immune function, and metabolic health more than almost any other single factor.",
      confidence: "high",
      actionToday: "Log today's sleep in the daily log: bedtime, wake time, subjective quality.",
      actionWeek: "Log sleep every day for 7 days to enable trend analysis.",
      reviewIn: "1 week",
      dataNeeded: "Bedtime, wake time, quality score (1-10).",
    });
  }

  // Lab alerts
  const abnormalLabs = labs.filter((l) => l.status !== "normal" && l.status !== "unknown");
  if (abnormalLabs.length > 0) {
    const top = abnormalLabs[0];
    recs.push({
      id: `lab_${top.marker}`,
      priority: "safety",
      category: "labs",
      title: `Abnormal lab result: ${top.marker.replace(/_/g, " ")}`,
      finding: `${top.marker}: ${top.value} ${top.unit} — status: ${top.status}. Reference: ${top.refMin ?? "?"} – ${top.refMax ?? "?"} ${top.unit}.`,
      importance: "Out-of-range biomarkers require context and possibly medical evaluation.",
      confidence: "high",
      actionToday: "Review this result with your healthcare provider if not already done.",
      actionWeek: "Assess dietary factors that may contribute. Track for retesting.",
      reviewIn: "As recommended by your physician.",
      dataNeeded: "Physician interpretation and possible retest date.",
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
      title: "Consider testing Vitamin D (25(OH)D)",
      finding: "No Vitamin D lab result on record. Deficiency is very common (>40% of adults) and often asymptomatic.",
      importance: "Vitamin D supports bone health, immune function, mood, and muscle function. Dietary intake rarely meets needs.",
      confidence: "medium",
      actionToday: "Assess your sun exposure — if minimal, discuss testing with your doctor.",
      actionWeek: "Request 25(OH)D test at next lab draw.",
      reviewIn: "After test result.",
      dataNeeded: "25(OH)D serum level.",
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

  if (avgProtein >= 100) strengths.push("Strong protein intake this week");
  if (avgSleepHours >= 7) strengths.push("Sleep duration meets minimum recommendation");
  if (avgWater >= 1500) strengths.push("Hydration levels are adequate");
  if (totalActivityMinutes >= 150) strengths.push("Physical activity meets WHO weekly recommendation (150+ min)");
  if (daysLogged >= 5) strengths.push("Consistent daily logging — good data foundation");

  if (avgProtein < 80 && days.length > 0) recurringIssues.push("Low protein intake on multiple days");
  if (avgSleepHours > 0 && avgSleepHours < 7) recurringIssues.push("Persistent sleep duration below 7h");
  if (avgWater < 1000 && logs.length > 0) recurringIssues.push("Low daily water intake");
  if (totalActivityMinutes < 75 && activities.length > 0) recurringIssues.push("Physical activity below recommended levels");

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

  if (todayFoods.length === 0) todayTopRisks.push("No food logged today yet");
  if (!todayLog || todayLog.waterMl < 500) todayTopRisks.push("Low water intake today");
  if (!profile) todayTopRisks.push("Health profile not set up — personalization is disabled");

  if (todayNutrients.protein && todayNutrients.protein > 60) todayTopStrengths.push("Good protein intake today");
  if (todayLog && todayLog.waterMl >= 1500) todayTopStrengths.push("Good hydration today");
  if (todayActivities.length > 0) todayTopStrengths.push("Physical activity logged today");

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
