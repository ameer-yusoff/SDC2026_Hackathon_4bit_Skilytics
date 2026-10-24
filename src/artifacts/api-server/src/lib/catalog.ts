import {skillSdgLinks} from "./skill-sdg";
import { ROLE_TITLE_ZH } from "../data/roles-zh";
import { liveCourses } from "./live-courses";
import { openLearnCourses } from "../data/openlearn";
import { courseFitsRole, courseSkillFit } from "./course-relevance";
import {
  db,
  skillsTable,
  rolesTable,
  roleSkillsTable,
  coursesTable,
  courseSkillsTable,
  occupationExposureTable,
  aiUsageTable,
  type SkillRow,
} from "@workspace/db";

export type RoleSkillView = { skillId: number; name: string; category: string; importance: number };
export type RoleView = {
  sourceUrl?: string | null;
  sourceVersion?: string | null;
  officialTitle?: string | null;
  sourceFetchedAt?: string | null;
  id: number;
  socCode: string;
  title: string;
  titleMs: string;
  sector: string;
  riasecCode: string;
  skills: RoleSkillView[];
  aiExposure: number | null;
  aiUsagePctMy: number | null;
  aiUsagePctGlobal: number | null;
  myColCritical: boolean;
  description: string | null;
};
export type CourseView = {
  roleScope?: readonly string[];
  id: number;
  title: string;
  provider: string;
  url: string;
  costMyr: number;
  costType: "free" | "low_cost" | "paid";
  hrdcStatus: "claimable_verified" | "check_with_employer" | "not_claimable";
  durationHours: number | null;
  level: string;
  language: string;
  certificate: boolean;
  skills: { id: number; name: string; category: string }[];
  lastVerified: string;
  catalogStale?: boolean;
  sdgCodes: string[];
};

export async function loadSkills(): Promise<SkillRow[]> {
  return db.select().from(skillsTable);
}

export async function loadRoles(): Promise<RoleView[]> {
  const [roles, rs, skills, exposure, usage] = await Promise.all([
    db.select().from(rolesTable),
    db.select().from(roleSkillsTable),
    db.select().from(skillsTable),
    db.select().from(occupationExposureTable),
    db.select().from(aiUsageTable),
  ]);
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const exp = new Map(exposure.map((e) => [e.socCode, e.exposure]));
  const usageKey = (geo: string, soc: string) => `${geo}|${soc}`;
  const use = new Map(usage.filter((u) => u.level === 0).map((u) => [usageKey(u.geo, u.socCode), u.pct]));
  return roles
    .filter((r) => !!r.sourceVersion)
    .map((r) => ({
      ...r,
      skills: rs
        .filter((x) => x.roleId === r.id)
        .map((x) => ({ skillId: x.skillId, name: skillById.get(x.skillId)?.name ?? "", category: skillById.get(x.skillId)?.category ?? "Other", importance: x.importance }))
        .sort((a, b) => b.importance - a.importance),
      aiExposure: exp.get(r.socCode) ?? null,
      aiUsagePctMy: use.get(usageKey("MYS", r.socCode)) ?? null,
      aiUsagePctGlobal: use.get(usageKey("GLOBAL", r.socCode)) ?? null,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function loadCourses(): Promise<CourseView[]> {
  const skills = await loadSkills();
  return [...await liveCourses(skills), ...openLearnCourses(skills)];
}

export async function loadDemoCourses(): Promise<CourseView[]> {
  const [courses, cs, skills] = await Promise.all([
    db.select().from(coursesTable),
    db.select().from(courseSkillsTable),
    db.select().from(skillsTable),
  ]);
  const byId = new Map(skills.map((s) => [s.id, s]));
  return courses
    .map((c) => ({
      ...c,
      costType: c.costType as CourseView["costType"],
      hrdcStatus: c.hrdcStatus as CourseView["hrdcStatus"],
      skills: cs
        .filter((x) => x.courseId === c.id)
        .map((x) => byId.get(x.skillId))
        .filter((s): s is SkillRow => !!s)
        .map((s) => ({ id: s.id, name: s.name, category: s.category })),
    }))
    .sort((a, b) => a.costMyr - b.costMyr || a.title.localeCompare(b.title));
}

export function roleToApi(r: RoleView, courses?: CourseView[]) {
  return {
    id: r.id,
    sourceUrl: r.sourceUrl ?? null,
    sourceVersion: r.sourceVersion ?? null,
    officialTitle: r.officialTitle ?? null,
    sourceFetchedAt: r.sourceFetchedAt ?? null,
    myColStatus: "unverified" as const,
    socCode: r.socCode,
    title: r.title,
    titleMs: r.titleMs,
    titleZh: ROLE_TITLE_ZH[r.title] ?? r.title,
    sector: r.sector,
    riasecCode: r.riasecCode,
    skills: r.skills.map(s => {
      const sdgLinks=skillSdgLinks(s.name);
      if (!courses) return {...s,sdgLinks};
      const matching = courses.filter(c => courseFitsRole(c,r.title) && c.skills.some(k => k.id === s.skillId))
        .sort((a,b) => courseSkillFit(b,s) - courseSkillFit(a,s) || a.costMyr - b.costMyr);
      return { ...s, sdgLinks, courseCount: matching.length, ...(matching[0] ? {courseUrl: matching[0].url} : {}) };
    }),
    aiExposure: r.aiExposure,
    aiUsagePctMy: r.aiUsagePctMy,
    aiUsagePctGlobal: r.aiUsagePctGlobal,
    myColCritical: false,
    description: r.description,
  };
}

export function courseToApi(c: CourseView) {
  return c;
}
