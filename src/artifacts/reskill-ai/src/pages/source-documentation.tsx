import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { AiStatus, MarketSource } from "@workspace/api-client-react";
import { Panel } from "@/components/kit";
import { useFmt } from "@/lib/fmt";
import { useT, type DictKey } from "@/i18n";
import { cn } from "@/lib/utils";

export type DocType = "external" | "static" | "derived" | "service" | "demo" | "user";

/** A fact row. `k` = translated prose, `ref` = verbatim reference identifier (URL, file, field, title), `url` = link. */
type Row = { label: DictKey; k?: DictKey[]; ref?: string; url?: string };
type Doc = { id: string; types: DocType[]; name: DictKey; sourceIds?: string[]; ai?: boolean; rows: Row[] };

const DOCS: Doc[] = [
  {id:"tvet_synthetic",types:["demo","static","derived"],name:"docs.tvet.synthetic",rows:[{label:"docs.f.files",ref:"src/synthetic-data/tvet/graduate-employment-2024-2026.json · synthetic data/"},{label:"docs.f.coverage",k:["docs.tvet.coverage"]},{label:"docs.f.method",k:["docs.tvet.method"]},{label:"docs.f.privacy",k:["docs.tvet.policy"]}]},

  { id: "dosm", types: ["external"], name: "src.dosm_lfs_month.name", sourceIds: ["dosm_lfs_month"], rows: [
    { label: "docs.f.publisher", ref: "Department of Statistics Malaysia (DOSM) / OpenDOSM" },
    { label: "docs.f.dataset", url: "https://data.gov.my/data-catalogue/lfs_month" },
    { label: "docs.f.api", url: "https://api.data.gov.my/data-catalogue?id=lfs_month&sort=-date&limit=60" },
    { label: "docs.f.coverage", k: ["docs.dosm.coverage"] },
    { label: "docs.f.fields", k: ["docs.dosm.fields"] },
    { label: "docs.f.method", k: ["docs.dosm.method"] },
    { label: "docs.f.license", k: ["docs.dosm.license"], url: "https://data.gov.my/terms" },
    { label: "docs.f.cadence", k: ["docs.dosm.cadence"] },
    { label: "docs.f.failure", k: ["docs.dosm.failure"] },
  ] },
  { id: "dosm_jmi", types: ["external", "static", "derived"], name: "docs.jmi.name", sourceIds: ["dosm_jmi_skills"], rows: [
    { label: "docs.f.publisher", ref: "Department of Statistics Malaysia (DOSM) · Job Market Insights" },
    { label: "docs.f.dataset", url: "https://www.dosm.gov.my/uploads/release-content/file_20260525094010.pdf" },
    { label: "docs.f.coverage", k: ["docs.jmi.coverage"] },
    { label: "docs.f.method", k: ["docs.jmi.method"] },
  ] },
  { id: "himalayas", types: ["external"], name: "docs.himalayas.name", sourceIds: ["himalayas_jobs"], rows: [
    { label: "docs.f.publisher", ref: "Himalayas" },
    { label: "docs.f.api", url: "https://himalayas.app/api/jobs" },
    { label: "docs.f.dataset", url: "https://himalayas.app/jobs" },
    { label: "docs.f.method", k: ["docs.himalayas.method"] },
  ] },
  { id: "remotive", types: ["external"], name: "docs.remotive.name", sourceIds: ["remotive_jobs"], rows: [
    { label: "docs.f.publisher", ref: "Remotive" },
    { label: "docs.f.api", url: "https://remotive.com/api/remote-jobs" },
    { label: "docs.f.dataset", url: "https://remotive.com" },
    { label: "docs.f.method", k: ["docs.remotive.method"] },
  ] },
  { id: "remoteok", types: ["external"], name: "docs.remoteok.name", sourceIds: ["remoteok_jobs"], rows: [
    { label: "docs.f.publisher", ref: "RemoteOK" },
    { label: "docs.f.api", url: "https://remoteok.com/api" },
    { label: "docs.f.dataset", url: "https://remoteok.com" },
    { label: "docs.f.method", k: ["docs.remoteok.method"] },
  ] },
  { id: "aei_usage", types: ["external"], name: "src.aei_usage.name", sourceIds: ["aei_usage"], rows: [
    { label: "docs.f.publisher", ref: "Anthropic, EconomicIndex (Hugging Face)" },
    { label: "docs.f.dataset", url: "https://huggingface.co/datasets/Anthropic/EconomicIndex" },
    { label: "docs.f.version", k: ["docs.aeiu.version"] },
    { label: "docs.f.files", k: ["docs.aeiu.files"] },
    { label: "docs.f.method", k: ["docs.aeiu.method"] },
    { label: "docs.f.limits", k: ["docs.aeiu.limits"] },
    { label: "docs.f.license", k: ["docs.aeiu.license"] },
    { label: "docs.f.cadence", k: ["docs.aeiu.cadence"] },
  ] },
  { id: "aei_exposure", types: ["external"], name: "src.aei_exposure.name", sourceIds: ["aei_exposure"], rows: [
    { label: "docs.f.publisher", ref: "Anthropic, EconomicIndex (Hugging Face)" },
    { label: "docs.f.api", url: "https://huggingface.co/datasets/Anthropic/EconomicIndex/resolve/main/labor_market_impacts/job_exposure.csv" },
    { label: "docs.f.fields", k: ["docs.aeie.fields"] },
    { label: "docs.f.limits", k: ["docs.aeie.limits"] },
    { label: "docs.f.license", k: ["docs.aeiu.license"] },
  ] },
  {id:"career_news",types:["external","derived"],name:"docs.news.name",sourceIds:["gdelt_career_news","career_news_rss"],rows:[
    {label:"docs.f.publisher",ref:"The GDELT Project / Google News RSS / original news publishers"},
    {label:"docs.f.api",url:"https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/"},
    {label:"docs.f.dataset",url:"https://news.google.com/rss/search?q=upskilling%20Malaysia%20when%3A30d&hl=en-MY&gl=MY&ceid=MY%3Aen"},
    {label:"docs.f.coverage",k:["docs.news.coverage"]},
    {label:"docs.f.method",k:["docs.news.method"]},
    {label:"docs.f.license",k:["docs.news.license"],url:"https://www.gdeltproject.org/about.html#termsofuse"},
    {label:"docs.f.failure",k:["docs.news.failure"]},
  ]},
  {id:"bls",types:["external","static","derived"],name:"src.bls_projections.name",sourceIds:["bls_projections"],rows:[
    {label:"docs.f.publisher",ref:"U.S. Bureau of Labor Statistics"},
    {label:"docs.f.dataset",url:"https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm"},
    {label:"docs.f.coverage",k:["docs.bls.coverage"]},
    {label:"docs.f.method",k:["docs.bls.method"]},
  ]},
  { id: "onet", types: ["external"], name: "src.onet.name", sourceIds: ["onet"], rows: [
    { label: "docs.f.publisher", ref: "U.S. Department of Labor, Employment and Training Administration (USDOL/ETA); National Center for O*NET Development" },
    { label: "docs.f.dataset", url: "https://www.onetcenter.org/database.html" },
    { label: "docs.f.api", url: "https://www.onetcenter.org/dl_files/database/db_31_0_csv.zip" },
    { label: "docs.f.version", k: ["docs.onet.version"] },
    { label: "docs.f.files", ref: "software_skills.csv, task_statements.csv, knowledge.csv, essential_skills.csv, transferable_skills.csv, career_interest_types.csv, occupation_data.csv" },
    { label: "docs.f.coverage", k: ["docs.onet.coverage"] },
    { label: "docs.f.method", k: ["docs.onet.method", "docs.onet.skills", "docs.onet.riasec", "docs.onet.provenance", "docs.onet.scope"] },
    { label: "docs.f.license", k: ["docs.onet.license"], url: "https://www.onetcenter.org/license_db.html" },
    { label: "docs.f.cadence", k: ["docs.onet.cadence"] },
  ] },
  { id: "riasec", types: ["external", "static", "derived", "user"], name: "docs.name.riasec", sourceIds:["onet_interest_profiler"], rows: [
    { label: "docs.f.publisher", ref: "USDOL/ETA — O*NET Interest Profiler; contextual adaptation by Skilytics" },
    { label: "docs.f.dataset", url: "https://www.onetcenter.org/dl_files/Mini-IP.pdf" },
    { label: "docs.f.license", url: "https://www.onetcenter.org/license_tools.html" },
    { label: "docs.f.method", k: ["docs.riasec.items", "docs.riasec.scoring"] },
    { label: "docs.f.limits", k: ["docs.riasec.limits"] },
  ] },
  {id:"skill_reference",types:["external","static","derived"],name:"src.onet_content_model.name",sourceIds:["onet_content_model"],rows:[
    {label:"docs.f.publisher",ref:"USDOL/ETA, National Center for O*NET Development; app dictionary by Skilytics"},
    {label:"docs.f.dataset",url:"https://www.onetcenter.org/content.html"},
    {label:"docs.f.files",ref:"cv-retrieval.ts (SKILL_REFERENCES), data/skills.ts, occupational-skills.ts"},
    {label:"docs.f.method",k:["docs.skills.method"]},
    {label:"docs.f.license",url:"https://www.onetcenter.org/license_db.html"},
  ]},
  { id: "courses", types: ["external"], name: "src.course_catalogue.name", sourceIds: ["course_catalogue"], rows: [
    { label: "docs.f.publisher", ref: "Microsoft Learn" },
    { label: "docs.f.api", url: "https://learn.microsoft.com/api/catalog/?locale=en-us&type=learningPaths" },
    { label: "docs.f.dataset", url: "https://learn.microsoft.com/en-us/training/support/integrations-learn-platform-api-catalog" },
    { label: "docs.f.method", k: ["docs.course.status"] },
    { label: "docs.f.limits", k: ["docs.course.limits"] },
    { label: "docs.f.license", k: ["docs.course.license"] },
  ] },
  { id: "hrdcorp", types: ["external", "static", "derived"], name: "docs.hrdcorp.name", sourceIds: ["hrdcorp_elatih"], rows: [
    { label: "docs.f.publisher", ref: "Human Resource Development Corporation (HRD Corp) & e-LATiH Malaysia" },
    { label: "docs.f.dataset", url: "https://e-latih.hrdcorp.gov.my/" },
    { label: "docs.f.files", ref: "src/artifacts/api-server/src/data/courses.ts" },
    { label: "docs.f.method", k: ["docs.hrdcorp.method"] },
  ] },
  { id: "seda_niosh", types: ["external", "static", "derived"], name: "docs.seda_niosh.name", rows: [
    { label: "docs.f.publisher", ref: "SEDA Malaysia (Solar PV) & NIOSH Malaysia (OSH)" },
    { label: "docs.f.dataset", url: "https://www.seda.gov.my/" },
    { label: "docs.f.api", url: "https://www.niosh.com.my/" },
    { label: "docs.f.method", k: ["docs.seda_niosh.method"] },
  ] },
  {id:"hubspot",types:["external","derived"],name:"src.hubspot_catalogue.name",sourceIds:["hubspot_catalogue"],rows:[
    {label:"docs.f.publisher",ref:"HubSpot Academy"},
    {label:"docs.f.dataset",url:"https://academy.hubspot.com/courses"},
    {label:"docs.f.method",k:["docs.hubspot.method"]},
  ]},
  { id: "freecodecamp", types: ["external"], name: "src.freecodecamp_catalogue.name", sourceIds: ["freecodecamp_catalogue"], rows: [
    { label: "docs.f.publisher", ref: "freeCodeCamp" },
    { label: "docs.f.dataset", url: "https://github.com/freeCodeCamp/freeCodeCamp/blob/main/curriculum/structure/curriculum.json" },
    { label: "docs.f.api", url: "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/client/i18n/locales/english/intro.json" },
    { label: "docs.f.method", k: ["docs.fcc.status"] },
    { label: "docs.f.limits", k: ["docs.fcc.limits"] },
    { label: "docs.f.license", k: ["docs.fcc.license"], url: "https://github.com/freeCodeCamp/freeCodeCamp/blob/main/LICENSE.md" },
  ] },
  { id: "githubskills", types: ["external"], name: "src.githubskills_catalogue.name", sourceIds: ["githubskills_catalogue"], rows: [
    { label: "docs.f.publisher", ref: "GitHub Skills" },
    { label: "docs.f.dataset", url: "https://learn.github.com/skills" },
    { label: "docs.f.api", url: "https://api.github.com/orgs/skills/repos?per_page=100&type=public" },
    { label: "docs.f.method", k: ["docs.githubskills.method"] },
    { label: "docs.f.limits", k: ["docs.githubskills.limits"] },
  ] },
  { id: "huggingface", types: ["external"], name: "src.huggingface_catalogue.name", sourceIds: ["huggingface_catalogue"], rows: [
    { label: "docs.f.publisher", ref: "Hugging Face" },
    { label: "docs.f.dataset", url: "https://huggingface.co/learn" },
    { label: "docs.f.method", k: ["docs.huggingface.method"] },
    { label: "docs.f.limits", k: ["docs.huggingface.limits"] },
  ] },
  { id: "openlearn", types: ["external", "static", "derived"], name: "docs.openlearn.name", sourceIds:["openlearn_catalogue"], rows: [
    {label: "docs.f.publisher", ref: "The Open University · OpenLearn"},
    {label: "docs.f.dataset", url: "https://www.open.edu/openlearn/free-courses/full-catalogue"},
    {label: "docs.f.files", ref: "src/artifacts/api-server/src/data/openlearn.ts"},
    {label: "docs.f.method", k: ["docs.openlearn.method"]},
  ]},
  { id: "sdg", types: ["external", "static", "derived"], name: "docs.name.sdg", sourceIds:["sdg_framework"], rows: [
    { label: "docs.f.publisher", ref: "United Nations, Sustainable Development Goals" },
    { label: "docs.f.dataset", url: "https://sdgs.un.org/goals" },
    { label: "docs.f.files", url: "https://www.un.org/sustainabledevelopment/news/communications-material/" },
    { label: "docs.f.license", url: "/sdg/NOTICE.md" },
    { label: "docs.f.method", k: ["docs.sdg.method"] },
    { label: "docs.f.limits", k: ["docs.sdg.limits"] },
  ] },
  { id: "runpod", types: ["service", "user"], name: "sources.aiTitle", sourceIds: ["gemini", "runpod_main", "runpod_light"], ai: true, rows: [
    { label: "docs.f.publisher", ref: "Google Gemini API + RunPod Serverless (vLLM, OpenAI-compatible)" },
    { label: "docs.f.api", url: "https://ai.google.dev/gemini-api/docs/models" },
    { label: "docs.f.api", url: "https://docs.runpod.io/serverless/vllm/openai-compatibility" },
    { label: "docs.f.method", k: ["docs.ai.checks", "docs.ai.cold", "docs.ai.configured"] },
    { label: "docs.f.limits", k: ["docs.ai.ids", "docs.ai.retrieval"] },
    { label: "docs.f.privacy", k: ["docs.ai.privacy"] },
  ] },
  { id: "demo", types: ["demo", "user"], name: "docs.name.demo", rows: [
    { label: "docs.f.method", k: ["docs.demo.org", "docs.demo.individual", "docs.demo.cv", "docs.account.profile"] },
    { label: "docs.f.privacy", k: ["docs.demo.private"] },
  ] },
];

