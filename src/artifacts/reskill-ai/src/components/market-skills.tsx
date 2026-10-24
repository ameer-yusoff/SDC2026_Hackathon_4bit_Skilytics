import {SkillTrends} from "./skill-trends";
import {ScenarioComparison,useFutureScenario} from "./future-scenario";
import {scenarioValue} from "../../../api-server/src/lib/future-scenarios";
import { ScenarioReason } from "./scenario-reason";
import { MarketGuide } from "./portal-guides";
import { ChangingValue, HorizonSlider } from "./projection-feedback";
import { useCompany } from "@/lib/enterprise";
import { enterpriseWords } from "@/i18n/enterprise";
import { MarketOutlook } from "./market-outlook";
import { marketWords } from "@/i18n/market";
import { PageGuide } from "./page-guide";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useT } from "@/i18n";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { skillLabel } from "@/lib/skill-label";
import { ErrorBox, Rows, Panel, PageHeader } from "./kit";
export const jobWords = {
  en: {
    tab: "Skills in demand",
    title: "What skills are employers asking for?",
    note: "Reviewed Malaysia signal: five selected DOSM JMI Q4 2025 occupations mapped to O*NET skills with available courses. A learning-priority index, not a vacancy count. Scenario values can exceed 100.",
    empty:
      "No Malaysian listings with recognised skills in the current sample. No ranking can be supported yet.",
    years: "Years ahead",
    scenario:
      "Planning example: the selected assumption grows the index by 5% or 10% per year. Not a forecast.",
    now: "Baseline index",
    next: "Scenario index",
    jobs: "Find a job",
    apply: "Apply",
    matched: "Skills you can bring",
    missing: "Skills to check",
    jobNote:
      "Suggested from CV skills, completed courses and Holland role fit. Not a hiring score. Job titles stay in their original language. Confirm location, qualifications and availability on the original listing; applying may require an employer account.",
    source:
      "Public vacancy catalogues: Himalayas, Remotive and RemoteOK (daily). No API keys. Location restrictions, original links and source attribution are retained. Remotive listings are delayed by 24 hours.",
    none: "No Malaysia or worldwide remote vacancies in the current sample.",
    more: "Load more",
  },
  ms: {
    tab: "Kemahiran diperlukan",
    title: "Kemahiran apa yang majikan perlukan?",
    note: "Rujukan Malaysia disemak: lima pekerjaan terpilih DOSM JMI S4 2025 dipadankan kepada kemahiran O*NET yang ada kursus. Indeks keutamaan belajar, bukan bilangan vacancy. Nilai senario boleh melebihi 100.",
    empty:
      "Tiada iklan Malaysia dengan kemahiran dikenal pasti dalam sampel semasa. Belum ada bukti untuk susunan kedudukan.",
    years: "Tahun ke hadapan",
    scenario:
      "Contoh perancangan: andaian dipilih menaikkan indeks 5% atau 10% setahun. Bukan ramalan.",
    now: "Indeks asas",
    next: "Indeks senario",
    jobs: "Cari pekerjaan",
    apply: "Mohon",
    matched: "Kemahiran yang anda bawa",
    missing: "Kemahiran untuk disemak",
    jobNote:
      "Cadangan berdasarkan kemahiran CV, kursus selesai dan padanan minat Holland. Bukan skor pengambilan kerja. Tajuk kerja kekal dalam bahasa asal. Semak lokasi, kelayakan dan ketersediaan pada iklan asal; permohonan mungkin memerlukan akaun majikan.",
    source:
      "Katalog vacancy awam: Himalayas, Remotive dan RemoteOK (harian). Tanpa kunci API. Syarat lokasi, pautan asal dan atribusi dikekalkan. Iklan Remotive lewat 24 jam.",
    none: "Tiada kekosongan Malaysia atau remote seluruh dunia dalam sampel semasa.",
    more: "Muat lagi",
  },
  zh: {
    tab: "需求技能",
    title: "雇主正在寻找哪些技能？",
    note: "已审核的马来西亚参考数据：DOSM JMI 2025年第4季度的五个选定职业，映射至有课程的O*NET技能。这是学习优先级指数，并非招聘数量。情景值可能超过100。",
    empty: "当前样本没有可识别技能的马来西亚职位，暂时无法提供有依据的排名。",
    years: "未来年数",
    scenario: "规划示例：所选假设每年增长5%或10%，并非预测。",
    now: "基准指数",
    next: "情景指数",
    jobs: "寻找工作",
    apply: "申请",
    matched: "您具备的相关技能",
    missing: "需要核对的技能",
    jobNote:
      "根据简历技能、已完成课程和霍兰德兴趣匹配推荐，并非招聘评分。职位名称保留原文。请在原招聘页面确认地点、资格与职位状态；申请可能需要雇主账号。",
    source:
      "公开招聘目录：Himalayas、Remotive及RemoteOK每天缓存，无需密钥。保留地点限制、原链接和来源。Remotive职位延迟24小时。",
    none: "当前样本没有马来西亚或全球远程职位。",
    more: "加载更多",
  },
};
export function MarketSkills({
  employer = false,
  hideHeader = false,
}: { employer?: boolean; hideHeader?: boolean } = {}) {
  const company = useCompany(employer);
  const { lang } = useT(),
    w = jobWords[lang];
  const [scenario]=useFutureScenario();
  const [years, setYears] = useState(3),
    [limit, setLimit] = useState(10);
  const q = useQuery({
    queryKey: ["market-skills"],
    queryFn: () =>
      customFetch<{
        sample: number;
        checkedAt: string;
        source: string;
        skills: { id: number; name: string; count: number }[];
      }>("/api/market/skill-demand"),
    retry: false,
  });
  return (
    <Panel
      title={hideHeader ? undefined : w.title}
      meta={hideHeader ? undefined : w.note}
    >
      <SkillTrends/>
      <HorizonSlider
        id={employer ? "company-skill-years" : "skill-years"}
        years={years}
        onChange={setYears}
        label={w.years}
      />
      <p className="mb-4 text-xs text-muted-foreground">{w.scenario}</p>
      <ScenarioComparison mode="skills" years={years} rows={q.data?.skills.slice(0,3).map(s=>({name:skillLabel(s.name,lang),baseline:s.count}))??[]}/>
      <div className="mb-4"><ScenarioReason mode="skills" years={years} ids={q.data?.skills.slice(0,3).map(s=>s.id)} evidenceKey={JSON.stringify(q.data?.skills.slice(0,3))}/></div>
      {q.isLoading ? (
        <Rows n={3} />
      ) : q.isError ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : !q.data?.skills.length ? (
        <p>{w.empty}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {q.data.skills.slice(0, 3).map((s, i) => (
              <article
                key={s.id}
                className={`rounded-2xl border p-4 ${i === 0 ? "border-accent bg-amber-50" : "bg-card"}`}
              >
                <b className="text-accent">#{i + 1}</b>
                <h3 className="mt-2 font-bold">{skillLabel(s.name, lang)}</h3>
                {employer && (
                  <p className="mt-2 text-xs">
                    {enterpriseWords[lang].gaps}:{" "}
                    {company.data?.members.filter(
                      (m) => m.skillNames && !m.skillNames.includes(s.name),
                    ).length ?? 0}{" "}
                    / {company.data?.profileCount ?? 0}
                  </p>
                )}
                <div className="mt-4 rounded-xl bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    {w.next} · {new Date().getFullYear() + years}
                  </p>
                  <ChangingValue
                    value={scenarioValue("skills",s.count,years,scenario)!.toFixed(1)}
                    className="my-1 text-4xl font-extrabold text-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    {w.now}: {s.count}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <ol className="mt-4 space-y-2">
            {q.data.skills.slice(3, limit).map((s, i) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-sm"
                key={s.id}
              >
                <b>
                  #{i + 4} {skillLabel(s.name, lang)}
                </b>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">
                    {w.next} · {new Date().getFullYear() + years}
                  </p>
                  <ChangingValue
                    value={scenarioValue("skills",s.count,years,scenario)!.toFixed(1)}
                    className="text-2xl font-extrabold text-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {w.now}: {s.count}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {limit < q.data.skills.length && (
            <div className="mt-4 mb-2 flex items-center justify-start">
              <Button
                variant="outline"
                className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-primary/40 bg-card px-5 text-sm font-bold text-primary shadow-sm transition-all duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md active:scale-95"
                onClick={() => setLimit((n) => n + 10)}
              >
                <span>{w.more}</span>
                <span className="flex h-5 items-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary transition-colors group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground">
                  +{Math.min(10, q.data.skills.length - limit)}
                </span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
              </Button>
            </div>
          )}
        </>
      )}
      <p className="mt-5 text-xs">
        {q.data?.source} · {q.data?.sample ?? 0} · {q.data?.checkedAt} ·{" "}
        <a href="/sources" className="underline">
          {lang === "en"
            ? "Data and method"
            : lang === "ms"
              ? "Data dan kaedah"
              : "数据与方法"}
        </a>
      </p>
    </Panel>
  );
}

export function MarketExplore() {
  const { lang } = useT(),
    w = jobWords[lang],
    m = marketWords[lang];
  const [tab, setTab] = useState("ai");
  return (
    <div className="space-y-4">
      <PageHeader
        title={tab === "skills" ? w.title : m.title}
        sub={tab === "skills" ? w.note : m.sub}
        help={
          <MarketGuide/>
        }
      />
      <div>
        <div
          role="tablist"
          className="grid grid-cols-3 gap-1 rounded-xl border bg-card p-1"
        >
          {[
            ["ai", m.ai],
            ["demand", m.demand],
            ["skills", w.tab],
          ].map(([id, label]) => (
            <button
              className={`min-h-11 rounded-lg px-2 text-xs sm:text-sm ${tab === id ? "bg-primary text-primary-foreground" : ""}`}
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "skills" ? (
        <MarketSkills hideHeader />
      ) : (
        <MarketOutlook
          hideGuide
          hideHeader
          selectedMode={tab === "demand" ? "demand" : "ai"}
        />
      )}
    </div>
  );
}
