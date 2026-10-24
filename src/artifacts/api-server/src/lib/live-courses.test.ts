import { test } from "node:test";
import assert from "node:assert/strict";
import { mapLearnPaths, mapFccCourses, mapGitHubSkills, mapHuggingFaceLearn, courseSdg, liveCourses } from "./live-courses";
import { buildPlan } from "./planner";
import {SDG_TARGETS} from "../data/courses";

test("all 17 SDG themes are available while new subject mappings require relevant content",()=>{
 for(let goal=1;goal<=17;goal++)assert.ok(SDG_TARGETS.some(t=>t.code===String(goal)));
 for(const [topic,goal] of [["Poverty reduction and social protection","1"],["Sustainable agriculture and food security","2"],["Gender equality and women's empowerment","5"],["Clean water and sanitation","6"],["Urban planning for sustainable cities","11"],["Ocean conservation and marine ecosystems","14"],["Biodiversity and wildlife conservation","15"],["Human rights and public governance","16"],["International cooperation and global partnerships","17"]])assert.ok(courseSdg(topic).includes(goal),topic);
 assert.ok(!courseSdg("Cloud data productivity").includes("14"));
});
import { hasCurrentRiasec, scoreRiasec } from "./riasec-scoring";
import { RIASEC_QUESTIONS } from "../data/riasec";

const skills = [{ id: 1, name: "Python", category: "Digital" }, { id: 2, name: "SQL", category: "Digital" }, { id: 3, name: "Generative AI Tools", category: "Digital" }];
const path = { uid: "learn.python", title: "Get started with Python", url: "https://learn.microsoft.com/en-us/training/paths/python/?tracking=1", duration_in_minutes: 90 };
test("provider courses retain stable IDs, exact destination and sourced duration; reject unsafe or irrelevant entries", () => {
  const courses = mapLearnPaths([path, { ...path, url: "https://evil.example/training/paths/python/" }, { ...path, title: "Introduction to art" }, { ...path, duration_in_minutes: 0 }], skills, "2026-10-23T00:00:00Z");
  assert.equal(courses.length, 1);
  assert.equal(courses[0].durationHours, 1.5);
  assert.equal(courses[0].url, "https://learn.microsoft.com/en-us/training/paths/python/");
  assert.equal(courses[0].hrdcStatus, "not_claimable");
  assert.equal(courses[0].certificate, false);
  assert.equal(mapLearnPaths([path], skills, "later")[0].id, courses[0].id);
  assert.deepEqual(courses[0].skills.map((s) => s.id), [1]);
});
test("SDGs reflect subject matter without treating every course as climate action or innovation", () => {
  assert.deepEqual(courseSdg("Learning Python"), ["4.4"]);
  assert.deepEqual(courseSdg("Cloud data productivity"), ["8.2"]);
  assert.deepEqual(courseSdg("Climate and carbon"), ["13.3"]);
  assert.deepEqual(courseSdg("Training accessibility"), ["10.2"]);
  assert.deepEqual(courseSdg("Configure a cloud development environment"), ["8.2"]);
});
test("current assessment requires all 30 translated activities and cannot reuse previous answers", () => {
  const answers = RIASEC_QUESTIONS.map((q) => ({ questionId: q.id, value: 3 }));
  assert.equal(hasCurrentRiasec(answers), true);
  for (let i=0; i<30; i++) assert.throws(() => scoreRiasec(answers.filter((_, index) => index !== i)), /riasec_incomplete/);
  assert.equal(hasCurrentRiasec(answers.map((a) => ({ ...a, questionId: a.questionId - 100 }))), false);
  assert.equal(RIASEC_QUESTIONS.filter((q) => q.textMs && q.textZh && q.text).length, 30);
});

test("unconfirmed HRD status cannot subsidise a plan", () => {
  const course = { ...mapLearnPaths([path], skills, "now")[0], costMyr: 100, costType: "paid" as const, hrdcStatus: "check_with_employer" as const };
  const options = { gaps: [{ skillId: 1, name: "Python", category: "Digital", importance: 3 }], courses: [course], budgetMyr: 0, weeklyHours: 5, hrdcEligible: true };
  assert.equal(buildPlan(options).items.length, 0);
  const verified = { ...course, hrdcStatus: "claimable_verified" as const };
  assert.equal(buildPlan({ ...options, courses: [verified] }).items.length, 1);
  assert.equal(buildPlan({ ...options, courses: [verified], hrdcEligible: false }).items.length, 0);
});

test("freeCodeCamp metadata keeps official titles, links and unknown duration", () => {
  const result = mapFccCourses({ superblocks: ["learn-python-for-beginners"], certifications: [] },
    { "learn-python-for-beginners": { title: "Learn Python for Beginners", intro: ["Learn Python programming"] } }, skills, "2026-10-23T00:00:00Z");
  assert.equal(result.length, 1);
  assert.equal(result[0].url, "https://www.freecodecamp.org/learn/learn-python-for-beginners/");
  assert.equal(result[0].durationHours, null);
  assert.equal(result[0].certificate, false);
  const plan = buildPlan({ gaps: [{ skillId: 1, name: "Python", category: "Digital", importance: 3 }], courses: result, budgetMyr: 0, weeklyHours: 5, hrdcEligible: false });
  assert.equal(plan.items[0].durationWeeks, null);
});