const TYPES: DocType[] = ["external", "static", "derived", "service", "demo", "user"];
const CATEGORIES = [
  { key: "market", ids: ["dosm", "dosm_jmi", "aei_usage", "aei_exposure", "bls", "career_news"] },
  { key: "jobs", ids: ["himalayas", "remotive", "remoteok"] },
  { key: "career", ids: ["riasec", "onet", "skill_reference"] },
  { key: "learning", ids: ["courses", "hrdcorp", "seda_niosh", "hubspot", "freecodecamp", "githubskills", "huggingface", "openlearn", "sdg"] },
  { key: "aiService", ids: ["runpod"] },
  { key: "privacy", ids: ["tvet_synthetic", "demo"] },
] as const;
const TYPE_TONE: Record<DocType, string> = {
  external: "bg-[hsl(var(--maroon-soft))] text-primary",
  static: "bg-muted text-foreground",
  derived: "bg-[hsl(var(--gold-soft))] text-foreground",
  service: "bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  demo: "border border-dashed border-border text-muted-foreground",
  user: "bg-card border border-border text-foreground",
};

export function TypeTag({ type }: { type: DocType }) {
  const { t } = useT();
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold", TYPE_TONE[type])}>{t(`docs.type.${type}` as DictKey)}</span>;
}

