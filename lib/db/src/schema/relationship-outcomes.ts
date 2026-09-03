import { createInsertSchema } from "drizzle-zod";
import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { relationshipAgentsTable } from "./relationship-agents";
import { relationshipLeadsTable } from "./relationship-leads";
import { relationshipSourcesTable } from "./relationship-sources";
import { z } from "zod/v4";

export const relationshipOutcomesTable = pgTable("relationship_outcomes", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").references(() => relationshipAgentsTable.id).notNull(),
  leadId: integer("lead_id").references(() => relationshipLeadsTable.id),
  sourceId: integer("source_id").references(() => relationshipSourcesTable.id),
  outcome: text("outcome").notNull(),
  detail: text("detail").notNull().default(""),
  occurredAt: date("occurred_at", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRelationshipOutcomeSchema = createInsertSchema(relationshipOutcomesTable).omit({ id: true, createdAt: true });
export type InsertRelationshipOutcome = z.infer<typeof insertRelationshipOutcomeSchema>;
export type RelationshipOutcome = typeof relationshipOutcomesTable.$inferSelect;