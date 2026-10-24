import {additionalVacancies} from "./vacancy-catalogues";
import { RIASEC_QUESTIONS } from "../data/riasec";
import { OPENLEARN, OPENLEARN_REVIEWED_AT } from "../data/openlearn";
import { SDG_TARGETS } from "../data/courses";
import { SKILL_REFERENCES } from "./cv-retrieval";
import blsSnapshot from "../data/bls-projections.json";
import {
  db,
  marketSourcesTable,
  labourMonthlyTable,
  occupationExposureTable,
  aiUsageTable,
  aiUsageOverallTable,
} from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { logger } from "./logger";
import { endpointHealth } from "./llm";
import { loadCourses } from "./catalog";
import { ingestOnet } from "./onet";
import { loadCareerNews, newsUrl } from "./career-news";

export type SourceDef = {
  id: string;
  name: string;
  kind: "dataset" | "catalogue" | "ai_endpoint";
  url: string;
  description: string;
  refreshCadence: string;
  consumers: string[];
};

const HF = "https://huggingface.co";
const HF_DATASET = "Anthropic/EconomicIndex";

// Consumer keys are translated in the frontend.
export const SOURCES: SourceDef[] = [
 {id:"himalayas_jobs",name:"Himalayas",kind:"catalogue",url:"https://himalayas.app/api",description:"Public keyless Malaysia-eligible remote vacancies; preserve application links, attribution and expiry.",refreshCadence:"daily",consumers:["pathway"]},
 {id:"remotive_jobs",name:"Remotive",kind:"catalogue",url:"https://github.com/remotive-com/remote-jobs-api",description:"Public keyless remote vacancies with attribution; listings delayed by 24 hours.",refreshCadence:"daily",consumers:["pathway"]},
 {id:"remoteok_jobs",name:"RemoteOK",kind:"catalogue",url:"https://remoteok.com/api",description:"Public keyless remote vacancies; original RemoteOK links and attribution, no provider logo.",refreshCadence:"daily",consumers:["pathway"]},
 {id:"dosm_jmi_skills",name:"DOSM JMI Q4 2025 · selected occupation snapshot",kind:"dataset",url:"https://www.dosm.gov.my/uploads/release-content/file_20260525094010.pdf",description:"Five reviewed occupation counts; editorial O*NET skill priority proxy, not measured skill shortages.",refreshCadence:"reviewed_snapshot",consumers:["market"]},
  {id:"onet_interest_profiler",name:"Holland / O*NET Interest Profiler",kind:"dataset",url:"https://www.onetcenter.org/dl_files/Mini-IP.pdf",description:"30 contextual RIASEC activities adapted and translated by Skilytics under the O*NET Tools Developer License; not the validated Mini-IP.",refreshCadence:"reviewed_snapshot",consumers:["role_matcher","agent_holland"]},
  {id:"onet_content_model",name:"O*NET Content Model · CV skill references",kind:"dataset",url:"https://www.onetcenter.org/content.html",description:"Attributed local collection of O*NET skill definitions used for CV retrieval. App aliases are editorial crosswalks, not employment statistics.",refreshCadence:"reviewed_snapshot",consumers:["agent_cv","role_matcher"]},
  {id:"openlearn_catalogue",name:"OpenLearn · reviewed public courses",kind:"catalogue",url:"https://www.open.edu/openlearn/",description:"Manually reviewed public course metadata selection; not a live catalogue API. Course bodies are not ingested.",refreshCadence:"reviewed_snapshot",consumers:["pathway","role_matcher","agent_company_advisor"]},
  {id:"sdg_framework",name:"United Nations · Sustainable Development Goals",kind:"dataset",url:"https://sdgs.un.org/goals",description:"Official SDG goals and target references; role and course associations are app thematic mappings, not measured impact or UN endorsement.",refreshCadence:"reviewed_snapshot",consumers:["pathway","role_matcher","agent_sdg"]},
  {id:"hubspot_catalogue",name:"HubSpot Academy · public course catalogue",kind:"catalogue",url:"https://academy.hubspot.com/courses",description:"Unauthenticated public website catalogue search, paginated full English courses only. Refreshed every six hours; free Academy account required for learning. Public metadata is not an open-content licence or a documented developer API.",refreshCadence:"links_6h",consumers:["pathway","role_matcher","agent_company_advisor"]},
  { id: "career_news_rss", name: "Google News · career, technology & AI RSS", kind: "dataset", url: newsUrl("rss", "my"), description: "Public RSS headline metadata for Malaysia and global career, technology, workplace AI and future-of-work signals. No private API key; original publisher rights still apply.", refreshCadence: "news_6h", consumers: ["market", "predictions", "agent_company_advisor"] },
  {id:"bls_projections",name:"BLS occupational projections · reviewed public snapshot",kind:"dataset",url:blsSnapshot.url,description:"US 2025–2035 employment growth and annual openings matched by SOC. Reviewed 23 October 2026; not a live feed or Malaysian demand forecast.",refreshCadence:"reviewed_snapshot",consumers:["market","predictions"]},
  { id: "onet", name: "O*NET occupation references", kind: "dataset", url: "https://www.onetcenter.org/database.html", description: "Official US occupation, skill and interest reference data; explicit SOC .00 crosswalk, not Malaysian vacancies.", refreshCadence: "release_6h", consumers: ["role_matcher", "agent_cv", "agent_holland", "agent_company_advisor"] },
  {
    id: "dosm_lfs_month",
    name: "DOSM Labour Force Survey (monthly)",
    kind: "dataset",
    url: "https://data.gov.my/data-catalogue/lfs_month",
    description: "Malaysia unemployment rate, participation rate and employment from the Department of Statistics Malaysia via the data.gov.my API.",
    refreshCadence: "monthly_6h",
    consumers: ["market", "predictions", "graduate_signals"],
  },
  {
    id: "aei_usage",
    name: "Anthropic Economic Index: AI usage by occupation",
    kind: "dataset",
    url: `${HF}/datasets/${HF_DATASET}`,
    description: "Share of Claude usage mapped to SOC occupations for Malaysia (MYS) and globally. The latest release is detected automatically.",
    refreshCadence: "release_6h",
    consumers: ["market", "role_matcher", "predictions", "agent_profiler", "agent_fitter", "agent_company_advisor"],
  },
  {
    id: "aei_exposure",
    name: "Anthropic Economic Index: observed AI exposure",
    kind: "dataset",
    url: `${HF}/datasets/${HF_DATASET}/tree/main/labor_market_impacts`,
    description: "Observed AI exposure score (0-1) per SOC occupation, based on actual task coverage.",
    refreshCadence: "release_6h",
    consumers: ["role_matcher", "skills_radar", "cohort", "agent_profiler", "agent_fitter", "agent_company_advisor"],
  },
  {
    id: "course_catalogue",
    name: "Microsoft Learn live catalogue",
    kind: "catalogue",
    url: "https://learn.microsoft.com/api/catalog/?locale=en-us&type=learningPaths",
    description: "Public learning paths with provider durations and direct URLs. Last good snapshot remains visible if refresh fails.",
    refreshCadence: "links_6h",
    consumers: ["pathway", "agent_planner", "agent_sdg", "cohort", "agent_company_advisor"],
  },
  {
    id: "freecodecamp_catalogue",
    name: "freeCodeCamp public curriculum",
    kind: "catalogue",
    url: "https://github.com/freeCodeCamp/freeCodeCamp/blob/main/curriculum/structure/curriculum.json",
    description: "Public curriculum structure and official English course titles; durations are not published.",
    refreshCadence: "links_6h",
    consumers: ["pathway", "agent_planner", "agent_sdg", "cohort", "agent_company_advisor"],
  },
  { id: "githubskills_catalogue", name: "GitHub Skills public exercises", kind: "catalogue",
    url: "https://api.github.com/orgs/skills/repos?per_page=100&type=public",
    description: "Public course-template repositories with official links; unknown duration and no certificate claim.",
    refreshCadence: "links_6h", consumers: ["pathway", "agent_planner", "agent_sdg", "cohort", "agent_company_advisor"] },
  { id: "huggingface_catalogue", name: "Hugging Face Learn", kind: "catalogue",
    url: "https://huggingface.co/learn",
    description: "Public AI course index with direct links; unknown duration and no certificate claim.",
    refreshCadence: "links_6h", consumers: ["pathway", "agent_planner", "agent_sdg", "cohort", "agent_company_advisor"] },
  {
    id: "gemini",
    name: "Google Gemini API",
    kind: "ai_endpoint",
    url: "https://ai.google.dev/gemini-api/docs/models",
    description: "Active service for eight routed AI roles, including Company Advisor chat. Gemini-only during testing; metadata checks do not generate text.",
    refreshCadence: "on_refresh",
    consumers: ["agent_cv", "agent_holland", "agent_profiler", "agent_fitter", "agent_planner", "agent_sdg", "predictions", "agent_company_advisor"],
  },

  {
    id: "runpod_main",
    name: "RunPod main model endpoint",
    kind: "ai_endpoint",
    url: "https://api.runpod.ai/v2/3pvoygmk4mn0ad/run",
    description: "Qwen3.5-27B endpoint temporarily paused to conserve remaining credits; Gemini currently handles AI requests.",
    refreshCadence: "on_refresh",
    consumers: ["agent_fitter", "agent_planner", "predictions", "agent_company_advisor"],
  },
  {
    id: "runpod_light",
    name: "RunPod light model endpoint",
    kind: "ai_endpoint",
    url: "https://api.runpod.ai/v2/bs50a57qmoqrpp/run",
    description: "Qwen3.5-9B endpoint temporarily paused to conserve remaining credits; Gemini currently handles AI requests.",
    refreshCadence: "on_refresh",
    consumers: ["agent_holland", "agent_sdg"],
  },
];

