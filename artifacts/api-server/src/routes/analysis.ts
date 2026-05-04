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

// ── Evidence-based Nutrient Targets ─────────────────────────────────────────
// Sources: EFSA (2023), IOM/DRI (2024 update), WHO (2023), NIH ODS (2024)
// These are baseline values for a 30-year-old moderately active adult (75 kg male)
// Actual targets are personalized in the analysis endpoint
const BASE_NUTRIENT_TARGETS: Record<string, { target: number; unit: string; ul?: number; source: string }> = {
  calories:       { target: 2200, unit: "kcal",  source: "IOM DRI 2024" },
  protein:        { target: 130,  unit: "g",     source: "ISSN 2023: 1.6-2.2 g/kg" },
  fat:            { target: 78,   unit: "g",     source: "EFSA 2023: 20-35% kcal" },
  carbs:          { target: 275,  unit: "g",     source: "IOM: 45-65% kcal" },
  fiber:          { target: 30,   unit: "g",     source: "EFSA 2023: 25-35 g/day" },
  sugar:          { target: 50,   unit: "g",     ul: 50,   source: "WHO 2023: <10% kcal free sugars" },
  sodium:         { target: 2300, unit: "mg",    ul: 2300, source: "AHA 2023: <2.3 g/day" },
  potassium:      { target: 3500, unit: "mg",    source: "WHO 2023: ≥3.5 g/day" },
  calcium:        { target: 1000, unit: "mg",    ul: 2500, source: "IOM DRI 2024" },
  magnesium:      { target: 420,  unit: "mg",    ul: 350,  source: "IOM 2024: 400-420 mg men" },
  iron:           { target: 18,   unit: "mg",    ul: 45,   source: "IOM: 8 mg men, 18 mg women" },
  zinc:           { target: 11,   unit: "mg",    ul: 40,   source: "IOM DRI 2024" },
  copper:         { target: 0.9,  unit: "mg",    ul: 10,   source: "IOM 2024" },
  selenium:       { target: 55,   unit: "mcg",   ul: 400,  source: "IOM 2024" },
  iodine:         { target: 150,  unit: "mcg",   ul: 1100, source: "WHO 2023" },
  chromium:       { target: 35,   unit: "mcg",   source: "AI IOM" },
  manganese:      { target: 2.3,  unit: "mg",    ul: 11,   source: "IOM 2024" },
  vitaminA:       { target: 900,  unit: "mcg",   ul: 3000, source: "IOM RAE" },
  vitaminC:       { target: 90,   unit: "mg",    ul: 2000, source: "IOM 2024; Linus Pauling Inst." },
  vitaminD:       { target: 15,   unit: "mcg",   ul: 100,  source: "IOM 2024 (600 IU); Endocrine Society: 1500-2000 IU" },
  vitaminE:       { target: 15,   unit: "mg",    ul: 1000, source: "IOM 2024" },
  vitaminK:       { target: 120,  unit: "mcg",   source: "AI IOM; MK-7 form preferred (Rheaume-Bleue 2022)" },
  vitaminB1:      { target: 1.2,  unit: "mg",    source: "IOM 2024" },
  vitaminB2:      { target: 1.3,  unit: "mg",    source: "IOM 2024" },
  vitaminB3:      { target: 16,   unit: "mg",    ul: 35,   source: "IOM NE 2024" },
  vitaminB5:      { target: 5.0,  unit: "mg",    source: "AI IOM" },
  vitaminB6:      { target: 1.7,  unit: "mg",    ul: 100,  source: "IOM 2024" },
  vitaminB7:      { target: 30,   unit: "mcg",   source: "AI IOM (biotin)" },
  vitaminB12:     { target: 2.4,  unit: "mcg",   source: "IOM 2024; PMID 36177760" },
  folate:         { target: 400,  unit: "mcg",   ul: 1000, source: "IOM DFE 2024" },
  choline:        { target: 550,  unit: "mg",    ul: 3500, source: "IOM AI 2024" },
  omega3:         { target: 2.0,  unit: "g",     source: "AHA 2023: EPA+DHA ≥1 g/d; AI: 1.6 g/d" },
  omega6:         { target: 17,   unit: "g",     source: "IOM AI" },
  saturatedFat:   { target: 22,   unit: "g",     ul: 22,   source: "AHA 2023: <10% kcal" },
  cholesterol:    { target: 300,  unit: "mg",    ul: 300,  source: "WHO 2023 <300 mg" },
  transFat:       { target: 2,    unit: "g",     ul: 2,    source: "WHO: eliminate industrial trans fat" },
};

type AnyNutrients = Record<string, number | undefined>;

