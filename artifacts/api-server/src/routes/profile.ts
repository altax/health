import { Router } from "express";
import { db } from "@workspace/db";
import { userProfileTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

router.get("/profile", async (req, res) => {
  const profiles = await db.select().from(userProfileTable).limit(1);
  if (profiles.length === 0) {
    return res.status(404).json({ error: "Profile not found" });
  }
  return res.json(profiles[0]);
});

router.put("/profile", async (req, res) => {
  const body = req.body;
  const profiles = await db.select().from(userProfileTable).limit(1);

  if (profiles.length === 0) {
    const [created] = await db
      .insert(userProfileTable)
      .values({
        sex: body.sex ?? "male",
        age: body.age ?? 30,
        height: body.height ?? 170,
        weight: body.weight ?? 70,
        waistCircumference: body.waistCircumference ?? null,
        bodyFatPercent: body.bodyFatPercent ?? null,
        muscleMass: body.muscleMass ?? null,
        restingHeartRate: body.restingHeartRate ?? null,
        activityLevel: body.activityLevel ?? "moderately_active",
        workType: body.workType ?? null,
        sleepGoalHours: body.sleepGoalHours ?? 8,
        timezone: body.timezone ?? null,
        goals: body.goals ?? [],
        chronicConditions: body.chronicConditions ?? [],
        medications: body.medications ?? [],
        allergies: body.allergies ?? [],
        dietaryRestrictions: body.dietaryRestrictions ?? [],
        updatedAt: new Date(),
      })
      .returning();
    return res.json(created);
  }

  const [updated] = await db
    .update(userProfileTable)
    .set({
      sex: body.sex ?? profiles[0].sex,
      age: body.age ?? profiles[0].age,
      height: body.height ?? profiles[0].height,
      weight: body.weight ?? profiles[0].weight,
      waistCircumference: body.waistCircumference ?? profiles[0].waistCircumference,
      bodyFatPercent: body.bodyFatPercent ?? profiles[0].bodyFatPercent,
      muscleMass: body.muscleMass ?? profiles[0].muscleMass,
      restingHeartRate: body.restingHeartRate ?? profiles[0].restingHeartRate,
      activityLevel: body.activityLevel ?? profiles[0].activityLevel,
      workType: body.workType ?? profiles[0].workType,
      sleepGoalHours: body.sleepGoalHours ?? profiles[0].sleepGoalHours,
      timezone: body.timezone ?? profiles[0].timezone,
      goals: body.goals ?? profiles[0].goals,
      chronicConditions: body.chronicConditions ?? profiles[0].chronicConditions,
      medications: body.medications ?? profiles[0].medications,
      allergies: body.allergies ?? profiles[0].allergies,
      dietaryRestrictions: body.dietaryRestrictions ?? profiles[0].dietaryRestrictions,
      updatedAt: new Date(),
    })
    .where(eq(userProfileTable.id, profiles[0].id))
    .returning();
  return res.json(updated);
});

export default router;
