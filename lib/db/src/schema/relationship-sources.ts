import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const relationshipSourcesTable = pgTable("relationship_sources", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  sourceType: text("source_type").notNull(),
  fileName: text("file_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const relationshipImportsTable = pgTable("relationship_imports", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => relationshipSourcesTable.id).notNull(),
  fileName: text("file_name").notNull(),
  sourceType: text("source_type").notNull(),
  status: text("status").notNull().default("completed"),
  totalRows: integer("total_rows").notNull().default(0),
  createdAgents: integer("created_agents").notNull().default(0),
  matchedAgents: integer("matched_agents").notNull().default(0),
  possibleMatches: integer("possible_matches").notNull().default(0),
  skippedRows: integer("skipped_rows").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const relationshipSourceRecordsTable = pgTable("relationship_source_records", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => relationshipSourcesTable.id).notNull(),
  importId: integer("import_id").references(() => relationshipImportsTable.id),
  rowNumber: integer("row_number").notNull(),
  recordType: text("record_type").notNull().default("relationship"),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRelationshipSourceSchema = createInsertSchema(relationshipSourcesTable).omit({ id: true, createdAt: true });
export const insertRelationshipImportSchema = createInsertSchema(relationshipImportsTable).omit({ id: true, createdAt: true });
export const insertRelationshipSourceRecordSchema = createInsertSchema(relationshipSourceRecordsTable).omit({ id: true, createdAt: true });

export type InsertRelationshipSource = z.infer<typeof insertRelationshipSourceSchema>;
export type RelationshipSource = typeof relationshipSourcesTable.$inferSelect;
export type InsertRelationshipImport = z.infer<typeof insertRelationshipImportSchema>;
export type RelationshipImport = typeof relationshipImportsTable.$inferSelect;
export type InsertRelationshipSourceRecord = z.infer<typeof insertRelationshipSourceRecordSchema>;
export type RelationshipSourceRecord = typeof relationshipSourceRecordsTable.$inferSelect;