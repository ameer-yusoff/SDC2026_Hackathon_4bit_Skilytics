import {useFutureScenario} from "./future-scenario";
import {TeamHeatmap} from "./team-heatmap";
import { AnalysisEvidence, ScenarioMath } from "./scenario-reason";
import { MarketGuide, usePortalGuide } from "./portal-guides";
import type { ReactNode } from "react";
import { CompanyAdvisor } from "./company-advisor";
import { ChangingValue, HorizonSlider } from "./projection-feedback";
import { MarketSkills, jobWords } from "./market-skills";
import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, ArrowRight } from "lucide-react";
import { useT } from "@/i18n";
import { marketWords } from "@/i18n/market";
import { enterpriseWords } from "@/i18n/enterprise";
import {
  useCompany,
  enterprisePost,
  enterpriseGet,
  type CompanyAnalysis,
  type CompanyMember,
} from "@/lib/enterprise";
import { scenarioPercent } from "@/lib/market-scenario";
import { skillLabel } from "@/lib/skill-label";
import { PageGuide } from "./page-guide";
import {
  ErrorBox,
  Rows,
  Panel,
  Stat,
  Meter,
  Markdown,
  PageHeader,
} from "./kit";
import { Button } from "./ui/button";
import { MarketOutlook } from "./market-outlook";