const normSoc = (code: string) => code.replace(/\.\d+$/, "");

async function setSource(id: string, patch: Partial<typeof marketSourcesTable.$inferInsert>) {
  await db
    .insert(marketSourcesTable)
    .values({ id, ...patch })
    .onConflictDoUpdate({ target: marketSourcesTable.id, set: patch });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": "Skilytics/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

// Quote-aware CSV line parser.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function* streamLines(url: string): AsyncGenerator<string> {
  const res = await fetch(url, { headers: { "User-Agent": "Skilytics/1.0" } });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      yield buf.slice(0, idx).replace(/\r$/, "");
      buf = buf.slice(idx + 1);
    }
  }
  if (buf) yield buf;
}

async function ingestLabour(): Promise<void> {
  type Row = { date: string; u_rate?: number; p_rate?: number; lf_employed?: number; lf_unemployed?: number };
  const rows = await fetchJson<Row[]>("https://api.data.gov.my/data-catalogue?id=lfs_month&sort=-date&limit=60");
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Empty response from data.gov.my");
  for (const r of rows) {
    const v = {
      unemploymentRate: r.u_rate ?? null,
      participationRate: r.p_rate ?? null,
      employedThousands: r.lf_employed ?? null,
      unemployedThousands: r.lf_unemployed ?? null,
    };
    await db.insert(labourMonthlyTable).values({ date: r.date, ...v }).onConflictDoUpdate({ target: labourMonthlyTable.date, set: v });
  }
  const latest = rows.map((r) => r.date).sort().at(-1) ?? null;
  await setSource("dosm_lfs_month", { status: "ok", lastFetchedAt: new Date(), dataDate: latest, recordCount: rows.length, error: null });
}

