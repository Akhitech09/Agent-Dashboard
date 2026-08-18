import { Router, type IRouter } from "express";
import {
  GetRelationshipActivityResponse,
  GetRelationshipAgentsResponse,
  GetRelationshipSummaryResponse,
} from "@workspace/api-zod";
import {
  relationshipActivity,
  relationshipAgents,
} from "../data/relationship-dashboard";

const router: IRouter = Router();

router.get("/relationship-dashboard/agents", (_req, res) => {
  res.json(GetRelationshipAgentsResponse.parse(relationshipAgents));
});

router.get("/relationship-dashboard/summary", (_req, res) => {
  const segmentLabels = [
    ["active-referral", "Live referral conversations", "blue"],
    ["existing-business", "Existing-student business", "teal"],
    ["prospective", "Prospective partners", "amber"],
    ["inactive", "Inactive agents", "slate"],
    ["long-tail", "Long tail", "slate"],
    ["internal", "Internal / exclude", "gray"],
  ] as const;
  const stageCounts = new Map<string, number>();
  for (const agent of relationshipAgents) {
    stageCounts.set(agent.stage, (stageCounts.get(agent.stage) ?? 0) + 1);
  }

  const activeReferrals = relationshipAgents.filter(
    (agent) => agent.segment === "active-referral",
  );
  const openFollowUps = relationshipAgents.filter(
    (agent) => agent.priority === "high" || agent.stage === "Relationship building",
  ).length;
  const warmRelationships = relationshipAgents.filter(
    (agent) => agent.relationshipHealth === "warm",
  ).length;
  const recentReferralCount = activeReferrals.filter(
    (agent) => agent.lastActivityDate >= "2026-07-01",
  ).length;
  const closedReferralCount = activeReferrals.filter((agent) =>
    ["Declined", "Withdrawn", "Lost"].includes(agent.outcome),
  ).length;

  res.json(
      GetRelationshipSummaryResponse.parse({
      totalTracked: relationshipAgents.length,
      activeReferralCount: activeReferrals.length,
      openFollowUps,
      warmRelationships,
      recentReferralCount,
      closedReferralCount,
      segmentBreakdown: segmentLabels.map(([segment, label, tone]) => ({
        label,
        count: relationshipAgents.filter((agent) => agent.segment === segment).length,
        tone,
      })),
      stageBreakdown: Array.from(stageCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([label, count]) => ({ label, count, tone: "blue" })),
    }),
  );
});

router.get("/relationship-dashboard/activity", (_req, res) => {
  res.json(GetRelationshipActivityResponse.parse(relationshipActivity));
});

export default router;