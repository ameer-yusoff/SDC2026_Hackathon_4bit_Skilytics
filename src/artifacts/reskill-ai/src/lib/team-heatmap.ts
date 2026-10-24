export type HeatMember = {
  requiredSkills?: string[];
  confirmedSkillNames?: string[];
  inferredSkillNames?: string[];
  completedSkillNames?: string[];
};
export function heatStatus(m: HeatMember, skill: string) {
  if (!m.requiredSkills?.includes(skill)) return "na";
  if (m.confirmedSkillNames?.includes(skill)) return "profile";
  if (m.completedSkillNames?.includes(skill)) return "course";
  if (m.inferredSkillNames?.includes(skill)) return "inferred";
  return "gap";
}
