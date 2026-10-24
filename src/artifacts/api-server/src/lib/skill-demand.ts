import { loadSkills, loadRoles, loadCourses } from "./catalog";
/** Editorial priority proxy. Occupation counts do not measure shortages in individual skills. */
export async function skillDemand() {
  const [skills, roles, courses] = await Promise.all([
    loadSkills(),
    loadRoles(),
    loadCourses(),
  ]);
  const reviewed = [
    { title: "Administrative Assistant", count: 5179 },
    { title: "Digital Marketing Specialist", count: 4642 },
    { title: "Sales Representative", count: 4557 },
    { title: "Data Analyst", count: 3455 },
    { title: "Graphic Designer", count: 2644 },
  ];
  const weights = new Map<number, number>();
  for (const ref of reviewed) {
    const role = roles.find((r) => r.title === ref.title);
    if (!role) continue;
    for (const s of role.skills.filter(
      (s) =>
        s.category !== "Human" &&
        courses.some((c) => c.skills.some((k) => k.id === s.skillId)),
    ))
      weights.set(
        s.skillId,
        (weights.get(s.skillId) ?? 0) + ref.count * s.importance,
      );
  }
  const max = Math.max(1, ...weights.values());
  return {
    sample: reviewed.length,
    checkedAt: "2026-05-25",
    source: "DOSM JMI Q4 2025 · O*NET · editorial occupation crosswalk",
    skills: [...weights]
      .map(([id, n]) => ({
        id,
        name: skills.find((s) => s.id === id)!.name,
        count: Math.round((n / max) * 100),
      }))
      .sort((a, b) => b.count - a.count),
  };
}
