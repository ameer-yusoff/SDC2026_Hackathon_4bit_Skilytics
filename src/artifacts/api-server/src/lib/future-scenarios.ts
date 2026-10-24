/** Explicit planning assumptions, never calibrated forecasts. No headline sets a rate. */
export type FutureScenario = "moderate" | "fast";
export const scenarioAssumptions = {
  moderate: { pace: 0.05, growthMultiplier: 1 },
  fast: { pace: 0.1, growthMultiplier: 1.35 },
} as const;
export function scenarioValue(
  mode: "ai" | "demand" | "skills",
  baseline: number | null,
  years: number,
  scenario: FutureScenario = "moderate",
) {
  if (baseline == null || !Number.isFinite(baseline)) return null;
  const n = Math.max(0, Math.min(10, years)),
    a = scenarioAssumptions[scenario];
  if (mode === "ai")
    return (
      100 * (1 - (1 - Math.max(0, Math.min(1, baseline))) * (1 - a.pace) ** n)
    );
  if (mode === "skills") return baseline * (1 + a.pace) ** n;
  if (baseline <= -100) return null;
  // Fast transition amplifies both positive and negative reference changes.
  return 100 * ((1 + baseline / 100) ** ((n / 10) * a.growthMultiplier) - 1);
}
export type TrendReference = {
  roleId: number;
  growthPct: number | null;
  source: string;
  period: string;
  reviewedAt: string;
  observedShift?: number | null;
};
export function futurePriority(
  fit: number,
  ref: TrendReference | undefined,
  years: number,
  scenario: FutureScenario,
) {
  const change = scenarioValue(
    "demand",
    ref?.growthPct ?? null,
    years,
    scenario,
  );
  // An editorial priority score, not hiring odds. Unknown signals never become zero growth.
  if (change == null && ref?.observedShift == null) return fit;
  const referenceIndex = Math.max(
    0,
    Math.min(100, 50 + (change ?? 0) * 2 + (ref?.observedShift ?? 0) * 2),
  );
  return Math.round((fit * 0.8 + referenceIndex * 0.2) * 10) / 10;
}