async function ingestExposure(): Promise<void> {
  const metadata = await fetchJson<{ sha: string; cardData?: { license?: string } }>(`${HF}/api/datasets/${HF_DATASET}`);
  if (metadata.cardData?.license !== "mit" || !/^[a-f0-9]{40}$/.test(metadata.sha)) throw new Error("EconomicIndex licence or revision could not be verified");
  const rows: { socCode: string; title: string; exposure: number }[] = [];
  let header = true;
  for await (const line of streamLines(`${HF}/datasets/${HF_DATASET}/resolve/${metadata.sha}/labor_market_impacts/job_exposure.csv`)) {
    if (header) {
      header = false;
      continue;
    }
    if (!line.trim()) continue;
    const [code, title, exp] = parseCsvLine(line);
    const exposure = Number(exp);
    if (!code || Number.isNaN(exposure)) continue;
    rows.push({ socCode: normSoc(code), title, exposure });
  }
  if (rows.length === 0) throw new Error("job_exposure.csv returned no rows");
  await db.transaction(async (tx) => {
    await tx.delete(occupationExposureTable);
    for (let i = 0; i < rows.length; i += 500) await tx.insert(occupationExposureTable).values(rows.slice(i, i + 500)).onConflictDoNothing();
  });
  await setSource("aei_exposure", { status: "ok", lastFetchedAt: new Date(), dataDate: null, version: `${metadata.sha}:labor_market_impacts/job_exposure.csv`, recordCount: rows.length, error: null });
}

