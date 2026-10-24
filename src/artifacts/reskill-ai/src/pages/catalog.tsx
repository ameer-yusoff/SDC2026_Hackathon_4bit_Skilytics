import { SkillSdg } from "@/components/skill-sdg";
import { SdgChoice, SdgExplanation, SdgReason } from "@/components/sdg-choice";
import { byGoal } from "@/lib/sdg-choice";
import { useMemo, useState } from "react";
import { Link, useParams, useSearch } from "wouter";
import { ArrowLeft, Award, ExternalLink } from "lucide-react";
import {
  useGetMarketOverview,
  useGetRole,
  useListCourses,
  useListRoles,
  getGetMarketOverviewQueryKey,
  getGetRoleQueryKey,
  getListRolesQueryKey,
  getListCoursesQueryKey,
  type Role,
} from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { skillLabel } from "@/lib/skill-label";
import { Switch } from "@/components/ui/switch";
import {
  CostBadge,
  DataStamp,
  Empty,
  ErrorBox,
  ExplainNote,
  HrdcBadge,
  Meter,
  PageHeader,
  Panel,
  Rows,
  SdgBadge,
  SkillBadge,
  catIcon,
} from "@/components/kit";
import { roleTitle, useFmt } from "@/lib/fmt";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { PageGuide, guides, guideSteps } from "@/components/page-guide";
import { RoleGoals, roleGoals } from "@/components/matcher-skill-map";

