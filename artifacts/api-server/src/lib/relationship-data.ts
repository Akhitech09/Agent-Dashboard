import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  relationshipAgentsTable,
  relationshipInteractionsTable,
  relationshipLeadsTable,
  relationshipMergeCandidatesTable,
  relationshipOutcomesTable,
  relationshipImportsTable,
  relationshipSourcesTable,
  relationshipSourceRecordsTable,
} from "@workspace/db";
import { logger } from "./logger";
import {
  relationshipActivity as seedActivity,
  relationshipAgents as seedAgents,
} from "../data/relationship-dashboard";

export function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || null;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/\D/g, "");
  return normalized || null;
}

export function asDate(value: string | null | undefined): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}

export async function seedRelationshipDatabase(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(relationshipAgentsTable);
  if (Number(count) > 0) return;

  const [source] = await db
    .insert(relationshipSourcesTable)
    .values({
      label: "WhatsApp agent review",
      sourceType: "whatsapp",
      fileName: "Pasted-WhatsApp-Agent-Chats-Potential-Student-Review-Aug-2025.txt",
    })
    .returning();

  const [importRecord] = await db
    .insert(relationshipImportsTable)
    .values({
      sourceId: source.id,
      fileName: source.fileName ?? "WhatsApp agent review",
      sourceType: source.sourceType,
      totalRows: seedAgents.length,
      createdAgents: seedAgents.length,
    })
    .returning();

  await db.transaction(async (tx) => {
    for (const agent of seedAgents) {
      await tx.insert(relationshipAgentsTable).values({
        id: agent.id,
        name: agent.name,
        normalizedName: normalizeIdentity(agent.name),
        sourceId: source.id,
        groupName: agent.groupName,
        normalizedGroupName: normalizeIdentity(agent.groupName),
        segment: agent.segment,
        stage: agent.stage,
        priority: agent.priority,
        studentContext: agent.studentContext,
        summary: agent.summary,
        dateRange: agent.dateRange,
        lastActivityDate: agent.lastActivityDate,
        nextAction: agent.nextAction,
        outcome: agent.outcome,
        relationshipHealth: agent.relationshipHealth,
      });

      if (!["No named lead", "Multiple students", "—"].includes(agent.studentName)) {
        const [lead] = await tx
          .insert(relationshipLeadsTable)
          .values({
            agentId: agent.id,
            sourceId: source.id,
            name: agent.studentName,
            normalizedName: normalizeIdentity(agent.studentName),
            context: agent.studentContext,
          })
          .returning();

        if (!["Open", "In flight", "Paused", "Awaiting response"].includes(agent.outcome)) {
          await tx.insert(relationshipOutcomesTable).values({
            agentId: agent.id,
            leadId: lead.id,
            sourceId: source.id,
            outcome: agent.outcome,
            detail: agent.summary,
            occurredAt: asDate(agent.lastActivityDate),
          });
        }
      }

      await tx.insert(relationshipSourceRecordsTable).values({
        sourceId: source.id,
        importId: importRecord.id,
        rowNumber: seedAgents.indexOf(agent) + 1,
        rawPayload: agent,
      });
    }

    for (const activity of seedActivity) {
      await tx.insert(relationshipInteractionsTable).values({
        agentId: activity.agentId,
        sourceId: source.id,
        event: activity.event,
        detail: activity.detail,
        occurredAt: activity.date,
        tone: activity.tone,
      });
    }
  });

  logger.info({ agents: seedAgents.length }, "Seeded relationship database");
}