async function latestUsageFile(): Promise<{ release: string; path: string }> {
  type Entry = { type: string; path: string };
  const root = await fetchJson<Entry[]>(`${HF}/api/datasets/${HF_DATASET}/tree/main`);
  const releases = root.filter((e) => e.type === "directory" && /^release_\d{4}_\d{2}_\d{2}$/.test(e.path)).map((e) => e.path).sort().reverse();
  for (const rel of releases) {
    const files = await fetchJson<Entry[]>(`${HF}/api/datasets/${HF_DATASET}/tree/main/${rel}?recursive=1`);
    const f = files.find((e) => e.type === "file" && /data\/aei_claude_ai_\d{4}-\d{2}-\d{2}\.csv$/.test(e.path));
    if (f) return { release: rel, path: f.path };
  }
  throw new Error("No compatible Anthropic Economic Index release found");
}

async function ingestUsage(force: boolean): Promise<void> {
  const { release, path } = await latestUsageFile();
  const [existing] = await db.select().from(marketSourcesTable).where(eq(marketSourcesTable.id, "aei_usage"));
  if (!force && existing?.version === path && existing.status === "ok") {
    await setSource("aei_usage", { lastFetchedAt: new Date() });
    return;
  }
  type U = { geo: string; level: number; socCode: string; title: string; pct: number; period: string };
  const byPeriod = new Map<string, U[]>();
  const overall = new Map<string, { index: number | null; pct: number | null; period: string }>();
  let header = true;
  for await (const line of streamLines(`${HF}/datasets/${HF_DATASET}/resolve/main/${path}`)) {
    if (header) {
      header = false;
      continue;
    }
    if (!(line.includes(",MYS,") || line.includes(",GLOBAL,"))) continue;
    if (!(line.includes(",soc_occupation,") || line.includes(",overall,"))) continue;
    const c = parseCsvLine(line);
    const [dateStart, , geo, , category, level, metric, value, nodeName, nodeId] = c;
    if (geo !== "MYS" && geo !== "GLOBAL") continue;
    const period = dateStart.slice(0, 7);
    if (category === "overall") {
      const key = `${geo}|${period}`;
      const o = overall.get(key) ?? { index: null, pct: null, period };
      if (metric === "usage_per_capita_index") o.index = Number(value);
      if (metric === "usage_pct") o.pct = Number(value);
      overall.set(key, o);
    } else if (metric === "pct" && (level === "0" || level === "1")) {
      const arr = byPeriod.get(period) ?? [];
      arr.push({ geo, level: Number(level), socCode: normSoc(nodeId), title: nodeName, pct: Number(value), period });
      byPeriod.set(period, arr);
    }
  }
  const latest = [...byPeriod.keys()].sort().at(-1);
  if (!latest) throw new Error(`No SOC usage rows found in ${path}`);
  const rows = byPeriod.get(latest)!;
  await db.transaction(async (tx) => {
    await tx.delete(aiUsageTable);
    for (let i = 0; i < rows.length; i += 500) await tx.insert(aiUsageTable).values(rows.slice(i, i + 500)).onConflictDoNothing();
    for (const geo of ["MYS", "GLOBAL"]) {
      const o = overall.get(`${geo}|${latest}`);
      if (!o) continue;
      const v = { usagePerCapitaIndex: o.index, usagePct: o.pct, period: latest };
      await tx.insert(aiUsageOverallTable).values({ geo, ...v }).onConflictDoUpdate({ target: aiUsageOverallTable.geo, set: v });
    }
  });
  await setSource("aei_usage", { status: "ok", lastFetchedAt: new Date(), dataDate: latest, recordCount: rows.length, error: null, version: path });
  logger.info({ release, period: latest, rows: rows.length }, "AI usage ingested");
}

