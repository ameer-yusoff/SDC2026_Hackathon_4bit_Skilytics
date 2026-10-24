import {roleTitle} from "@/lib/fmt";
import {skillLabel} from "@/lib/skill-label";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useT } from "@/i18n";
import { Button } from "./ui/button";
import { ErrorBox, Markdown } from "./kit";
const copy = {
  en: {
    title: "Why does this year change?",
    explain: "Explain",
    loading: "Connecting this year with the evidence…",
    previous: "Previous year",
    selected: "Selected year",
    news: "Career, technology & AI signals",
    note: "AI explains the calculation and dated evidence. Headlines do not set these numbers. This is a scenario, not a measured forecast.",
    ai: "Each year adds 5% of the tasks still outside the observed AI overlap. The rate is a planning assumption.",
    demand:
      "The reviewed US ten-year growth is spread smoothly across ten years. These are not official yearly or Malaysian forecasts.",
    skills:
      "The learning-priority index grows by an assumed 5% per year. It is not a vacancy count or employer percentage.",
    graduate:
      "This fictional 2026 example adds 2 percentage points per year, capped at 100%. News cannot turn it into real institution employment data.",
    sources: "Evidence used",
    stale:
      "Recent news is unavailable or stale; statistical references remain available.",
  },
  ms: {
    title: "Kenapa nilai tahun ini berubah?",
    explain: "Jelaskan",
    loading: "Mengaitkan tahun ini dengan bukti…",
    previous: "Tahun sebelumnya",
    selected: "Tahun dipilih",
    news: "Isyarat kerjaya, teknologi & AI",
    note: "AI menerangkan kiraan dan bukti bertarikh. Berita tidak menetapkan angka ini. Ini senario, bukan ramalan terukur.",
    ai: "Setiap tahun menambah 5% tugas yang masih di luar pertindihan AI diperhatikan. Kadar ini ialah andaian perancangan.",
    demand:
      "Pertumbuhan sepuluh tahun Amerika Syarikat disebarkan secara sekata. Ini bukan ramalan tahunan rasmi atau ramalan Malaysia.",
    skills:
      "Indeks keutamaan belajar meningkat dengan andaian 5% setahun. Bukan jumlah vacancy atau peratus majikan.",
    graduate:
      "Contoh rekaan 2026 ini menambah 2 mata peratus setahun, sehingga 100%. Berita tidak menjadikannya data pekerjaan sebenar institusi.",
    sources: "Bukti dirujuk",
    stale:
      "Berita terkini tiada atau sudah lama; rujukan statistik masih tersedia.",
  },
  zh: {
    title: "为什么该年份的数值变化？",
    explain: "解释",
    loading: "正在关联该年与参考证据…",
    previous: "前一年",
    selected: "所选年份",
    news: "职业、技术与AI信号",
    note: "AI解释计算和注明日期的证据。新闻不决定这些数值。这是情景，并非实测预测。",
    ai: "每年假设纳入尚未被观察到AI重叠覆盖任务的5%。这是规划假设。",
    demand:
      "将已审核的美国十年增长平滑分配到十年。这不是官方年度或马来西亚预测。",
    skills: "学习优先级指数假设每年增长5%，并非职位数量或雇主百分比。",
    graduate:
      "虚构2026年示例每年增加2个百分点，最高100%。新闻不会将它变为本机构真实就业数据。",
    sources: "参考依据",
    stale: "近期新闻缺失或已过时；仍可参考统计资料。",
  },
};
type Mode = "ai" | "demand" | "skills";
type Row = { name: string; nameMs?:string;nameZh?:string; previous: number | null; selected: number | null };
type Reply = {
  mode: Mode;
  years: number;
  baseYear: number;
  rows: Row[];
  generated: boolean;
  translations: { en: string; ms: string; zh: string } | null;
  sources: { label: string; url: string; dataDate: string | null }[];
  newsStale: boolean;
};
export function ScenarioMath({
  mode,
  years,
  baseYear = new Date().getFullYear(),
  rows,
}: {
  mode: Mode | "graduate";
  years: number;
  baseYear?: number;
  rows: Row[];
}) {
  const { lang } = useT(),
    w = copy[lang],
    pct = mode !== "skills";
  const value = (n: number | null) =>
    n == null
      ? "—"
      : `${n.toLocaleString({ en: "en-GB", ms: "ms-MY", zh: "zh-CN" }[lang], { maximumFractionDigits: 1, minimumFractionDigits: 1 })}${pct ? "%" : ""}`;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{w[mode]}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.name} className="min-w-0 rounded-xl bg-background p-3">
            <p className="mb-2 break-words text-xs font-semibold">{mode === "skills" ? skillLabel(r.name,lang) : roleTitle({title:r.name,titleMs:r.nameMs??r.name,titleZh:r.nameZh??r.name},lang)}</p>
            <div className="flex items-center justify-between gap-2 text-sm tabular-nums">
              <span>
                <small className="block text-[10px] text-muted-foreground">
                  {baseYear + years - 1}
                </small>
                {value(r.previous)}
              </span>
              <span aria-hidden>→</span>
              <strong className="text-primary">
                <small className="block text-[10px] font-normal">
                  {baseYear + years}
                </small>
                {value(r.selected)}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export function ScenarioReason({ mode, years }: { mode: Mode; years: number }) {
  const { lang } = useT(),
    w = copy[lang],
    qc = useQueryClient();
  const [settled, setSettled] = useState(years);
  useEffect(() => {
    const id = setTimeout(() => setSettled(years), 300);
    return () => clearTimeout(id);
  }, [years]);
  const key = (at: number) => ["scenario-explanation", mode, at];
  const q = useQuery({
    queryKey: key(settled),
    queryFn: ({ signal }) =>
      customFetch<Reply>(
        `/api/market/scenario-explanation?mode=${mode}&years=${settled}`,
        { signal },
      ),
    staleTime: 300000,
    retry: false,
  });
  const ai = useMutation({
    mutationFn: async ({ at, forMode }: { at: number; forMode: Mode }) => ({
      at,
      data: await customFetch<Reply>("/api/market/scenario-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: forMode, years: at }),
      }),
    }),
    onSuccess: ({ at, data }) =>
      qc.setQueryData(["scenario-explanation", data.mode, at], data),
  });
  const data = q.data?.years === years ? q.data : undefined;
  return (
    <section
      className="rounded-2xl border bg-primary/5 p-4 sm:p-5"
      aria-label={w.title}
      data-testid="scenario-reason"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">
          {w.title} · {(data?.baseYear ?? new Date().getFullYear()) + years}
        </h2>
        <Button
          variant="outline"
          disabled={!data || ai.isPending}
          onClick={() => ai.mutate({ at: years, forMode: mode })}
        >
          {ai.isPending
            ? w.loading
            : `${w.explain} ${(data?.baseYear ?? new Date().getFullYear()) + years}`}
        </Button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{w.note}</p>
      {data && (
        <ScenarioMath
          mode={mode}
          years={years}
          baseYear={data.baseYear}
          rows={data.rows}
        />
      )}
      {q.isError && <ErrorBox error={q.error} retry={() => q.refetch()} />}{" "}
      {ai.isError &&
        ai.variables?.at === years &&
        ai.variables?.forMode === mode && <ErrorBox error={ai.error} />}{" "}
      {data?.newsStale && (
        <p className="mt-3 text-xs text-muted-foreground">{w.stale}</p>
      )}
      {data?.translations && (
        <div className="mt-4 text-sm">
          <Markdown>{data.translations[lang]}</Markdown>
        </div>
      )}
      {data && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer font-semibold">
            {w.sources}
          </summary>
          <ul className="mt-2 space-y-2">
            {data.sources.map((s) => (
              <li key={s.url}>
                <a
                  className="break-words text-primary underline"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.label}
                </a>
                {s.dataDate && <span> · {s.dataDate}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export function AnalysisEvidence({
  sources,
  model,
}: {
  sources?: { label: string; url: string; dataDate?: string | null }[];
  model?: string;
}) {
  const { lang } = useT(),
    w = copy[lang];
  return (
    <div className="my-3 text-xs">
      {model?.startsWith("deterministic") && (
        <p className="mb-2 text-muted-foreground">
          {lang === "ms"
            ? "Penerangan kiraan tersimpan · AI tidak tersedia"
            : lang === "zh"
              ? "已保存计算解释 · AI暂不可用"
              : "Saved calculation explanation · AI unavailable"}
        </p>
      )}
      {!!sources?.length && (
        <details>
          <summary className="cursor-pointer font-semibold">
            {w.sources}
          </summary>
          <ul className="mt-2 space-y-2">
            {sources.map((s) => (
              <li key={s.url}>
                <a
                  className="break-words text-primary underline"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.label}
                </a>
                {s.dataDate && ` · ${s.dataDate}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
