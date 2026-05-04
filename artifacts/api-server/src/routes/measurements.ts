import { Router } from "express";
import { db } from "@workspace/db";
import { bodyMeasurementTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/measurements", async (req, res) => {
  const measurements = await db
    .select()
    .from(bodyMeasurementTable)
    .orderBy(desc(bodyMeasurementTable.date));
  return res.json(measurements);
});

router.post("/measurements", async (req, res) => {
  const body = req.body;
  const [created] = await db
    .insert(bodyMeasurementTable)
    .values({
      date: body.date,
      weight: body.weight ?? null,
      bodyFatPercent: body.bodyFatPercent ?? null,
      muscleMass: body.muscleMass ?? null,
      waistCm: body.waistCm ?? null,
      hipCm: body.hipCm ?? null,
      chestCm: body.chestCm ?? null,
      notes: body.notes ?? null,
    })
    .returning();
  return res.status(201).json(created);
});

export default router;
