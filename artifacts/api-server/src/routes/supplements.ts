import { Router } from "express";
import { db } from "@workspace/db";
import { supplementEntryTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/logs/:date/supplements", async (req, res) => {
  const { date } = req.params;
  const entries = await db
    .select()
    .from(supplementEntryTable)
    .where(eq(supplementEntryTable.date, date))
    .orderBy(supplementEntryTable.createdAt);
  return res.json(entries);
});

router.post("/logs/:date/supplements", async (req, res) => {
  const { date } = req.params;
  const body = req.body;

  const [created] = await db
    .insert(supplementEntryTable)
    .values({
      date,
      name: body.name,
      brand: body.brand ?? null,
      form: body.form ?? "capsule",
      amountMg: body.amountMg ?? 0,
      unit: body.unit ?? "mg",
      timeTaken: body.timeTaken ?? null,
      nutrients: body.nutrients ?? null,
      notes: body.notes ?? null,
    })
    .returning();

  return res.status(201).json(created);
});

router.delete("/logs/:date/supplements/:entryId", async (req, res) => {
  const entryId = parseInt(req.params.entryId, 10);
  await db.delete(supplementEntryTable).where(eq(supplementEntryTable.id, entryId));
  return res.json({ success: true });
});

export default router;
