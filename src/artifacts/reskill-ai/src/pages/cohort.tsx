import { LearnerListGuide } from "@/components/portal-guides";
import {useCompany} from "@/lib/enterprise";
import { InstitutionDashboard, InstitutionCourses } from "@/components/institution-portal";
import { EnterpriseDashboard } from "@/components/company-future";
import { PageGuide } from "@/components/page-guide";
import { enterpriseWords } from "@/i18n/enterprise";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ExternalLink, Plus, Search, Users } from "lucide-react";
import { useGetCohortSummary, getGetCohortSummaryQueryKey, type CountItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CostBadge, Empty, ErrorBox, ExplainNote, HrdcBadge, Meter, PageHeader, Panel, Rows, Stat } from "@/components/kit";
import { ProfileFormDialog } from "@/components/profile-form";
import { useAuth } from "@/lib/auth";
import { useFmt } from "@/lib/fmt";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

function useCohort() {
  return useGetCohortSummary(undefined, { query: { queryKey: getGetCohortSummaryQueryKey() } });
}

function Bars({ items, label, tone = "maroon" }: { items: CountItem[]; label?: (s: string) => string; tone?: "maroon" | "gold" }) {
  const { t } = useT();
  if (!items.length) return <p className="text-sm text-muted-foreground">{t("cohort.noData")}</p>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const l = label ? label(it.label) : it.label;
        return (
          <li key={it.label} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 text-sm">
            <span title={l} className="truncate whitespace-nowrap">{l}</span>
            <Meter value={it.count} max={max} tone={tone} label={String(it.count)} />
          </li>
        );
      })}
    </ul>
  );
}

export function CohortDashboard({kind}:{kind:"hr"|"tvet"}) { return kind === "hr" ? <EnterpriseDashboard/> : <InstitutionDashboard/>; }

