import { test } from "node:test";
import assert from "node:assert/strict";
import { futurePriority, scenarioValue } from "./future-scenarios";
import { compareSkillSnapshots, futureSkillWeights } from "./workforce-trends";
import { skillSdgLinks } from "./skill-sdg";
import { scoreRole } from "./scoring";
import { buildPlan } from "./planner";
import { ROLE_TITLE_ZH } from "../data/roles-zh";
import { ROLES } from "../data/roles";
import personas from "../../../../synthetic-data/evaluation/career-personas.json";

test("same-year scenarios change calculations, preserve source anchors and unknowns", () => {
  for (const mode of ["ai", "demand", "skills"] as const) {
    const baseline = mode === "ai" ? 0.4 : 20;
    assert.ok(
      scenarioValue(mode, baseline, 5, "fast")! >
        scenarioValue(mode, baseline, 5, "moderate")!,
    );
    assert.equal(
      scenarioValue(mode, baseline, 0, "fast"),
      mode === "demand" ? 0 : mode === "ai" ? 40 : 20,
    );
    assert.equal(scenarioValue(mode, null, 5, "fast"), null);
  }
  assert.ok(
    scenarioValue("demand", -17, 5, "fast")! <
      scenarioValue("demand", -17, 5, "moderate")!,
  );
});
test("new trend snapshots change priority without touching personal fit", () => {
  const ref = {
    roleId: 1,
    growthPct: 10,
    source: "https://www.bls.gov/",
    period: "2025–2035",
    reviewedAt: "2026-10-23",
  };
  const fit = 80;
  assert.notEqual(
    futurePriority(fit, ref, 5, "moderate"),
    futurePriority(fit, { ...ref, growthPct: -17 }, 5, "moderate"),
  );
  assert.notEqual(
    futurePriority(fit, ref, 5, "moderate"),
    futurePriority(fit, { ...ref, observedShift: 5 }, 5, "moderate"),
  );
  assert.notEqual(
    futurePriority(fit, ref, 5, "moderate"),
    futurePriority(fit, ref, 5, "fast"),
  );
  assert.equal(futurePriority(fit, undefined, 5, "fast"), 80);
  assert.equal(fit, 80);
});
test("listing trend compares normalized shares and refuses insufficient/mismatched sources", () => {
  const current = {
    day: "2026-10-24",
    total: 100,
    providers: ["A"],
    skills: [
      { id: 1, name: "SQL", count: 50 },
      { id: 2, name: "Writing", count: 10 },
    ],
  };
  const previous = {
    ...current,
    day: "2026-10-10",
    total: 200,
    skills: [
      { id: 1, name: "SQL", count: 60 },
      { id: 2, name: "Writing", count: 60 },
    ],
  };
  const comparison = compareSkillSnapshots(current, previous);
  assert.equal(comparison[0].delta, 20);
  assert.equal(comparison[0].direction, "rising");
  assert.equal(comparison[1].direction, "declining");
  for (const old of [
    undefined,
    { ...previous, total: 5 },
    { ...previous, providers: ["B"] },
    { ...previous, day: "2026-10-23" },
  ])
    assert.equal(
      compareSkillSnapshots(current, old)[0].direction,
      "unavailable",
    );
});
test("every skill exposes a traceable SDG target with three-language reasons and provenance", () => {
  for (const name of [
    "SQL",
    "Python",
    "Teaching",
    "Solar Energy",
    "Resource Management",
    "Active Listening",
    "Workplace Safety",
  ]) {
    const links = skillSdgLinks(name);
    assert.ok(links.length);
    for (const l of links) {
      assert.ok(Number(l.code) >= 1 && Number(l.code) <= 17);
      assert.ok(l.target.startsWith(l.code + "."));
      assert.ok(l.sourceUrl.startsWith("https://sdgs.un.org/"));
      assert.ok(l.reason.en && l.reason.ms && l.reason.zh);
    }
  }
  assert.equal(skillSdgLinks("Active Listening")[0].basis, "work-context");
});

