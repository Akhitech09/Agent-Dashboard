import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { relationshipAgentsTable } from "./relationship-agents";
import { relationshipSourcesTable } from "./relationship-sources";
import { z } from "zod/v4";

export const relationshipLeadsTable = pgTable("relationship_leads", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").references(() => relationshipAgentsTable.id).notNull(),
  sourceId: integer("source_id").references(() => relationshipSourcesTable.id),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  context: text("context").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRelationshipLeadSchema = createInsertSchema(relationshipLeadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRelationshipLead = z.infer<typeof insertRelationshipLeadSchema>;
export type RelationshipLead = typeof relationshipLeadsTable.$inferSelect;