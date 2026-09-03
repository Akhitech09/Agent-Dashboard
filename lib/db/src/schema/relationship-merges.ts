import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { relationshipAgentsTable } from "./relationship-agents";
import { relationshipImportsTable } from "./relationship-sources";
import { z } from "zod/v4";

export const relationshipMergeCandidatesTable = pgTable("relationship_merge_candidates", {
  id: serial("id").primaryKey(),
  leftAgentId: text("left_agent_id").references(() => relationshipAgentsTable.id).notNull(),
  rightAgentId: text("right_agent_id").references(() => relationshipAgentsTable.id).notNull(),
  importId: integer("import_id").references(() => relationshipImportsTable.id),
  confidence: integer("confidence").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const insertRelationshipMergeCandidateSchema = createInsertSchema(relationshipMergeCandidatesTable).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertRelationshipMergeCandidate = z.infer<typeof insertRelationshipMergeCandidateSchema>;
export type RelationshipMergeCandidate = typeof relationshipMergeCandidatesTable.$inferSelect;