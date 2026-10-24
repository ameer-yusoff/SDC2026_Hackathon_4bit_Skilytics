import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { forgetPreviousIntake } from "./intake-replacement";

test("replacement removes old review/answers/plan caches without touching the new profile", () => {
  const memory = () => {
    const values = new Map<string, string>();
    return {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
      removeItem: (k: string) => {
        values.delete(k);
      },
    };
  };
  const local = memory(),
    session = memory();
  Object.defineProperty(globalThis, "localStorage", {
    value: local,
    configurable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: session,
    configurable: true,
  });
  session.setItem(
    "skilytics.onboarding.draft.guest.42",
    JSON.stringify({ answers: { 1: 5 }, form: { name: "Old person" } }),
  );
  local.setItem("skilytics.pathway.start.42", "2026-10-01");
  local.setItem("skilytics.pathway.start.420", "2026-10-25");
  const client = new QueryClient();
  const old = [
    ["/api/profiles/42"],
    ["/api/profiles/42/plan"],
    ["/api/profiles/42/insights"],
    ["learning", 42],
    ["jobs", "42"],
  ];
  const keep = [
    ["/api/profiles/420"],
    ["/api/profiles/420/plan"],
    ["learning", 420],
    ["/api/profiles"],
  ];
  for (const key of [...old, ...keep])
    client.setQueryData(key, { cached: true });
  forgetPreviousIntake(client, "guest", 42);
  for (const key of old) assert.equal(client.getQueryData(key), undefined);
  for (const key of keep)
    assert.deepEqual(client.getQueryData(key), { cached: true });
  assert.equal(session.getItem("skilytics.onboarding.draft.guest.42"), null);
  assert.equal(local.getItem("skilytics.pathway.start.42"), null);
  assert.equal(local.getItem("skilytics.pathway.start.420"), "2026-10-25");
  client.clear();
});
