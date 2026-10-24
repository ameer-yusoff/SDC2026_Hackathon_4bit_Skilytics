import { AnalysisEvidence, ScenarioMath } from "./scenario-reason";
import { MarketGuide, usePortalGuide } from "./portal-guides";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { customFetch, useListCourses } from "@workspace/api-client-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  useCompany,
  enterprisePost,
  enterpriseGet,
  type CompanyAnalysis,
} from "@/lib/enterprise";
import { useT } from "@/i18n";
import { institutionWords } from "@/i18n/institution";
import { marketWords } from "@/i18n/market";
import { skillLabel } from "@/lib/skill-label";
import {
  PageHeader,
  Panel,
  Stat,
  Rows,
  ErrorBox,
  Meter,
  Markdown,
  SdgBadge,
} from "./kit";
import { PageGuide } from "./page-guide";
import { HorizonSlider, ChangingValue } from "./projection-feedback";
import { CompanyAdvisor } from "./company-advisor";
import { MarketOutlook } from "./market-outlook";
import { MarketSkills, jobWords } from "./market-skills";
import { Courses } from "@/pages/catalog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import fixture from "../../../../synthetic-data/tvet/graduate-employment-2024-2026.json";
const annual = [2024, 2025, 2026].map((year) => {
  const rows = fixture.rows.filter((r) => r.year === year);
  const graduates = rows.reduce((n, r) => n + r.graduates, 0),
    employed = rows.reduce((n, r) => n + r.employedWithinSixMonths, 0);
  return { year, graduates, employed, rate: (employed / graduates) * 100 };
});
function Guide({body,title}:{body:string;title:string}) {
 const {lang}=useT(),w=institutionWords[lang],guide=usePortalGuide();
 return <PageGuide title={w.guide} steps={[
  {title,body},
  {title:w.students,body:guide.intakeBody},
  {title:w.compulsory,body:guide.requiredBody},
  ...(title===w.dashboard?[{title:w.future,body:guide.gradsBody}]:[])
 ]}/>;
}
function OutcomeChart({ years = 0 }: { years?: number }) {
  const { lang } = useT(),
    w = institutionWords[lang];
  const baseline = annual.at(-1)!.rate;
  const data = [
    ...annual.map((r) => ({
      ...r,
      history: r.rate,
      scenario: r.year === 2026 ? r.rate : null,
    })),
    ...Array.from({ length: years }, (_, n) => ({
      year: 2027 + n,
      history: null,
      scenario: Math.min(100, baseline + 2 * (n + 1)),
    })),
  ];
  return (
    <div>
      <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold">
        {w.synthetic}
      </p>
      <div className="h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20, right: 12 }}>
            <CartesianGrid strokeDasharray="3 4" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(n) => `${n}%`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(n: number, name: string) => [`${n.toFixed(1)}%`, name]}
            />
            <Line
              name={w.history}
              dataKey="history"
              stroke="#7a1523"
              strokeWidth={3}
            />
            {years>0 && <Line
              name={w.scenario}
              dataKey="scenario"
              stroke="#bd8b14"
              strokeDasharray="5 4"
              strokeWidth={3}
            />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{w.method}</p>
      <a
        className="mt-2 inline-block text-xs text-primary underline"
        href="/synthetic-data/graduate-employment-2024-2026.json"
        download
      >
        graduate-employment-2024-2026.json
      </a>
    </div>
  );
}
export function InstitutionDashboard() {
  const { lang } = useT(),
    w = institutionWords[lang],
    q = useCompany(),
    c = q.data;
  return (
    <>
      <PageHeader
        title={c?.organization ?? w.dashboard}
        sub={w.sub}
        help={<Guide title={w.dashboard} body={w.guideDash} />}
      />
      {q.isLoading ? (
        <Rows n={4} />
      ) : q.isError || !c ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{w.current}</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={w.students} value={c.profileCount} />
            <Stat label={w.active} value={c.activeCount} />
            <Stat
              label={w.completed}
              value={`${c.completedCourses}/${c.totalCourses}`}
            />
            <Stat label={w.gap} value={c.avgGap.toFixed(1)} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title={w.history}>
              <OutcomeChart />
            </Panel>
            <Panel title={w.gaps}>
              <div className="space-y-4">
                {c.topGaps.map((g) => (
                  <div key={g.name}>
                    <p className="mb-1 text-sm font-semibold">
                      {skillLabel(g.name, lang)}
                    </p>
                    <Meter
                      value={g.count}
                      max={Math.max(1, c.profileCount)}
                      label={`${g.count}/${c.profileCount}`}
                    />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title={w.all} className="lg:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                {c.members.map((m) => (
                  <Link
                    key={m.id}
                    href={`/tvet/students/${m.id}/intake`}
                    className="rounded-xl border p-4 hover:border-primary"
                  >
                    <b>{m.name}</b>
                    <p className="my-2 text-xs text-muted-foreground">
                      {m.targetRole ?? "—"} · {m.riasecCode ?? "—"}
                    </p>
                    <Meter
                      value={m.completedCourses}
                      max={Math.max(1, m.totalCourses)}
                      label={`${m.completedCourses}/${m.totalCourses}`}
                    />
                    {m.nextDeadline && (
                      <p className="mt-2 text-xs font-bold text-primary">
                        {m.nextDeadline}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
              {!c.profileCount && <p>{w.empty}</p>}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
export function InstitutionFuture() {
  const { lang } = useT(),
    w = institutionWords[lang],
    m = marketWords[lang];
  const [tab, setTab] = useState("institution");
  return (
    <>
      <PageHeader
        title={
          tab === "institution"
            ? w.future
            : tab === "skills"
              ? jobWords[lang].title
              : m.title
        }
        sub={
          tab === "institution"
            ? w.synthetic
            : tab === "skills"
              ? jobWords[lang].note
              : m.sub
        }
        help={<MarketGuide role="tvet"/>}
      />
      <div
        role="tablist"
        className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border bg-card p-1 sm:grid-cols-4"
      >
        {[
          ["institution", w.future],
          ["ai", m.ai],
          ["demand", m.demand],
          ["skills", jobWords[lang].tab],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-11 rounded-xl px-2 text-xs font-semibold sm:text-sm ${tab === id ? "bg-primary text-primary-foreground" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "institution" ? (
        <GraduateProjection />
      ) : tab === "skills" ? (
        <MarketSkills employer hideHeader />
      ) : (
        <MarketOutlook
          hideHeader
          hideGuide
          selectedMode={tab === "demand" ? "demand" : "ai"}
        />
      )}
    </>
  );
}
function GraduateProjection() {
  const { lang } = useT(),
    w = institutionWords[lang],
    q = useCompany(),
    c = q.data;
  const [years, setYears] = useState(3),
    [saved, setSaved] = useState<Record<string, CompanyAnalysis>>({});
  const fingerprint = JSON.stringify(c ? { ...c, updatedAt: undefined } : null),
    key = `${fingerprint}:${years}`;
  const existing = useQuery({
    queryKey: ["institution-analysis", fingerprint, years],
    queryFn: () =>
      enterpriseGet<CompanyAnalysis>(`future/analysis?years=${years}`),
    enabled: !!c && !saved[key],
    retry: false,
  });
  const result = saved[key] ?? existing.data;
  const ai = useMutation({
    mutationFn: async ({ at, forKey }: { at: number; forKey: string }) => ({
      forKey,
      result: await enterprisePost<CompanyAnalysis>("future/analysis", {
        years: at,
      }),
    }),
    onSuccess: ({ forKey, result }) =>
      setSaved((old) => ({ ...old, [forKey]: result })),
  });
  if (q.isLoading) return <Rows n={3} />;
  if (!c || q.isError)
    return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  const latest = annual.at(-1)!,
    scenario = Math.min(100, latest.rate + 2 * years);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={w.students} value={c.profileCount} />
        <Stat label={w.baseline} value={`${latest.rate.toFixed(1)}%`} />
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs">
            {w.scenario} · {2026 + years}
          </p>
          <ChangingValue
            value={scenario.toFixed(1)}
            className="mt-2 text-3xl font-bold text-primary"
          >
            {scenario.toFixed(1)}%
          </ChangingValue>
        </div>
        <Stat label={w.gap} value={c.avgGap.toFixed(1)} />
      </div>
      <Panel title={w.history} meta={w.scenarioNote}>
        <HorizonSlider
          id="graduate-years"
          baseYear={2026}
          years={years}
          onChange={setYears}
          label={w.years}
        />
        <OutcomeChart years={years} />
        <div className="mt-4"><ScenarioMath mode="graduate" years={years} baseYear={2026} rows={[{name:w.future,previous:Math.min(100,latest.rate+2*(years-1)),selected:scenario}]}/></div>
      </Panel>
      <Panel title={w.advice} meta={w.synthetic}>
        <Button
          disabled={ai.isPending}
          onClick={() => ai.mutate({ at: years, forKey: key })}
        >
          {ai.isPending ? "…" : w.analyse}
        </Button>
        {ai.isError && <ErrorBox error={ai.error} />}
        {result && (
          <div className="mt-4 text-sm">
            <Markdown>{result.translations[lang]}</Markdown>
            <AnalysisEvidence sources={result.sources} model={result.model}/>
            {result.id > 0 && (
              <CompanyAdvisor
                key={result.id}
                analysis={result}
                years={years}
                institution
              />
            )}
          </div>
        )}
      </Panel>
      <Panel title={w.all}>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.members.map((m) => (
            <Link
              key={m.id}
              href={`/tvet/students/${m.id}/intake`}
              className="rounded-xl border p-3"
            >
              <b>{m.name}</b>
              <p className="my-2 text-xs">{m.targetRole ?? "—"}</p>
              <Meter
                value={m.completedCourses}
                max={Math.max(1, m.totalCourses)}
                label={`${m.completedCourses}/${m.totalCourses}`}
              />
              <p className="mt-2 text-xs">
                {w.gaps}: {m.remainingGap}
              </p>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
export function InstitutionCourses() {
  const { lang } = useT(),
    w = institutionWords[lang],
    qc = useQueryClient();
  const q = useQuery({
    queryKey: ["institution-compulsory"],
    queryFn: () =>
      customFetch<{ courseIds: number[] }>("/api/institution/compulsory"),
  });
  const courses = useListCourses();
  const [selected, setSelected] = useState<number[]>([]),
    [dirty, setDirty] = useState(false),
    [search, setSearch] = useState("");
  useEffect(() => {
    if (q.data && !dirty) setSelected(q.data.courseIds);
  }, [q.data, dirty]);
  const save = useMutation({
    mutationFn: () =>
      customFetch<{ courseIds: number[] }>("/api/institution/compulsory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds: selected }),
      }),
    onSuccess: async (result) => {
      qc.setQueryData(["institution-compulsory"], result);
      setDirty(false);
      await qc.invalidateQueries();
    },
  });
  const available = courses.data ?? [];
  const options = available
    .filter(
      (c) =>
        `${c.title} ${c.provider}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (search.trim() || c.durationHours !== null),
    )
    .slice(0, 8);
  return (
    <>
      <PageHeader title={w.courses} help={<Guide title={w.courses} body={w.guideCourses} />} />
      <Panel title={w.compulsory} meta={w.policy} className="mb-6">
        {q.isError && <ErrorBox error={q.error} retry={() => q.refetch()} />}
        <p className="my-3 text-xs text-muted-foreground">{w.budget}</p>
        <div className="mb-3 space-y-2">
          {selected.map((id) => {
            const c = available.find((c) => c.id === id);
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-primary/5 p-3"
              >
                <div className="min-w-0">
                  <b className="text-sm">{c?.title ?? id}</b>
                  <p className="text-xs text-muted-foreground">{c?.provider}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`${lang === "ms" ? "Buang" : lang === "zh" ? "移除" : "Remove"} ${c?.title ?? id}`}
                  onClick={() => {
                    setSelected((ids) => ids.filter((k) => k !== id));
                    setDirty(true);
                  }}
                >
                  ×
                </Button>
              </div>
            );
          })}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={w.search}
          aria-label={w.search}
        />
        <div className="my-3 grid gap-2 md:grid-cols-2">
          {options
            .filter((c) => !selected.includes(c.id))
            .map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={
                  c.durationHours === null ||
                  selected.length >= 10 ||
                  q.isPending
                }
                title={c.durationHours === null ? w.duration : undefined}
                onClick={() => {
                  setSelected((ids) => [...ids, c.id]);
                  setDirty(true);
                }}
                className="rounded-xl border p-3 text-left text-sm hover:border-primary disabled:opacity-40"
              >
                <b>{c.title}</b>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.provider} · {c.durationHours ?? "—"}h · RM {c.costMyr}
                </p>
              </button>
            ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-bold">
            {w.selected}: {selected.length}/10
          </span>
          <Button
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending || q.isPending}
          >
            {w.save}
          </Button>
        </div>
        {save.isSuccess && !dirty && (
          <p role="status" className="mt-3 text-sm text-primary">
            {w.saved}
          </p>
        )}
        {save.isError && <ErrorBox error={save.error} />}
      </Panel>
      <Courses hideHeader />
    </>
  );
}