// Fictional course metadata is only for constraint/parity testing, never exposed as real offers.
export function evaluatePersonas() {
  const names = [...new Set(ROLES.flatMap((r) => r.skills.map((s) => s[0])))];
  const skills = names.map((name, i) => ({
    id: i + 1,
    name,
    category: /writing|communication|listening|speaking/i.test(name)
      ? "Human"
      : "Digital",
    aliases: [],
  }));
  const roles = ROLES.map((r, i) => ({
    ...r,
    id: i + 1,
    aiExposure: 0.4,
    aiUsagePctMy: null,
    aiUsagePctGlobal: null,
    description: null,
    skills: r.skills.map(([name, importance]) => ({
      ...skills.find((s) => s.name === name)!,
      skillId: skills.find((s) => s.name === name)!.id,
      importance,
    })),
  }));
  const courses = skills.map((s) => ({
    id: s.id,
    title: s.name + " fundamentals",
    provider: "Synthetic constraint fixture",
    url: "https://example.org/test-only/" + s.id,
    costMyr: 0,
    costType: "free" as const,
    hrdcStatus: "not_claimable" as const,
    durationHours: 4,
    level: "beginner",
    language: "English",
    certificate: false,
    skills: [s],
    lastVerified: "2026-10-24",
    sdgCodes: skillSdgLinks(s.name).map((l) => l.target),
  }));
  return personas.cases.map((p) => {
    const target = roles.find((r) => r.title === p.target)!;
    assert.ok(target, p.target);
    const confirmed = p.skills.map((name) => {
      const s = skills.find((s) => s.name === name);
      assert.ok(s, name);
      return {
        skillId: s.id,
        status: "evidenced" as const,
        evidence: "Synthetic experience",
      };
    });
    const base = {
      skills: confirmed,
      riasecScores: null,
      currentRole: null,
      weeklyHours: p.weeklyHours,
      budgetMyr: p.budgetMyr,
      hrdcEligible: false,
    };
    const ranked = (["en", "ms", "zh"] as const).map((lang) => {
      const goals = p.goals[lang];
      return roles
        .map((r) => ({
          role: r,
          ...scoreRole({ ...base, goals }, r, skills, courses),
        }))
        .sort((a, b) => b.score - a.score || a.role.id - b.role.id);
    });
    const parity =
      JSON.stringify(ranked[0].map((r) => [r.role.id, r.score])) ===
        JSON.stringify(ranked[1].map((r) => [r.role.id, r.score])) &&
      JSON.stringify(ranked[0].map((r) => [r.role.id, r.score])) ===
        JSON.stringify(ranked[2].map((r) => [r.role.id, r.score]));
    const match = ranked[0].find((r) => r.role.id === target.id)!;
    const plan = buildPlan({
      gaps: match.gapSkills,
      courses,
      budgetMyr: p.budgetMyr,
      weeklyHours: p.weeklyHours,
      hrdcEligible: false,
      roleTitle: p.target,
    });
    return {
      id: p.id,
      target: p.target,
      parity,
      top3: ranked[0].slice(0, 3).map((r) => r.role.title),
      targetInTop3: ranked[0]
        .slice(0, 3)
        .some((r) => r.role.title === p.target),
      gapCount: match.gapSkills.length,
      withinBudget: plan.totalCostMyr <= p.budgetMyr,
      allCoursesFromFixture: plan.items.every((i) =>
        courses.some((c) => c.id === i.courseId && c.url === i.url),
      ),
    };
  });
}
test("20 synthetic personas: equal meaning across EN/BM/ZH, course IDs and budget constraints", () => {
  const results = evaluatePersonas();
  assert.equal(results.length, 20);
  for (const r of results) {
    assert.equal(r.parity, true, r.id);
    assert.equal(r.withinBudget, true, r.id);
    assert.equal(r.allCoursesFromFixture, true, r.id);
  }
  // Relevance outcomes are recorded, not forced to pass or called real-world accuracy.
  console.log("SYNTHETIC_EVALUATION " + JSON.stringify(results));
});
test("future skill changes can reorder a relevant affordable plan, with explicit confirmation metadata", () => {
  const skills = [
    { skillId: 1, name: "SQL", category: "Digital", importance: 3 },
    { skillId: 2, name: "Business Writing", category: "Human", importance: 3 },
  ];
  const courses = skills.map((s) => ({
    id: s.skillId,
    title: s.name,
    provider: "test",
    url: "https://example.org/" + s.skillId,
    costMyr: 0,
    costType: "free" as const,
    hrdcStatus: "not_claimable" as const,
    durationHours: 4,
    level: "beginner",
    language: "English",
    certificate: false,
    skills: [{ id: s.skillId, name: s.name, category: s.category }],
    lastVerified: "2026-10-24",
    sdgCodes: ["8.2"],
  }));
  const base = {
    gaps: skills,
    courses,
    budgetMyr: 0,
    weeklyHours: 4,
    hrdcEligible: false,
  };
  const a = buildPlan({
    ...base,
    futureScenario: "moderate",
    futureSkillWeights: { 1: 1, 2: 3 },
  });
  const b = buildPlan({
    ...base,
    futureScenario: "fast",
    futureSkillWeights: { 1: 3, 2: 1 },
  });
  assert.notEqual(a.items[0].courseId, b.items[0].courseId);
  assert.ok(b.items.every((i) => i.futureScenario === "fast"));
  assert.equal(b.totalCostMyr, 0);
});