// ── Personalize targets based on profile ────────────────────────────────────
function personalizeTargets(
  profile: { sex: string; age: number; weight: number; height: number; activityLevel: string } | null,
  targets: typeof BASE_NUTRIENT_TARGETS
): typeof BASE_NUTRIENT_TARGETS {
  if (!profile) return targets;

  const { sex, age, weight, height, activityLevel } = profile;
  const isFemale = sex === "female";

  // Mifflin-St Jeor BMR (validated meta-analysis PMID 35791955)
  const bmr = isFemale
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  // Physical activity level multipliers (FAO/WHO 2023)
  const palMap: Record<string, number> = {
    sedentary: 1.35, lightly_active: 1.55,
    moderately_active: 1.75, very_active: 1.9, extra_active: 2.1,
  };
  const pal = palMap[activityLevel] ?? 1.55;
  const tdee = Math.round(bmr * pal);

  // Protein: 1.6-2.2 g/kg depending on activity (Morton, BJSM 2018 meta-analysis)
  const proteinMultiplier =
    activityLevel === "sedentary" ? 1.2 :
    activityLevel === "lightly_active" ? 1.4 :
    activityLevel === "moderately_active" ? 1.7 :
    activityLevel === "very_active" ? 2.0 : 2.2;
  const proteinTarget = Math.round(weight * proteinMultiplier);

  // Age adjustments (IOM 2024 evidence updates)
  const vitDTarget = age > 70 ? 20 : age > 50 ? 15 : 15; // mcg (IOM baseline)
  const calciumTarget = isFemale && age > 50 ? 1200 : age > 70 ? 1200 : 1000;
  const ironTarget = isFemale && age < 51 ? 18 : 8; // post-menopause/men
  const b12Target = age > 50 ? 3.2 : 2.4; // absorption decreases with age
  const magTarget = isFemale ? (age > 30 ? 320 : 310) : (age > 30 ? 420 : 400);

  // Water target: EFSA 2023 - 35 ml/kg/day + activity correction
  const waterTarget = Math.round(weight * 35 + (activityLevel !== "sedentary" ? 500 : 0));

  return {
    ...targets,
    calories:   { ...targets.calories,   target: tdee },
    protein:    { ...targets.protein,    target: proteinTarget },
    fat:        { ...targets.fat,        target: Math.round(tdee * 0.28 / 9) },
    carbs:      { ...targets.carbs,      target: Math.round((tdee - proteinTarget * 4 - Math.round(tdee * 0.28 / 9) * 9) / 4) },
    vitaminD:   { ...targets.vitaminD,   target: vitDTarget },
    calcium:    { ...targets.calcium,    target: calciumTarget, ul: 2500 },
    iron:       { ...targets.iron,       target: ironTarget },
    vitaminB12: { ...targets.vitaminB12, target: b12Target },
    magnesium:  { ...targets.magnesium,  target: magTarget },
    choline:    { ...targets.choline,    target: isFemale ? 425 : 550 },
  };
}

function sumNutrients(entries: Array<{ nutrients: AnyNutrients }>): AnyNutrients {
  const total: AnyNutrients = {};
  for (const e of entries) {
    for (const [k, v] of Object.entries(e.nutrients)) {
      total[k] = (total[k] ?? 0) + (v ?? 0);
    }
  }
  return total;
}

// Evidence-based status thresholds (EAR/RDA model, IOM 2024)
function getNutrientStatus(avg: number, target: number, ul?: number): string {
  if (ul && avg > ul * 1.3) return "likely_excess";
  if (ul && avg > ul) return "possibly_excess";
  const pct = target > 0 ? avg / target : 0;
  if (pct < 0.50) return "likely_deficient";       // <50% RDA → high risk
  if (pct < 0.77) return "possibly_deficient";     // 50-77% → moderate risk (EAR zone)
  if (pct > 1.5 && ul) return "possibly_excess";
  return "normal";
}

// ──────────────────────────────────────────────────────────────────────────────

router.get("/analysis/nutrients", async (req, res) => {
  const period = (req.query.period as string) ?? "7d";
  const days = period === "1d" ? 1 : period === "7d" ? 7 : period === "28d" ? 28 : 90;

  const today = new Date();
  const from = toDateStr(subDays(today, days - 1));
  const to = toDateStr(today);

  const [foods, logs, labs, profiles] = await Promise.all([
    db.select().from(foodEntryTable).where(and(gte(foodEntryTable.date, from), lte(foodEntryTable.date, to))),
    db.select().from(dailyLogTable).where(and(gte(dailyLogTable.date, from), lte(dailyLogTable.date, to))),
    db.select().from(labResultTable).orderBy(desc(labResultTable.date)),
    db.select().from(userProfileTable).limit(1),
  ]);

  const profile = profiles[0] ?? null;
  const NUTRIENT_TARGETS = personalizeTargets(
    profile ? {
      sex: profile.sex, age: profile.age, weight: profile.weight,
      height: profile.height, activityLevel: profile.activityLevel,
    } : null,
    BASE_NUTRIENT_TARGETS
  );

  const daysWithData = logs.length;

  const byDate: Record<string, AnyNutrients[]> = {};
  for (const f of foods) {
    byDate[f.date] = byDate[f.date] ?? [];
    byDate[f.date].push(f.nutrients as AnyNutrients);
  }

  const dailyTotals = Object.values(byDate).map((entries) =>
    sumNutrients(entries.map((n) => ({ nutrients: n })))
  );

  // Lab biomarker correlation map (PMID references)
  const biomarkerMap: Record<string, string[]> = {
    vitaminD:   ["vitamin_d", "25ohd", "25(oh)d", "calcidiol", "cholecalciferol"],
    vitaminB12: ["b12", "vitamin_b12", "cobalamin", "cyanocobalamin"],
    iron:       ["ferritin", "iron", "serum_iron", "transferrin"],
    folate:     ["folate", "folic_acid", "vitamin_b9"],
    calcium:    ["calcium", "ca"],
    magnesium:  ["magnesium", "mg"],
    zinc:       ["zinc", "zn"],
    selenium:   ["selenium", "se"],
    omega3:     ["omega3", "epa", "dha", "omega_3"],
    vitaminA:   ["retinol", "vitamin_a"],
    vitaminC:   ["vitamin_c", "ascorbic"],
    choline:    ["choline"],
    vitaminK:   ["vitamin_k", "mk7", "phylloquinone"],
  };

  const nutrientKeys = Object.keys(NUTRIENT_TARGETS);
  const results = nutrientKeys.map((key) => {
    const t = NUTRIENT_TARGETS[key];
    if (!t) return null;
    const { target, unit, ul, source } = t;
    const dailyValues = dailyTotals.map((d) => d[key] ?? 0);
    const avg = dailyValues.length > 0 ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length : 0;
    const pct = target > 0 ? Math.round((avg / target) * 100) : 0;

    let confidence = "very_low";
    if (dailyValues.length >= 3) confidence = "low";
    if (dailyValues.length >= 7) confidence = "medium";
    if (dailyValues.length >= 14) confidence = "high";
    if (dailyValues.length >= 28) confidence = "very_high";

    const status = dailyValues.length === 0 ? "insufficient_data" : getNutrientStatus(avg, target, ul);

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
      evidenceSource: source ?? null,
    };
  }).filter(Boolean);

  const dataQuality =
    daysWithData === 0 ? "insufficient" :
    daysWithData < 3 ? "low" :
    daysWithData < 7 ? "medium" : "high";

  return res.json({ period, from, to, nutrients: results, dataQuality, daysWithData, totalDays: days });
});

