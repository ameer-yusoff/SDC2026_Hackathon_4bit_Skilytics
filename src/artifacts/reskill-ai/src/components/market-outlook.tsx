import { ChangingValue, HorizonSlider } from "./projection-feedback";
import { GuideButton } from "./page-guide";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import {
  ArrowRight,
  ChevronDown,
  CircleHelp,
  RefreshCw,
  Loader2,
  TrendingUp,
  Cpu,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { customFetch } from "@workspace/api-client-react";
import { useT } from "@/i18n";
import { roleTitle } from "@/lib/fmt";
import { scenarioPercent } from "@/lib/market-scenario";
import { marketWords } from "@/i18n/market";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ErrorBox, Rows, SdgBadge } from "./kit";
import { roleGoals } from "./matcher-skill-map";

type Tri = { en: string; ms: string; zh: string };
type Candidate = {
  roleId: number;
  title: string;
  titleMs: string;
  titleZh: string;
  sector: string;
  socCode: string;
  aiExposure: number | null;
  usageMy: number | null;
  projection: { growthPct: number; annualOpenings: number } | null;
  reason: Tri | null;
  confidence: "low" | "medium" | null;
};
type News = {
  title: string;
  url: string;
  domain: string;
  seenAt: string;
  region: "my" | "global";
};
type Outlook = {
  generated: boolean;
  generatedAt: string | null;
  model: string | null;
  baseYear: number;
  horizon: number;
  ai: Candidate[];
  demand: Candidate[];
  note: Tri | null;
  sources: { label: string; url: string; dataDate: string | null }[];
  reviewedAt: string;
  projectionPeriod: string;
  news?: {
    articles: News[];
    fetchedAt: string | null;
    stale: boolean;
    providers?: string[];
  };
};
const colors = ["#821326", "#087f8c", "#9a6700"];
const CONTEXT_YEARS = 10;
function Goals({ role }: { role: Candidate }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roleGoals(role).map((code, i) => (
        <SdgBadge key={code} code={code} primary={i === 0} compact />
      ))}
    </div>
  );
}
export function MarketOutlook({
  selectedMode,
  hideGuide = false,
  hideHeader = false,
}: {
  selectedMode?: "ai" | "demand";
  hideGuide?: boolean;
  hideHeader?: boolean;
} = {}) {
  const { lang } = useT(),
    w = marketWords[lang];
  const qc = useQueryClient();
  const search = new URLSearchParams(useSearch());
  const inputYear = Number(search.get("years"));
  const [horizon, setHorizon] = useState(
    Number.isInteger(inputYear) && inputYear >= 1 && inputYear <= 10
      ? inputYear
      : 3,
  );
  const [mode, setMode] = useState<"ai" | "demand">(
    search.get("view") === "demand" ? "demand" : "ai",
  );
  useEffect(() => {
    if (selectedMode) setMode(selectedMode);
  }, [selectedMode]);
  const [visible, setVisible] = useState(5);
  const [guide, setGuide] = useState(false),
    [step, setStep] = useState(0);
  const tried = useRef(false);
  // One public 10-year explanation; dragging and translating never call the model.
  const key = ["public-market-outlook", CONTEXT_YEARS];
  const q = useQuery({
    queryKey: key,
    queryFn: () =>
      customFetch<Outlook>(`/api/market/outlook?horizon=${CONTEXT_YEARS}`),
    staleTime: 300000,
    refetchInterval: 300000,
    retry: false,
  });
  const generate = useMutation({
    mutationFn: () =>
      customFetch<Outlook>("/api/market/outlook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizon: CONTEXT_YEARS }),
      }),
    onSuccess: (data) => qc.setQueryData(key, data),
  });
  useEffect(() => {
    if (q.data && !q.data.generated && !tried.current && !generate.isPending) {
      tried.current = true;
      generate.mutate();
    }
  }, [q.data, generate.isPending]);
  const data = q.data,
    list = data?.[mode] ?? [],
    top = list.slice(0, 3);
  const locale = { en: "en-GB", ms: "ms-MY", zh: "zh-CN" }[lang];
  const year = (data?.baseYear ?? new Date().getFullYear()) + horizon;
  const yearWord = (n: number) => (lang === "en" && n === 1 ? "year" : w.year);
  const pct = (value: number | null, signed = false) =>
    value == null
      ? "—"
      : `${signed && value > 0 ? "+" : ""}${value.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
  const metric = (r: Candidate, n = horizon) =>
    pct(scenarioPercent(mode, r, n), mode === "demand");
  const chart = Array.from({ length: 11 }, (_, n) => ({
    n,
    ...Object.fromEntries(
      top.map((r, i) => [`r${i}`, scenarioPercent(mode, r, n)]),
    ),
  }));
  const label = mode === "ai" ? w.aiMetric : w.demandMetric;
  const details = (r: Candidate, includeGoals = true) => (
    <>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {r.reason?.[lang] ?? (mode === "ai" ? w.aiLimit : w.limit)}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {includeGoals && <Goals role={r} />}
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-primary"
          href={`/roles/${r.roleId}?from=market&years=${horizon}&view=${mode}`}
        >
          {w.next}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {r.confidence && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {w.confidence}: {w[r.confidence]}
        </p>
      )}
      {!r.reason && (
        <p className="mt-2 text-[10px] text-muted-foreground">{w.observed}</p>
      )}
    </>
  );
  return (
    <div className="space-y-5">
      {!hideHeader && (
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{w.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{w.sub}</p>
          </div>
          {!hideGuide && (
            <GuideButton
              label={w.guide}
              onClick={() => {
                setStep(0);
                setGuide(true);
              }}
            />
          )}
        </header>
      )}
      <section
        className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6"
        aria-label={w.trend}
        data-testid="market-trend"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-bold">{w.graph}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{w.graphSub}</p>
          </div>
          <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            {w.scenario}
          </span>
        </div>
        <div className="my-5">
          <HorizonSlider
            id="market-years"
            years={horizon}
            onChange={setHorizon}
            baseYear={data?.baseYear}
            label={w.years}
          />
        </div>
        {q.isLoading ? (
          <Rows n={1} h="h-52" />
        ) : q.isError ? (
          <ErrorBox error={q.error} retry={() => q.refetch()} />
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold">{label} (%)</p>
            <div className="h-56 w-full min-w-0 sm:h-64" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chart}
                  margin={{ top: 12, right: 16, bottom: 8, left: -18 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 5"
                    vertical={false}
                    stroke="currentColor"
                    opacity={0.12}
                  />
                  <XAxis
                    dataKey="n"
                    type="number"
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tickFormatter={(n) => (n === 0 ? w.now : `+${n}`)}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={mode === "ai" ? [0, 100] : [0, "auto"]}
                    tickFormatter={(n) => `${n}%`}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(n) =>
                      `${(data?.baseYear ?? new Date().getFullYear()) + Number(n)}`
                    }
                    formatter={(v: number) => pct(v, mode === "demand")}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <ReferenceLine
                    x={horizon}
                    stroke="#6b6264"
                    strokeDasharray="4 4"
                    label={{
                      value: `${year}`,
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  {top.map((r, i) => (
                    <Line
                      key={r.roleId}
                      dataKey={`r${i}`}
                      name={roleTitle(r, lang)}
                      type="monotone"
                      stroke={colors[i]}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {top.map((r, i) => (
                <div
                  key={r.roleId}
                  className="flex min-w-0 items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: colors[i] }}
                  />
                  <span className="min-w-0 flex-1 break-words">
                    #{i + 1} {roleTitle(r, lang)}
                  </span>
                  <ChangingValue
                    value={metric(r)}
                    className="font-bold text-primary"
                  />
                </div>
              ))}
            </div>
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer py-2 text-muted-foreground">
                {w.table}
              </summary>
              <table className="w-full text-left">
                <caption className="sr-only">
                  {label} · {year}
                </caption>
                <thead>
                  <tr>
                    <th className="py-2">{w.more}</th>
                    <th>{w.now}</th>
                    <th>{year}</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r) => (
                    <tr key={r.roleId} className="border-t">
                      <th className="py-2 pr-2 font-normal">
                        {roleTitle(r, lang)}
                      </th>
                      <td className="pr-2">{metric(r, 0)}</td>
                      <td>
                        <ChangingValue value={metric(r)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {mode === "ai" ? w.aiAssumption : w.demandAssumption}
        </p>
      </section>
      {!selectedMode && (
        <div
          className="flex w-fit max-w-full rounded-xl bg-muted p-1"
          role="tablist"
          aria-label={w.title}
        >
          {(["ai", "demand"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setVisible(5);
              }}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold sm:text-sm ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {m === "ai" ? (
                <Cpu className="h-4 w-4 shrink-0" />
              ) : (
                <TrendingUp className="h-4 w-4 shrink-0" />
              )}
              {w[m]}
            </button>
          ))}
        </div>
      )}
      {data && (
        <>
          <p className="text-xs font-semibold">
            {data.generated ? w.estimate : w.observed} · {w.forecast} {year}
          </p>
          {generate.isPending && (
            <p
              className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-xs"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {w.loading}
            </p>
          )}
          {generate.isError && (
            <Button
              variant="outline"
              className="min-h-11 text-xs"
              onClick={() => generate.mutate()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {w.retry}
            </Button>
          )}
          {!list.length ? (
            <p className="text-sm">{w.empty}</p>
          ) : (
            <div className="grid items-stretch gap-3 md:grid-cols-3">
              {top.map((r, i) => (
                <article
                  key={r.roleId}
                  className={`flex min-w-0 flex-col rounded-2xl border p-5 ${i === 0 ? "border-accent bg-[hsl(var(--gold-soft))] md:order-2" : i === 1 ? "bg-card md:order-1 md:mt-8" : "bg-card md:order-3 md:mt-14"}`}
                >
                  <span className="text-3xl font-black text-accent">
                    #{i + 1}
                  </span>
                  <h2 className="mt-2 text-lg font-bold leading-snug">
                    {roleTitle(r, lang)}
                  </h2>
                  <div className="my-4 rounded-xl bg-background/70 p-3">
                    <p className="text-[10px] text-muted-foreground">
                      {label} · {year}
                    </p>
                    <p
                      className="mt-1 text-3xl font-extrabold tabular-nums text-primary"
                      data-testid={`market-value-${r.roleId}`}
                    >
                      <ChangingValue value={metric(r)} />
                    </p>
                    <p className="mt-2 border-t pt-2 text-[10px] text-muted-foreground">
                      {mode === "ai" ? w.exposure : w.growth}:{" "}
                      {mode === "ai"
                        ? pct(r.aiExposure == null ? null : r.aiExposure * 100)
                        : pct(r.projection?.growthPct ?? null, true)}
                    </p>
                  </div>
                  <div className="mt-auto">{details(r)}</div>
                </article>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {mode === "ai" ? w.aiLimit : w.limit}
          </p>
          {list.length > 3 && (
            <section>
              <h2 className="mb-3 font-bold">{w.more}</h2>
              <div className="space-y-2">
                {list.slice(3, 3 + visible).map((r, i) => (
                  <details
                    key={r.roleId}
                    className="group overflow-hidden rounded-xl border bg-card"
                  >
                    <summary className="grid min-h-16 cursor-pointer list-none grid-cols-[1.75rem_1fr_auto_1rem] items-center gap-x-3 gap-y-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="w-7 shrink-0 text-sm font-extrabold text-accent">
                        #{i + 4}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                        {roleTitle(r, lang)}
                      </span>
                      <span className="shrink-0 text-base font-extrabold tabular-nums text-primary">
                        <ChangingValue value={metric(r)} />
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      <span className="col-span-3 col-start-2">
                        <Goals role={r} />
                      </span>
                    </summary>
                    <div className="border-t px-4 py-3">
                      {details(r, false)}
                    </div>
                  </details>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {Math.min(list.length, visible + 3)} / {list.length} {w.shown}
                </p>
                {visible + 3 < list.length ? (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setVisible((n) => n + 5)}
                  >
                    {w.load}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{w.all}</span>
                )}
              </div>
            </section>
          )}
          {!!data.news?.articles.length && (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="font-bold">
                {lang === "en"
                  ? "Career news behind the outlook"
                  : lang === "ms"
                    ? "Berita kerjaya di sebalik jangkaan"
                    : "展望参考的职业新闻"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.news.providers
                  ?.map((p) => (p === "rss" ? "Google News RSS" : p))
                  .join(" / ") || "Google News RSS"}{" "}
                · {data.news.fetchedAt?.slice(0, 10)}
                {data.news.stale
                  ? " · " +
                    (lang === "en"
                      ? "Last available snapshot"
                      : lang === "ms"
                        ? "Snapshot terakhir tersedia"
                        : "最近可用快照")
                  : ""}
              </p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  ...data.news.articles
                    .filter((a) => a.region === "my")
                    .slice(0, 3),
                  ...data.news.articles
                    .filter((a) => a.region === "global")
                    .slice(0, 3),
                ].map((a) => (
                  <li key={a.url}>
                    <a
                      className="text-sm font-semibold text-primary underline underline-offset-4"
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {a.title}
                    </a>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {a.region === "my"
                        ? "Malaysia"
                        : lang === "zh"
                          ? "全球"
                          : "Global"}{" "}
                      · {a.domain} · {a.seenAt.slice(0, 10)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer py-1 text-sm font-semibold">
              {w.sources}
            </summary>
            <p className="my-3 text-xs leading-relaxed text-muted-foreground">
              {data.note?.[lang] ?? w.limit} {w.cache}
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              {mode === "ai" ? w.aiAssumption : w.demandAssumption}
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              {w.reviewed}: {data.reviewedAt} · {data.model ?? w.observed}
            </p>
            <ul className="space-y-2">
              {data.sources.map((s) => (
                <li key={s.url}>
                  <a
                    className="text-xs text-primary underline"
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.label} · {s.dataDate ?? "—"}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
      <Dialog open={guide} onOpenChange={setGuide}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogTitle className="pr-8">{w.guide}</DialogTitle>
          <DialogDescription>
            {step + 1} / {w.guideSteps.length}
          </DialogDescription>
          <div className="flex gap-1" aria-hidden="true">
            {w.guideSteps.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <div className="rounded-xl bg-[hsl(var(--gold-soft))] p-5">
            <p className="font-bold">{w.guideSteps[step][0]}</p>
            <p className="mt-2 text-sm leading-relaxed">
              {w.guideSteps[step][1]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={w.replay}
              onClick={() => setStep(0)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="ml-auto"
              disabled={step === 0}
              onClick={() => setStep((n) => n - 1)}
            >
              {w.previous}
            </Button>
            <Button
              onClick={() =>
                step === w.guideSteps.length - 1
                  ? setGuide(false)
                  : setStep((n) => n + 1)
              }
            >
              {step === w.guideSteps.length - 1 ? w.done : w.nextStep}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
