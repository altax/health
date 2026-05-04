import { Router } from "express";
import { db } from "@workspace/db";
import {
  dailyLogTable,
  foodEntryTable,
  activityEntryTable,
  supplementEntryTable,
} from "@workspace/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

const router = Router();

type NutrientData = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  magnesium?: number;
  iron?: number;
  zinc?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  vitaminB1?: number;
  vitaminB2?: number;
  vitaminB3?: number;
  vitaminB6?: number;
  vitaminB12?: number;
  folate?: number;
  omega3?: number;
  omega6?: number;
  saturatedFat?: number;
  cholesterol?: number;
};

function sumNutrients(entries: Array<{ nutrients: NutrientData }>): NutrientData {
  const total: NutrientData = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  for (const e of entries) {
    const n = e.nutrients;
    total.calories += n.calories ?? 0;
    total.protein += n.protein ?? 0;
    total.fat += n.fat ?? 0;
    total.carbs += n.carbs ?? 0;
    total.fiber = (total.fiber ?? 0) + (n.fiber ?? 0);
    total.sugar = (total.sugar ?? 0) + (n.sugar ?? 0);
    total.sodium = (total.sodium ?? 0) + (n.sodium ?? 0);
    total.potassium = (total.potassium ?? 0) + (n.potassium ?? 0);
    total.calcium = (total.calcium ?? 0) + (n.calcium ?? 0);
    total.magnesium = (total.magnesium ?? 0) + (n.magnesium ?? 0);
    total.iron = (total.iron ?? 0) + (n.iron ?? 0);
    total.zinc = (total.zinc ?? 0) + (n.zinc ?? 0);
    total.vitaminA = (total.vitaminA ?? 0) + (n.vitaminA ?? 0);
    total.vitaminC = (total.vitaminC ?? 0) + (n.vitaminC ?? 0);
    total.vitaminD = (total.vitaminD ?? 0) + (n.vitaminD ?? 0);
    total.vitaminE = (total.vitaminE ?? 0) + (n.vitaminE ?? 0);
    total.vitaminK = (total.vitaminK ?? 0) + (n.vitaminK ?? 0);
    total.vitaminB1 = (total.vitaminB1 ?? 0) + (n.vitaminB1 ?? 0);
    total.vitaminB2 = (total.vitaminB2 ?? 0) + (n.vitaminB2 ?? 0);
    total.vitaminB3 = (total.vitaminB3 ?? 0) + (n.vitaminB3 ?? 0);
    total.vitaminB6 = (total.vitaminB6 ?? 0) + (n.vitaminB6 ?? 0);
    total.vitaminB12 = (total.vitaminB12 ?? 0) + (n.vitaminB12 ?? 0);
    total.folate = (total.folate ?? 0) + (n.folate ?? 0);
    total.omega3 = (total.omega3 ?? 0) + (n.omega3 ?? 0);
    total.omega6 = (total.omega6 ?? 0) + (n.omega6 ?? 0);
    total.saturatedFat = (total.saturatedFat ?? 0) + (n.saturatedFat ?? 0);
    total.cholesterol = (total.cholesterol ?? 0) + (n.cholesterol ?? 0);
  }
  return total;
}

async function buildDailyLogResponse(log: typeof dailyLogTable.$inferSelect) {
  const [foods, activities, supplements] = await Promise.all([
    db.select().from(foodEntryTable).where(eq(foodEntryTable.date, log.date)).orderBy(foodEntryTable.createdAt),
    db.select().from(activityEntryTable).where(eq(activityEntryTable.date, log.date)).orderBy(activityEntryTable.createdAt),
    db.select().from(supplementEntryTable).where(eq(supplementEntryTable.date, log.date)).orderBy(supplementEntryTable.createdAt),
  ]);
  const foodNutrients = sumNutrients(foods as Array<{ nutrients: NutrientData }>);
  // Merge supplement nutrient contributions into total
  const totalNutrients = { ...foodNutrients };
  for (const supp of supplements) {
    const n = supp.nutrients as Record<string, number> | null;
    if (!n) continue;
    for (const [k, v] of Object.entries(n)) {
      (totalNutrients as Record<string, number>)[k] = ((totalNutrients as Record<string, number>)[k] ?? 0) + (v ?? 0);
    }
  }
  return { ...log, foodEntries: foods, activityEntries: activities, supplementEntries: supplements, totalNutrients };
}

