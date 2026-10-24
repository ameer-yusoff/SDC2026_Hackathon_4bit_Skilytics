import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scenarioValue,
  scenarioPrompt,
  parseScenarioExplanation,
  explanationInput,
  assertScenarioNumbers,
} from "./scenario-explanation";
import { careerRelevant, newsTopic, newsUrl, balancedNews } from "./career-news";
const { scenarioPercent } = await import(
  new URL("../../../reskill-ai/src/lib/market-scenario.ts", import.meta.url)
    .href
);
test("explanation values exactly match the chart for all ten horizons and preserve missing observations", () => {
  for (let n = 1; n <= 10; n++) {
    assert.equal(
      scenarioValue("ai", 0.46, n),
      scenarioPercent("ai", { aiExposure: 0.46, projection: null }, n),
    );
    assert.equal(
      scenarioValue("demand", 34.6, n),
      scenarioPercent(
        "demand",
        { aiExposure: null, projection: { growthPct: 34.6 } },
        n,
      ),
    );
    assert.equal(scenarioValue("skills", 100, n), 100 * 1.05 ** n);
  }
  assert.equal(scenarioValue("ai", null, 4), null);
  assert.throws(() => explanationInput.parse({ mode: "ai", years: 11 }));
  assert.throws(() => explanationInput.parse({ mode: "company", years: 3 }));
});
test("AI reasons require genuine reference IDs, all languages and calculated percentages", () => {
  const translations = {
    en: "The assumed task overlap reaches 48.7%.",
    ms: "Andaian pertindihan tugas mencapai 48.7%.",
    zh: "假设任务重叠达到48.7%。",
  };
  const content = JSON.stringify({ translations, referenceIds: [0, 0] });
  assert.deepEqual(parseScenarioExplanation(content, 2).referenceIds, [0]);
  assert.throws(() =>
    parseScenarioExplanation(
      JSON.stringify({ translations, referenceIds: [2] }),
      2,
    ),
  );
  assert.throws(() =>
    parseScenarioExplanation(
      JSON.stringify({ translations, referenceIds: [] }),
      2,
    ),
  );
  assert.throws(() =>
    parseScenarioExplanation(
      JSON.stringify({
        translations: { en: "Only English" },
        referenceIds: [0],
      }),
      2,
    ),
  );
  const rows = [{ baseline: 0.46, previous: 46, selected: 48.7 }];
  assert.doesNotThrow(() => assertScenarioNumbers(translations, rows, "ai"));
  assert.throws(() =>
    assertScenarioNumbers(
      { ...translations, en: "News proves 99% adoption." },
      rows,
      "ai",
    ),
  );
  const prompt = scenarioPrompt({ selectedYear: 2029 });
  assert.match(prompt.system, /not verified article content/);
  assert.match(prompt.system, /Farther horizons have greater uncertainty/);
});
test("news adds relevant AI and enterprise technology signals without gadget or entertainment gossip", () => {
  for (const title of [
    "Enterprise AI adoption improves coding productivity",
    "Cloud technology transforms business workflows",
    "Automation research explores future productivity",
    "Malaysia upskilling workforce",
  ])
    assert.ok(careerRelevant(title));
  for (const title of [
    "AI phone launches with a new camera",
    "Celebrity fashion awards",
    "Cryptocurrency price doubles",
  ])
    assert.equal(careerRelevant(title), false);
  assert.equal(newsTopic("AI workplace adoption"), "ai");
  assert.equal(
    newsTopic("Cloud technology and enterprise workflows"),
    "technology",
  );
  assert.equal(newsTopic("Malaysia reskilling jobs"), "career");
  const queries = new Set(
    ["career", "technology", "ai"].flatMap((topic) =>
      ["my", "global"].map((region) =>
        newsUrl(
          "rss",
          region as "my" | "global",
          topic as "career" | "technology" | "ai",
        ),
      ),
    ),
  );
  assert.equal(queries.size, 6);
  for (const url of queries)
    assert.equal(new URL(url).searchParams.has("api_key"), false);
});

test('limited news context preserves career, technology and AI across Malaysia and global coverage',()=>{
 const news=['Malaysia workforce skills','Enterprise cloud productivity','AI business adoption'].flatMap(title=>(['my','global'] as const).flatMap(region=>[1,2,3].map(n=>({title:title+n,region,url:'https://example.test/'+title+n+region,domain:'example.test',seenAt:'2026-10-24T00:00:00Z'}))));
 const first=balancedNews(news,6);
 assert.equal(first.length,6);
 for(const topic of ['career','technology','ai'])for(const region of ['my','global'])assert.ok(first.some(a=>newsTopic(a.title)===topic&&a.region===region));
});
