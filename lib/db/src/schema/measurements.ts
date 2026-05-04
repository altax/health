import { pgTable, serial, real, text, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bodyMeasurementTable = pgTable("body_measurement", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  weight: real("weight"),
  bodyFatPercent: real("body_fat_percent"),
  muscleMass: real("muscle_mass"),
  waistCm: real("waist_cm"),
  hipCm: real("hip_cm"),
  chestCm: real("chest_cm"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBodyMeasurementSchema = createInsertSchema(bodyMeasurementTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBodyMeasurement = z.infer<typeof insertBodyMeasurementSchema>;
export type BodyMeasurement = typeof bodyMeasurementTable.$inferSelect;