/** Raw server/publisher text, only behind an explicitly labelled technical disclosure. */
export function TechDiagnostics({ text, testId }: { text?: string | null; testId?: string }) {
  const { t } = useT();
  if (!text) return null;
  return (
    <details className="mt-2 text-[11px]" data-testid={testId}>
      <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">{t("docs.tech")}</summary>
      <p className="mt-1 text-muted-foreground">{t("docs.techNote")}</p>
      <pre lang="en" className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-2 font-mono">{text}</pre>
    </details>
  );
}

function LinkOut({ url }: { url: string }) {
  return <a href={url} target="_blank" rel="noreferrer" lang="en" className="inline-flex max-w-full items-start gap-1 break-all font-mono text-[11px] text-primary hover:underline">{url}<ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /></a>;
}

function LiveSource({ s }: { s: MarketSource }) {
  const { t, tk } = useT();
  const f = useFmt();
  const ok = s.status === "ok";
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-xs" data-testid={`docs-live-${s.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{tk("src", `${s.id}.name`)}</span>
        <span className="rounded-full bg-card px-2 py-0.5 font-semibold">{tk("srcStatus", s.status)}</span>
        {s.stale ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">{t("docs.live.stale")}</span>
          : ok && s.refreshCadence !== "reviewed_snapshot" && <span className="text-muted-foreground">{t("docs.live.fresh")}</span>}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        <div><dt className="text-muted-foreground">{t("docs.f.version")}</dt><dd lang="en" className="break-all font-semibold">{s.version ?? t("docs.live.noVersion")}</dd></div>
        <div><dt className="text-muted-foreground">{t("docs.live.dataDate")}</dt><dd className="font-semibold">{s.dataDate ?? t("docs.live.unavailable")}</dd></div>
        <div><dt className="text-muted-foreground">{t(s.refreshCadence === "reviewed_snapshot" ? "docs.live.reviewed" : s.status === "error" ? "docs.live.checked" : "docs.live.fetched")}</dt><dd className="font-semibold">{s.lastFetchedAt ? (s.refreshCadence === "reviewed_snapshot" ? f.date(s.lastFetchedAt) : f.dateTime(s.lastFetchedAt)) : t("docs.live.unavailable")}</dd></div>
        <div><dt className="text-muted-foreground">{t("docs.live.records")}</dt><dd className="tnum font-semibold">{s.recordCount > 0 || ok ? f.num(s.recordCount) : t("docs.live.unavailable")}</dd></div>
      </dl>
      {s.error && <p className="mt-2 text-destructive">{t("docs.live.errorNote")}</p>}
    </div>
  );
}

