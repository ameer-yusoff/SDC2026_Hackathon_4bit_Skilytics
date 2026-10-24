import { test } from "node:test";
import assert from "node:assert/strict";
import { byGoal, roleGoals } from "./sdg-choice";
import { heatStatus } from "./team-heatmap";
import { sdgExplanation } from "./sdg-explanations";
import { skillPersonalNote } from "./sdg-applications";

test("SDG explanations use the actual subject before secondary skills", () => {
  assert.match(
    sdgExplanation("8", "Learn Relative Units in CSS", ["Python"], "en")!
      .personal,
    /fit a phone/,
  );
  assert.match(
    sdgExplanation("9", "Learn Algorithms in Python", [], "en")!.personal,
    /sort or search/,
  );
  assert.match(
    sdgExplanation("8", "Administrative Assistant", [], "en")!.personal,
    /records/,
  );
  assert.match(
    sdgExplanation("9", "AI Application Developer", [], "en")!.personal,
    /check accuracy/,
  );
  for (const lang of ["en", "ms", "zh"] as const)
    for (let goal = 1; goal <= 17; goal++) {
      const explanation = sdgExplanation(String(goal), "", [], lang)!;
      assert.ok(explanation.personal.length > 5);
      assert.ok(explanation.global.length > 5);
    }
  assert.equal(sdgExplanation("18", "CSS", [], "en"), null);
});

test("SDG examples distinguish specific skills and use only supplied learner evidence", () => {
  for (const lang of ["en", "ms", "zh"] as const) {
    assert.notEqual(
      sdgExplanation("9", "SQL", [], lang)!.global,
      sdgExplanation("9", "HTML and CSS", [], lang)!.global,
    );
    const sql = skillPersonalNote(
      "SQL",
      { subject: "Data Analyst", status: "known" },
      lang,
    );
    const python = skillPersonalNote(
      "Python",
      { subject: "Data Analyst", status: "learn" },
      lang,
    );
    assert.notEqual(sql.example, python.example);
    assert.notEqual(sql.status, python.status);
    assert.ok(sql.example.includes("Data Analyst"));
    assert.ok(sql.example.includes("SQL"));
    assert.equal(skillPersonalNote("SQL", {}, lang).status, null);
    const vacancy = sdgExplanation("9", "Junior Analyst", ["SQL"], lang, {
      kind: "vacancy",
      matchedSkills: ["SQL"],
      missingSkills: ["Python"],
    })!;
    assert.ok(vacancy.personal.includes("Junior Analyst"));
    assert.ok(vacancy.learner.includes("SQL"));
    assert.ok(vacancy.learner.includes("Python"));
    assert.equal(
      sdgExplanation("9", "Junior Analyst", ["SQL"], lang)!.learner,
      "",
    );
    assert.ok(
      skillPersonalNote("Unreviewed specialist skill", {}, lang).example
        .length > 20,
    );
  }
});

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
