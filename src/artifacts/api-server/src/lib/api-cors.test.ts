import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { apiCors } from "./api-cors";

test("browser preflights allow onboarding creation, consented upload and demo replacement", async () => {
  const app = express();
  app.use(apiCors);
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = "https://skilytics.vercel.app";
    for (const path of ["/api/profiles", "/api/profiles/1/cv", "/api/profiles/1/demo-cv"]) {
      const requested = ["content-type", "authorization", "x-guest-token", "x-idempotency-key", "x-replace-intake", "x-intake-segment"];
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": requested.join(","),
        },
      });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get("access-control-allow-origin"), origin);
      assert.equal(response.headers.get("access-control-allow-credentials"), "true");
      const allowed = response.headers.get("access-control-allow-headers")!.toLowerCase().split(",").map(value => value.trim());
      for (const header of requested) assert.ok(allowed.includes(header), `${path}: ${header} must pass preflight`);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