function LiveAi({ a }: { a: AiStatus }) {
  const { t } = useT();
  const state = (configured: boolean, status: string) => status === "ok" ? t("sources.aiVerified") : !configured ? t("sources.aiNotConfigured") : t("sources.aiUnavailable");
  return (
    <div className="grid gap-2 rounded-xl bg-muted/50 p-3 text-xs sm:grid-cols-3" data-testid="docs-live-ai">
      <div><div className="text-muted-foreground">{t("sources.aiConn")}</div><div className="font-semibold">{a.connected ? t("sources.aiReady") : a.mainConfigured ? t("sources.aiUnavailable") : t("sources.aiNotConfigured")}</div><div lang="en" className="text-muted-foreground">{a.provider}</div></div>
      <div className="min-w-0"><div className="text-muted-foreground">{t("sources.mainModel")}</div><div lang="en" className="truncate font-semibold">{a.mainModel ?? "-"}</div><div>{state(!!a.mainConfigured, a.mainStatus)}</div></div>
      <div className="min-w-0"><div className="text-muted-foreground">{t("sources.lightModel")}</div><div lang="en" className="truncate font-semibold">{a.lightModel ?? "-"}</div><div>{state(!!a.lightModel, a.lightStatus)}</div></div>
    </div>
  );
}

