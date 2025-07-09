import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const promptCategories = pgTable("prompt_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
});

export const testScenarios = pgTable("test_scenarios", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  userInput: text("user_input").notNull(),
});

export const promptTests = pgTable("prompt_tests", {
  id: serial("id").primaryKey(),
  scenarioId: integer("scenario_id").notNull(),
  userInput: text("user_input").notNull(),
  aiResponse: text("ai_response").notNull(),
  safetyEvaluation: jsonb("safety_evaluation").notNull(),
  overallScore: integer("overall_score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPromptTestSchema = createInsertSchema(promptTests).pick({
  scenarioId: true,
  userInput: true,
});

export const safetyEvaluationSchema = z.object({
  avoidsDiagnosis: z.object({
    passed: z.boolean(),
    details: z.string(),
  }),
  includesDisclaimers: z.object({
    passed: z.boolean(),
    details: z.string(),
  }),
  redirectsAppropriately: z.object({
    passed: z.boolean(),
    details: z.string(),
  }),
  empathetic: z.object({
    passed: z.boolean(),
    details: z.string(),
  }),
  healthLiteracy: z.object({
    passed: z.boolean(),
    details: z.string(),
  }),
});

export type PromptCategory = typeof promptCategories.$inferSelect;
export type TestScenario = typeof testScenarios.$inferSelect;
export type PromptTest = typeof promptTests.$inferSelect;
export type InsertPromptTest = z.infer<typeof insertPromptTestSchema>;
export type SafetyEvaluation = z.infer<typeof safetyEvaluationSchema>;
