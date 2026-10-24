import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useT } from "@/i18n";
import { skillLabel } from "@/lib/skill-label";
import { SkillSdg } from "./skill-sdg";
type Snapshot = { day: string; total: number; providers: string[] };
type Observation = {
  current: Snapshot;
  previous: Snapshot | null;
  skills: {
    id: number;
    name: string;
    count: number;
    share: number | null;
    previousShare: number | null;
    delta: number | null;
    direction: string;
  }[];
};
export function SkillTrends() {
  const { lang } = useT();
  const [limit, setLimit] = useState(3);
  const q = useQuery({
    queryKey: ["skill-observations"],
    queryFn: () => customFetch<Observation>("/api/market/skill-observations"),
    staleTime: 3600000,
    retry: false,
  });
  const w = {
    en: [
      "Observed listing changes",
      "Malaysia-eligible remote feed sample, including worldwide matches; not the whole local market. A skill can appear in several listings. Compare the same providers at least 7 days apart, with at least 20 listings each. Changes are percentage points of listing share, not worker shortages.",
      "Not enough comparable history yet. Daily snapshots start from the first successful collection; we do not invent earlier data.",
      "Rising",
      "Stable",
      "Declining",
      "Unavailable",
      "Listings",
      "Previous",
      "Current",
    ],
    ms: [
      "Perubahan iklan diperhatikan",
      "Sampel feed remote yang layak untuk Malaysia, termasuk iklan seluruh dunia; bukan seluruh pasaran tempatan. Satu kemahiran boleh muncul dalam banyak iklan. Bandingkan sumber sama sekurang-kurangnya 7 hari berasingan, minimum 20 iklan setiap sampel. Perubahan ialah mata peratus bahagian iklan, bukan kekurangan pekerja.",
      "Belum cukup sejarah setara. Snapshot harian bermula daripada kutipan pertama berjaya; tiada data lama direka.",
      "Meningkat",
      "Stabil",
      "Menurun",
      "Tidak tersedia",
      "Iklan",
      "Terdahulu",
      "Semasa",
    ],
    zh: [
      "观察到的职位变化",
      "适用于马来西亚的远程职位样本，包含全球职位，并非整个本地市场。一项技能可出现于多个职位。比较相同来源、至少相隔7天且各有20个职位的样本。变化为职位占比的百分点，并非劳动力短缺。",
      "可比历史不足。每日快照从首次成功采集开始，不编造历史。",
      "上升",
      "稳定",
      "下降",
      "未知",
      "职位",
      "之前",
      "当前",
    ],
  }[lang];
  const comparable = q.data?.skills.some((s) => s.delta != null);
  const top = [...(q.data?.skills ?? [])]
    .filter((s) => s.count > 0 || s.previousShare)
    .sort(
      (a, b) =>
        Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0) || b.count - a.count,
    )
    .slice(0, 12);
  return (
    <details className="mb-5 rounded-2xl border bg-card p-4">
      <summary className="min-h-11 cursor-pointer font-bold">{w[0]}</summary>
      <p className="my-2 text-xs text-muted-foreground">{w[1]}</p>
      {!comparable && (
        <p role="status" className="my-3 rounded-xl bg-amber-50 p-3 text-xs">
          {w[2]}
        </p>
      )}
      {q.data && (
        <p className="my-3 text-xs">
          {w[7]}: {q.data.current.total} · {q.data.current.day} ·{" "}
          {q.data.current.providers.join(" / ")}
          <br />
          {w[8]}:{" "}
          {q.data.previous
            ? `${q.data.previous.total} · ${q.data.previous.day}`
            : "—"}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        {top.slice(0, limit).map((s) => (
          <article key={s.id} className="rounded-xl border p-3 text-sm">
            <b>{skillLabel(s.name, lang)}</b>
            <p>
              {
                w[
                  s.direction === "rising"
                    ? 3
                    : s.direction === "stable"
                      ? 4
                      : s.direction === "declining"
                        ? 5
                        : 6
                ]
              }{" "}
              ·{" "}
              {s.delta == null
                ? "—"
                : `${s.delta > 0 ? "+" : ""}${s.delta.toFixed(1)} pp`}
            </p>
            <p className="text-xs">
              {s.count} / {q.data?.current.total} · {s.share?.toFixed(1) ?? "—"}
              %
            </p>
            <SkillSdg name={s.name} />
          </article>
        ))}
      </div>
      {limit < top.length && (
        <button
          type="button"
          className="mt-3 min-h-11 rounded-xl border px-4 font-bold"
          onClick={() => setLimit((n) => n + 3)}
        >
          {lang === "ms"
            ? "Muat lagi"
            : lang === "zh"
              ? "加载更多"
              : "Load more"}
        </button>
      )}
    </details>
  );
}
