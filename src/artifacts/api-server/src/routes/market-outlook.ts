import { Router } from "express";
import { z } from "zod";
import {
  db,
  predictionsTable,
  marketSourcesTable,
  labourMonthlyTable,
} from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { loadRoles, loadCourses } from "../lib/catalog";
import { selfDirectedRoles } from "../lib/self-directed";
import { ROLE_TITLE_ZH } from "../data/roles-zh";
import {
  BLS_SOURCE,
  outlookCandidates,
  outlookPrompt,
  parseOutlook,
} from "../lib/market-outlook";
import { hashInput } from "../lib/agents";
import { chat } from "../lib/llm";
import { consumeAiRequest } from "../lib/ai-rate-limit";
import { loadCareerNews } from "../lib/career-news";

const router = Router();
const running = new Map<string, Promise<unknown>>();
async function contextFor(horizon: number) {
  const [roles, sources, labour, news, courses] = await Promise.all([
    loadRoles(),
    db.select().from(marketSourcesTable),
    db
      .select()
      .from(labourMonthlyTable)
      .orderBy(desc(labourMonthlyTable.date))
      .limit(1),
    loadCareerNews(),
    loadCourses(),
  ]);
  const candidates = outlookCandidates(selfDirectedRoles(roles,courses)).map((r) => ({
    ...r,
    titleZh: ROLE_TITLE_ZH[r.title] ?? r.title,
  }));
  const references = [
    {
      label: "O*NET occupations",
      url: "https://www.onetcenter.org/database.html",
      dataDate: sources.find((s) => s.id === "onet")?.version ?? null,
    },
    {
      label: "Anthropic Economic Index · observed AI usage",
      url: "https://huggingface.co/datasets/Anthropic/EconomicIndex",
      dataDate: sources.find((s) => s.id === "aei_usage")?.dataDate ?? null,
    },
    {
      label: "DOSM · Malaysian aggregate labour data",
      url: "https://data.gov.my/data-catalogue/lfs_month",
      dataDate: labour[0]?.date ?? null,
    },
    {
      label: "BLS · US occupational projections (reviewed snapshot)",
      url: BLS_SOURCE.url,
      dataDate: BLS_SOURCE.period,
    },

    ...(news.providers.includes("rss")
      ? [
          {
            label: "Google News · public career RSS metadata",
            url: "https://news.google.com/",
            dataDate: news.fetchedAt?.slice(0, 10) ?? null,
          },
        ]
      : []),
  ];
  const context = {
    baseYear: new Date().getUTCFullYear(),
    horizon,
    labour: labour[0] ?? null,
    candidates,
    references,
    blsReviewedAt: BLS_SOURCE.reviewedAt,
    news: {
      ...news,
      articles: news.articles.filter(
        (a) => Date.parse(a.seenAt) >= Date.now() - 35 * 86400000,
      ),
    },
  };
  const hash = hashInput(
    "public-market-outlook-v3-news",
    context.baseYear,
    horizon,
    candidates,
    context.labour,
    references,
    context.news.articles,
  );
  return { context, hash, candidates, references };
}
async function cached(hash: string, tx: Pick<typeof db, "select"> = db) {
  const [row] = await tx
    .select()
    .from(predictionsTable)
    .where(
      and(
        eq(predictionsTable.inputHash, hash),
        eq(predictionsTable.question, "PUBLIC_MARKET_OUTLOOK_V3"),
        gte(predictionsTable.createdAt, new Date(Date.now() - 86400000)),
      ),
    )
    .orderBy(desc(predictionsTable.createdAt))
    .limit(1);
  return row;
}
function payload(
  c: Awaited<ReturnType<typeof contextFor>>,
  row?: typeof predictionsTable.$inferSelect,
) {
  let analysis;
  try {
    if (row) analysis = parseOutlook(row.content, c.candidates);
  } catch {}
  const baseAi = c.candidates
    .filter((r) => r.aiExposure !== null)
    .sort((a, b) => (b.aiExposure ?? 0) - (a.aiExposure ?? 0));
  const baseDemand = c.candidates
    .filter((r) => r.projection && r.projection.growthPct > 0)
    .sort(
      (a, b) => (b.projection?.growthPct ?? 0) - (a.projection?.growthPct ?? 0),
    );
  const decorate = (
    list: { roleId: number; reason?: unknown; confidence?: string }[],
  ) =>
    list.map((r) => ({
      ...c.candidates.find((x) => x.roleId === r.roleId),
      reason: r.reason ?? null,
      confidence: r.confidence ?? null,
    }));
  const extend = (
    ranked:
      { roleId: number; reason?: unknown; confidence?: string }[] | undefined,
    base: typeof baseAi,
  ) => {
    const first = ranked ?? [];
    const ids = new Set(first.map((r) => r.roleId));
    return decorate([...first, ...base.filter((r) => !ids.has(r.roleId))]);
  };
  return {
    generated: !!analysis,
    generatedAt: analysis ? row!.createdAt : null,
    model: analysis ? row!.model : null,
    baseYear: c.context.baseYear,
    horizon: c.context.horizon,
    ai: extend(analysis?.ai, baseAi),
    demand: extend(analysis?.demand, baseDemand),
    note: analysis?.note ?? null,
    sources: c.references,
    reviewedAt: BLS_SOURCE.reviewedAt,
    projectionPeriod: BLS_SOURCE.period,
    news: c.context.news,
  };
}
router.get("/market/outlook", async (req, res) => {
  const horizon = z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .parse(req.query.horizon ?? 3);
  const c = await contextFor(horizon);
  res.setHeader("Cache-Control", "no-store");
  res.json(payload(c, await cached(c.hash)));
});
router.post("/market/outlook", async (req, res) => {
  const { horizon } = z
    .object({ horizon: z.number().int().min(1).max(10).default(3) })
    .parse(req.body);
  const c = await contextFor(horizon);
  const existing = await cached(c.hash);
  if (existing) {
    res.json(payload(c, existing));
    return;
  }
  const inflight = running.get(c.hash);
  if (inflight) {
    res.json(await inflight);
    return;
  }
  const rate = consumeAiRequest(
    req.user ? "user" : "guest",
    String(req.user?.id ?? req.guestToken ?? req.ip),
  );
  if (!rate.allowed) {
    res.status(429).json({ error: "ai_rate_limited" });
    return;
  }
  const job = db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${c.hash},0))`,
    );
    const shared = await cached(c.hash, tx);
    if (shared) return payload(c, shared);
    const prompt = outlookPrompt(c.context, horizon);
    const out = await chat("main", prompt.system, prompt.user, {
      agent: "analyst",
    });
    const analysis = parseOutlook(out.content, c.candidates);
    const [row] = await tx
      .insert(predictionsTable)
      .values({
        question: "PUBLIC_MARKET_OUTLOOK_V3",
        horizonYears: horizon,
        lang: "en",
        inputHash: c.hash,
        content: JSON.stringify(analysis),
        sources: c.references,
        model: out.model,
      })
      .returning();
    return payload(c, row);
  });
  running.set(c.hash, job);
  try {
    res.json(await job);
  } catch (err) {
    req.log.warn({ err }, "Market outlook generation failed");
    res.status(502).json({ error: "ai_failed" });
  } finally {
    running.delete(c.hash);
  }
});
export default router;
