/** Editorial work themes, not UN role ratings or measured impact. */
export function roleGoals(role: { title: string; sector: string }) {
  const title = role.title.toLowerCase();
  // Explicit subject references can link to any of the 17 goals.
  const themes: [RegExp, string[]][] = [
    [/poverty|social protection/, ["1", "10"]],
    [/agricultur|food security|nutrition|farming/, ["2", "12"]],
    [/gender equality|women.?s empowerment/, ["5", "10"]],
    [/clean water|water treatment|sanitation|wastewater/, ["6"]],
    [/urban plan|sustainable cit|housing policy/, ["11"]],
    [/marine biolog|ocean conservation|fisheries|coral/, ["14"]],
    [/biodiversity|forestry|wildlife|terrestrial ecosystem/, ["15"]],
    [/human rights|anti.corruption|public governance|rule of law/, ["16"]],
    [
      /international cooperation|global partnership|development partnership/,
      ["17"],
    ],
    [/accessibility|disability inclusion|social inclusion/, ["10"]],
  ];
  const specific = themes.find(([pattern]) => pattern.test(title));
  if (specific) return specific[1];
  if (/solar|renewable/.test(title)) return ["7", "13"];
  if (/energy/.test(title)) return ["7", "12", "13"];
  if (/environment|sustainab|esg/.test(title)) return ["12", "13"];
  if (/safety/.test(title)) return ["8", "3"];
  if (role.sector === "Healthcare") return ["3"];
  if (
    role.sector === "Education & Training" ||
    /instructional|learning designer|trainer|training and development/.test(
      title,
    )
  )
    return ["4", "8"];
  if (
    ["Engineering & Manufacturing", "Logistics", "Digital & ICT"].includes(
      role.sector,
    ) ||
    /scientist|machine learning|research/.test(title)
  )
    return ["9", "8"];
  return ["8"];
}
/** Filter without changing someone's personal fit score. */
export function byGoal<T>(
  items: readonly T[],
  goal: string,
  getRole: (item: T) => { title: string; sector: string },
): T[] {
  return items.filter(
    (item) => goal === "all" || roleGoals(getRole(item)).includes(goal),
  );
}
