import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchCareerFeed, newsUrl, NewsFeedError } from "./career-news";

test("Google News RSS uses Malaysia subject context without auth", async () => {
  const u = new URL(newsUrl("rss", "my"));
  assert.match(u.searchParams.get("q")!, /Malaysia/);
  assert.equal(u.searchParams.has("apikey"), false);
  const xml = `<rss><channel><item><title>Malaysia expands workforce training</title><link>https://news.google.com/rss/articles/example</link><pubDate>${new Date().toUTCString()}</pubDate><source url="https://www.reuters.com">Reuters</source></item></channel></rss>`;
  const rows = await fetchCareerFeed("rss", "my", (async (_url, options) => {
    assert.equal("Authorization" in (options?.headers ?? {}), false);
    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "application/rss+xml" },
    });
  }) as typeof fetch);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Malaysia expands workforce training");
});

test("HTTP 429 is a rate limit, respects Retry-After, and is never described as missing auth", async () => {
  await assert.rejects(
    fetchCareerFeed(
      "rss",
      "global",
      (async () =>
        new Response("Too many requests", {
          status: 429,
          headers: { "Retry-After": "1200" },
        })) as typeof fetch,
    ),
    (error) =>
      error instanceof NewsFeedError &&
      error.code === "news_rate_limited" &&
      error.retryAfterMs === 1200000,
  );
});

test("timeouts and malformed public responses retain distinct diagnostics", async () => {
  await assert.rejects(
    fetchCareerFeed("rss", "global", (async () => {
      throw new DOMException("Timed out", "TimeoutError");
    }) as typeof fetch),
    (error) => error instanceof NewsFeedError && error.code === "news_timeout",
  );
  await assert.rejects(
    fetchCareerFeed(
      "rss",
      "global",
      (async () => new Response("<!DOCTYPE x><rss/>")) as typeof fetch,
    ),
    (error) =>
      error instanceof NewsFeedError && error.code === "news_invalid_response",
  );
});