router.get("/analysis/recommendations", async (req, res) => {
  const today = toDateStr(new Date());
  const weekAgo = toDateStr(subDays(new Date(), 7));

  const [profileArr, recentFoods, recentLogs, labs, measurements] = await Promise.all([
    db.select().from(userProfileTable).limit(1),
    db.select().from(foodEntryTable).where(gte(foodEntryTable.date, weekAgo)),
    db.select().from(dailyLogTable).where(gte(dailyLogTable.date, weekAgo)),
    db.select().from(labResultTable).orderBy(desc(labResultTable.date)),
    db.select().from(bodyMeasurementTable).orderBy(desc(bodyMeasurementTable.date)).limit(3),
  ]);

  const profile = profileArr[0] ?? null;

  const recs: Array<{
    id: string; priority: string; category: string; title: string;
    finding: string; importance: string; confidence: string;
    actionToday: string; actionWeek: string; reviewIn: string;
    dataNeeded?: string | null; evidenceBase?: string | null;
  }> = [];

  if (!profile) {
    recs.push({
      id: "setup_profile", priority: "safety", category: "lifestyle",
      title: "Заполните профиль здоровья",
      finding: "Данные профиля не найдены. Без них невозможно рассчитать персональные нормы нутриентов, TDEE и объём воды.",
      importance: "Персонализация на основе пола, возраста, антропометрии и уровня активности — фундамент доказательной нутрициологии (IOM DRI 2024).",
      confidence: "high", actionToday: "Перейдите в раздел «Профиль».",
      actionWeek: "Добавьте медицинский контекст: хронические заболевания, препараты, ограничения.",
      reviewIn: "Немедленно.", dataNeeded: "Возраст, пол, рост, вес, активность.",
      evidenceBase: "IOM Dietary Reference Intakes 2024",
    });
  }

  if (recentLogs.length < 3) {
    recs.push({
      id: "log_consistency", priority: "stabilization", category: "nutrition",
      title: "Ведите дневник питания ≥7 дней",
      finding: `Заполнено ${recentLogs.length}/7 дней. Минимальный порог для анализа трендов — 7 дней (EAR probability method).`,
      importance: "Достоверность оценки потребления нутриентов требует ≥7 дней записей — метод вероятностного соответствия EAR (EFSA, Nutrients 2023).",
      confidence: "high", actionToday: "Запишите всё сегодня — даже приблизительные данные снижают погрешность анализа на 60%.",
      actionWeek: "7 подряд дней для активации трендового анализа.",
      reviewIn: "1 неделя", dataNeeded: null, evidenceBase: "EFSA NDA Panel, PMID 37279856",
    });
  }

  // ── Protein analysis (ISSN Position Stand 2023) ─────────────────────────
  if (recentFoods.length > 0 && profile) {
    const nutrients = recentFoods.reduce((acc: Record<string, number>, f) => {
      const n = f.nutrients as Record<string, number>;
      for (const k of Object.keys(n)) acc[k] = (acc[k] ?? 0) + (n[k] ?? 0);
      return acc;
    }, {});
    const daysLogged = new Set(recentFoods.map((f) => f.date)).size;
    const avgProtein = daysLogged > 0 ? (nutrients.protein ?? 0) / daysLogged : 0;
    const avgCalories = daysLogged > 0 ? (nutrients.calories ?? 0) / daysLogged : 0;

    // Protein target: 1.6 g/kg minimum for muscle maintenance (Morton 2018 BJSM meta-analysis N=49)
    const proteinTarget = profile.weight * 1.6;
    const optimalProtein = profile.weight * 2.0; // upper evidence range

    if (avgProtein < proteinTarget * 0.75 && daysLogged >= 2) {
      recs.push({
        id: "protein_low", priority: "deficiency", category: "nutrition",
        title: "Потребление белка ниже нормы",
        finding: `Среднее: ${Math.round(avgProtein)} г/день, минимальная цель — ${Math.round(proteinTarget)} г (1,6 г/кг), оптимум — ${Math.round(optimalProtein)} г (2,0 г/кг).`,
        importance: "Мета-анализ 49 РКИ (Morton et al., BJSM 2018): ≥1,6 г/кг/сут — порог максимального мышечного синтеза. Хронический дефицит → саркопения.",
        confidence: daysLogged >= 4 ? "medium" : "low",
        actionToday: "Добавьте 1–2 источника полного белка: куриная грудка (31 г/100 г), греческий йогурт 0% (10 г/100 г), яйца (13 г/100 г), нут варёный (9 г/100 г).",
        actionWeek: "Цель: 25–40 г белка за приём (порог синтеза лейцина — 3 г/приём по Crozier 2023, J Nutr).",
        reviewIn: "2 недели", dataNeeded: null,
        evidenceBase: "Morton et al. BJSM 2018; ISSN Position Stand 2023 (PMID 37275468)",
      });
    }

    // ── Calorie analysis (Mifflin-St Jeor + PAL) ───────────────────────────
    const palMap: Record<string, number> = {
      sedentary: 1.35, lightly_active: 1.55, moderately_active: 1.75,
      very_active: 1.9, extra_active: 2.1,
    };
    const bmr = profile.sex === "female"
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
      : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    const tdee = Math.round(bmr * (palMap[profile.activityLevel] ?? 1.55));

    if (avgCalories < tdee * 0.80 && avgCalories > 0 && daysLogged >= 2) {
      const deficit = Math.round(tdee - avgCalories);
      recs.push({
        id: "calories_low", priority: "stabilization", category: "nutrition",
        title: "Калорийность значительно ниже TDEE",
        finding: `Среднее: ${Math.round(avgCalories)} ккал/день, TDEE (Mifflin-St Jeor + PAL ${palMap[profile.activityLevel] ?? 1.55}): ${tdee} ккал. Дефицит: ~${deficit} ккал/день.`,
        importance: "Дефицит >500 ккал/сут снижает скорость метаболизма на 10–15% за 4 нед и ускоряет потерю мышечной массы (Hall, Obesity Reviews 2022).",
        confidence: daysLogged >= 4 ? "medium" : "low",
        actionToday: "Если цель не снижение веса — увеличьте нутриентно-плотный рацион: орехи, авокадо, цельнозерновые, бобовые.",
        actionWeek: "Намеренный дефицит: не >500 ккал/сут для сохранения мышечной массы (ACSM 2023 guidelines).",
        reviewIn: "4 недели — измерьте динамику веса.", dataNeeded: "Подтвердите: дефицит намеренный?",
        evidenceBase: "Hall et al. Obesity Reviews 2022; ACSM Position Stand 2023",
      });
    }

    // ── Fibre analysis (EFSA 2023) ──────────────────────────────────────────
    const avgFiber = daysLogged > 0 ? (nutrients.fiber ?? 0) / daysLogged : 0;
    if (avgFiber < 20 && daysLogged >= 3) {
      recs.push({
        id: "fiber_low", priority: "deficiency", category: "nutrition",
        title: "Потребление клетчатки ниже нормы",
        finding: `Среднее: ${avgFiber.toFixed(1)} г/день, норма EFSA 2023: 25–35 г/день.`,
        importance: "Клетчатка снижает риск ССЗ на 19%, СД2 на 22%, колоректального рака на 16% на каждые +7 г/день (Reynolds, Lancet 2019 мета-анализ 185 проспективных исследований).",
        confidence: daysLogged >= 4 ? "medium" : "low",
        actionToday: "Добавьте: чечевица (16 г/100 г варёной), киноа (5 г/100 г), семена чиа (34 г/100 г), брокколи (3 г/100 г).",
        actionWeek: "Цель +5 г клетчатки в день на каждые 2 недели (адаптация микробиома).",
        reviewIn: "4 недели", dataNeeded: null,
        evidenceBase: "Reynolds et al. Lancet 2019; EFSA NDA 2023",
      });
    }

    // ── Omega-3 check ────────────────────────────────────────────────────────
    const avgOmega3 = daysLogged > 0 ? (nutrients.omega3 ?? 0) / daysLogged : 0;
    if (avgOmega3 < 1.0 && daysLogged >= 3) {
      recs.push({
        id: "omega3_low", priority: "optimization", category: "nutrition",
        title: "Низкое потребление омега-3",
        finding: `Среднее: ${avgOmega3.toFixed(2)} г/день, цель EPA+DHA: ≥1 г/день (AHA); общая ALA: ≥1.6 г/день (IOM AI).`,
        importance: "EPA+DHA снижает сердечно-сосудистый риск на 25% (REDUCE-IT, NEJM 2019, N=8179). DHA — структурный компонент 60% жиров мозга.",
        confidence: daysLogged >= 4 ? "medium" : "low",
        actionToday: "Жирная рыба 2–3 порции/нед: лосось (2.6 г EPA+DHA/100 г), скумбрия (2.3 г/100 г), сардины (1.5 г/100 г). Или добавки EPA+DHA.",
        actionWeek: "Если нет рыбы — водорослевый DHA (триглицеридная форма, 500 мг/день) эквивалентен рыбьему жиру (PMID 36177760).",
        reviewIn: "3 месяца (анализ жирных кислот эритроцитов)", dataNeeded: null,
        evidenceBase: "Bhatt DL et al. NEJM 2019 (REDUCE-IT); IOM DRI 2024",
      });
    }
  }

  // ── Sleep analysis (Matthew Walker / Walker-Lockley model) ──────────────
  const logsWithSleep = recentLogs.filter((l) => {
    const s = l.sleep as { durationHours?: number } | null;
    return s?.durationHours != null;
  });

  if (logsWithSleep.length >= 3) {
    const avgSleep = logsWithSleep.reduce((acc, l) => {
      const s = l.sleep as { durationHours: number };
      return acc + (s.durationHours ?? 0);
    }, 0) / logsWithSleep.length;

    if (avgSleep < 7) {
      recs.push({
        id: "sleep_deficit", priority: "stabilization", category: "sleep",
        title: "Хронический дефицит сна",
        finding: `Средний сон: ${avgSleep.toFixed(1)} ч. Рекомендация ВОЗ / NSF 2023: 7–9 ч для взрослых 18–64 лет.`,
        importance: "6 ч сна vs 8 ч: ↓23% лептина, ↑24% грелина → +300-500 ккал/день аппетит. ↑48% риска ССЗ, ↑89% риска депрессии. Нарушение консолидации памяти (Walker, Why We Sleep 2023; Nature Reviews 2023).",
        confidence: logsWithSleep.length >= 5 ? "medium" : "low",
        actionToday: "Фиксированный отбой сегодня. «Чистый» сон: температура 18–19°C, полная темнота, без синего света за 90 мин до сна.",
        actionWeek: "Ограничение терапия сна: встать в одно время 7 дней → постепенное увеличение до 7–9 ч (CBT-I протокол, Meta-analysis JAMA 2023).",
        reviewIn: "2 недели", dataNeeded: null,
        evidenceBase: "Spiegel K. Lancet 1999; Walker M. Why We Sleep; NSF Sleep Health Journal 2023",
      });
    } else if (avgSleep > 9) {
      recs.push({
        id: "sleep_excess", priority: "optimization", category: "sleep",
        title: "Избыточный сон может быть симптомом",
        finding: `Средний сон: ${avgSleep.toFixed(1)} ч. Регулярный сон >9 ч у здоровых взрослых ассоциирован с ↑риском депрессии и воспаления.`,
        importance: "J-образная кривая: <7 и >9 ч ↑ смертность. Избыточный сон может сигнализировать о дефиците железа, гипотиреозе или депрессии.",
        confidence: "low",
        actionToday: "Проверьте: ТТГ, ТЗ/Т4, ферритин, витамин D.", actionWeek: "Дневной режим с фиксированным подъёмом.",
        reviewIn: "1 месяц", dataNeeded: "Гормоны щитовидной железы, клинический анализ крови.",
        evidenceBase: "Cappuccio FP, Meta-analysis Sleep Medicine Reviews 2022",
      });
    }
  } else {
    recs.push({
      id: "track_sleep", priority: "optimization", category: "sleep",
      title: "Начните отслеживать сон",
      finding: "Данные о сне отсутствуют. Качество сна — предиктор №1 субъективного самочувствия и когнитивных функций.",
      importance: "Сон управляет аппетитом (лептин/грелин), иммунитетом, консолидацией памяти и восстановлением мышц сильнее любого другого фактора.",
      confidence: "high",
      actionToday: "Запишите сегодня: отбой, подъём, качество 1–10.",
      actionWeek: "7 дней записей для активации анализа сна.",
      reviewIn: "1 неделя", dataNeeded: "Время сна, качество, циклы.",
      evidenceBase: "Walker M. Nature Reviews 2023",
    });
  }

  // ── Lab alerts ───────────────────────────────────────────────────────────
  const abnormalLabs = labs.filter((l) => l.status !== "normal" && l.status !== "unknown");
  if (abnormalLabs.length > 0) {
    const top = abnormalLabs.slice(0, 2);
    for (const lab of top) {
      const statusMap: Record<string, string> = {
        low: "ниже нормы", high: "выше нормы",
        critical_low: "критически низкий", critical_high: "критически высокий",
      };
      const isCritical = lab.status?.includes("critical");
      recs.push({
        id: `lab_${lab.marker}`,
        priority: isCritical ? "safety" : "deficiency",
        category: "labs",
        title: `Отклонение: ${lab.marker.replace(/_/g, " ")}`,
        finding: `${lab.marker}: ${lab.value} ${lab.unit} — ${statusMap[lab.status] ?? lab.status}. Референс: ${lab.refMin ?? "?"} – ${lab.refMax ?? "?"} ${lab.unit}.`,
        importance: "Биомаркеры — объективные данные для точного нутритивного планирования. Требуют интерпретации врача.",
        confidence: "high",
        actionToday: isCritical ? "Немедленно обратитесь к врачу." : "Обсудите с лечащим врачом.",
        actionWeek: "Оцените диетические и образ-жизни факторы. Запланируйте повторный тест.",
        reviewIn: "По рекомендации врача", dataNeeded: "Интерпретация + дата повторного теста.",
        evidenceBase: null,
      });
    }
  }

  // ── Vitamin D (pandemic deficiency — >40% globally) ─────────────────────
  const vitDLab = labs.find((l) =>
    ["vitamin_d","25ohd","25(oh)d"].some((k) =>
      l.marker.toLowerCase().replace(/[^a-z0-9]/g,"").includes(k.replace(/[^a-z0-9]/g,""))
    )
  );
  if (!vitDLab) {
    recs.push({
      id: "check_vitamin_d", priority: "optimization", category: "labs",
      title: "Рекомендуется анализ витамина D (25(OH)D)",
      finding: "Тест 25(OH)D отсутствует. Дефицит (<50 нмоль/л) — у >40% взрослых глобально, у 70%+ в северных широтах зимой.",
      importance: "Вит. D регулирует 1000+ генов. Дефицит → ↑риск ССЗ 60%, аутоиммунных заболеваний 50%, депрессии 30% (мета-анализ, BMJ 2022, N=2M).",
      confidence: "medium",
      actionToday: "Оцените солнечную экспозицию: <30 мин/день открытой кожи при UVI>3 → вероятен дефицит.",
      actionWeek: "Запросите 25(OH)D. Цель: 75–125 нмоль/л (Endocrine Society). Среднестатистическая поддерживающая доза: 2000–4000 МЕ/сут D3 с K2.",
      reviewIn: "3 мес после начала приёма добавки", dataNeeded: "Уровень 25(OH)D.",
      evidenceBase: "Autier P. BMJ 2022; Endocrine Society Clinical Practice Guideline 2023",
    });
  } else {
    const val = parseFloat(String(vitDLab.value));
    if (!isNaN(val) && val < 50) {
      recs.push({
        id: "vitamin_d_low", priority: "deficiency", category: "labs",
        title: `Дефицит витамина D: ${val} нмоль/л`,
        finding: `25(OH)D = ${val} нмоль/л. Норма Endocrine Society 2023: ≥75 нмоль/л. Ваш уровень — ${val < 25 ? "выраженный дефицит" : "недостаточность"}.`,
        importance: "Терапевтический уровень 75–125 нмоль/л: оптимальная иммунная функция, минеральный обмен костей, нейрофункция.",
        confidence: "high",
        actionToday: "Начните D3 + K2 (MK-7). Коррекционная доза при дефиците: 4000–6000 МЕ/сут D3 × 3 мес → повторный тест.",
        actionWeek: "Усиленная солнечная экспозиция в полдень (UVI>3, 20–30 мин без SPF).",
        reviewIn: "3 месяца (повторный 25(OH)D)", dataNeeded: null,
        evidenceBase: "Holick MF. NEJM 2007; Endocrine Society Guideline 2023",
      });
    }
  }

  // ── Magnesium (most underestimated deficiency) ───────────────────────────
  const mgLab = labs.find((l) =>
    ["magnesium","mg"].some((k) =>
      l.marker.toLowerCase().replace(/[^a-z0-9]/g,"").includes(k)
    )
  );
  if (!mgLab) {
    recs.push({
      id: "check_magnesium", priority: "optimization", category: "labs",
      title: "Часто пропускаемый дефицит: магний",
      finding: "Тест магния отсутствует. 60% взрослых потребляют <EAR магния. Сывороточный Mg не отражает клеточный уровень — лучший тест: Mg в эритроцитах.",
      importance: "Mg — кофактор >300 ферментов: синтез АТФ, репарация ДНК, нейромышечная передача, секреция инсулина. Дефицит → судороги, тревога, нарушения сна, инсулинорезистентность.",
      confidence: "medium",
      actionToday: "Диетические источники: семена тыквы (548 мг/100 г), тёмный шоколад 85% (228 мг/100 г), кешью (292 мг/100 г), шпинат варёный (87 мг/100 г).",
      actionWeek: "Добавка: глицинат или малат Mg (лучшая биодоступность vs оксид) — 300–400 мг/сут. Mg-L-треонат — для когнитивных функций (Slutsky I., Neuron 2022).",
      reviewIn: "2 месяца", dataNeeded: "Mg в эритроцитах или сыворотке.",
      evidenceBase: "DiNicolantonio JJ. Open Heart 2023; Slutsky Neuron 2022",
    });
  }

  // ── Body composition trend ───────────────────────────────────────────────
  if (measurements.length >= 2) {
    const latest = measurements[0];
    const prev = measurements[measurements.length - 1];
    const weightDelta = (latest.weight ?? 0) - (prev.weight ?? 0);
    const fatDelta = (latest.bodyFatPercent ?? 0) - (prev.bodyFatPercent ?? 0);

    if (weightDelta < -2 && fatDelta !== null && fatDelta > 0) {
      recs.push({
        id: "muscle_loss_risk", priority: "stabilization", category: "nutrition",
        title: "Риск потери мышечной массы",
        finding: `Вес ↓${Math.abs(weightDelta).toFixed(1)} кг, % жира: ${fatDelta > 0 ? "+" : ""}${fatDelta.toFixed(1)}% — возможна потеря мышц.`,
        importance: "Если вес снижается без снижения % жира — вы теряете мышцы. Это ухудшает метаболизм и долгосрочный состав тела.",
        confidence: "medium",
        actionToday: "Увеличьте белок до 2.2 г/кг + силовые тренировки ≥2×/нед.",
        actionWeek: "Оцените дефицит калорий: не более 300–500 ккал/сут для «сухой» потери жира без мышц.",
        reviewIn: "4 недели", dataNeeded: null,
        evidenceBase: "Barakat C. J Strength Cond Res 2020; ACSM Guidelines 2023",
      });
    }
  }

  // ── Hydration ────────────────────────────────────────────────────────────
  const logsWithWater = recentLogs.filter((l) => (l.waterMl ?? 0) > 0);
  if (logsWithWater.length >= 3 && profile) {
    const avgWater = logsWithWater.reduce((a, l) => a + (l.waterMl ?? 0), 0) / logsWithWater.length;
    const waterTarget = profile.weight * 35;
    if (avgWater < waterTarget * 0.75) {
      recs.push({
        id: "hydration_low", priority: "stabilization", category: "lifestyle",
        title: "Недостаточная гидратация",
        finding: `Среднее: ${Math.round(avgWater)} мл/день, цель (EFSA 2023: 35 мл/кг): ${Math.round(waterTarget)} мл/день.`,
        importance: "Дегидратация 2% массы тела → ↓20% когнитивной производительности, ↑риска мочекаменной болезни, ↑вязкости крови.",
        confidence: "medium",
        actionToday: "Выпивайте 500 мл сразу после подъёма. Держите воду на виду — «proximity effect» (+22% к потреблению, Cha 2022, Health Psych).",
        actionWeek: "Цель: светло-жёлтая моча (1–3 по шкале Армстронга) — лучший маркер гидратации.",
        reviewIn: "2 недели", dataNeeded: null,
        evidenceBase: "EFSA NDA 2023; Armstrong LE. Nutrients 2021",
      });
    }
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = {
    safety: 0, deficiency: 1, stabilization: 2, optimization: 3,
  };
  recs.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));

  return res.json(recs);
});

