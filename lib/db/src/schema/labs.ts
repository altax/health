import { pgTable, serial, text, real, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const labResultTable = pgTable("lab_result", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  marker: text("marker").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  refMin: real("ref_min"),
  refMax: real("ref_max"),
  laboratory: text("laboratory"),
  status: text("status").notNull().default("unknown"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLabResultSchema = createInsertSchema(labResultTable).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type LabResult = typeof labResultTable.$inferSelect;
