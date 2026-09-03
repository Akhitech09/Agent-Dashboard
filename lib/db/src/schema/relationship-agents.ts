import { createInsertSchema } from "drizzle-zod";
import { boolean, date, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { relationshipSourcesTable } from "./relationship-sources";
import { z } from "zod/v4";

export const relationshipAgentsTable = pgTable("relationship_agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  email: text("email"),
  normalizedEmail: text("normalized_email"),
  phone: text("phone"),
  normalizedPhone: text("normalized_phone"),
  sourceId: integer("source_id").references(() => relationshipSourcesTable.id),
  groupName: text("group_name").notNull(),
  normalizedGroupName: text("normalized_group_name").notNull(),
  segment: text("segment").notNull().default("long-tail"),
  stage: text("stage").notNull().default("No substantive discussion"),
  priority: text("priority").notNull().default("low"),
  studentContext: text("student_context").notNull().default(""),
  summary: text("summary").notNull().default(""),
  dateRange: text("date_range").notNull().default("Review window"),
  lastActivityDate: date("last_activity_date", { mode: "string" }),
  nextAction: text("next_action").notNull().default("Leave in the long tail until a new signal appears."),
  outcome: text("outcome").notNull().default("No recent signal"),
  relationshipHealth: text("relationship_health").notNull().default("dormant"),
  isArchived: boolean("is_archived").notNull().default(false),
  mergedIntoId: text("merged_into_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRelationshipAgentSchema = createInsertSchema(relationshipAgentsTable).omit({ createdAt: true, updatedAt: true });
export type InsertRelationshipAgent = z.infer<typeof insertRelationshipAgentSchema>;
export type RelationshipAgentRecord = typeof relationshipAgentsTable.$inferSelect;