import type { PlanItemStored } from "@workspace/db";
import type { CourseView, RoleSkillView } from "./catalog";
import { courseFitsRole, courseSkillFit } from "./course-relevance";
import { workplaceAiCourses } from "./workplace-ai";

// Greedy constraint planner: covers gap skills with the fewest, cheapest,
// shortest courses inside the user's budget and weekly hours. Only verified
// claimable courses may be treated as funded for an eligible employer.
export function buildPlan(opts: {
  gaps: RoleSkillView[];
  courses: CourseView[];
  budgetMyr: number;
  weeklyHours: number;
  hrdcEligible: boolean;
  maxCourses?: number;
  roleTitle?: string;
  aiAdvancement?: boolean;
  sdgGoal?: string;
  compulsoryCourses?: CourseView[];
}) {
  const { courses, weeklyHours, hrdcEligible } = opts;
  const maxCourses = opts.maxCourses ?? 6;
  const remaining = new Map(opts.gaps.map((g) => [g.skillId, g]));
  let budget = opts.budgetMyr;
  const compulsory = opts.compulsoryCourses ?? [];
  const chosen: CourseView[] = [...compulsory];
  budget -= compulsory.reduce((sum,c)=>sum+c.costMyr,0);
  for(const c of compulsory) for(const skill of c.skills) remaining.delete(skill.id);
  const advancement = opts.aiAdvancement ? workplaceAiCourses(courses) : [];
  for (const c of advancement) for (const s of c.skills) remaining.delete(s.id);

  const personalCost = (c: CourseView) =>
    hrdcEligible && c.hrdcStatus === "claimable_verified" ? 0 : c.costMyr;

  while (remaining.size > 0 && chosen.length < maxCourses) {
    let best: { c: CourseView; value: number } | null = null;
    const eligible = courses.filter(
      (c) =>
        courseFitsRole(c, opts.roleTitle ?? "") &&
        !advancement.includes(c) &&
        !chosen.includes(c) &&
        personalCost(c) <= budget &&
        c.skills.some((s) => remaining.has(s.id)),
    );
    // Prioritize role-specific gaps before courses matching only a basic skill.
    const specific = eligible.filter((c) =>
      c.skills.some(
        (s) => remaining.has(s.id) && remaining.get(s.id)?.category !== "Human",
      ),
    );
    const candidates = specific.length ? specific : eligible;
    const scheduled = candidates.filter((c) => c.durationHours !== null);
    for (const c of scheduled.length ? scheduled : candidates) {
      if (chosen.includes(c)) continue;
      if (personalCost(c) > budget) continue;
      const gain = c.skills.reduce(
        (a, s) => a + (remaining.get(s.id)?.importance ?? 0),
        0,
      );
      if (gain === 0) continue;
      const topicFit = Math.max(
        0,
        ...c.skills.map((s) =>
          remaining.has(s.id) ? courseSkillFit(c, s) : 0,
        ),
      );
      // User-selected theme is a modest preference among already eligible courses.
      // It cannot waive role relevance, budget, skill coverage or required courses.
      const themePreference=opts.sdgGoal && c.sdgCodes.some(code=>code.split(".")[0]===opts.sdgGoal)?1.15:1;
      const value =
        (gain * (1 + topicFit / 10) * themePreference) /
        (1 + c.costMyr / 300 + (c.durationHours ?? 0) / 40);
      if (!best || value > best.value) best = { c, value };
    }
    if (!best) break;
    chosen.push(best.c);
    budget -= personalCost(best.c);
    for (const s of best.c.skills) remaining.delete(s.id);
  }

  // Order: core skill courses first, then free before paid.
  const coreIds = new Set(
    opts.gaps.filter((g) => g.importance >= 3).map((g) => g.skillId),
  );
  chosen.sort((a, b) => {
    if(compulsory.includes(a)!==compulsory.includes(b))return compulsory.includes(a)?-1:1;
    const ca = a.skills.some((s) => coreIds.has(s.id)) ? 0 : 1;
    const cb = b.skills.some((s) => coreIds.has(s.id)) ? 0 : 1;
    return ca - cb || a.costMyr - b.costMyr;
  });
  chosen.push(...advancement.filter(c=>!chosen.includes(c)));

  // Schedule: two parallel tracks when weekly hours allow (>= 8h/week),
  // otherwise sequential. Course hours are never truncated.
  const tracks = weeklyHours >= 8 ? 2 : 1;
  const hoursPerTrack = weeklyHours / tracks;
  const trackEnd = Array.from({ length: tracks }, () => 1);
  const gapNames = new Set(opts.gaps.map((g) => g.name));
  const items: PlanItemStored[] = chosen.map((c) => {
    // Keep the advancing module after the role preparation, in learning order.
    if (advancement.includes(c)) trackEnd.fill(Math.max(...trackEnd));
    if (c.durationHours === null)
      return {
        compulsory: compulsory.includes(c),
        courseId: c.id,
        title: c.title,
        provider: c.provider,
        url: c.url,
        startWeek: null,
        durationWeeks: null,
        costMyr: c.costMyr,
        hrdcStatus: c.hrdcStatus,
        skills: c.skills.map((s) => s.name).filter((n) => gapNames.has(n)),
        sdgCodes: c.sdgCodes,
      };
    const t = trackEnd.indexOf(Math.min(...trackEnd));
    const durationWeeks = Math.max(
      1,
      Math.ceil(
        c.durationHours /
          Math.max(advancement.includes(c) ? weeklyHours : hoursPerTrack, 1),
      ),
    );
    const startWeek = trackEnd[t];
    trackEnd[t] = startWeek + durationWeeks;
    return {
      compulsory: compulsory.includes(c),
      courseId: c.id,
      title: c.title,
      provider: c.provider,
      url: c.url,
      startWeek,
      durationWeeks,
      costMyr: c.costMyr,
      hrdcStatus: c.hrdcStatus,
      skills: c.skills
        .map((s) => s.name)
        .filter((n) => compulsory.includes(c) || advancement.includes(c) || gapNames.has(n)),
      sdgCodes: c.sdgCodes,
    };
  });

  for(const item of items) if(opts.sdgGoal) item.sdgGoal=opts.sdgGoal;
  const totalWeeks = items.reduce(
    (a, i) =>
      i.startWeek !== null && i.durationWeeks !== null
        ? Math.max(a, i.startWeek + i.durationWeeks - 1)
        : a,
    0,
  );
  const totalCostMyr = items.reduce((a, i) => a + i.costMyr, 0);
  return {
    items,
    totalWeeks,
    totalCostMyr,
    uncoveredSkills: [...remaining.values()].map((g) => g.name),
  };
}