function LegacyCohortDashboard({ kind }: { kind: "hr" | "tvet" }) {
  const { t, tk } = useT();
  const f = useFmt();
  const { user } = useAuth();
  const q = useCohort();
  const c = q.data;
  const base = kind === "hr" ? "/hr/members" : "/tvet/students";
  return (
    <>
      <PageHeader eyebrow={t(kind === "hr" ? "portal.hr" : "portal.tvet")} title={c?.organization ?? user?.organization ?? t(kind === "hr" ? "nav.hrDashboard" : "nav.tvetDashboard")} sub={t(kind === "hr" ? "cohort.hrSub" : "cohort.tvetSub")}
        actions={<Link href={base} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><Users className="h-4 w-4" />{t(kind === "hr" ? "nav.members" : "nav.students")}</Link>} />
      {q.isLoading ? <Rows n={5} h="h-24" /> : q.isError || !c ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !c.profileCount ? (
        <Empty title={t("cohort.emptyTitle")} action={<Link href={base} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">{t(kind === "hr" ? "cohort.addMember" : "cohort.addStudent")}</Link>}>{t("cohort.emptyBody")}</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={t(kind === "hr" ? "cohort.members" : "cohort.students")} value={f.num(c.profileCount)} tone="maroon" testid="text-cohort-count" />
            {kind === "hr"
              ? <Stat label={t("cohort.avgExposure")} value={f.frac(c.avgExposure)} foot={t("cohort.exposureFoot")} />
              : <Stat label={t("cohort.withRiasec")} value={f.num(c.riasecDistribution.reduce((s, x) => s + x.count, 0))} />}
            <Stat label={t("cohort.planCoverage")} value={f.frac((c.planCoverage ?? 0) / 100, 0)} tone="gold" foot={t("cohort.planFoot")} />
            {kind === "hr"
              ? <Stat label={t("cohort.hrdcEligible")} value={f.num(c.members.filter((m) => m.hrdcEligible).length)} />
              : <Stat label={t("cohort.commonGaps")} value={f.num(c.topGaps.length)} />}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {kind === "hr" && (
              <Panel title={t("cohort.exposureByMember")} meta={t("cohort.exposureFoot")} className="lg:col-span-2">
                <ul className="grid gap-x-8 gap-y-2 md:grid-cols-2">
                  {[...c.members].sort((a, b) => (b.currentRoleExposure ?? -1) - (a.currentRoleExposure ?? -1)).map((m) => (
                    <li key={m.id}><Link href={`${base}/${m.id}/radar`} className="grid min-h-11 min-w-0 grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 rounded-lg text-sm hover:bg-muted/40">
                      <span className="min-w-0"><span title={m.name} className="block truncate whitespace-nowrap font-medium">{m.name}</span><span className="block truncate whitespace-nowrap text-[11px] text-muted-foreground">{m.currentRole ?? "-"}</span></span>
                      <Meter value={m.currentRoleExposure} tone="slate" label={f.frac(m.currentRoleExposure, 0)} />
                    </Link></li>
                  ))}
                </ul>
                <ExplainNote>{t("radar.exposureExplain")}</ExplainNote>
              </Panel>
            )}
            <Panel title={t("cohort.topGaps")}><Bars items={c.topGaps.slice(0, 10)} /></Panel>
            <Panel title={t("cohort.roleFit")} meta={t("cohort.roleFitMeta")}><Bars items={c.roleFitDistribution.slice(0, 10)} tone="gold" /></Panel>
            <Panel title={t("cohort.riasec")} meta={t("cohort.riasecMeta")}><Bars items={c.riasecDistribution} label={(s) => `${s} · ${tk("riasec", s)}`} /></Panel>
            {kind === "tvet"
              ? <Panel title={t("cohort.segments")}><Bars items={c.segmentCounts} label={(s) => tk("seg", s)} tone="gold" /></Panel>
              : <GapCourses c={c} hr />}
          </div>
          {kind === "tvet" && <div className="mt-4"><Link href="/tvet/programmes" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary">{t("nav.programmes")}<ArrowRight className="h-4 w-4" /></Link></div>}
        </>
      )}
    </>
  );
}

function GapCourses({ c, wide, hr = false }: { c: NonNullable<ReturnType<typeof useCohort>["data"]>; wide?: boolean; hr?: boolean }) {
  const { t } = useT();
  const f = useFmt();
  return (
    <Panel title={t("cohort.gapCourses")} meta={t("courses.live")} className={wide ? "lg:col-span-2" : undefined}>
      {!c.gapCourses.length ? <p className="text-sm text-muted-foreground">{t("cohort.noData")}</p> : (
        <div className="space-y-4">
          {c.gapCourses.map((g) => (
            <div key={g.skill}>
              <div className="flex items-center justify-between gap-2"><span title={g.skill} className="truncate whitespace-nowrap text-sm font-semibold">{g.skill}</span><span className="shrink-0 rounded-full bg-[hsl(var(--maroon-soft))] px-2 py-0.5 text-[11px] font-semibold text-primary">{t("cohort.needN", { n: g.count })}</span></div>
              {!g.courses.length ? <p className="mt-1 text-xs text-muted-foreground">{t("cohort.noCourse")}</p> : (
                <ul className="mt-1.5 space-y-1.5">
                  {g.courses.map((cr) => (
                    <li key={cr.id} className={cn("rounded-xl border p-2.5", hr && cr.hrdcStatus !== "not_claimable" ? "border-accent/60 bg-[hsl(var(--gold-soft))]/30" : "border-border")}>
                      <div className="flex items-center justify-between gap-2">
                        <a href={cr.url} target="_blank" rel="noreferrer" title={cr.title} className="inline-flex min-w-0 items-center gap-1 text-sm font-medium hover:text-primary"><span className="truncate whitespace-nowrap">{cr.title}</span><ExternalLink className="h-3 w-3 shrink-0" /></a>
                        <span className="tnum shrink-0 text-xs font-semibold">{cr.costMyr === 0 ? t("cost.free") : f.myr(cr.costMyr)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground"><span className="truncate whitespace-nowrap">{cr.provider}</span><span>{cr.durationHours === null ? t("courses.durationUnknown") : t("common.hours", { n: cr.durationHours })}</span><CostBadge type={cr.costType} />{hr && <HrdcBadge status={cr.hrdcStatus} />}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function Programmes() {return <InstitutionCourses/>;}

export function Members({ kind }: { kind: "hr" | "tvet" }) {
  const { t, tk, lang } = useT();
  const ew=enterpriseWords[lang];
  const f = useFmt();
  const [, nav] = useLocation();
  const q = useCohort();
  const progress = useCompany();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const base = kind === "hr" ? "/hr/members" : "/tvet/students";
  const members = (q.data?.members ?? []).filter((m) => !query.trim() || `${m.name} ${m.currentRole ?? ""} ${m.topMatchTitle ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      <PageHeader title={t(kind === "hr" ? "nav.members" : "nav.students")} sub={t(kind === "hr" ? "members.hrSub" : "members.tvetSub")}
        help={<LearnerListGuide institution={kind === "tvet"}/>}
        actions={<Button className="min-h-11" onClick={() => setOpen(true)} data-testid="button-add-member"><Plus className="mr-1.5 h-4 w-4" />{t(kind === "hr" ? "cohort.addMember" : "cohort.addStudent")}</Button>} />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("members.search")} aria-label={t("members.search")} className="min-h-11 pl-9" data-testid="input-member-search" />
      </div>
      {q.isLoading ? <Rows n={5} h="h-16" /> : q.isError ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !members.length ? (
        <Empty title={query ? t("members.noMatch") : t("cohort.emptyTitle")} icon={<Users className="h-5 w-5" />}>{query ? undefined : t("cohort.emptyBody")}</Empty>
      ) : (
        <ul className="space-y-2">
          {members.map((m, i) => (
            <li key={m.id} className="rise" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <Link href={`${base}/${m.id}/intake`} className="group grid min-w-0 gap-2 rounded-2xl border border-card-border bg-card p-3 shadow-xs transition-colors hover:border-primary md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_8rem_auto] md:items-center md:gap-4" data-testid={`link-member-${m.id}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--maroon-soft))] text-sm font-bold text-primary">{m.name.slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0"><div title={m.name} className="truncate whitespace-nowrap font-semibold">{m.name}</div><div className="truncate whitespace-nowrap text-[11px] text-muted-foreground">{m.currentRole ?? tk("seg", m.segment)}</div></div>
                </div>
                <div className="min-w-0 text-xs">
                  <div className="text-muted-foreground">{t("members.topMatch")}</div>
                  <div className="truncate whitespace-nowrap font-medium" title={m.topMatchTitle ?? ""}>{m.topMatchTitle ?? "-"}{m.topMatchScore != null && <span className="tnum ml-1.5 font-bold text-primary">{Math.round(m.topMatchScore)}</span>}</div>
                </div>
                <div className="text-[11px]"><span className="text-muted-foreground">{kind === "hr" ? t("matcher.exposure") : "RIASEC"}</span>{kind === "hr" ? <Meter value={m.currentRoleExposure} tone="slate" label={f.frac(m.currentRoleExposure, 0)} /> : <div className="font-semibold">{m.riasecCode ?? "-"}</div>}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-full bg-muted px-2 py-0.5">{t("me.skillsN", { n: m.skillCount ?? 0 })}</span>
                  {m.riasecCode && <span translate="no" className="rounded-full border px-2 py-1 font-semibold">{m.riasecCode}</span>}
                  {progress.data?.members.find(p=>p.id===m.id)?.stage === "active" && <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">{ew.progress}: {progress.data.members.find(p=>p.id===m.id)?.completedCourses}/{progress.data.members.find(p=>p.id===m.id)?.totalCourses}</span>}
                  {kind === "hr" && m.hrdcEligible && <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground">HRD Corp</span>}
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ProfileFormDialog open={open} onOpenChange={setOpen} segment={kind === "hr" ? "worker" : "graduate"} lockSegment onDone={(p) => nav(`${base}/${p.id}/intake`)} />
    </>
  );
}