export async function checkCourseLinks(): Promise<void> {
  const courses = await loadCourses();
  for (const [id, provider] of [["course_catalogue", "Microsoft Learn"], ["freecodecamp_catalogue", "freeCodeCamp"], ["githubskills_catalogue", "GitHub Skills"], ["huggingface_catalogue", "Hugging Face Learn"], ["hubspot_catalogue", "HubSpot Academy"]] as const) {
    const available = courses.filter((c) => c.provider === provider);
    const latest = available[0];
    await setSource(id, {
      status: available.length > 0 ? "ok" : "error",
      lastFetchedAt: latest ? new Date(latest.lastVerified) : undefined,
      dataDate: latest?.lastVerified.slice(0, 10) ?? null,
      version: provider === "Microsoft Learn" ? "microsoft-learn-public" : provider === "freeCodeCamp" ? "freecodecamp-curriculum-main" : provider === "GitHub Skills" ? "github-skills-public" : provider === "HubSpot Academy" ? "hubspot-public-search-tracks-v1" : "huggingface-learn-public",
      recordCount: available.length,
      detail: latest ? "Public provider metadata. Direct course URLs; SDG associations are editorial." : null,
      error: latest?.catalogStale ? "provider_refresh_failed_using_last_snapshot" : available.length > 0 ? null : "course_catalogue_unavailable",
    });
  }
}

async function checkEndpoint(tier: "main" | "light"): Promise<void> {
  const h = await endpointHealth(tier, "runpod");
  await setSource(`runpod_${tier}`, { status: h.status, lastFetchedAt: new Date(), detail: h.detail, error: h.error, recordCount: 0 });
}

async function checkGemini(): Promise<void> {
  const h = await endpointHealth("main", "gemini");
  await setSource("gemini", { status: h.status, lastFetchedAt: new Date(), detail: h.detail, error: h.error, recordCount: 0 });
}


let running: Promise<void> | null = null;

