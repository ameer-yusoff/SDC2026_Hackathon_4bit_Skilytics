import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import {
  scenarioValue,
  type FutureScenario,
} from "../../../api-server/src/lib/future-scenarios";
const key = "skilytics-future-scenario";
export function useFutureScenario() {
  const [scenario, set] = useState<FutureScenario>(() => {
    try {
      return localStorage.getItem(key) === "fast" ? "fast" : "moderate";
    } catch {
      return "moderate";
    }
  });
  useEffect(() => {
    const sync = () => {
      try {
        set(localStorage.getItem(key) === "fast" ? "fast" : "moderate");
      } catch {}
    };
    window.addEventListener(key, sync);
    return () => window.removeEventListener(key, sync);
  }, []);
  return [
    scenario,
    (v: FutureScenario) => {
      set(v);
      try {
        localStorage.setItem(key, v);
      } catch {}
      window.dispatchEvent(new Event(key));
    },
  ] as const;
}
export function FutureScenarioChoice({
  graduate = false,
}: {
  graduate?: boolean;
}) {
  const { lang } = useT();
  const [value, set] = useFutureScenario();
  const w = {
    en: [
      "Compare assumptions",
      "Moderate transition",
      "Faster transition",
      "Same year, different assumptions. Moderate: 5% of remaining tasks/year; faster: 10%, with 1.35× the reference growth trajectory. Illustrations, not measured forecasts.",
      "AI task overlap after 3 years, starting at 40%",
    ],
    ms: [
      "Bandingkan andaian",
      "Peralihan sederhana",
      "Peralihan lebih cepat",
      "Tahun sama, andaian berbeza. Sederhana: 5% baki tugas/tahun; cepat: 10%, dengan 1.35× trajektori pertumbuhan rujukan. Ilustrasi, bukan ramalan terukur.",
      "Pertindihan tugas AI selepas 3 tahun, bermula pada 40%",
    ],
    zh: [
      "比较假设",
      "中等转型",
      "较快转型",
      "同一年，不同假设。中等：每年剩余任务的5%；较快：10%，参考增长轨迹乘1.35。仅为示例，并非实测预测。",
      "从40%开始，3年后的AI任务重叠",
    ],
  }[lang];
  return (
    <fieldset className="mb-4 rounded-2xl border bg-card p-4">
      <legend className="px-1 text-sm font-bold">{w[0]}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(["moderate", "fast"] as const).map((s, i) => (
          <button
            type="button"
            key={s}
            aria-pressed={value === s}
            onClick={() => set(s)}
            className={`min-h-11 rounded-xl border p-3 text-sm font-bold ${value === s ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {w[i + 1]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {graduate
          ? {
              en: "Fictional graduate example: +2 or +4 percentage points/year, capped at 100%. Not measured employment.",
              ms: "Contoh graduan rekaan: +2 atau +4 mata peratus/tahun, sehingga 100%. Bukan pekerjaan diukur.",
              zh: "虚构毕业生示例：每年+2或+4个百分点，上限100%。并非实测就业。",
            }[lang]
          : w[3]}
      </p>
    </fieldset>
  );
}

export function ScenarioComparison({
  mode,
  years,
  rows,
}: {
  mode: "ai" | "demand" | "skills";
  years: number;
  rows: { name: string; baseline: number | null }[];
}) {
  const { lang } = useT();
  const w = {
    en: ["Same year · two assumptions", "Moderate", "Faster"],
    ms: ["Tahun sama · dua andaian", "Sederhana", "Lebih cepat"],
    zh: ["同一年 · 两种假设", "中等", "较快"],
  }[lang];
  return (
    <details className="my-3 rounded-xl border bg-background p-3 text-xs">
      <summary className="min-h-11 cursor-pointer py-3 font-bold">
        {w[0]} · {new Date().getFullYear() + years}
      </summary>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3">
        <span />
        <b>{w[1]}</b>
        <b>{w[2]}</b>
        {rows.map((r) => (
          <div className="contents" key={r.name}>
            <span className="break-words">{r.name}</span>
            {(["moderate", "fast"] as const).map((s) => (
              <b key={s} className="tabular-nums">
                {scenarioValue(mode, r.baseline, years, s)?.toFixed(1) ?? "—"}
                {mode === "skills" ? "" : "%"}
              </b>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}
