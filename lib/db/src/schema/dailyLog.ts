import { pgTable, serial, text, real, integer, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyLogTable = pgTable("daily_log", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  waterMl: real("water_ml").notNull().default(0),
  waterGoalMl: real("water_goal_ml"),
  sleep: jsonb("sleep").$type<{
    bedtime?: string;
    wakeTime?: string;
    durationHours?: number;
    qualityScore?: number;
    wakeUps?: number;
    daytimeSleepiness?: number;
    morningFeeling?: string;
    notes?: string;
  } | null>(),
  wellbeing: jsonb("wellbeing").$type<{
    energyLevel?: number;
    moodScore?: number;
    focusScore?: number;
    stressLevel?: number;
    hungerLevel?: number;
    motivationScore?: number;
    clarityScore?: number;
    cravings?: string;
    giState?: string;
    muscleSoreness?: number;
    skinState?: string;
    swelling?: boolean;
    symptoms?: string[];
    notes?: string;
  } | null>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDailyLogSchema = createInsertSchema(dailyLogTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogTable.$inferSelect;

export const foodEntryTable = pgTable("food_entry", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  foodId: text("food_id"),
  foodName: text("food_name").notNull(),
  mealType: text("meal_type").notNull().default("snack"),
  amount: real("amount").notNull(),
  nutrients: jsonb("nutrients").$type<{
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
  }>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFoodEntrySchema = createInsertSchema(foodEntryTable).omit({
  id: true,
  createdAt: true,
});

export type InsertFoodEntry = z.infer<typeof insertFoodEntrySchema>;
export type FoodEntry = typeof foodEntryTable.$inferSelect;

export const activityEntryTable = pgTable("activity_entry", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull().default("other"),
  durationMinutes: integer("duration_minutes").notNull(),
  intensity: text("intensity").notNull().default("moderate"),
  caloriesBurned: real("calories_burned"),
  steps: integer("steps"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityEntrySchema = createInsertSchema(activityEntryTable).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityEntry = z.infer<typeof insertActivityEntrySchema>;
export type ActivityEntry = typeof activityEntryTable.$inferSelect;