export function refreshAll(force = false): Promise<void> {
  if (running) return running;
  const jobs: [string, () => Promise<void>][] = [
    ["career_news_rss", async () => { await loadCareerNews(force); }],
    ["onet", ingestOnet],
    ["himalayas_jobs", async()=>{await additionalVacancies();}],
    ["dosm_lfs_month", ingestLabour],
    ["aei_exposure", ingestExposure],
    ["aei_usage", () => ingestUsage(force)],
    ["course_catalogue", checkCourseLinks],
    ["gemini", checkGemini],
    ["runpod_main", () => checkEndpoint("main")],
    ["runpod_light", () => checkEndpoint("light")],
  ];
  running = (async () => {
    for (const [id, fn] of jobs) {
      try {
        await fn();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, source: id }, "Market ingestion failed");
        await setSource(id, { status: "error", error: message });
      }
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

const staticSources: Record<string,{version:string;lastFetchedAt:Date;status:"ok";detail:string;dataDate:string;recordCount:number;error:null}> = Object.fromEntries([
  ["dosm_jmi_skills","reviewed-q4-2025","2026-05-25",5,"Five DOSM JMI occupation counts mapped editorially to O*NET skills; not a measured shortage series."],
  ["bls_projections",blsSnapshot.period,blsSnapshot.period,blsSnapshot.rows.length,blsSnapshot.method],
  ["onet_interest_profiler","skilytics-contextual-riasec-201-230","2026-10-23",RIASEC_QUESTIONS.length,"Adapted 30-item questionnaire with English, Malay and Mandarin wording. All answers required. Independent psychometric validation remains outstanding."],
  ["onet_content_model","content-model-reference-2026-10","2026-10",SKILL_REFERENCES.length,"O*NET Content Model definitions, locally attributed retrieval reference. Separate from the occupation database and the Interest Profiler."],
  ["openlearn_catalogue","reviewed-2026-10-23","2026-10-23",OPENLEARN.length,"Reviewed selection, not a live endpoint. Metadata reviewed 23 October 2026."],
  ["sdg_framework","sdg-editorial-target-map-v1","2026-10-23",SDG_TARGETS.length,"Curated target references and 17 official goal icons. Associations are thematic, not measured outcomes."],
].map(([id,version,dataDate,recordCount,detail])=>[id,{version:String(version),lastFetchedAt:new Date(id === "bls_projections"?blsSnapshot.reviewedAt+"T00:00:00Z":OPENLEARN_REVIEWED_AT),status:"ok" as const,detail:String(detail),dataDate:String(dataDate),recordCount:Number(recordCount),error:null}]));

export async function listSources() {
  const rows = await db.select().from(marketSourcesTable);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return SOURCES.map((s) => {
    const r = staticSources[s.id] ?? byId.get(s.id);
    return {
      ...s,
      version: r?.version ?? null,
      stale: !staticSources[s.id] && !!r?.lastFetchedAt && Date.now() - r.lastFetchedAt.getTime() > 12 * 3600000,
      status: (r?.status ?? "pending") as "ok" | "error" | "pending" | "not_configured",
      detail: r?.detail ?? null,
      lastFetchedAt: r?.lastFetchedAt ? r.lastFetchedAt.toISOString() : null,
      dataDate: r?.dataDate ?? null,
      recordCount: r?.recordCount ?? 0,
      error: r?.error ?? null,
    };
  });
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function startMarketScheduler(): void {
  void (async () => {
    const courseCatRows = await db
      .select()
      .from(marketSourcesTable)
      .where(inArray(marketSourcesTable.id, ["course_catalogue", "freecodecamp_catalogue", "githubskills_catalogue", "huggingface_catalogue", "hubspot_catalogue"]));
    if (courseCatRows.length < 5 || courseCatRows.some((r) => r.status !== "ok" || (r.recordCount ?? 0) === 0)) {
      await checkCourseLinks().catch((err) => logger.error({ err }, "Initial course catalogue check failed"));
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(marketSourcesTable)
      .where(eq(marketSourcesTable.status, "ok"));
    if (count < SOURCES.filter(s=>!staticSources[s.id] && s.id !== "career_news_rss").length) await refreshAll();
    else logger.info("Market data present; next check in 6 hours");
  })().catch((err) => logger.error({ err }, "Initial market refresh failed"));
  setInterval(() => {
    refreshAll().catch((err) => logger.error({ err }, "Scheduled market refresh failed"));
    loadCareerNews().catch((err) => logger.warn({ err }, "Career news refresh unavailable"));
  }, SIX_HOURS).unref();
  void ingestOnet().catch(err=>logger.warn({err},"Daily occupation discovery unavailable; retaining last good catalogue"));
  void loadCareerNews().catch((err) => logger.warn({ err }, "Initial career news unavailable"));
}
