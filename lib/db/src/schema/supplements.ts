import { pgTable, serial, text, real, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const supplementEntryTable = pgTable("supplement_entry", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  name: text("name").notNull(),
  brand: text("brand"),
  form: text("form").notNull().default("capsule"),
  amountMg: real("amount_mg").notNull(),
  unit: text("unit").notNull().default("mg"),
  timeTaken: text("time_taken"),
  nutrients: jsonb("nutrients").$type<Record<string, number>>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupplementEntrySchema = createInsertSchema(supplementEntryTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSupplementEntry = z.infer<typeof insertSupplementEntrySchema>;
export type SupplementEntry = typeof supplementEntryTable.$inferSelect;
