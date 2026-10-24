import { test } from "node:test";
import assert from "node:assert/strict";
const { scenarioPercent } = await import(new URL("../../../reskill-ai/src/lib/market-scenario.ts", import.meta.url).href);
import {
  careerRelevant,
  newsUrl,
  parseCareerRss,
} from "./career-news";

test("slider scenarios keep source anchors, unknown values and bounded 1–10-year calculations", () => {
  const role = { aiExposure: 0.7, projection: { growthPct: 34.6 } };
  assert.ok(Math.abs(scenarioPercent("ai", role, 0)! - 70) < 1e-8);
  assert.ok(scenarioPercent("ai", role, 1)! < scenarioPercent("ai", role, 10)!);
  assert.ok(scenarioPercent("ai", role, 10)! < 100);
  assert.ok(Math.abs(scenarioPercent("demand", role, 10)! - 34.6) < 1e-8);
  assert.equal(scenarioPercent("demand", role, 0), 0);
  assert.equal(
    scenarioPercent("ai", role, 99),
    scenarioPercent("ai", role, 10),
  );
  assert.equal(scenarioPercent("ai", { ...role, aiExposure: null }, 4), null);
  assert.equal(
    scenarioPercent("demand", { ...role, projection: null }, 4),
    null,
  );
});
test("career news excludes unrelated, old, unlisted and unsafe metadata", () => {
  const now = Date.parse("2026-10-23T10:00:00Z");
  const item = (
    title: string,
    link = "https://news.google.com/rss/articles/example",
    source = "https://www.bernama.com",
    date = "Thu, 22 Oct 2026 10:00:00 GMT",
  ) =>
    `<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${date}</pubDate><source url="${source}">Publisher</source></item>`;
  const xml = `<rss><channel>${item("Malaysia workforce skills &amp; AI training")}${item("Football results")}${item("New career skills", "javascript:alert(1)")}${item("Jobs news", undefined, "https://unknown.invalid")}${item("Upskilling news", undefined, undefined, "Thu, 01 Jan 2026 00:00:00 GMT")}</channel></rss>`;
  const rows = parseCareerRss(xml, "my", now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Malaysia workforce skills & AI training");
  assert.equal(rows[0].region, "my");
  assert.ok(careerRelevant("Latihan kemahiran pekerja baharu"));
  assert.ok(careerRelevant("职业技能培训"));
  assert.throws(() => parseCareerRss("<!DOCTYPE x><rss/>", "global", now));
  assert.ok(
    new URL(newsUrl("rss", "my")).searchParams.get("q")?.includes("Malaysia"),
  );
});