export function Roles() {
  const { t, tk, lang } = useT();
  const f = useFmt();
  const q = useListRoles(undefined, {
    query: {
      queryKey: getListRolesQueryKey(),
      refetchInterval: 300000,
      staleTime: 60000,
    },
  });
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("all");
  const sectors = useMemo(
    () => Array.from(new Set((q.data ?? []).map((r) => r.sector))).sort(),
    [q.data],
  );
  const [goal, setGoal] = useState("all");
  const goals = [...new Set((q.data ?? []).flatMap(roleGoals))].sort(
    (a, b) => Number(a) - Number(b),
  );
  const list = byGoal(q.data ?? [], goal, (r) => r).filter(
    (r) =>
      (sector === "all" || r.sector === sector) &&
      `${r.title} ${roleTitle(r, lang)} ${r.socCode} ${r.skills.map((s) => skillLabel(s.name, lang)).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const latest = (q.data ?? [])
    .map((r) => r.sourceFetchedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  return (
    <>
      <PageHeader
        help={
          <PageGuide
            title={guides[lang].title}
            steps={guideSteps(guides[lang].roles)}
          />
        }
        title={t("roles.title")}
        sub={t("roles.sub")}
        actions={
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger
              className="min-h-11 w-56"
              data-testid="select-sector"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("roles.allSectors")}</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>
                  {tk("sector", s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="mb-4">
        <SdgChoice goals={goals} value={goal} onChange={setGoal} />
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{guides[lang].scope}</p>
      <div className="mb-4 space-y-2">
        <Input
          className="min-h-11"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={
            lang === "ms"
              ? "Cari kerjaya atau kemahiran"
              : lang === "zh"
                ? "搜索职业或技能"
                : "Search careers or skills"
          }
          placeholder={
            lang === "ms"
              ? "Cari kerjaya atau kemahiran"
              : lang === "zh"
                ? "搜索职业或技能"
                : "Search careers or skills"
          }
        />
        <p className="text-xs text-muted-foreground">
          {list.length}{" "}
          {lang === "ms"
            ? "kerjaya dengan rujukan sumber"
            : lang === "zh"
              ? "个职业，附来源"
              : list.length === 1
                ? "career with source references"
                : "careers with source references"}
          {latest ? ` · ${f.date(latest)}` : ""}
        </p>
      </div>
      {q.isLoading ? (
        <Rows n={6} h="h-28" />
      ) : q.isError ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : !list.length ? (
        <Empty title={t("roles.empty")} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((r, i) => {
            const Icon = catIcon(
              [...r.skills].sort((a, b) => b.importance - a.importance)[0]
                ?.category,
            );
            const title = roleTitle(r, lang);
            return (
              <article
                key={r.id}
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                data-testid={`card-role-${r.id}`}
                className="rise flex min-w-0 flex-col rounded-2xl border border-card-border bg-card p-4 shadow-xs transition-colors hover:border-primary"
              >
                <div className="flex min-h-14 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--maroon-soft))] text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/roles/${r.id}`}
                      title={title}
                      className="inline-flex min-h-11 items-center font-semibold leading-snug"
                    >
                      {title}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {tk("sector", r.sector)}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {t("matcher.exposure")}
                    </span>
                    <b>{f.frac(r.aiExposure, 0)}</b>
                  </div>
                  <Meter value={r.aiExposure} tone="slate" />
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <div className="flex gap-1">
                    {roleGoals(r).map((code, i) => (
                      <span
                        key={code}
                        title={tk("sdg", code)}
                        className={cn(
                          "rounded border bg-card p-1",
                          i === 0 && "border-2 border-primary",
                        )}
                      >
                        <img
                          src={`/sdg/${code}.png`}
                          alt={`SDG ${code}: ${tk("sdg", code)}`}
                          className="h-8 w-8 object-contain"
                          loading="lazy"
                        />
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/roles/${r.id}`}
                    className="inline-flex min-h-11 items-center text-xs font-semibold text-primary"
                  >
                    {lang === "ms"
                      ? "Lihat kemahiran"
                      : lang === "zh"
                        ? "查看技能"
                        : "View skills"}{" "}
                    →
                  </Link>
                </div>
                <SdgReason role={r} />
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export function RoleDetail() {
  const { id } = useParams<{ id: string }>();
  const rid = Number(id);
  const searchParams = new URLSearchParams(useSearch());
  const backToMarket = searchParams.get("from") === "market";
  const inputYears = Number(searchParams.get("years"));
  const years =
    Number.isInteger(inputYears) && inputYears >= 1 && inputYears <= 10
      ? inputYears
      : 3;
  const backHref = backToMarket
    ? `/market?years=${years}&view=${searchParams.get("view") === "demand" ? "demand" : "ai"}`
    : "/roles";
  const { t, tk, lang } = useT();
  const f = useFmt();
  const q = useGetRole(rid, {
    query: { enabled: rid > 0, queryKey: getGetRoleQueryKey(rid) },
  });
  const ov = useGetMarketOverview({
    query: { queryKey: getGetMarketOverviewQueryKey() },
  });
  const r = q.data;
  const groups = useMemo(() => {
    const m = new Map<string, NonNullable<typeof r>["skills"]>();
    (r?.skills ?? []).forEach((s) =>
      m.set(s.category, [...(m.get(s.category) ?? []), s]),
    );
    return Array.from(m.entries());
  }, [r]);
  return (
    <>
      <Link
        href={backHref}
        className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t(backToMarket ? "nav.market" : "nav.roles")}
      </Link>
      {q.isLoading ? (
        <Rows n={4} h="h-24" />
      ) : q.isError || !r ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <PageHeader
            eyebrow={`${tk("sector", r.sector)} · SOC ${r.socCode}`}
            title={roleTitle(r, lang)}
            sub={lang !== "en" ? r.title : undefined}
          />
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              {r.description && (
                <Panel title={t("roles.about")} meta={t("role.sourceExcerpt")}>
                  <blockquote
                    lang="en"
                    className="border-l-2 border-accent pl-3 text-sm leading-relaxed text-muted-foreground"
                    data-testid="text-role-source-excerpt"
                  >
                    {r.description}
                  </blockquote>
                </Panel>
              )}
              <Panel
                title={t("roles.requiredSkills")}
                meta={t("roles.importanceNote")}
              >
                <div className="space-y-4">
                  {groups.map(([cat, skills]) => (
                    <div key={cat}>
                      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
                        {tk("cat", cat)}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[...skills]
                          .sort((a, b) => b.importance - a.importance)
                          .map((s) => (
                            <span
                              key={s.skillId}
                              className="inline-flex flex-col items-start gap-1 rounded-xl border p-2"
                            >
                              <SkillBadge
                                name={skillLabel(s.name, lang)}
                                category={s.category}
                                tone={s.importance >= 3 ? "gap" : "neutral"}
                              />
                              <span className="tnum text-[10px] text-muted-foreground">
                                {s.importance}/3
                              </span>
                              <SkillSdg
                                name={s.name}
                                subject={roleTitle(r, lang)}
                              />
                              {s.courseUrl && (
                                <a
                                  className="inline-flex min-h-11 items-center text-xs text-primary underline"
                                  href={s.courseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {lang === "ms"
                                    ? "Kursus"
                                    : lang === "zh"
                                      ? "课程"
                                      : "Course"}{" "}
                                  ↗
                                </a>
                              )}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
            <div className="space-y-4">
              <Panel
                title={t("radar.exposureTitle")}
                meta={
                  <DataStamp
                    source="Anthropic Economic Index"
                    period={ov.data?.aiUsagePeriod}
                  />
                }
              >
                <div className="tnum text-3xl font-bold text-primary">
                  {f.frac(r.aiExposure)}
                </div>
                <Meter className="mt-2" value={r.aiExposure} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("radar.exposureExplain")}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {t("market.my")}
                    </div>
                    <div className="tnum font-semibold">
                      {f.pct(r.aiUsagePctMy, 2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {t("market.global")}
                    </div>
                    <div className="tnum font-semibold">
                      {f.pct(r.aiUsagePctGlobal, 2)}
                    </div>
                  </div>
                </div>
              </Panel>
              <ProvenancePanel r={r} />
              <Panel title={t("roles.signals")}>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">RIASEC</dt>
                    <dd className="font-semibold">{r.riasecCode}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">
                      {t("roles.mycol")}
                    </dt>
                    <dd className="font-semibold">{t("ob.unverified")}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <RoleGoals role={r} />
                  <SdgReason role={r} />
                </div>
                <ExplainNote>{t("roles.mycolExplain")}</ExplainNote>
              </Panel>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function Courses({
  hr,
  hideHeader = false,
}: {
  hr?: boolean;
  hideHeader?: boolean;
}) {
  const { t, tk, lang } = useT();
  const f = useFmt();
  const [provider, setProvider] = useState("all");
  const [hrdc, setHrdc] = useState(false);
  const [courseGoal, setCourseGoal] = useState("all");
  const urlSearch = useSearch();
  const [courseSearch, setCourseSearch] = useState(
    () => new URLSearchParams(urlSearch).get("search") ?? "",
  );
  const params = { ...(hr && hrdc ? { hrdcOnly: true } : {}) };
  const q = useListCourses(params, {
    query: {
      queryKey: getListCoursesQueryKey(params),
      refetchInterval: 300000,
    },
  });
  const providers = [...new Set((q.data ?? []).map((c) => c.provider))].sort();
  const courseGoals = [
    ...new Set(
      (q.data ?? []).flatMap((c) =>
        (c.sdgCodes ?? []).map((s) => s.split(".")[0]),
      ),
    ),
  ].sort((a, b) => Number(a) - Number(b));
  const list = (q.data ?? [])
    .filter(
      (c) =>
        courseGoal === "all" ||
        (c.sdgCodes ?? []).some((s) => s.split(".")[0] === courseGoal),
    )
    .filter(
      (c) =>
        (provider === "all" || c.provider === provider) &&
        `${c.title} ${c.provider} ${c.skills.map((s) => s.name + " " + skillLabel(s.name, lang)).join(" ")}`
          .toLowerCase()
          .includes(courseSearch.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.provider.localeCompare(b.provider) || a.title.localeCompare(b.title),
    );
  return (
    <>
      {!hideHeader && (
        <PageHeader
          help={
            <PageGuide
              title={guides[lang].title}
              steps={guideSteps(guides[lang].courses)}
            />
          }
          title={hr ? t("courses.hrTitle") : t("courses.title")}
          sub={t("courses.sub")}
        />
      )}
      <div className="mb-4">
        <SdgChoice
          learning
          goals={courseGoals}
          value={courseGoal}
          onChange={setCourseGoal}
        />
      </div>
      <Input
        className="mb-3 min-h-11"
        value={courseSearch}
        onChange={(e) => setCourseSearch(e.target.value)}
        aria-label={
          lang === "ms"
            ? "Cari kursus atau kemahiran"
            : lang === "zh"
              ? "搜索课程或技能"
              : "Search courses or skills"
        }
        placeholder={
          lang === "ms"
            ? "Cari kursus atau kemahiran"
            : lang === "zh"
              ? "搜索课程或技能"
              : "Search courses or skills"
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger
            className="min-h-11 w-48"
            data-testid="select-provider"
            aria-label={guides[lang].providers}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{guides[lang].providers}</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hr && (
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
            <Switch
              checked={hrdc}
              onCheckedChange={setHrdc}
              data-testid="switch-hrdc-only"
            />
            {t("courses.hrdcOnly")}
          </label>
        )}
        <span className="tnum text-xs text-muted-foreground">
          {list.length === 1 && lang === "en"
            ? "1 course"
            : t("courses.count", { n: list.length })}
        </span>
      </div>
      {q.isLoading ? (
        <Rows n={6} h="h-24" />
      ) : q.isError ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : !list.length ? (
        <Empty title={t("courses.empty")}>{t("courses.emptyBody")}</Empty>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {list.map((c, i) => (
            <article
              key={c.id}
              style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
              data-testid={`card-course-${c.id}`}
              className={cn(
                "rise min-w-0 rounded-2xl border bg-card p-4 shadow-xs",
                hr && c.hrdcStatus !== "not_claimable"
                  ? "border-accent/60"
                  : "border-card-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div title={c.title} className="font-semibold leading-snug">
                    {c.title}
                  </div>
                  <div className="truncate whitespace-nowrap text-xs text-muted-foreground">
                    {c.provider} · {tk("level", c.level.toLowerCase())} ·{" "}
                    {tk("courseLanguage", c.language)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {c.costMyr > 0 && (
                    <div className="tnum font-bold">{f.myr(c.costMyr)}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground">
                    {c.durationHours === null
                      ? t("courses.durationUnknown")
                      : t("common.hours", { n: f.num(c.durationHours, 1) })}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.sdgCodes
                  ?.filter(
                    (code, i, all) =>
                      all.findIndex(
                        (x) => x.split(".")[0] === code.split(".")[0],
                      ) === i,
                  )
                  .map((code, index) => (
                    <SdgBadge
                      key={code}
                      code={code}
                      title={tk("sdg", code.split(".")[0])}
                      primary={index === 0}
                    />
                  ))}
              </div>
              <SdgExplanation
                goals={c.sdgCodes ?? []}
                subject={c.title}
                skills={c.skills.map((s) => s.name)}
                kind="course"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.skills.map((s) => (
                  <div key={s.id} className="min-w-0 rounded-xl border p-2">
                    <SkillBadge
                      name={skillLabel(s.name, lang)}
                      category={s.category}
                    />
                    <SkillSdg name={s.name} subject={c.title} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {hr && <HrdcBadge status={c.hrdcStatus} />}
                  <CostBadge type={c.costType} />
                  {c.certificate && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
                      <Award className="h-3 w-3" />
                      {t("courses.cert")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>
                    {t(c.catalogStale ? "courses.stale" : "courses.verified", {
                      d: f.date(c.lastVerified),
                    })}
                  </span>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary"
                    data-testid={`link-course-${c.id}`}
                  >
                    {t("common.open")}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{t("courses.live")}</p>
      <p className="mt-2 text-xs text-muted-foreground">{t("sdg.notice")}</p>
      {hr && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("courses.hrdcHonest")}
        </p>
      )}
    </>
  );
}

function ProvenancePanel({ r }: { r: Role }) {
  const { t } = useT();
  const f = useFmt();
  const src = r;
  const has = !!(src.officialTitle || src.sourceUrl || src.sourceVersion);
  return (
    <Panel title={t("role.provTitle")}>
      {!has ? (
        <p className="text-sm text-muted-foreground">{t("role.provMissing")}</p>
      ) : (
        <dl className="space-y-2 text-sm" data-testid="panel-provenance">
          {src.officialTitle && (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("role.officialTitle")}
              </dt>
              <dd
                lang="en"
                className="font-medium"
                data-testid="text-official-title"
              >
                {src.officialTitle}
              </dd>
            </div>
          )}
          {src.sourceVersion && (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("role.version")}
              </dt>
              <dd className="font-medium">{src.sourceVersion}</dd>
            </div>
          )}
          {src.sourceFetchedAt && (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("role.fetched")}
              </dt>
              <dd>{f.date(src.sourceFetchedAt)}</dd>
            </div>
          )}
          {src.sourceUrl && /^https:\/\//.test(src.sourceUrl) && (
            <a
              href={src.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline"
              data-testid="link-role-source"
            >
              {t("role.sourceLink")}
            </a>
          )}
        </dl>
      )}
      <p
        className="mt-2 text-xs text-muted-foreground"
        data-testid="text-mycol-unverified"
      >
        {t("role.mycolUnverified")}
      </p>
    </Panel>
  );
}