export async function getRelationshipAgentsFromDatabase() {
  const [agents, leads] = await Promise.all([
    db.select().from(relationshipAgentsTable).orderBy(asc(relationshipAgentsTable.name)),
    db.select().from(relationshipLeadsTable),
  ]);
  const leadsByAgent = new Map<string, typeof leads>();
  for (const lead of leads) {
    const current = leadsByAgent.get(lead.agentId) ?? [];
    current.push(lead);
    leadsByAgent.set(lead.agentId, current);
  }
  return agents.map((agent) => {
    const agentLeads = leadsByAgent.get(agent.id) ?? [];
    return {
      id: agent.id,
      name: agent.name,
      groupName: agent.groupName,
      segment: agent.segment,
      stage: agent.stage,
      priority: agent.priority,
      studentName: agentLeads.length ? agentLeads.map((lead) => lead.name).join(" + ") : "No named lead",
      studentContext: agent.studentContext,
      summary: agent.summary,
      dateRange: agent.dateRange,
      lastActivityDate: agent.lastActivityDate ?? "",
      nextAction: agent.nextAction,
      outcome: agent.outcome,
      relationshipHealth: agent.relationshipHealth,
    };
  });
}

export async function getRelationshipActivityFromDatabase() {
  const rows = await db
    .select({
      id: relationshipInteractionsTable.id,
      agentId: relationshipInteractionsTable.agentId,
      agentName: relationshipAgentsTable.name,
      event: relationshipInteractionsTable.event,
      detail: relationshipInteractionsTable.detail,
      date: relationshipInteractionsTable.occurredAt,
      tone: relationshipInteractionsTable.tone,
    })
    .from(relationshipInteractionsTable)
    .innerJoin(relationshipAgentsTable, eq(relationshipInteractionsTable.agentId, relationshipAgentsTable.id))
    .orderBy(desc(relationshipInteractionsTable.occurredAt), desc(relationshipInteractionsTable.id));

  return rows.map((row) => ({ ...row, id: String(row.id) }));
}

export async function getMergeCandidatesFromDatabase() {
  return db
    .select({
      id: relationshipMergeCandidatesTable.id,
      leftAgentId: relationshipMergeCandidatesTable.leftAgentId,
      rightAgentId: relationshipMergeCandidatesTable.rightAgentId,
      confidence: relationshipMergeCandidatesTable.confidence,
      reason: relationshipMergeCandidatesTable.reason,
      status: relationshipMergeCandidatesTable.status,
      createdAt: relationshipMergeCandidatesTable.createdAt,
      leftAgent: relationshipAgentsTable.name,
    })
    .from(relationshipMergeCandidatesTable)
    .innerJoin(relationshipAgentsTable, eq(relationshipMergeCandidatesTable.leftAgentId, relationshipAgentsTable.id))
    .where(eq(relationshipMergeCandidatesTable.status, "pending"))
    .orderBy(desc(relationshipMergeCandidatesTable.createdAt));
}

export async function findExactAgentMatch(input: {
  normalizedName: string;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  normalizedGroupName: string;
}) {
  const agents = await db.select().from(relationshipAgentsTable);
  return agents.find((agent) =>
    (input.normalizedEmail && agent.normalizedEmail === input.normalizedEmail) ||
    (input.normalizedPhone && agent.normalizedPhone === input.normalizedPhone) ||
    (agent.normalizedName === input.normalizedName && agent.normalizedGroupName === input.normalizedGroupName),
  );
}

export async function findPossibleAgentMatches(input: {
  normalizedName: string;
  normalizedGroupName: string;
}, exactId?: string) {
  const agents = await db.select().from(relationshipAgentsTable);
  const inputTokens = new Set(input.normalizedName.split(" ").filter(Boolean));
  return agents
    .filter((agent) => agent.id !== exactId)
    .map((agent) => {
      const agentTokens = new Set(agent.normalizedName.split(" ").filter(Boolean));
      const sharedTokens = [...inputTokens].filter((token) => agentTokens.has(token)).length;
      const nameSimilarity = input.normalizedName === agent.normalizedName
        ? 1
        : sharedTokens / Math.max(inputTokens.size, agentTokens.size, 1);
      const sameGroup = Boolean(input.normalizedGroupName && input.normalizedGroupName === agent.normalizedGroupName);
      const confidence = Math.round(Math.min(0.95, nameSimilarity * 0.8 + (sameGroup ? 0.15 : 0)) * 100);
      return { agent, confidence, sameGroup };
    })
    .filter(({ confidence, sameGroup }) => confidence >= 72 || sameGroup)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}