function DocItem({ d, live, ai }: { d: Doc; live: MarketSource[]; ai?: AiStatus }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const mine = live.filter((s) => d.sourceIds?.includes(s.id));
  const body: ReactNode = (
    <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
      {(mine.length > 0 || (d.ai && ai)) && (
        <section>
          <h4 className="mb-1.5 text-xs font-bold">{t(!d.ai && mine.length > 0 && mine.every(s=>s.refreshCadence === "reviewed_snapshot") ? "docs.live.staticTitle" : "docs.live.title")}</h4>
          <div className="space-y-2">{d.ai && ai && <LiveAi a={ai} />}{mine.map((s) => <LiveSource key={s.id} s={s} />)}</div>
          {d.types.includes("external") && <p className="mt-1.5 text-[11px] text-muted-foreground">{t(mine.length > 0 && mine.every(s=>s.refreshCadence === "reviewed_snapshot") ? "docs.live.staticNote" : "docs.live.notRealtime")}</p>}
        </section>
      )}
      <dl className="grid gap-x-4 gap-y-2.5 text-sm md:grid-cols-[10rem_1fr]">
        {d.rows.map((r, i) => (
          <div key={i} className="contents">
            <dt className="text-xs font-semibold text-muted-foreground md:pt-0.5">{t(r.label)}</dt>
            <dd className="min-w-0 space-y-1 leading-relaxed">
              {r.ref && <div lang="en" className="font-medium">{r.ref}</div>}
              {r.k?.map((k) => <p key={k}>{t(k)}</p>)}
              {r.url && <LinkOut url={r.url} />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
  return (
    <article className="rounded-2xl border border-card-border bg-card" data-testid={`doc-${d.id}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left" data-testid={`button-doc-${d.id}`}>
        <span className="min-w-0">
          <span className="block font-semibold">{t(d.name)}</span>
          <span className="mt-1 flex flex-wrap gap-1">{d.types.map((ty) => <TypeTag key={ty} type={ty} />)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><span className="hidden sm:inline">{open ? t("docs.collapse") : t("docs.expand")}</span><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></span>
      </button>
      {open && body}
    </article>
  );
}

export function SourceDocumentation({ sources, ai }: { sources: MarketSource[]; ai?: AiStatus }) {
  const { t } = useT();
  return (
    <Panel className="mt-6" title={t("docs.title")} meta={t("docs.sub")}>
      <dl className="mb-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3" data-testid="docs-types">
        {TYPES.map((ty) => <div key={ty} className="space-y-1"><dt><TypeTag type={ty} /></dt><dd className="text-muted-foreground">{t(`docs.typeDesc.${ty}` as DictKey)}</dd></div>)}
      </dl>
      <div className="space-y-6">{CATEGORIES.map((category) => (
        <section key={category.key} aria-labelledby={`sources-category-${category.key}`}>
          <h3 id={`sources-category-${category.key}`} className="mb-2 text-sm font-semibold text-primary">{t(`docs.category.${category.key}` as DictKey)}</h3>
          <div className="space-y-2">{category.ids.map((id) => {
            const d = DOCS.find((entry) => entry.id === id)!;
            return <DocItem key={d.id} d={d} live={sources} ai={ai} />;
          })}</div>
        </section>
      ))}</div>
    </Panel>
  );
}
