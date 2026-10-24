import bls from "../data/bls-projections.json";
import { ROLE_TITLE_ZH } from "../data/roles-zh";
import { type RoleView, type CourseView } from "./catalog";
import {
  scenarioAssumptions,
  scenarioValue,
  type FutureScenario,
  futurePriority,
} from "./future-scenarios";
export { futurePriority };
export function roleTrendReferences(roles: RoleView[]) {
  return roles.map((r) => ({
    roleId: r.id,
    title: r.title,
    titleMs: r.titleMs,
    titleZh: ROLE_TITLE_ZH[r.title] ?? r.title,
    growthPct: bls.rows.find((b) => b.socCode === r.socCode)?.growthPct ?? null,
    source: bls.url,
    period: bls.period,
    reviewedAt: bls.reviewedAt,
  }));
}
export type SkillObservation = { id: number; name: string; count: number };
export type SkillSnapshot = {
  day: string;
  total: number;
  providers: string[];
  skills: SkillObservation[];
};
/** Compare like-for-like source coverage and normalized listing shares. Never infer worker supply. */
export function compareSkillSnapshots(
  current: SkillSnapshot,
  previous?: SkillSnapshot,
) {
  const comparable =
    !!previous &&
    current.total >= 20 &&
    previous.total >= 20 &&
    current.providers.join("|") === previous.providers.join("|") &&
    Date.parse(current.day) - Date.parse(previous.day) >= 7 * 86400000;
  return current.skills.map((s) => {
    const before = previous?.skills.find((p) => p.id === s.id)?.count ?? 0;
    const share = current.total ? (s.count / current.total) * 100 : null;
    const previousShare = comparable ? (before / previous!.total) * 100 : null;
    const delta =
      previousShare != null && share != null ? share - previousShare : null;
    return {
      ...s,
      share,
      previousShare,
      delta,
      direction:
        delta == null
          ? "unavailable"
          : delta > 1
            ? "rising"
            : delta < -1
              ? "declining"
              : "stable",
    };
  });
}
/** Focus only relevant, learnable gap skills. Rates are explicit editorial assumptions. */
export function futureSkillWeights(
  role: RoleView,
  courses: CourseView[],
  scenario: FutureScenario,
  shifts: Record<number, number> = {},
  years=3,
) {
  const ai = role.aiExposure ?? 0;
  return Object.fromEntries(
    role.skills
      .filter(
        (s) =>
          s.category !== "Human" &&
          courses.some((c) => c.skills.some((k) => k.id === s.skillId)),
      )
      .map((s) => [
        s.skillId,
        Math.max(
          0.5,
          1 +
            ai *
              (1-(1-scenarioAssumptions[scenario].pace)**Math.max(1,Math.min(10,years))) *
              (/ai|python|sql|automation|data|cloud/i.test(s.name) ? 1.8 : 1) +
            (shifts[s.skillId] ?? 0) * 0.05,
        ),
      ]),
  );
}
