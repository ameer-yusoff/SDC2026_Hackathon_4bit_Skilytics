import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useT } from "@/i18n";
import { HorizonSlider } from "./projection-feedback";
import { type TrendReference } from "../../../api-server/src/lib/future-scenarios";
export type MarketSignals = {
  references: (TrendReference & {
    title: string;
    titleMs: string;
    titleZh: string;
  })[];
  checkedAt: string;
  observation: {
    day: string;
    total: number;
    previousDay: string | null;
  } | null;
  news?: { count: number; fetchedAt: string | null };
};
export function useMarketSignals() {
  return useQuery({
    queryKey: ["matcher-market-signals"],
    queryFn: () => customFetch<MarketSignals>("/api/market/signals"),
    staleTime: 300000,
    retry: false,
  });
}
export function MatcherTrends({
  years,
  setYears,
}: {
  years: number;
  setYears: (n: number) => void;
}) {
  const { lang } = useT();
  const q = useMarketSignals();
  const w = {
    en: [
      "Your fit + the changing market",
      "Fit describes you. Future priority uses 80% fit + 20% source-based priority. It combines US growth references with comparable Malaysia listing-share changes when available; missing data stays unknown. News is context, never a numerical rate.",
      "Compare years",
      "Listing sample",
      "No comparable earlier sample yet",
      "Data unavailable: showing personal fit",
      "Changing assumptions can change the order. Your profile stays the same; choose a path before a new plan is saved.",
    ],
    ms: [
      "Padanan anda + perubahan pasaran",
      "Fit menerangkan diri anda. Keutamaan masa depan menggunakan 80% fit + 20% keutamaan bersumber. Ia menggabungkan rujukan pertumbuhan AS dengan perubahan bahagian iklan Malaysia jika setara; data tiada kekal tidak diketahui. Berita ialah konteks, bukan kadar angka.",
      "Bandingkan tahun",
      "Sampel iklan",
      "Belum ada sampel terdahulu yang setara",
      "Data tidak tersedia: paparkan padanan peribadi",
      "Tukar andaian boleh mengubah susunan. Profil kekal sama; pilih laluan sebelum pelan baharu disimpan.",
    ],
    zh: [
      "个人匹配与市场变化",
      "匹配描述你。未来优先级采用80%匹配加20%来源优先级，结合美国增长参考与可比的马来西亚职位占比变化。缺失数据保持未知；新闻仅为背景，不决定数值。",
      "比较年份",
      "职位样本",
      "尚无可比的早期样本",
      "数据不可用：显示个人匹配",
      "改变假设可能改变排序，个人资料不变。选择道路后才保存新计划。",
    ],
  }[lang];
  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="font-bold">{w[0]}</h3>
      <HorizonSlider
        id="matcher-years"
        label={w[2]}
        years={years}
        onChange={setYears}
      />
      <details className="text-xs">
        <summary className="min-h-11 cursor-pointer py-3">
          {w[0]} · {q.data?.checkedAt.slice(0, 10) ?? "—"}
        </summary>
        <p>{w[1]}</p>
        {q.data?.observation ? (
          <p className="mt-2">
            {w[3]}: {q.data.observation.total} · {q.data.observation.day} ·{" "}
            {q.data.observation.previousDay ?? w[4]}
          </p>
        ) : (
          <p className="mt-2">{w[4]}</p>
        )}
        {q.isError && <p>{w[5]}</p>}
        <p className="mt-2">{w[6]}</p>
        {q.data?.references[0] && (
          <a
            className="inline-flex min-h-11 items-center underline"
            href={q.data.references[0].source}
            target="_blank"
            rel="noreferrer"
          >
            BLS · {q.data.references[0].period} ·{" "}
            {q.data.references[0].reviewedAt}
          </a>
        )}
      </details>
    </section>
  );
}

export function ReferenceDirections() {
  const { lang } = useT();
  const q = useMarketSignals();
  const labels = {
    en: [
      "Rising and declining · source reference",
      "Rising",
      "Declining",
      "US BLS ten-year occupation references; not Malaysian vacancy counts. Specialised roles may share one broad SOC reference. Your selected scenario changes its trajectory, not the original source value.",
    ],
    ms: [
      "Meningkat dan menurun · rujukan sumber",
      "Meningkat",
      "Menurun",
      "Rujukan pekerjaan sepuluh tahun BLS AS, bukan bilangan vacancy Malaysia. Role khusus mungkin berkongsi satu SOC luas. Senario dipilih mengubah trajektori, bukan nilai asal sumber.",
    ],
    zh: [
      "上升与下降 · 来源参考",
      "上升",
      "下降",
      "美国BLS十年职业参考，并非马来西亚职位数量。细分职位可能共享较宽泛SOC。情景改变轨迹，不改变原始来源数值。",
    ],
  }[lang];
  return (
    <details className="my-4 rounded-2xl border bg-card p-4 text-xs">
      <summary className="min-h-11 cursor-pointer py-3 font-bold">
        {labels[0]}
      </summary>
      <p className="mb-3 text-muted-foreground">{labels[3]}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[true, false].map((up) => (
          <div key={String(up)} className="rounded-xl bg-muted/40 p-3">
            <b>{labels[up ? 1 : 2]}</b>
            {q.data?.references
              .filter(
                (r) =>
                  r.growthPct != null &&
                  (up ? r.growthPct > 0 : r.growthPct < 0),
              )
              .sort((a, b) =>
                up ? b.growthPct! - a.growthPct! : a.growthPct! - b.growthPct!,
              )
              .slice(0, 5)
              .map((r) => (
                <p key={r.roleId} className="my-2 flex justify-between gap-3">
                  <span>
                    {lang === "ms"
                      ? r.titleMs
                      : lang === "zh"
                        ? r.titleZh
                        : r.title}
                  </span>
                  <b className="tabular-nums">
                    {r.growthPct! > 0 ? "+" : ""}
                    {r.growthPct}%
                  </b>
                </p>
              ))}
          </div>
        ))}
      </div>
    </details>
  );
}

export function RoleTrendEvidence({
  roleId,
  fit,
  years,
}: {
  roleId: number;
  fit: number;
  years: number;
}) {
  const q = useMarketSignals();
  const { lang } = useT();
  const r = q.data?.references.find((r) => r.roleId === roleId);
  const w = {
    en: [
      "Why this priority?",
      "Personal fit",
      "US 10-year growth reference",
      "Malaysia skill-share change",
      "Unavailable",
    ],
    ms: [
      "Mengapa keutamaan ini?",
      "Padanan peribadi",
      "Rujukan pertumbuhan AS 10 tahun",
      "Perubahan bahagian skill Malaysia",
      "Tidak tersedia",
    ],
    zh: [
      "为什么这样排序？",
      "个人匹配",
      "美国十年增长参考",
      "马来西亚技能占比变化",
      "未知",
    ],
  }[lang];
  return (
    <details className="my-2 text-xs">
      <summary className="min-h-11 cursor-pointer py-3 text-primary">
        {w[0]}
      </summary>
      <p>
        {w[1]}: {fit}
      </p>
      <p>
        {w[2]}: {r?.growthPct ?? w[4]}
        {r?.growthPct != null ? "%" : ""} · {r?.period}
      </p>
      <p>
        {w[3]}: {r?.observedShift?.toFixed(1) ?? w[4]}
        {r?.observedShift != null ? " pp" : ""}
      </p>
      <p className="mt-1 text-muted-foreground">
        {new Date().getFullYear() + years} · {r?.reviewedAt}
      </p>
    </details>
  );
}
