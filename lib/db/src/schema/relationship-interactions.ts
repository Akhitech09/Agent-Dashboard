import { createInsertSchema } from "drizzle-zod";
import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { relationshipAgentsTable } from "./relationship-agents";
import { relationshipLeadsTable } from "./relationship-leads";
import { relationshipSourcesTable } from "./relationship-sources";
import { z } from "zod/v4";

export const relationshipInteractionsTable = pgTable("relationship_interactions", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").references(() => relationshipAgentsTable.id).notNull(),
  leadId: integer("lead_id").references(() => relationshipLeadsTable.id),
  sourceId: integer("source_id").references(() => relationshipSourcesTable.id),
  event: text("event").notNull(),
  detail: text("detail").notNull().default(""),
  occurredAt: date("occurred_at", { mode: "string" }).notNull(),
  tone: text("tone").notNull().default("neutral"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRelationshipInteractionSchema = createInsertSchema(relationshipInteractionsTable).omit({ id: true, createdAt: true });
export type InsertRelationshipInteraction = z.infer<typeof insertRelationshipInteractionSchema>;
export type RelationshipInteraction = typeof relationshipInteractionsTable.$inferSelect;