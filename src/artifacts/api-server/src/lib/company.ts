import {graduateOutcomes,graduateYears,compulsoryIds} from "./institution";
import {
  db,
  profilesTable,
  plansTable,
  learningJourneysTable,
  marketSourcesTable,
} from "@workspace/db";
import { desc, eq, inArray } from "drizzle-orm";
import type { Request } from "express";
import { profileScope } from "./profiles";
import { loadCourses, loadRoles, loadSkills } from "./catalog";
import { profileSkills } from "./profile-skills";
import { selfDirectedRoles } from "./self-directed";
import { workplaceAiCourses } from "./workplace-ai";
import { courseFitsRole } from "./course-relevance";
import { scoreRole } from "./scoring";
import { hasCurrentRiasec } from "./riasec-scoring";
import { datedCourses } from "./learning-journey";

export function remainingGap(required: string[], completed: string[]) {
  const learned = new Set(completed);
  return required.filter((s) => !learned.has(s));
}

/** Company metrics are scoped to its authenticated organisation, including plans. */
export async function companyData(req: Request) {
  const [profiles, allRoles, skills, courses, sources] = await Promise.all([
    db
      .select()
      .from(profilesTable)
      .where(profileScope(req))
      .orderBy(profilesTable.id),
    loadRoles(),
    loadSkills(),
    loadCourses(),
    db.select().from(marketSourcesTable),
  ]);
  const ids = profiles.map((p) => p.id);
  const [plans, journeys] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(plansTable)
          .where(inArray(plansTable.profileId, ids))
          .orderBy(desc(plansTable.id)),
        db
          .select()
          .from(learningJourneysTable)
          .where(inArray(learningJourneysTable.profileId, ids)),
      ])
    : [[], []];
  const roles = selfDirectedRoles(allRoles, courses);
  const members = profiles.map((p) => {
    const evidence = profileSkills(p, skills);
    const ranked = roles
      .map((r) => ({
        r,
        s: scoreRole({ ...p, skills: evidence }, r, skills, courses),
      }))
      .sort((a, b) => b.s.score - a.s.score);
    const state = journeys.find((j) => j.profileId === p.id)?.state;
    const plan =
      state?.stage === "active"
        ? plans.find((pl) => pl.id === state.planId && pl.profileId === p.id)
        : plans.find((pl) => pl.profileId === p.id);
    const target = ranked.find((x) => x.r.id === p.targetRoleId) ?? ranked[0];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const current = p.currentRole
      ? allRoles.find(
          (r) =>
            norm(p.currentRole!) === norm(r.title) ||
            norm(p.currentRole!).includes(norm(r.title)),
        )
      : undefined;
    const completedItems =
      state?.stage === "active"
        ? (plan?.items.filter((i) => !!state.completed[String(i.courseId)]) ??
          [])
        : [];
    // Course completion is reported learning progress, not a verified skill assessment.
    const gapNames =
      target?.s.gapSkills
        .filter(
          (g) =>
            g.category !== "Human" &&
            courses.some(
              (c) =>
                courseFitsRole(c, target.r.title) &&
                c.skills.some((s) => s.id === g.skillId),
            ),
        )
        .map((g) => g.name) ?? [];
    const outstanding = remainingGap(
      gapNames,
      completedItems.flatMap((i) => i.skills),
    );
    const dated =
      state?.stage === "active" && plan && state.startDate
        ? datedCourses(plan.items, state.startDate, state.durationWeeks)
        : [];
    return {
      id: p.id,
      name: p.name,
      currentRole: p.currentRole,
      riasecCode: hasCurrentRiasec(p.riasecAnswers) ? p.riasecCode : null,
      exposure: current?.aiExposure ?? null,
      exposureRole: current?.title ?? null,
      targetRole: target?.r.title ?? null,
      stage: state?.stage ?? "intake",
      skillCount: evidence.length,
      skillNames: [...new Set([...evidence.map(s=>skills.find(k=>k.id===s.skillId)?.name).filter((s):s is string=>!!s),...completedItems.flatMap(i=>i.skills)])],
      requiredSkills: target?.r.skills.filter(s=>s.category!=="Human" && courses.some(c=>courseFitsRole(c,target.r.title)&&c.skills.some(k=>k.id===s.skillId))).map(s=>s.name)??[],
      confirmedSkillNames: evidence.filter(s=>s.status!=="inferred").map(s=>skills.find(k=>k.id===s.skillId)?.name).filter((s):s is string=>!!s),
      inferredSkillNames: evidence.filter(s=>s.status==="inferred").map(s=>skills.find(k=>k.id===s.skillId)?.name).filter((s):s is string=>!!s),
      completedSkillNames: [...new Set(completedItems.flatMap(i=>i.skills))],
      gapCount: gapNames.length,
      remainingGap: outstanding.length,
      gaps: outstanding,
      totalCourses: state?.stage === "active" ? (plan?.items.length ?? 0) : 0,
      completedCourses: completedItems.length,
      nextDeadline:
        dated
          .filter((i) => !state?.completed[String(i.courseId)])
          .map((i) => i.deadline)
          .filter(Boolean)
          .sort()[0] ?? null,
      hrdcEligible: p.hrdcEligible,
    };
  });
  const known = members.filter((m) => m.exposure !== null);
  const gaps = new Map<string, number>();
  members.forEach((m) =>
    m.gaps.forEach((g) => gaps.set(g, (gaps.get(g) ?? 0) + 1)),
  );
  const totalCourses = members.reduce((n, m) => n + m.totalCourses, 0),
    completedCourses = members.reduce((n, m) => n + m.completedCourses, 0);
  const institution = req.user!.role === "tvet";
  return {
    portal: institution ? "tvet" as const : "hr" as const,
    institutionHistory: institution ? {...graduateOutcomes,annual:graduateYears()} : null,
    compulsoryCourseIds: institution ? await compulsoryIds(req) : [],
    organization: req.user!.organization,
    members,
    profileCount: members.length,
    exposureCoverage: known.length,
    avgExposure: known.length
      ? known.reduce((n, m) => n + m.exposure!, 0) / known.length
      : null,
    avgGap: members.length
      ? members.reduce((n, m) => n + m.remainingGap, 0) / members.length
      : 0,
    activeCount: members.filter((m) => m.stage === "active").length,
    totalCourses,
    completedCourses,
    topGaps: [...gaps]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count })),
    sources: sources
      .filter((s) => ["onet", "aei_exposure", "aei_usage"].includes(s.id))
      .map((s) => ({ id: s.id, version: s.version, dataDate: s.dataDate })),
    courseSuggestions: [
      ...new Map(
        [
          ...[...gaps]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .flatMap(([name]) =>
              courses
                .filter((c) => c.skills.some((s) => s.name === name))
                .slice(0, 2),
            ),
          ...workplaceAiCourses(courses).slice(0, 3),
        ].map((c) => [
          c.id,
          {
            id: c.id,
            title: c.title,
            provider: c.provider,
            url: c.url,
            skills: c.skills.map((s) => s.name),
            sdgCodes: c.sdgCodes,
          },
        ]),
      ).values(),
    ],
    catalogueCourses: courses.length,
    updatedAt: new Date().toISOString(),
  };
}