async function getOrCreateLog(date: string) {
  const existing = await db.select().from(dailyLogTable).where(eq(dailyLogTable.date, date));
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(dailyLogTable).values({ date }).returning();
  return created;
}

router.get("/logs", async (req, res) => {
  const { from, to, limit = "30" } = req.query as Record<string, string>;
  let query = db.select().from(dailyLogTable);
  const conditions = [];
  if (from) conditions.push(gte(dailyLogTable.date, from));
  if (to) conditions.push(lte(dailyLogTable.date, to));

  let logs;
  if (conditions.length > 0) {
    logs = await db
      .select()
      .from(dailyLogTable)
      .where(and(...conditions))
      .orderBy(desc(dailyLogTable.date))
      .limit(parseInt(limit, 10));
  } else {
    logs = await db
      .select()
      .from(dailyLogTable)
      .orderBy(desc(dailyLogTable.date))
      .limit(parseInt(limit, 10));
  }

  const result = await Promise.all(logs.map(buildDailyLogResponse));
  return res.json(result);
});

router.get("/logs/:date", async (req, res) => {
  const { date } = req.params;
  const log = await getOrCreateLog(date);
  const full = await buildDailyLogResponse(log);
  return res.json(full);
});

router.patch("/logs/:date", async (req, res) => {
  const { date } = req.params;
  const body = req.body;
  const log = await getOrCreateLog(date);

  const updates: Partial<typeof dailyLogTable.$inferInsert> = { updatedAt: new Date() };
  if (body.waterMl !== undefined) updates.waterMl = body.waterMl;
  if (body.waterGoalMl !== undefined) updates.waterGoalMl = body.waterGoalMl;
  if (body.sleep !== undefined) updates.sleep = body.sleep;
  if (body.wellbeing !== undefined) updates.wellbeing = body.wellbeing;

  const [updated] = await db
    .update(dailyLogTable)
    .set(updates)
    .where(eq(dailyLogTable.id, log.id))
    .returning();

  const full = await buildDailyLogResponse(updated);
  return res.json(full);
});

router.post("/logs/:date/food", async (req, res) => {
  const { date } = req.params;
  const body = req.body;
  await getOrCreateLog(date);

  const [created] = await db
    .insert(foodEntryTable)
    .values({
      date,
      foodId: body.foodId ?? null,
      foodName: body.foodName,
      mealType: body.mealType,
      amount: body.amount,
      nutrients: body.nutrients,
    })
    .returning();
  return res.status(201).json(created);
});

router.delete("/logs/:date/food/:entryId", async (req, res) => {
  const entryId = parseInt(req.params.entryId, 10);
  await db.delete(foodEntryTable).where(eq(foodEntryTable.id, entryId));
  return res.json({ success: true });
});

router.post("/logs/:date/activity", async (req, res) => {
  const { date } = req.params;
  const body = req.body;
  await getOrCreateLog(date);

  const [created] = await db
    .insert(activityEntryTable)
    .values({
      date,
      type: body.type,
      category: body.category,
      durationMinutes: body.durationMinutes,
      intensity: body.intensity,
      caloriesBurned: body.caloriesBurned ?? null,
      steps: body.steps ?? null,
      notes: body.notes ?? null,
    })
    .returning();
  return res.status(201).json(created);
});

router.delete("/logs/:date/activity/:entryId", async (req, res) => {
  const entryId = parseInt(req.params.entryId, 10);
  await db.delete(activityEntryTable).where(eq(activityEntryTable.id, entryId));
  return res.json({ success: true });
});

export default router;
