import {skillDemand} from "../lib/skill-demand";
import {explanationInput,parseScenarioExplanation,scenarioValue,scenarioPrompt,assertScenarioNumbers} from "../lib/scenario-explanation";
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
    "public-market-outlook-v4-tech-ai-news",
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
        eq(predictionsTable.question, "PUBLIC_MARKET_OUTLOOK_V4"),
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
        question: "PUBLIC_MARKET_OUTLOOK_V4",
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

async function explanationContext(mode:"ai"|"demand"|"skills",years:number){
 const c=await contextFor(10),ranked=payload(c,await cached(c.hash));
 const raw=mode==="skills"?(await skillDemand()).skills.slice(0,3).map(s=>({name:s.name,baseline:s.count})):
  ranked[mode].slice(0,3).map(r=>({name:r.title!,nameMs:r.titleMs,nameZh:r.titleZh,baseline:mode==="ai"?r.aiExposure!:r.projection?.growthPct??null}));
 const rows=raw.map(r=>({...r,previous:scenarioValue(mode,r.baseline,years-1),selected:scenarioValue(mode,r.baseline,years)}));
 const references=[...c.references,...c.context.news.articles.slice(0,12).map(a=>({label:`${a.region === "my"?"Malaysia-related":"Global"} · ${a.domain}: ${a.title}`,url:a.url,dataDate:a.seenAt.slice(0,10)}))];
 const context={mode,baseYear:c.context.baseYear,previousYear:c.context.baseYear+years-1,selectedYear:c.context.baseYear+years,years,rows,
  formula:mode==="ai"?"100 * (1 - (1 - observed exposure) * 0.95^years); assumes 5% of remaining tasks each year":mode==="demand"?"100 * ((1 + supplied BLS ten-year growth / 100)^(years/10) - 1); smooth annual interpolation, not annual BLS forecasts":"baseline learning-priority index * 1.05^years; assumed 5% yearly increase, not employer percentage",
  newsStale:c.context.news.stale,newsCheckedAt:c.context.news.fetchedAt,references:references.map((r,id)=>({id,...r}))};
 return {context,references,hash:hashInput("scenario-explanation-v1",context)};
}
async function savedExplanation(hash:string,tx:Pick<typeof db,"select">=db){return (await tx.select().from(predictionsTable).where(and(eq(predictionsTable.inputHash,hash),eq(predictionsTable.question,"PUBLIC_SCENARIO_EXPLANATION_V1"),gte(predictionsTable.createdAt,new Date(Date.now()-86400000)))).orderBy(desc(predictionsTable.id)).limit(1))[0];}
function explanationResponse(c:Awaited<ReturnType<typeof explanationContext>>,row?:typeof predictionsTable.$inferSelect){
 const saved=row?parseScenarioExplanation(row.content,c.references.length):null;
 return {mode:c.context.mode,years:c.context.years,baseYear:c.context.baseYear,rows:c.context.rows,generated:!!saved,translations:saved?.translations??null,sources:saved?saved.referenceIds.map(id=>c.references[id]):c.references.slice(0,4),generatedAt:row?.createdAt??null,newsStale:c.context.newsStale};
}
router.get("/market/scenario-explanation",async(req,res)=>{const input=explanationInput.parse(req.query),c=await explanationContext(input.mode,input.years);res.setHeader("Cache-Control","no-store");res.json(explanationResponse(c,await savedExplanation(c.hash)));});
router.post("/market/scenario-explanation",async(req,res)=>{
 const input=explanationInput.parse(req.body),c=await explanationContext(input.mode,input.years),existing=await savedExplanation(c.hash);
 if(existing){res.json(explanationResponse(c,existing));return;}
 const rate=consumeAiRequest(req.user?"user":"guest",String(req.user?.id??req.guestToken??req.ip));if(!rate.allowed){res.status(429).json({error:"ai_rate_limited"});return;}
 let job=running.get(c.hash);
 if(!job){job=db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${c.hash},0))`);
  const cached=await savedExplanation(c.hash,tx);if(cached)return explanationResponse(c,cached);
  const prompt=scenarioPrompt(c.context),out=await chat("main",prompt.system,prompt.user,{agent:"analyst"});
  const parsed=parseScenarioExplanation(out.content,c.references.length);
  if(!parsed.referenceIds.length)throw new Error("scenario_references_required");
  assertScenarioNumbers(parsed.translations,c.context.rows,input.mode);
  const [row]=await tx.insert(predictionsTable).values({question:"PUBLIC_SCENARIO_EXPLANATION_V1",horizonYears:input.years,lang:"all",inputHash:c.hash,content:JSON.stringify(parsed),sources:parsed.referenceIds.map(id=>c.references[id]),model:out.model}).returning();
  return explanationResponse(c,row);
 });running.set(c.hash,job);}
 try{res.json(await job);}catch(err){req.log.warn({err},"Scenario explanation failed");res.status(502).json({error:"ai_failed"});}finally{if(running.get(c.hash)===job)running.delete(c.hash);}
});

export default router;
