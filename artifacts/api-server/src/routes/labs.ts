import { Router } from "express";
import { db } from "@workspace/db";
import { labResultTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function computeStatus(value: number, refMin?: number | null, refMax?: number | null): string {
  if (refMin == null && refMax == null) return "unknown";
  if (refMin != null && value < refMin * 0.7) return "critical_low";
  if (refMax != null && value > refMax * 1.3) return "critical_high";
  if (refMin != null && value < refMin) return "low";
  if (refMax != null && value > refMax) return "high";
  return "normal";
}

router.get("/labs", async (req, res) => {
  const labs = await db
    .select()
    .from(labResultTable)
    .orderBy(desc(labResultTable.date), desc(labResultTable.createdAt));
  return res.json(labs);
});

router.post("/labs", async (req, res) => {
  const body = req.body;
  const status = computeStatus(body.value, body.refMin, body.refMax);
  const [created] = await db
    .insert(labResultTable)
    .values({
      date: body.date,
      marker: body.marker,
      value: body.value,
      unit: body.unit,
      refMin: body.refMin ?? null,
      refMax: body.refMax ?? null,
      laboratory: body.laboratory ?? null,
      status,
      notes: body.notes ?? null,
    })
    .returning();
  return res.status(201).json(created);
});

router.delete("/labs/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(labResultTable).where(eq(labResultTable.id, id));
  return res.json({ success: true });
});

export default router;