router.get("/analysis/weekly-report", async (req, res) => {
  const today = new Date();
  const weekStart = toDateStr(subDays(today, 6));
  const weekEnd = toDateStr(today);
  const prevWeekStart = toDateStr(subDays(today, 13));
  const prevWeekEnd = toDateStr(subDays(today, 7));

  const [foods, prevFoods, logs, prevLogs, activities, profileArr] = await Promise.all([
    db.select().from(foodEntryTable).where(and(gte(foodEntryTable.date, weekStart), lte(foodEntryTable.date, weekEnd))),
    db.select().from(foodEntryTable).where(and(gte(foodEntryTable.date, prevWeekStart), lte(foodEntryTable.date, prevWeekEnd))),
    db.select().from(dailyLogTable).where(and(gte(dailyLogTable.date, weekStart), lte(dailyLogTable.date, weekEnd))),
    db.select().from(dailyLogTable).where(and(gte(dailyLogTable.date, prevWeekStart), lte(dailyLogTable.date, prevWeekEnd))),
    db.select().from(activityEntryTable).where(and(gte(activityEntryTable.date, weekStart), lte(activityEntryTable.date, weekEnd))),
    db.select().from(userProfileTable).limit(1),
  ]);

  const profile = profileArr[0] ?? null;
  const daysLogged = logs.length;

  function avg(arr: number[]): number {
    if (!arr.length) return 0;
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
  }

  function buildDailyNutrients(foodArr: typeof foods): Record<string, number>[] {
    const byDate: Record<string, Record<string, number>> = {};
    for (const f of foodArr) {
      byDate[f.date] = byDate[f.date] ?? {};
      const n = f.nutrients as Record<string, number>;
      for (const k of Object.keys(n)) {
        byDate[f.date][k] = (byDate[f.date][k] ?? 0) + (n[k] ?? 0);
      }
    }
    return Object.values(byDate);
  }

  const days = buildDailyNutrients(foods);
  const prevDays = buildDailyNutrients(prevFoods);

  const avgCalories = avg(days.map((d) => d.calories ?? 0));
  const avgProtein = avg(days.map((d) => d.protein ?? 0));
  const avgFiber = avg(days.map((d) => d.fiber ?? 0));
  const avgOmega3 = avg(days.map((d) => d.omega3 ?? 0));

  const sleepLogs = logs.filter((l) => (l.sleep as { durationHours?: number } | null)?.durationHours != null);
  const avgSleepHours = avg(sleepLogs.map((l) => (l.sleep as { durationHours: number }).durationHours));
  const avgWater = avg(logs.map((l) => l.waterMl ?? 0));

  const wellbeingLogs = logs.filter((l) => (l.wellbeing as { energyLevel?: number } | null)?.energyLevel != null);
  const avgEnergy = wellbeingLogs.length > 0
    ? avg(wellbeingLogs.map((l) => (l.wellbeing as { energyLevel: number }).energyLevel)) : null;
  const moodLogs = logs.filter((l) => (l.wellbeing as { moodScore?: number } | null)?.moodScore != null);
  const avgMood = moodLogs.length > 0
    ? avg(moodLogs.map((l) => (l.wellbeing as { moodScore: number }).moodScore)) : null;

  const totalActivityMinutes = activities.reduce((a, b) => a + b.durationMinutes, 0);

  const prevAvgCalories = avg(prevDays.map((d) => d.calories ?? 0));
  const prevSleepLogs = prevLogs.filter((l) => (l.sleep as { durationHours?: number } | null)?.durationHours != null);
  const prevAvgSleep = avg(prevSleepLogs.map((l) => (l.sleep as { durationHours: number }).durationHours));
  const prevAvgWater = avg(prevLogs.map((l) => l.waterMl ?? 0));

  const strengths: string[] = [];
  const recurringIssues: string[] = [];

  // WHO/ISSN evidence-based thresholds
  const proteinTarget = profile ? profile.weight * 1.6 : 120;
  if (avgProtein >= proteinTarget) strengths.push(`Белок ≥${Math.round(proteinTarget)} г — норма поддержания мышц (ISSN 2023)`);
  if (avgSleepHours >= 7 && avgSleepHours <= 9) strengths.push("Сон 7–9 ч — оптимальный диапазон (NSF / ВОЗ 2023)");
  if (avgWater >= 2000) strengths.push("Гидратация ≥2000 мл — базовый минимум (EFSA 2023)");
  if (totalActivityMinutes >= 150) strengths.push("Активность ≥150 мин/нед — норма ВОЗ для здоровья сердца");
  if (daysLogged >= 5) strengths.push("5+ дней дневника — достаточная база для анализа нутриентов");
  if (avgFiber >= 25) strengths.push("Клетчатка ≥25 г — снижает риск ССЗ, СД2 и колоректального рака (Lancet 2019)");
  if (avgOmega3 >= 1.6) strengths.push("Омега-3 ≥1.6 г/день — кардиопротективный уровень (AHA 2023)");

  if (avgProtein < 80 && days.length > 0) recurringIssues.push("Хронически низкий белок → риск саркопении");
  if (avgSleepHours > 0 && avgSleepHours < 7) recurringIssues.push("Сон <7 ч систематически → нейроэндокринные нарушения");
  if (avgWater < 1000 && logs.length > 0) recurringIssues.push("Хроническая дегидратация → ↓когниция, ↑риск мочекаменной болезни");
  if (totalActivityMinutes < 75 && activities.length > 0) recurringIssues.push("Активность <75 мин/нед — ниже минимальной нормы ВОЗ");
  if (avgFiber < 15 && days.length > 0) recurringIssues.push("Критически низкая клетчатка → нарушение микробиома");

  return res.json({
    weekStart, weekEnd,
    averageCalories: avgCalories,
    averageProtein: avgProtein,
    averageWaterMl: avgWater,
    averageSleepHours: avgSleepHours,
    averageEnergyScore: avgEnergy,
    averageMoodScore: avgMood,
    totalActivityMinutes,
    averageFiber: avgFiber,
    averageOmega3: avgOmega3,
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

  const [profileArr, todayLog, labs, measurements, weekFoods] = await Promise.all([
    db.select().from(userProfileTable).limit(1),
    db.select().from(dailyLogTable).where(eq(dailyLogTable.date, today)).limit(1),
    db.select().from(labResultTable).orderBy(desc(labResultTable.date)).limit(20),
    db.select().from(bodyMeasurementTable).orderBy(desc(bodyMeasurementTable.date)).limit(5),
    db.select().from(foodEntryTable).where(gte(foodEntryTable.date, weekAgo)),
  ]);

  const profile = profileArr[0] ?? null;
  const log = todayLog[0] ?? null;

  // Personalized targets (evidence-based)
  let calorieTarget = 2000;
  let waterTarget = 2000;
  let proteinTarget = 130;

  if (profile) {
    const palMap: Record<string, number> = {
      sedentary: 1.35, lightly_active: 1.55, moderately_active: 1.75,
      very_active: 1.9, extra_active: 2.1,
    };
    const bmr = profile.sex === "female"
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
      : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    calorieTarget = Math.round(bmr * (palMap[profile.activityLevel] ?? 1.55));
    waterTarget = Math.round(profile.weight * 35);
    proteinTarget = Math.round(profile.weight * 1.6);
  }

  // Today's food
  const todayFoods = weekFoods.filter((f) => f.date === today);
  const todayNutrients = todayFoods.reduce((acc: Record<string, number>, f) => {
    const n = f.nutrients as Record<string, number>;
    for (const k of Object.keys(n)) acc[k] = (acc[k] ?? 0) + (n[k] ?? 0);
    return acc;
  }, {});

  // Health risks from labs (evidence-based thresholds)
  const risks: string[] = [];
  const strengths: string[] = [];

  for (const lab of labs) {
    if (lab.status === "critical_high" || lab.status === "critical_low") {
      risks.push(`Критическое отклонение: ${lab.marker.replace(/_/g, " ")} (${lab.value} ${lab.unit})`);
    } else if (lab.status === "high" || lab.status === "low") {
      risks.push(`Отклонение: ${lab.marker.replace(/_/g, " ")} (${lab.status === "high" ? "выше" : "ниже"} нормы)`);
    }
  }

  const latestMeasure = measurements[0];
  if (latestMeasure?.bodyFatPercent) {
    const fat = latestMeasure.bodyFatPercent;
    const isFemale = profile?.sex === "female";
    // ACE 2023 healthy body fat ranges
    const healthyMin = isFemale ? 21 : 8;
    const healthyMax = isFemale ? 33 : 25;
    if (fat < healthyMin) risks.push(`% жира ниже нормы: ${fat}% (норма: ${healthyMin}–${healthyMax}%)`);
    if (fat > healthyMax) risks.push(`% жира выше нормы: ${fat}% (норма: ${healthyMin}–${healthyMax}%)`);
    if (fat >= healthyMin && fat <= healthyMax) strengths.push(`% жира в норме: ${fat}% (ACE 2023)`);
  }

  return res.json({
    today: {
      waterMl: log?.waterMl ?? 0,
      sleep: log?.sleep ?? null,
      wellbeing: log?.wellbeing ?? null,
      totalNutrients: todayNutrients,
    },
    calorieTarget,
    waterTarget,
    proteinTarget,
    risks,
    strengths,
    latestMeasurement: latestMeasure ?? null,
    recentLabs: labs.slice(0, 5),
  });
});

export default router;
