import { test } from "node:test";
import assert from "node:assert/strict";
import { profileSkills } from "./profile-skills";
import { buildPlan } from "./planner";
import type { CourseView } from "./catalog";
import { CreateProfilePlanBody } from "@workspace/api-zod";

test("SDG preference changes an eligible course choice without waiving budget or skill coverage", () => {
  const course: CourseView = {
    id: 800,
    title: "SQL practice",
    provider: "Test",
    url: "https://example.invalid/sql",
    costMyr: 10,
    costType: "low_cost",
    hrdcStatus: "not_claimable",
    durationHours: 4,
    level: "beginner",
    language: "en",
    certificate: false,
    skills: [{ id: 1, name: "SQL", category: "Digital" }],
    lastVerified: "2026-10-24",
    sdgCodes: ["8.2"],
  };
  const education = {
    ...course,
    id: 801,
    url: "https://example.invalid/sql-education",
    sdgCodes: ["4.4"],
  };
  const options = {
    courses: [course, education],
    gaps: [{ skillId: 1, name: "SQL", category: "Digital", importance: 3 }],
    budgetMyr: 10,
    weeklyHours: 2,
    hrdcEligible: false,
  };
  assert.equal(buildPlan(options).items[0].courseId, 800);
  const selected = buildPlan({ ...options, sdgGoal: "4" });
  assert.equal(selected.items[0].courseId, 801);
  assert.equal(selected.items[0].sdgGoal, "4");
  assert.deepEqual(selected.uncoveredSkills, []);
  assert.equal(selected.totalCostMyr, 10);
  assert.equal(selected.totalWeeks, 2);
  assert.equal(
    buildPlan({
      ...options,
      sdgGoal: "4",
      courses: [course, { ...education, costMyr: 50 }],
    }).items[0].courseId,
    800,
  );
  assert.equal(
    buildPlan({
      ...options,
      sdgGoal: "4",
      courses: [
        course,
        {
          ...education,
          skills: [{ id: 9, name: "Other skill", category: "Digital" }],
        },
      ],
    }).items[0].courseId,
    800,
  );
  const required = buildPlan({
    ...options,
    budgetMyr: 20,
    sdgGoal: "4",
    compulsoryCourses: [course],
  });
  assert.equal(required.items[0].courseId, 800);
  assert.equal(required.items[0].compulsory, true);
  assert.equal(
    CreateProfilePlanBody.parse({ roleId: 1, sdgGoal: "17" }).sdgGoal,
    "17",
  );
  assert.throws(() =>
    CreateProfilePlanBody.parse({ roleId: 1, sdgGoal: "18" }),
  );
});

test("education and experience suggest skills without replacing confirmed evidence", () => {
  const catalogue = [
    { id: 1, name: "Programming", category: "Digital", aliases: ["python"] },
    { id: 2, name: "Mathematics", category: "Digital", aliases: [] },
  ];
  const result = profileSkills(
    {
      education: "Master of Data Science",
      experience: "Built pipelines using Python",
      skills: [{ skillId: 1, status: "self_reported", evidence: null }],
    },
    catalogue,
  );
  assert.equal(result.find((s) => s.skillId === 1)?.status, "self_reported");
  assert.equal(result.find((s) => s.skillId === 2)?.status, "inferred");
  assert.deepEqual(profileSkills({ skills: [] }, catalogue), []);
});