function TeamGuide() {
 const {lang}=useT(),w=enterpriseWords[lang],guide=usePortalGuide();
 return <PageGuide title={w.guide} steps={[
  {title:w.dashboard,body:w.guideDashboard},
  {title:lang==="ms"?"Peta kemahiran pasukan":lang==="zh"?"团队技能地图":"Team skill map",body:lang==="ms"?"Warna membezakan bukti profil, anggaran pengalaman, kursus selesai dan kemahiran untuk dipelajari. Scroll jadual ke sisi dan tekan tajuk kemahiran untuk cari kursus.":lang==="zh"?"颜色区分资料已有、经历推测、课程完成与待学技能。横向滚动表格，点击技能标题查找课程。":"Colours separate profile evidence, experience suggestions, course completions and skills to learn. Scroll the table sideways and tap a skill header to find courses."},
  {title:w.due,body:guide.progressBody},
  {title:w.employees,body:guide.intakeBody},
  {title:w.company,body:guide.companyBody}
 ]}/>;
}
export function EnterpriseDashboard() {
  const { lang } = useT(),
    w = enterpriseWords[lang],
    q = useCompany(),
    c = q.data;
  return (
    <>
      <PageHeader
        title={c?.organization ?? w.dashboard}
        sub={w.dashboardSub}
        help={<TeamGuide />}
      />
      {q.isLoading ? (
        <Rows n={4} />
      ) : q.isError || !c ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={w.employees} value={c.profileCount} />
            <Stat
              label={w.active}
              value={`${c.activeCount} / ${c.profileCount}`}
              tone="maroon"
            />
            <Stat
              label={w.completed}
              value={`${c.completedCourses} / ${c.totalCourses}`}
              tone="gold"
            />
            <Stat label={w.gap} value={c.avgGap.toFixed(1)} />
          </div>
          <TeamHeatmap company={c}/>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title={w.due}>
              {c.members.filter((m) => m.nextDeadline).length ? (
                <ul className="space-y-2">
                  {[...c.members]
                    .filter((m) => m.nextDeadline)
                    .sort((a, b) =>
                      a.nextDeadline!.localeCompare(b.nextDeadline!),
                    )
                    .slice(0, 6)
                    .map((m) => (
                      <li key={m.id}>
                        <Link
                          className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-sm"
                          href={`/hr/members/${m.id}/intake`}
                        >
                          <b>{m.name}</b>
                          <time className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 font-semibold">
                            {m.nextDeadline}
                          </time>
                        </Link>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{w.noDue}</p>
              )}
              <Link
                href="/hr/members"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
              >
                {w.employees}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Panel>
            <Panel title={w.gaps} meta={w.notEvidence}>
              <div className="space-y-3">
                {c.topGaps.map((g) => (
                  <div
                    key={g.name}
                    className="grid grid-cols-[1fr_5rem] items-center gap-3 text-sm"
                  >
                    <span>{skillLabel(g.name, lang)}</span>
                    <Meter
                      value={g.count}
                      max={Math.max(1, c.profileCount)}
                      label={String(g.count)}
                    />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title={w.capacity} meta={w.reported}>
              <div className="space-y-3">
                {c.members.map((m) => (
                  <div key={m.id}>
                    <Link
                      href={`/hr/members/${m.id}/intake`}
                      className="mb-1 flex min-h-10 items-center justify-between gap-3 text-sm"
                    >
                      <b>{m.name}</b>
                      <span>
                        {m.totalCourses
                          ? `${m.completedCourses} / ${m.totalCourses}`
                          : w.notStarted}
                      </span>
                    </Link>
                    <Meter
                      value={m.completedCourses}
                      max={Math.max(1, m.totalCourses)}
                      tone="gold"
                    />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title={w.company}
              meta={w.source}
              className="flex h-full flex-col justify-between"
            >
              <div className="flex flex-1 flex-col justify-between gap-4">
                <div className="flex flex-1 flex-col justify-center py-2 lg:py-6">
                  <div className="space-y-2 lg:space-y-3">
                    <p className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl lg:text-6xl xl:text-7xl">
                      {c.avgExposure == null
                        ? "—"
                        : `${(c.avgExposure * 100).toFixed(1)}%`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-lg bg-[hsl(var(--maroon-soft))] px-2.5 py-1 text-xs font-semibold text-primary lg:text-sm">
                        {w.now}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground lg:text-base">
                        · {c.exposureCoverage}/{c.profileCount}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href="/market"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95 lg:min-h-12 lg:px-6 lg:text-base"
                  >
                    {w.future} →
                  </Link>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
export function CompanyFuture() {
  const { lang } = useT(),
    w = enterpriseWords[lang];
  const [tab, setTab] = useState("company");
  return (
    <>
      <PageHeader
        title={
          tab === "company"
            ? w.company
            : tab === "skills"
              ? jobWords[lang].title
              : marketWords[lang].title
        }
        sub={
          tab === "company"
            ? w.source
            : tab === "skills"
              ? jobWords[lang].note
              : marketWords[lang].sub
        }
        help={<MarketGuide role="hr"/>}
      />
      <div className="mb-5">
        <div
          role="tablist"
          className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl border bg-card p-1"
        >
          {[
            ["company", w.company],
            ["ai", marketWords[lang].ai],
            ["demand", marketWords[lang].demand],
            ["skills", jobWords[lang].tab],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`min-h-11 rounded-xl px-2 text-xs font-semibold sm:px-3 sm:text-sm ${tab === id ? "bg-primary text-primary-foreground" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "company" ? (
        <CompanyProjection />
      ) : tab === "skills" ? (
        <MarketSkills employer hideHeader />
      ) : (
        <MarketOutlook
          hideGuide
          hideHeader
          selectedMode={tab === "demand" ? "demand" : "ai"}
        />
      )}
    </>
  );
}
function ProjectionMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
function CompanyProjection() {
  const [scenario] = useFutureScenario();
  const { lang } = useT(),
    w = enterpriseWords[lang],
    q = useCompany(),
    c = q.data;
  const [years, setYears] = useState(3);
  const [saved, setSaved] = useState<Record<string, CompanyAnalysis>>({});
  const fingerprint = JSON.stringify(c ? { ...c, updatedAt: undefined } : null);
  const localResult = saved[`${fingerprint}:${years}:${scenario}`];

  const existingQuery = useQuery({
    queryKey: ["company-analysis", fingerprint, years, scenario],
    queryFn: () =>
      enterpriseGet<CompanyAnalysis>(`future/analysis?years=${years}&scenario=${scenario}`),
    enabled: !!c && !localResult,
    retry: false,
  });

  const result = localResult || existingQuery.data;

  const ai = useMutation({
    mutationFn: async ({ years: at, key }: { years: number; key: string }) => ({
      key,
      result: await enterprisePost<CompanyAnalysis>("future/analysis", {
        years: at, scenario:scenario,
      }),
    }),
    onSuccess: ({ key, result: res }) =>
      setSaved((v) => ({ ...v, [key]: res })),
  });
  if (q.isLoading) return <Rows n={4} />;
  if (q.isError || !c)
    return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  const projected = (exposure: number | null, n: number) =>
    scenarioPercent("ai", { aiExposure: exposure, projection: null }, n, scenario);
  const chart = Array.from({ length: years + 1 }, (_, n) => ({
    year: new Date().getFullYear() + n,
    observed: n === 0 && c.avgExposure !== null ? 100 * c.avgExposure : null,
    scenario: projected(c.avgExposure, n),
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ProjectionMetric
          label={w.coverage}
          value={`${c.exposureCoverage} / ${c.profileCount}`}
        />
        <ProjectionMetric
          label={`${w.now} · ${new Date().getFullYear()}`}
          value={
            c.avgExposure == null ? "—" : `${(c.avgExposure * 100).toFixed(1)}%`
          }
        />
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            {w.scenario} · {new Date().getFullYear() + years}
          </p>
          <ChangingValue
            value={
              projected(c.avgExposure, years) == null
                ? "—"
                : `${projected(c.avgExposure, years)!.toFixed(1)}%`
            }
            className="mt-2 text-3xl font-extrabold text-primary"
          />
        </div>
        <ProjectionMetric label={w.gap} value={c.avgGap.toFixed(1)} />
      </div>
      <Panel title={w.scenario} meta={w.scenarioNote}>
        <HorizonSlider
          id="company-years"
          years={years}
          onChange={setYears}
          label={w.years}
        />
        {c.avgExposure === null ? (
          <p>{w.unknown}</p>
        ) : (
          <div
            className="h-64 w-full"
            role="img"
            aria-label={`${w.scenario}: ${projected(c.avgExposure, years)!.toFixed(1)}%`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chart}
                margin={{ left: 0, right: 12, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  width={38}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(1)}%`, w.scenario]}
                />
                <Line
                  type="monotone"
                  dataKey="scenario"
                  stroke="#7a1523"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  dot
                />
                <Line dataKey="observed" stroke="#c69214" dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {w.coverage}: {c.exposureCoverage} / {c.profileCount}
        </p>
      </Panel>
      <Panel title={lang === "ms"?"Kenapa nilai tahun ini berubah?":lang === "zh"?"为什么该年份的数值变化？":"Why does this year change?"}>
        <ScenarioMath mode="ai" years={years} rows={[{name:w.company,previous:c.avgExposure==null?null:100*(1-(1-c.avgExposure)*.95**(years-1)),selected:c.avgExposure==null?null:100*(1-(1-c.avgExposure)*.95**years)}]}/>
      </Panel>
      <Panel title={w.analysis} meta={w.saved}>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={ai.isPending || !c.profileCount}
            onClick={() => ai.mutate({ years, key: `${fingerprint}:${years}:${scenario}` })}
            className="shadow-sm font-semibold"
          >
            {ai.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {w.analyse}
          </Button>
          {result && (
            <span className="text-xs text-muted-foreground">
              {result.cached ? "✓ Saved" : "✓ Updated"}
            </span>
          )}
        </div>
        {ai.isPending && (
          <p className="mt-3 animate-pulse text-sm text-primary font-medium">
            {w.loading}
          </p>
        )}
        {ai.isError && (
          <div className="mt-3">
            <ErrorBox
              error={ai.error}
              retry={() => ai.mutate({ years, key: `${fingerprint}:${years}:${scenario}` })}
            />
          </div>
        )}
        {result && (
          <div className="mt-5 text-sm leading-relaxed rounded-2xl border border-primary/20 bg-card/60 p-4 sm:p-5 shadow-sm">
            <Markdown>{result.translations[lang]}</Markdown>
            <AnalysisEvidence sources={result.sources} model={result.model}/>
            <CompanyAdvisor key={result.id} analysis={result} years={years} />
          </div>
        )}
      </Panel>
      <Panel title={w.all} meta={w.reported}>
        <ul className="space-y-3">
          {c.members.map((m) => (
            <EmployeeProjection key={m.id} m={m} years={years} />
          ))}
        </ul>
        {!c.members.length && <p>{w.empty}</p>}
      </Panel>
      <p className="text-xs text-muted-foreground">
        {w.source}{" "}
        <Link className="underline" href="/sources">
          O*NET · Anthropic Economic Index
        </Link>
      </p>
    </div>
  );
}
function EmployeeProjection({ m, years }: { m: CompanyMember; years: number }) {
  const { lang } = useT(),
    w = enterpriseWords[lang];
  const [scenario] = useFutureScenario();
  const value = scenarioPercent(
    "ai",
    { aiExposure: m.exposure, projection: null },
    years, scenario,
  );
  return (
    <li className="rounded-xl border p-3">
      <div className="grid items-center gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
        <Link href={`/hr/members/${m.id}/intake`} className="min-w-0">
          <b className="block break-words text-sm">{m.name}</b>
          <span className="text-xs text-muted-foreground">{m.currentRole}</span>
        </Link>
        <div className="text-xs">
          <span>
            {w.now}:{" "}
            {m.exposure === null ? "—" : `${(m.exposure * 100).toFixed(1)}%`} →{" "}
            <ChangingValue
              value={value === null ? "—" : `${value.toFixed(1)}%`}
              className="text-lg font-extrabold text-primary"
            />
          </span>
          <Meter value={value} max={100} tone="slate" />
          {value === null && <span>{w.unknown}</span>}
        </div>
        <div className="text-xs">
          <b>
            {w.progress}: {m.completedCourses}/{m.totalCourses}
          </b>
          <p className="mt-1 text-muted-foreground">
            {w.gaps}: {m.remainingGap}
          </p>
        </div>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-semibold">{w.gaps}</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {m.gaps.map((g) => (
            <span key={g} className="rounded bg-muted px-2 py-1">
              {skillLabel(g, lang)}
            </span>
          ))}
        </div>
      </details>
    </li>
  );
}
