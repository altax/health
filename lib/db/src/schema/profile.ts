import { pgTable, serial, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfileTable = pgTable("user_profile", {
  id: serial("id").primaryKey(),
  sex: text("sex").notNull().default("male"),
  age: integer("age").notNull().default(30),
  height: real("height").notNull().default(170),
  weight: real("weight").notNull().default(70),
  waistCircumference: real("waist_circumference"),
  bodyFatPercent: real("body_fat_percent"),
  muscleMass: real("muscle_mass"),
  restingHeartRate: integer("resting_heart_rate"),
  activityLevel: text("activity_level").notNull().default("moderately_active"),
  workType: text("work_type"),
  sleepGoalHours: real("sleep_goal_hours").notNull().default(8),
  timezone: text("timezone"),
  goals: jsonb("goals").$type<string[]>().notNull().default([]),
  chronicConditions: jsonb("chronic_conditions").$type<string[]>().notNull().default([]),
  medications: jsonb("medications").$type<string[]>().notNull().default([]),
  allergies: jsonb("allergies").$type<string[]>().notNull().default([]),
  dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>().notNull().default([]),
  lifestyle: jsonb("lifestyle").$type<{
    caffeinePerDayMg?: number;
    alcoholUnitsPerWeek?: number;
    smokingStatus?: string;
    sweatingLevel?: string;
    baselineStressLevel?: number;
    mealFrequencyPerDay?: number;
    lastMealTime?: string;
    screenTimeHoursPerDay?: number;
    trainingFrequencyPerWeek?: number;
    trainingTypes?: string[];
    wakeUpTime?: string;
    bedTimeGoal?: string;
  }>(),
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfileTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfileTable.$inferSelect;