test("public course indices only admit official direct links with mapped skills", () => {
  const repos = mapGitHubSkills([
    { name: "learn-python", html_url: "https://github.com/skills/learn-python", topics: ["skills-course"], is_template: true, description: "Python exercises" },
    { name: "learn-python", html_url: "https://evil.example/skills/learn-python", topics: ["skills-course"], is_template: true },
  ], skills, "now");
  assert.equal(repos.length, 1);
  assert.equal(repos[0].durationHours, null);
  assert.deepEqual(repos[0].sdgCodes, ["8.2"]);
  const hf = mapHuggingFaceLearn('<a href="/learn/llm-course">LLM Course</a><a href="/learn/llm-course">Duplicate</a><a href="https://evil.example/learn/python">Bad</a>',
    [{ id: 3, name: "Generative AI Tools", category: "Digital" }], "now");
  assert.equal(hf.length, 1);
  assert.equal(hf[0].url, "https://huggingface.co/learn/llm-course");
});
test("provider refreshes independently and retains stale snapshots on failure", async () => {
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  let calls = 0, clock = originalNow();
  Date.now = () => clock;
  globalThis.fetch = async (input) => {
    calls++;
    const url = String(input);
    if (url.includes("PublicSearchService/search")) return Response.json({type:"data",data:{total:1,hasMore:false,results:[{id:1,contentType:"TRACK",name:"Generative AI Tools",pagePath:"ai-tools",duration:3600,language:"EN",visibleOnLoggedOutPage:true}]}});
    if (url.includes("/api/catalog/")) return new Response(JSON.stringify({ learningPaths: [path] }), { status: 200 });
    if (url.includes("api.github.com/orgs/skills")) return new Response(JSON.stringify([{ name: "learn-python", html_url: "https://github.com/skills/learn-python", topics: ["skills-course"], is_template: true, description: "Python exercises" }]), { status: 200 });
    if (url.includes("huggingface.co/learn")) return new Response('<a href="/learn/llm-course">LLM Course</a>', { status: 200 });
    if (url.includes("curriculum.json")) return new Response(JSON.stringify({ superblocks: ["learn-python-for-beginners"], certifications: [] }), { status: 200 });
    return new Response(JSON.stringify({ "learn-python-for-beginners": { title: "Learn Python for Beginners", intro: ["Learn Python programming"] } }), { status: 200 });
  };
  try {
    const [a,b] = await Promise.all([liveCourses(skills), liveCourses(skills)]);
    assert.equal(calls, 6); assert.equal(a.length, 5); assert.deepEqual(a,b);
    clock += 6 * 3600000 + 1;
    globalThis.fetch = async () => { calls++; throw new Error("offline"); };
    const stale = await liveCourses(skills);
    assert.equal(stale.length, 5);
    assert.ok(stale.every((course) => course.catalogStale));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(calls, 12);
  } finally { globalThis.fetch = originalFetch; Date.now = originalNow; }
});

test("SDG mapping accurately attributes specialized domains with mapped skills", () => {
  assert.ok(courseSdg("Machine learning algorithms", [{ name: "Machine Learning" }]).includes("9.5"));
  assert.ok(courseSdg("Machine learning algorithms", [{ name: "Machine Learning" }]).includes("8.2"));
  assert.ok(courseSdg("Cybersecurity and network defenses", [{ name: "Cybersecurity" }]).includes("8.2"));
  assert.ok(courseSdg("Industrial robotics with LeRobot", [{ name: "PLC and Industrial Automation" }]).includes("9.2"));
  assert.ok(courseSdg("Financial accounting and bookkeeping", [{ name: "Financial Accounting" }]).includes("8.2"));
  assert.ok(courseSdg("Version control and open source workflows", [{ name: "Version Control (Git)" }]).includes("8.2"));
  assert.ok(courseSdg("Occupational health and safety guidelines", [{ name: "Occupational Safety and Health" }]).includes("8.8"));
  assert.ok(courseSdg("Supply chain and warehouse operations", [{ name: "Supply Chain Management" }]).includes("9.1"));
});

test("Hugging Face card parsing extracts both title and descriptive text", () => {
  const html = '<a href="/learn/agents-course"><h3>Agents Course</h3><p>Learn to build and deploy your own AI agents</p></a>' +
    '<a href="/learn/deep-rl-course"><h3>Deep RL Course</h3><p>Learn about deep reinforcement learning with PyTorch</p></a>';
  const allSkills = [
    { id: 1, name: "Generative AI Tools", category: "Digital" },
    { id: 2, name: "Machine Learning", category: "Digital" }
  ];
  const courses = mapHuggingFaceLearn(html, allSkills, "now");
  assert.equal(courses.length, 2);
  assert.equal(courses[0].title, "Agents Course");
  assert.deepEqual(courses[0].skills.map(s => s.name), ["Generative AI Tools"]);
  assert.equal(courses[1].title, "Deep RL Course");
  assert.deepEqual(courses[1].skills.map(s => s.name), ["Machine Learning"]);
});
