import {ROLE_TITLE_ZH} from "../data/roles-zh";
import type { SkillRow, StoredProfileSkill, StoredRiasec } from "@workspace/db";
import type { CourseView, RoleSkillView, RoleView } from "./catalog";
import { hasCurrentRiasec } from "./riasec-scoring";
import { courseFitsRole } from "./course-relevance";

// Deterministic, explainable match score (0-100). No GPU involved.
// Weights: skills 40, transferable 15, interest 20, preferences 10, feasibility 15.
export const WEIGHTS = { skills: 40, transferable: 15, interest: 20, preferences: 10, feasibility: 15 };

const STATUS_CREDIT: Record<StoredProfileSkill["status"], number> = { evidenced: 1, self_reported: 0.8, inferred: 0.6 };

export type ProfileForScoring = {
  riasecAnswers?: { questionId: number; value: number }[];
  skills: StoredProfileSkill[];
  riasecScores: StoredRiasec | null;
  goals: string | null;
  currentRole: string | null;
  weeklyHours: number;
  budgetMyr: number;
  hrdcEligible: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function riasecCongruence(scores: StoredRiasec, code: string): number {
  const weights = [3, 2, 1];
  let total = 0;
  let max = 0;
  code.split("").slice(0, 3).forEach((letter, i) => {
    const raw = scores[letter as keyof StoredRiasec] ?? 1;
    total += weights[i] * ((raw - 1) / 4);
    max += weights[i];
  });
  return max ? total / max : 0;
}

export function cheapestCourseHours(skillId: number, courses: CourseView[], budget: number): number {
  const options = courses.filter((c) => c.durationHours !== null && c.skills.some((s) => s.id === skillId) && c.costMyr <= Math.max(budget, 0));
  if (options.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...options.map((c) => c.durationHours!));
}

export function scoreRole(profile: ProfileForScoring, role: RoleView, skills: SkillRow[], courses: CourseView[]) {
  courses = courses.filter(c => courseFitsRole(c,role.title));
  const have = new Map(profile.skills.map((s) => [s.skillId, STATUS_CREDIT[s.status] ?? 0.6]));
  const category = new Map(skills.map((s) => [s.id, s.category]));
  const haveCategories = new Set(profile.skills.map((s) => category.get(s.skillId)));

  const weight = (s: RoleSkillView) => s.importance * (s.category === "Human" ? 1 : 2);
  const totalImp = role.skills.reduce((a, s) => a + weight(s), 0) || 1;
  const matched: RoleSkillView[] = [];
  const gaps: RoleSkillView[] = [];
  let covered = 0;
  for (const s of role.skills) {
    const credit = have.get(s.skillId);
    if (credit) {
      covered += weight(s) * credit;
      matched.push(s);
    } else gaps.push(s);
  }
  const skillsScore = (covered / totalImp) * WEIGHTS.skills;

  const gapImp = gaps.reduce((a, s) => a + s.importance, 0);
  const transferableImp = gaps.filter((g) => haveCategories.has(category.get(g.skillId))).reduce((a, s) => a + s.importance, 0);
  const transferable = gapImp === 0 ? WEIGHTS.transferable : (transferableImp / gapImp) * WEIGHTS.transferable;

  const interest = profile.riasecScores && (!profile.riasecAnswers || hasCurrentRiasec(profile.riasecAnswers))
    ? riasecCongruence(profile.riasecScores, role.riasecCode) * WEIGHTS.interest
    : WEIGHTS.interest / 2;

  const text = `${profile.goals ?? ""} ${profile.currentRole ?? ""}`.toLowerCase();
  const normalize=(v:string)=>v.normalize("NFKC").toLowerCase().replace(/[\s/\-]+/g," ").trim();
  const intent=normalize(text);
  const mentioned = [role.title,role.titleMs,ROLE_TITLE_ZH[role.title]].filter((v):v is string=>!!v).some(v=>intent.includes(normalize(v)));
  const preferences = mentioned ? WEIGHTS.preferences : WEIGHTS.preferences / 2;

  const gapHours = gaps.reduce((a, g) => a + cheapestCourseHours(g.skillId, courses, profile.budgetMyr), 0);
  const weeks = gapHours / Math.max(profile.weeklyHours, 1);
  const feasibility = weeks <= 12 ? WEIGHTS.feasibility : Math.max(0, WEIGHTS.feasibility * (1 - (weeks - 12) / 40));

  // Market signal (separate from personal fit): MyCOL critical listing plus
  // resilience to AI task exposure.
  // No verified Malaysian demand series or MyCOL crosswalk is configured.
  // AI exposure is not labour demand, and missing exposure must never become 0.3.
  const marketDemand = null;

  const breakdown = {
    skills: round1(skillsScore),
    transferable: round1(transferable),
    interest: round1(interest),
    preferences: round1(preferences),
    feasibility: round1(feasibility),
  };
  const score = round1(Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { score, breakdown, matchedSkills: matched, gapSkills: gaps, marketDemand };
}
