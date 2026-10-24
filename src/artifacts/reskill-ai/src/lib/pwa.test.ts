import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { installPlatform } from "./pwa";

test("installation guidance recognises iPhone, iPad desktop mode and Android", () => {
  assert.equal(
    installPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"),
    "ios",
  );
  assert.equal(
    installPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 5),
    "ios",
  );
  assert.equal(installPlatform("Mozilla/5.0 (Linux; Android 15)"), "android");
  assert.equal(installPlatform("Mozilla/5.0 (Windows NT 10.0)"), "android");
});

test("offline worker never caches app HTML, authenticated API calls or user submissions", async () => {
  const handlers: Record<string, (event: any) => void> = {};
  let offline = false;
  let stored: string[] = [];
  let cacheWrites = 0;
  runInNewContext(
    readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"),
    {
      self: {
        location: { origin: "https://skilytics.test" },
        addEventListener: (name: string, handler: any) => {
          handlers[name] = handler;
        },
        skipWaiting: async () => {},
        clients: { claim: async () => {} },
      },
      caches: {
        open: async () => ({
          addAll: async (urls: string[]) => {
            stored = urls;
          },
          put: () => {
            cacheWrites++;
          },
        }),
        match: async (path: string) =>
          path === "/offline.html" ? new Response("offline guide") : undefined,
      },
      fetch: async () => {
        if (offline) throw new Error("offline");
        return new Response("fresh HTML");
      },
      URL,
      Response,
    },
  );
  await new Promise<void>((resolve, reject) =>
    handlers.install({
      waitUntil: (work: Promise<void>) => work.then(resolve, reject),
    }),
  );
  assert.ok(stored.includes("/offline.html"));
  assert.ok(
    stored.every(
      (path) => path === "/offline.html" || path.startsWith("/pwa/icon-"),
    ),
  );
  for (const request of [
    {
      url: "https://skilytics.test/api/profiles/1",
      method: "GET",
      mode: "navigate",
    },
    { url: "https://skilytics.test/login", method: "POST", mode: "navigate" },
    { url: "https://other.test/api/user", method: "GET", mode: "cors" },
  ]) {
    let intercepted = false;
    handlers.fetch({
      request,
      respondWith: () => {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false);
  }
  const navigate = async () => {
    let result: Promise<Response> | undefined;
    handlers.fetch({
      request: {
        url: "https://skilytics.test/me",
        method: "GET",
        mode: "navigate",
      },
      respondWith: (response: Promise<Response>) => {
        result = response;
      },
    });
    return (await result!)!.text();
  };
  assert.equal(await navigate(), "fresh HTML");
  offline = true;
  assert.equal(await navigate(), "offline guide");
  assert.equal(cacheWrites, 0);
});
