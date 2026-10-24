import { AiServiceNotice } from "@/components/ai-service-notice";
import { InstitutionFuture } from "@/components/institution-portal";
import { AiRoutingPanel } from "@/components/ai-routing-panel";
import {SourceAccess,SourceAccessAudit,auditedSourceDescription} from "@/components/source-access";
import { MarketExplore } from "@/components/market-skills";
import { CompanyFuture } from "@/components/company-future";
import { PageGuide, guides, guideSteps } from "@/components/page-guide";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  CircleDashed,
  Cpu,
  Database,
  ExternalLink,
  Library,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  useGetAiStatus,
  useGetAiUsageByGroup,
  useGetAiUsageByRole,
  useGetLabourTrend,
  useGetMarketOverview,
  useGetRoleExposure,
  useListMarketSources,
  useListRoles,
  useRefreshMarketData,
  getGetAiStatusQueryKey,
  getGetAiUsageByGroupQueryKey,
  getGetAiUsageByRoleQueryKey,
  getGetLabourTrendQueryKey,
  getGetMarketOverviewQueryKey,
  getGetRoleExposureQueryKey,
  getListMarketSourcesQueryKey,
  type LabourPoint,
  type MarketSource,
  type MarketSourceKind,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  DataStamp,
  Empty,
  ErrorBox,
  ExplainNote,
  Meter,
  PageHeader,
  Panel,
  Rows,
  Stat,
} from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { roleTitle, useFmt } from "@/lib/fmt";
import { useErrText, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { SourceDocumentation, TechDiagnostics } from "./source-documentation";
import { useAuth } from "@/lib/auth";
import { MarketOutlook } from "@/components/market-outlook";

const MAROON = "#7A1523";
const GOLD = "#C69214";

function LabourChart({ data }: { data: LabourPoint[] }) {
  const { t } = useT();
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -12, right: 4, top: 8 }}>
          <CartesianGrid stroke="hsl(30 16% 88%)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(350 8% 40%)" }}
            minTickGap={36}
          />
          <YAxis
            yAxisId="u"
            tick={{ fontSize: 10, fill: "hsl(350 8% 40%)" }}
            unit="%"
            domain={["auto", "auto"]}
            width={48}
          />
          <YAxis
            yAxisId="p"
            orientation="right"
            tick={{ fontSize: 10, fill: "hsl(350 8% 40%)" }}
            unit="%"
            domain={["auto", "auto"]}
            width={44}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(30 16% 86%)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            yAxisId="u"
            dataKey="unemploymentRate"
            name={t("market.unemployment")}
            stroke={MAROON}
            dot={false}
            strokeWidth={2}
          />
          <Line
            yAxisId="p"
            dataKey="participationRate"
            name={t("market.participation")}
            stroke={GOLD}
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PairBars({
  items,
}: {
  items: {
    key: string;
    label: string;
    a: number | null | undefined;
    b: number | null | undefined;
  }[];
}) {
  const { t } = useT();
  const f = useFmt();
  const max = Math.max(0.01, ...items.flatMap((i) => [i.a ?? 0, i.b ?? 0]));
  return (
    <>
      <div className="mb-2 flex gap-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          {t("market.my")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
          {t("market.global")}
        </span>
      </div>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.key} className="min-w-0">
            <div
              title={it.label}
              className="truncate whitespace-nowrap text-xs font-medium"
            >
              {it.label}
            </div>
            <div className="mt-1 grid grid-cols-[1fr_3.5rem] items-center gap-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${((it.a ?? 0) / max) * 100}%` }}
                />
              </div>
              <span className="tnum text-right text-[11px]">
                {f.pct(it.a, 2)}
              </span>
            </div>
            <div className="mt-0.5 grid grid-cols-[1fr_3.5rem] items-center gap-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${((it.b ?? 0) / max) * 100}%` }}
                />
              </div>
              <span className="tnum text-right text-[11px] text-muted-foreground">
                {f.pct(it.b, 2)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Market() {
  const { user } = useAuth();
  if (!user || user.role === "individual") return <MarketExplore />;
  if (user.role === "hr") return <CompanyFuture/>;
  return <ObservedMarket />;
}

function ObservedMarket() {
  const { t } = useT();
  const f = useFmt();
  const ov = useGetMarketOverview({
    query: { queryKey: getGetMarketOverviewQueryKey() },
  });
  const rp = { limit: 12, geo: "MYS" as const };
  const roles = useGetAiUsageByRole(rp, {
    query: { queryKey: getGetAiUsageByRoleQueryKey(rp) },
  });
  const groups = useGetAiUsageByGroup({
    query: { queryKey: getGetAiUsageByGroupQueryKey() },
  });
  const exp = useGetRoleExposure(
    { limit: 12 },
    { query: { queryKey: getGetRoleExposureQueryKey({ limit: 12 }) } },
  );
  const lab = useGetLabourTrend({
    query: { queryKey: getGetLabourTrendQueryKey() },
  });
  const o = ov.data;
  const labour = lab.data ?? [];
  return (
    <>
      <PageHeader
        eyebrow={t("nav.market")}
        title={t("market.title")}
        sub={t("market.sub")}
      />
      {ov.isError && (
        <div className="mb-4">
          <ErrorBox error={ov.error} retry={() => ov.refetch()} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label={t("market.unemployment")}
          value={f.pct(o?.unemploymentRate)}
          tone="maroon"
          foot={`DOSM · ${o?.unemploymentDate ?? "-"}`}
        />
        <Stat
          label={t("market.participation")}
          value={f.pct(o?.participationRate)}
          foot={`DOSM · ${o?.unemploymentDate ?? "-"}`}
        />
        <Stat
          label={t("market.usageIndex")}
          value={
            o?.malaysiaUsageIndex != null
              ? `${o.malaysiaUsageIndex.toFixed(2)}x`
              : "-"
          }
          tone="gold"
          foot={`${t("market.usageIndexFoot")} · ${o?.aiUsagePeriod ?? "-"}`}
        />
        <Stat
          label={t("market.sourcesOk")}
          value={o ? `${o.sourcesOk}/${o.sourcesTotal}` : "—"}
          foot={`${t("common.checked")}: ${f.dateTime(o?.lastRefresh)}`}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("market.cadence")}
      </p>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel
          title={t("market.labourTitle")}
          meta={
            <DataStamp
              source="DOSM / OpenDOSM"
              period={labour[labour.length - 1]?.date}
              fetchedAt={o?.lastRefresh}
            />
          }
          className="xl:col-span-2"
        >
          {lab.isLoading ? (
            <Rows n={5} />
          ) : lab.isError ? (
            <ErrorBox error={lab.error} retry={() => lab.refetch()} />
          ) : !labour.length ? (
            <Empty title={t("market.noData")} />
          ) : (
            <LabourChart data={labour} />
          )}
        </Panel>
        <Panel
          title={t("market.byRole")}
          meta={
            <DataStamp
              source="Anthropic Economic Index"
              period={roles.data?.period}
              fetchedAt={roles.data?.fetchedAt}
            />
          }
        >
          {roles.isLoading ? (
            <Rows n={6} />
          ) : roles.isError ? (
            <ErrorBox error={roles.error} retry={() => roles.refetch()} />
          ) : !roles.data?.items.length ? (
            <Empty title={t("market.noData")} />
          ) : (
            <PairBars
              items={roles.data.items.map((r) => ({
                key: r.socCode,
                label: r.title,
                a: r.usagePct,
                b: r.usagePctGlobal,
              }))}
            />
          )}
          <ExplainNote>{t("market.usageExplain")}</ExplainNote>
        </Panel>
        <Panel
          title={t("market.byGroup")}
          meta={
            <DataStamp
              source="Anthropic Economic Index"
              period={groups.data?.period}
              fetchedAt={groups.data?.fetchedAt}
            />
          }
        >
          {groups.isLoading ? (
            <Rows n={6} />
          ) : groups.isError ? (
            <ErrorBox error={groups.error} retry={() => groups.refetch()} />
          ) : !groups.data?.items.length ? (
            <Empty title={t("market.noData")} />
          ) : (
            <PairBars
              items={groups.data.items.map((g) => ({
                key: g.majorGroup,
                label: g.majorGroup,
                a: g.usagePctMy,
                b: g.usagePctGlobal,
              }))}
            />
          )}
        </Panel>
        <Panel
          title={t("market.exposureTitle")}
          meta={
            <DataStamp
              source="Anthropic Economic Index"
              period={o?.aiUsagePeriod}
            />
          }
          className="xl:col-span-2"
        >
          {exp.isLoading ? (
            <Rows n={6} />
          ) : exp.isError ? (
            <ErrorBox error={exp.error} retry={() => exp.refetch()} />
          ) : !exp.data?.length ? (
            <Empty title={t("market.noData")} />
          ) : (
            <ul className="grid gap-x-8 gap-y-2 md:grid-cols-2">
              {exp.data.map((e) => (
                <li
                  key={e.socCode}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-3 text-sm"
                >
                  <span title={e.title} className="truncate whitespace-nowrap">
                    {e.title}
                  </span>
                  <Meter
                    value={e.exposure}
                    tone="maroon"
                    label={f.frac(e.exposure)}
                  />
                </li>
              ))}
            </ul>
          )}
          <ExplainNote>{t("radar.exposureExplain")}</ExplainNote>
        </Panel>
      </div>
    </>
  );
}

export function TvetMarket() {return <InstitutionFuture/>;}
function LegacyTvetMarket() {
  const { t, tk, lang } = useT();
  const f = useFmt();
  const ov = useGetMarketOverview({
    query: { queryKey: getGetMarketOverviewQueryKey() },
  });
  const lab = useGetLabourTrend({
    query: { queryKey: getGetLabourTrendQueryKey() },
  });
  const roles = useListRoles();
  const labour = lab.data ?? [];
  const list = useMemo(
    () =>
      [...(roles.data ?? [])].sort(
        (a, b) => (b.aiUsagePctMy ?? 0) - (a.aiUsagePctMy ?? 0),
      ),
    [roles.data],
  );
  return (
    <>
      <PageHeader
        eyebrow={t("nav.gradMarket")}
        title={t("tvetMarket.title")}
        sub={t("tvetMarket.sub")}
      />
      <Panel
        title={t("market.labourTitle")}
        meta={
          <DataStamp
            source="DOSM / OpenDOSM"
            period={labour[labour.length - 1]?.date}
            fetchedAt={ov.data?.lastRefresh}
          />
        }
      >
        {lab.isLoading ? (
          <Rows n={5} />
        ) : lab.isError ? (
          <ErrorBox error={lab.error} retry={() => lab.refetch()} />
        ) : !labour.length ? (
          <Empty title={t("market.noData")} />
        ) : (
          <LabourChart data={labour} />
        )}
      </Panel>
      <Panel
        className="mt-4"
        title={t("tvetMarket.roles")}
        meta={
          <DataStamp
            source="Anthropic Economic Index"
            period={ov.data?.aiUsagePeriod}
          />
        }
      >
        {roles.isLoading ? (
          <Rows n={6} />
        ) : roles.isError ? (
          <ErrorBox error={roles.error} retry={() => roles.refetch()} />
        ) : !list.length ? (
          <Empty title={t("roles.empty")} />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((r) => (
              <li
                key={r.id}
                className="grid gap-2 py-2.5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      title={roleTitle(r, lang)}
                      className="truncate whitespace-nowrap text-sm font-semibold"
                    >
                      {roleTitle(r, lang)}
                    </span>
                  </div>
                  <div className="truncate whitespace-nowrap text-[11px] text-muted-foreground">
                    {tk("sector", r.sector)}
                  </div>
                </div>
                <div className="min-w-0 text-[11px]">
                  <span className="text-muted-foreground">
                    {t("matcher.exposure")}
                  </span>
                  <Meter
                    value={r.aiExposure}
                    tone="slate"
                    label={f.frac(r.aiExposure, 0)}
                  />
                </div>
                <div className="text-[11px] md:text-right">
                  <span className="text-muted-foreground">
                    {t("roles.usageMy")}{" "}
                  </span>
                  <span className="tnum font-semibold">
                    {f.pct(r.aiUsagePctMy, 2)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ExplainNote>
          {t("role.mycolUnverified")} {t("docs.live.notRealtime")}
        </ExplainNote>
      </Panel>
    </>
  );
}

const SECTIONS: {
  key: "dataset" | "jobs" | "learning" | "ai_endpoint";
  filter: (s: MarketSource) => boolean;
  icon: typeof Database;
}[] = [
  { key: "dataset", filter: (s) => s.kind === "dataset", icon: Database },
  { key: "jobs", filter: (s) => s.kind === "catalogue" && s.id.endsWith("_jobs"), icon: Briefcase },
  { key: "learning", filter: (s) => s.kind === "catalogue" && !s.id.endsWith("_jobs"), icon: Library },
  { key: "ai_endpoint", filter: (s) => s.kind === "ai_endpoint", icon: Cpu },
];

function StatusPill({ s }: { s: MarketSource["status"] }) {
  const { tk } = useT();
  const Icon =
    s === "ok"
      ? CheckCircle2
      : s === "error"
        ? XCircle
        : s === "pending"
          ? Loader2
          : CircleDashed;
  const c =
    s === "ok"
      ? "bg-[hsl(var(--gold-soft))] text-foreground"
      : s === "error"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        c,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", s === "pending" && "animate-spin")} />
      {tk("srcStatus", s)}
    </span>
  );
}

export function Sources() {
  const { t, tk, lang } = useT();
  const et = useErrText();
  const f = useFmt();
  const qc = useQueryClient();
  const { toast } = useToast();
  const src = useListMarketSources({
    query: { queryKey: getListMarketSourcesQueryKey() },
  });
  const ai = useGetAiStatus({
    query: {
      queryKey: getGetAiStatusQueryKey(),
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  });
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!since) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [since]);
  const refresh = useRefreshMarketData({
    mutation: {
      onSuccess: (s) => {
        setSince(null);
        qc.setQueryData(getListMarketSourcesQueryKey(), s);
        qc.invalidateQueries();
        toast({
          title: t("sources.refreshed", {
            ok: s.filter((x) => x.status === "ok").length,
            n: s.length,
          }),
        });
      },
      onError: (e) => {
        setSince(null);
        toast({
          title: t("err.generic"),
          description: et(e),
          variant: "destructive",
        });
      },
    },
  });
  const elapsed = since ? Math.round((now - since) / 1000) : 0;
  const a = ai.data;
  return (
    <>
      <PageHeader
        help={
          <PageGuide
            title={guides[lang].title}
            steps={[...guideSteps(guides[lang].sources),{title:t("docs.category.synthetic"),body:t("docs.synthetic.limits")}] }
          />
        }
        title={t("sources.title")}
        sub={t("sources.sub")}
        actions={
          <Button
            className="min-h-11"
            onClick={() => {
              setSince(Date.now());
              setNow(Date.now());
              refresh.mutate();
            }}
            disabled={refresh.isPending}
            data-testid="button-refresh-all"
          >
            <RefreshCw
              className={cn(
                "mr-1.5 h-4 w-4",
                refresh.isPending && "animate-spin",
              )}
            />
            {refresh.isPending
              ? t("sources.refreshing", { s: elapsed })
              : t("sources.refreshAll")}
          </Button>
        }
      />
      <AiServiceNotice />
      {refresh.isPending && (
        <div
          className="mb-4 rounded-2xl border border-accent/40 bg-[hsl(var(--gold-soft))]/50 p-4 text-sm"
          role="status"
        >
          <div className="font-semibold">
            {t("sources.refreshing", { s: elapsed })}
          </div>
          <p className="text-muted-foreground">{t("sources.refreshHint")}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000"
              style={{ width: `${Math.min(95, (elapsed / 60) * 100)}%` }}
            />
          </div>
        </div>
      )}
      <Panel title={t("sources.aiTitle")} className="mb-4">
        {ai.isLoading ? (
          <Rows n={2} />
        ) : ai.isError || !a ? (
          <ErrorBox error={ai.error} retry={() => ai.refetch()} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">
                {t("sources.aiConn")}
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-semibold">
                {a.connected ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                {a.connected
                  ? t("sources.aiReady")
                  : a.mainConfigured
                    ? t("sources.aiUnavailable")
                    : t("sources.aiNotConfigured")}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {a.provider}
              </div>
            </div>
            <div className="min-w-0 rounded-xl bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">
                {t("sources.mainModel")}
              </div>
              <div
                title={a.mainModel ?? ""}
                className="mt-1 truncate font-semibold"
              >
                {a.mainModel ?? "-"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {a.mainStatus === "ok"
                  ? t("sources.aiVerified")
                  : a.mainStatus === "error"
                    ? t("sources.aiUnavailable")
                    : t("sources.aiNotConfigured")}
              </div>
              <TechDiagnostics text={a.mainError} testId="tech-ai-main" />
              {a.mainDetail && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {a.mainDetail}
                </div>
              )}
            </div>
            <div className="min-w-0 rounded-xl bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">
                {t("sources.lightModel")}
              </div>
              <div
                title={a.lightModel ?? ""}
                className="mt-1 truncate font-semibold"
              >
                {a.lightModel ?? "-"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {a.lightStatus === "ok"
                  ? t("sources.aiVerified")
                  : a.lightStatus === "error"
                    ? t("sources.aiUnavailable")
                    : t("sources.aiNotConfigured")}
              </div>
              <TechDiagnostics text={a.lightError} testId="tech-ai-light" />
              {a.lightDetail && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {a.lightDetail}
                </div>
              )}
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {t("sources.coldStart")} {t("docs.ai.cold")}
        </p>
      </Panel>
      <SourceAccessAudit/>
      {src.isLoading ? (
        <Rows n={5} h="h-28" />
      ) : src.isError ? (
        <ErrorBox error={src.error} retry={() => src.refetch()} />
      ) : !src.data?.length ? (
        <Empty title={t("sources.empty")} />
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((sec) => {
            const items = src.data!.filter(sec.filter);
            if (!items.length) return null;
            const Icon = sec.icon;
            return (
              <section key={sec.key}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Icon className="h-4 w-4 text-accent" />
                  {tk("srcKind", sec.key)}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                </h2>
                {sec.key === "ai_endpoint" && <AiRoutingPanel/>}
                <div className="grid gap-3 lg:grid-cols-2">
                  {items.map((s) => {
                    const name = tk("src", `${s.id}.name`);
                    const desc = tk("src", `${s.id}.desc`);
                    return (
                      <article
                        key={s.id}
                        className="rise min-w-0 rounded-2xl border border-card-border bg-card p-4 shadow-xs"
                        data-testid={`card-source-${s.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              title={name === `${s.id}.name` ? s.name : name}
                              className="inline-flex max-w-full items-center gap-1 font-semibold hover:text-primary"
                            >
                              <span className="truncate whitespace-nowrap">
                                {name === `${s.id}.name` ? s.name : name}
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {desc === `${s.id}.desc` ? auditedSourceDescription(s.id,lang)??s.description : desc}
                            </p>
                          </div>
                          <StatusPill s={s.status} />
                        </div>
                        <SourceAccess id={s.id}/>
                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
                          <div>
                            <dt className="text-muted-foreground">
                              {t("common.dataPeriod")}
                            </dt>
                            <dd className="font-semibold">
                              {s.dataDate ?? t("docs.live.unavailable")}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {t(s.refreshCadence === "reviewed_snapshot" ? "docs.live.reviewed" : s.status === "error" ? "docs.live.checked" : "sources.lastFetched")}
                            </dt>
                            <dd className="font-semibold">
                              {s.lastFetchedAt
                                ? s.refreshCadence === "reviewed_snapshot" ? f.date(s.lastFetchedAt) : f.dateTime(s.lastFetchedAt)
                                : t("docs.live.unavailable")}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {t("sources.records")}
                            </dt>
                            <dd className="tnum font-semibold">
                              {s.recordCount > 0 || s.status === "ok"
                                ? f.num(s.recordCount)
                                : t("docs.live.unavailable")}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-muted-foreground">
                              {t("docs.f.version")}
                            </dt>
                            <dd
                              lang="en"
                              title={s.version ?? ""}
                              className="truncate font-semibold"
                            >
                              {s.version ?? t("docs.live.noVersion")}
                            </dd>
                          </div>
                        </dl>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {tk("cadence", s.refreshCadence)}
                        </div>
                        <TechDiagnostics
                          text={s.detail}
                          testId={`tech-detail-${s.id}`}
                        />
                        {s.stale && (
                          <div
                            className="mt-2 rounded-lg bg-destructive/5 p-2 text-[11px] text-destructive"
                            data-testid={`text-stale-${s.id}`}
                          >
                            {t("docs.live.stale")}
                          </div>
                        )}
                        {s.error && (
                          <div className="mt-2 rounded-lg bg-destructive/5 p-2 text-[11px] text-destructive">
                            {t("docs.live.errorNote")}
                            <TechDiagnostics
                              text={s.error}
                              testId={`tech-source-${s.id}`}
                            />
                          </div>
                        )}
                        {s.consumers.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            <span className="mr-1 text-[11px] text-muted-foreground">
                              {t("sources.usedBy")}:
                            </span>
                            {s.consumers.map((c) => (
                              <span
                                key={c}
                                className="rounded-full bg-[hsl(var(--maroon-soft))] px-2 py-0.5 text-[10px] font-semibold text-primary"
                              >
                                {tk("consumer", c)}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <SourceDocumentation sources={src.data ?? []} ai={a} />
    </>
  );
}
