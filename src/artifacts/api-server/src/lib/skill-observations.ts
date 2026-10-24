import { db, predictionsTable } from "@workspace/db";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import { additionalVacancies } from "./vacancy-catalogues";
import { extractSkills } from "./cv";
import { loadSkills } from "./catalog";
import { compareSkillSnapshots, type SkillSnapshot } from "./workforce-trends";
let cache: { at: number; value: unknown } | undefined;
let running: Promise<any> | undefined;
export async function skillObservations(): Promise<any> {
  if (cache && Date.now() - cache.at < 3600000) return cache.value;
  if (running) return running;
  running = (async () => {
    const rows = await db
      .select({ content: predictionsTable.content })
      .from(predictionsTable)
      .where(and(eq(predictionsTable.question, "PUBLIC_SKILL_OBSERVATION_V1"),eq(predictionsTable.model,"deterministic-public-listing-counts"),isNull(predictionsTable.ownerUserId),isNull(predictionsTable.guestToken)))
      .orderBy(desc(predictionsTable.createdAt))
      .limit(45);
    const snapshots: SkillSnapshot[] = rows.flatMap((r) => {
      try {
        const v = JSON.parse(r.content);
        return v.day && Array.isArray(v.skills) ? [v] : [];
      } catch {
        return [];
      }
    });
    const today = new Date().toISOString().slice(0, 10);
    let current = snapshots.find((s) => s.day === today);
    if (!current) {
      const [jobs, skills] = await Promise.all([
        additionalVacancies(),
        loadSkills(),
      ]);
      // Catalogue country eligibility is not physical workplace location.
      // Himalayas MY search can include globally eligible remote jobs.
      const sample = jobs.filter((j) => /\bmalaysia\b/i.test(j.jobGeo));
      const counts = new Map<number, number>();
      for (const j of sample) {
        const ids = new Set(
          extractSkills(
            j.jobTitle + " " + j.jobDescription.replace(/<[^>]*>/g, " "),
            skills,
          ).map((s) => s.skillId),
        );
        for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      current = {
        day: today,
        total: sample.length,
        providers: [
          ...new Set(sample.map((j) => j.source ?? "unknown")),
        ].sort(),
        skills: skills.map((s) => ({
          id: s.id,
          name: s.name,
          count: counts.get(s.id) ?? 0,
        })),
      };
      const snapshot = current;
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${"skill-observation-" + today},0))`,
        );
        const existing = await tx
          .select({ id: predictionsTable.id })
          .from(predictionsTable)
          .where(eq(predictionsTable.inputHash, "skill-observation-" + today))
          .limit(1);
        if (!existing.length)
          await tx
            .insert(predictionsTable)
            .values({
              question: "PUBLIC_SKILL_OBSERVATION_V1",
              horizonYears: 0,
              lang: "all",
              inputHash: "skill-observation-" + today,
              content: JSON.stringify(snapshot),
              sources: [],
              model: "deterministic-public-listing-counts",
            });
      });
    }
    const previous = snapshots.find(
      (s) => Date.parse(current!.day) - Date.parse(s.day) >= 7 * 86400000,
    );
    const value = {
      current,
      previous: previous ?? null,
      minimumSample: 20,
      minimumDays: 7,
      skills: compareSkillSnapshots(current, previous),
      scope:
        "Malaysia-eligible retained remote-feed sample (may include worldwide jobs), not physically local vacancies; source coverage must match. No worker-supply data. Threshold ±1 percentage point is editorial.",
    };
    cache = { at: Date.now(), value };
    return value;
  })();
  try {
    return await running;
  } finally {
    running = undefined;
  }
}