test("timeline respects long course hours and the training budget", () => {
  const course: CourseView = {
    id: 1,
    title: "Long course",
    provider: "Test",
    url: "https://example.invalid/course",
    costMyr: 100,
    costType: "paid",
    hrdcStatus: "not_claimable",
    durationHours: 300,
    level: "beginner",
    language: "en",
    certificate: true,
    skills: [{ id: 1, name: "Programming", category: "Digital" }],
    lastVerified: "2026-10-23",
    sdgCodes: ["4"],
  };
  const opts = {
    gaps: [
      { skillId: 1, name: "Programming", category: "Digital", importance: 3 },
    ],
    courses: [course],
    budgetMyr: 100,
    weeklyHours: 2,
    hrdcEligible: false,
  };
  const plan = buildPlan(opts);
  assert.equal(plan.items[0].durationWeeks, 150);
  assert.equal(plan.totalWeeks, 150);
  assert.equal(buildPlan({ ...opts, budgetMyr: 0 }).items.length, 0);
  assert.equal(
    buildPlan({ ...opts, weeklyHours: 10 }).items[0].durationWeeks,
    60,
  );
  assert.equal(
    buildPlan({
      ...opts,
      roleTitle: "Administrative Assistant",
      courses: [{ ...course, title: "Monitor AI workloads on Azure" }],
    }).items.length,
    0,
  );
});

test("a fully skilled learner still gets three free workplace AI courses in learning order", () => {
  const base: CourseView = {
    id: 1,
    title: "Build foundational generative AI skills",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/training/paths/explore-microsoft-365-copilot-business-chat/",
    costMyr: 0,
    costType: "free",
    hrdcStatus: "not_claimable",
    durationHours: 2.33,
    level: "Beginner",
    language: "en",
    certificate: false,
    skills: [{ id: 2, name: "Generative AI Tools", category: "Digital" }],
    lastVerified: "2026-10-23",
    sdgCodes: ["8.2"],
  };
  const courses = [
    base,
    {
      ...base,
      id: 2,
      title: "Draft, analyze, and present with Microsoft Copilot",
      url: "https://learn.microsoft.com/en-us/training/paths/draft-analyze-present-microsoft-365-copilot/",
      durationHours: 4.3,
    },
    {
      ...base,
      id: 3,
      title:
        "Enhance your productivity with prebuilt Microsoft 365 Copilot agents",
      url: "https://learn.microsoft.com/en-us/training/paths/enhance-productivity-prebuilt-agents/",
      durationHours: 0.95,
    },
  ];
  const opts = {
    gaps: [],
    courses,
    budgetMyr: 0,
    weeklyHours: 8,
    hrdcEligible: false,
    aiAdvancement: true,
    roleTitle: "Administrative Assistant",
  };
  const plan = buildPlan(opts);
  assert.deepEqual(
    plan.items.map((i) => i.courseId),
    [1, 2, 3],
  );
  assert.deepEqual(
    plan.items.map((i) => i.startWeek),
    [1, 2, 3],
  );
  assert.equal(plan.totalCostMyr, 0);
  assert.ok(plan.items.every((i) => i.skills.includes("Generative AI Tools")));
  const withGap = buildPlan({
    ...opts,
    gaps: [{ skillId: 4, name: "SQL", category: "Digital", importance: 3 }],
    roleTitle: "Data Analyst",
    courses: [
      ...courses,
      {
        ...base,
        id: 4,
        title: "SQL fundamentals",
        url: "https://example.invalid/sql",
        durationHours: 80,
        skills: [{ id: 4, name: "SQL", category: "Digital" }],
      },
    ],
  });
  assert.equal(withGap.items[0].courseId, 4);
  assert.ok(
    withGap.items[1].startWeek! >=
      withGap.items[0].startWeek! + withGap.items[0].durationWeeks!,
  );
  assert.equal(
    new Set(withGap.items.map((i) => i.courseId)).size,
    withGap.items.length,
  );
  assert.equal(
    buildPlan({
      ...opts,
      gaps: [
        {
          skillId: 2,
          name: "Generative AI Tools",
          category: "Digital",
          importance: 3,
        },
      ],
    }).items.length,
    3,
  );
  const unsafe = {
    ...base,
    id: 5,
    title: "Deploy Security Copilot for Azure administrators",
    url: "https://example.invalid/security",
  };
  assert.equal(
    buildPlan({ ...opts, courses: [unsafe] }).items.length,
    0,
    "do not replace business-user courses with specialist administration",
  );
});
