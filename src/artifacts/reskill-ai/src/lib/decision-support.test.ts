import { test } from "node:test";
import assert from "node:assert/strict";
import { byGoal, roleGoals } from "./sdg-choice";
import { heatStatus } from "./team-heatmap";

test("SDG choice changes candidates without altering personal fit scores", () => {
  const roles = [
    { title: "Data Analyst", sector: "Digital & ICT", score: 91 },
    { title: "Instructional Designer", sector: "Creative", score: 83 },
  ];
  assert.deepEqual(
    byGoal(roles, "4", (r) => r).map((r) => r.title),
    ["Instructional Designer"],
  );
  assert.deepEqual(
    byGoal(roles, "9", (r) => r).map((r) => r.title),
    ["Data Analyst"],
  );
  assert.deepEqual(
    byGoal(roles, "all", (r) => r),
    roles,
  );
  assert.equal(roles[0].score, 91);
  assert.deepEqual(
    roleGoals({
      title: "Solar Engineer",
      sector: "Engineering & Manufacturing",
    }),
    ["7", "13"],
  );
});
test("heatmap keeps unrequired, inferred and course evidence distinct from profile evidence", () => {
  const m = {
    requiredSkills: ["SQL", "Python", "Excel", "Git"],
    confirmedSkillNames: ["SQL", "Writing"],
    inferredSkillNames: ["Python"],
    completedSkillNames: ["Excel"],
  };
  assert.equal(heatStatus(m, "SQL"), "profile");
  assert.equal(heatStatus(m, "Python"), "inferred");
  assert.equal(heatStatus(m, "Excel"), "course");
  assert.equal(heatStatus(m, "Git"), "gap");
  assert.equal(heatStatus(m, "Writing"), "na");
  assert.equal(heatStatus({}, "SQL"), "na");
});