test("observed source changes flow through real skill weights into confirmed course selection",()=>{
 const gaps=[{skillId:1,name:"SQL",category:"Digital",importance:3},{skillId:2,name:"Python",category:"Digital",importance:3}];
 const courses=gaps.map(s=>({id:s.skillId,title:s.name+' fundamentals',provider:"Synthetic fixture",url:'https://example.org/test-only/'+s.skillId,costMyr:0,costType:"free" as const,hrdcStatus:"not_claimable" as const,durationHours:6,level:"beginner",language:"English",certificate:false,skills:[{id:s.skillId,name:s.name,category:s.category}],lastVerified:"2026-10-24",sdgCodes:["9.5"]}));
 const role={skills:gaps,aiExposure:.4} as any;
 const first=futureSkillWeights(role,courses,"moderate",{1:20,2:-10},3);
 const changed=futureSkillWeights(role,courses,"moderate",{1:-10,2:20},3);
 const base={gaps,courses,budgetMyr:0,weeklyHours:3,hrdcEligible:false,maxCourses:1,futureScenario:"moderate" as const,futureYears:3,trendEvidence:'{"syntheticComparison":true}'};
 const before=buildPlan({...base,futureSkillWeights:first}),after=buildPlan({...base,futureSkillWeights:changed});
 assert.equal(before.items[0].courseId,1);assert.equal(after.items[0].courseId,2);
 assert.equal(after.items[0].futureYears,3);assert.equal(after.items[0].trendEvidence,base.trendEvidence);
 assert.ok(futureSkillWeights(role,courses,"fast",{},10)[1]>futureSkillWeights(role,courses,"moderate",{},1)[1]);
});

test("missing or ambiguous skill evidence never becomes mastery from interests alone",()=>{
 const role={id:1,title:"Data Analyst",titleMs:"Penganalisis Data",sector:"Digital & ICT",riasecCode:"ICR",skills:[{skillId:1,name:"SQL",category:"Digital",importance:3}]} as any;
 const result=scoreRole({skills:[],goals:null,currentRole:null,weeklyHours:4,budgetMyr:0,hrdcEligible:false,riasecScores:{R:5,I:5,A:5,S:5,E:5,C:5}},role,[{id:1,name:"SQL",category:"Digital",aliases:[]}] as any,[]);
 assert.equal(result.matchedSkills.length,0);assert.equal(result.gapSkills.length,1);assert.equal(result.breakdown.skills,0);assert.equal(result.breakdown.feasibility,0);
});
