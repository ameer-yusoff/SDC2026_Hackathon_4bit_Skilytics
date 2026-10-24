import { latestGuestProfileId } from "./guest-profile";
import { individualProfile, primaryProfileId } from "./individual-profile";
import { db, profilesTable, plansTable, usersTable, type SkillRow } from "@workspace/db";
import { and, eq, desc, isNull, sql, type SQL } from "drizzle-orm";
import type { Request } from "express";
import { loadCourses } from "./catalog";
import { hasCurrentRiasec } from "./riasec-scoring";
import { SDG_TARGETS } from "../data/courses";

export type ProfileRow = typeof profilesTable.$inferSelect;
export type PlanRow = typeof plansTable.$inferSelect;

export async function getProfileRow(id: number): Promise<ProfileRow | undefined> {
  const [row] = await db.select().from(profilesTable).where(eq(profilesTable.id, id));
  if (row && !hasCurrentRiasec(row.riasecAnswers)) {
    row.riasecScores = null; row.riasecCode = null;
    if (["results", "save", "complete"].includes(row.onboardingStep ?? "")) row.onboardingStep = "holland";
  }
  return row;
}

export async function getLatestPlan(profileId: number): Promise<PlanRow | undefined> {
  const [row] = await db.select().from(plansTable).where(eq(plansTable.profileId, profileId)).orderBy(desc(plansTable.createdAt)).limit(1);
  return row;
}

export function profileToApi(p: ProfileRow, skills: SkillRow[]) {
  const current = hasCurrentRiasec(p.riasecAnswers);
  const name = new Map(skills.map((s) => [s.id, s.name]));
  return {
    id: p.id,
    name: p.name,
    segment: p.segment,
    currentRole: p.currentRole,
    organization: p.organization,
    goals: p.goals,
    weeklyHours: p.weeklyHours,
    budgetMyr: p.budgetMyr,
    hrdcEligible: p.hrdcEligible,
    hrdcEligibilityStatus: p.hrdcEligibilityStatus,
    cvFileName: p.cvFileName,
    education: p.education,
    experience: p.experience,
    cvEvidence: p.cvEvidence,
    cvExtractionKey: p.cvExtractionKey,
    onboardingStep: p.onboardingStep,
    verified: p.verified,
    riasecAnswers: p.riasecAnswers,
    cvUploadedAt: p.cvUploadedAt ? p.cvUploadedAt.toISOString() : null,
    isGuest: p.ownerUserId === null && p.guestToken !== null,
    cvWordCount: p.cvText ? p.cvText.split(/\s+/).filter(Boolean).length : null,
    skills: p.skills
      .filter((s) => name.has(s.skillId))
      .map((s) => ({ skillId: s.skillId, name: name.get(s.skillId)!, status: s.status, evidence: s.evidence })),
    riasecScores: current ? p.riasecScores : null,
    riasecCode: current ? p.riasecCode : null,
    targetRoleId: p.targetRoleId,
    createdAt: p.createdAt.toISOString(),
  };
}

type SdgTarget = (typeof SDG_TARGETS)[number];
const sdgByCode = new Map(SDG_TARGETS.map((t) => [t.code, t]));

export async function planToApi(p: PlanRow) {
  const current = new Map((await loadCourses()).map((c) => [c.id, c]));
  const valid = p.items.filter((i) => current.get(i.courseId)?.url === i.url);
  const verified = valid.length === p.items.length && valid.length > 0;
  return {
    id: p.id,
    profileId: p.profileId,
    roleId: p.roleId,
    roleTitle: p.roleTitle,
    totalWeeks: verified && valid.every((i) => i.durationWeeks !== null) ? p.totalWeeks : null,
    totalCostMyr: verified ? p.totalCostMyr : null,
    sdgGoal: p.items[0]?.sdgGoal ?? null,
    verificationStatus: verified ? "verified" as const : "unverified" as const,
    // Historical plans are retained, but unverified prices/durations are withheld.
    uncoveredSkills: [...new Set([...p.uncoveredSkills, ...p.items.filter((i) => !valid.includes(i)).flatMap((i) => i.skills)])],
    items: valid.map(({ sdgCodes, sdgGoal: _preference, ...i }) => ({
      ...i,
      sdgTargets: sdgCodes.map((c) => sdgByCode.get(c)).filter((t): t is SdgTarget => !!t),
    })),
    createdAt: p.createdAt.toISOString(),
  };
}


/** SQL condition restricting profiles to what the caller may see. */
export function profileScope(req: Request): SQL {
  const u = req.user;
  if (u && (u.role === "hr" || u.role === "tvet")) {
    return u.organization ? sql`${profilesTable.organization} = ${u.organization} AND ${profilesTable.ownerUserId} IN (SELECT id FROM users WHERE role = ${u.role} AND organization = ${u.organization})` : sql`false`;
  }
  const own = u ? and(eq(profilesTable.ownerUserId, u.id),eq(profilesTable.id,primaryProfileId(u.id))) : undefined;
  const guest = req.guestToken ? and(isNull(profilesTable.ownerUserId), eq(profilesTable.guestToken, req.guestToken),eq(profilesTable.id,latestGuestProfileId(req.guestToken))) : undefined;
  if (u?.role === "individual") return own!;
  if (own && guest) return sql`(${own} OR ${guest})`;
  return own ?? guest ?? sql`false`;
}

export async function canAccessProfile(req: Request, p: ProfileRow): Promise<boolean> {
  const u = req.user;
  if (u && (u.role === "hr" || u.role === "tvet")) {
    if (!u.organization || p.organization !== u.organization || !p.ownerUserId) return false;
    const [owner] = await db.select({ role: usersTable.role, organization: usersTable.organization }).from(usersTable).where(eq(usersTable.id, p.ownerUserId));
    return owner?.role === u.role && owner.organization === u.organization;
  }
  if (u?.role === "individual") return p.ownerUserId === u.id && (await individualProfile(u.id))?.id === p.id;
  if (u && p.ownerUserId === u.id) return true;
  if (!req.guestToken || p.ownerUserId !== null || p.guestToken !== req.guestToken) return false;
  const [latest] = await db.select({id:profilesTable.id}).from(profilesTable).where(eq(profilesTable.id,latestGuestProfileId(req.guestToken)));
  return latest?.id === p.id;
}
