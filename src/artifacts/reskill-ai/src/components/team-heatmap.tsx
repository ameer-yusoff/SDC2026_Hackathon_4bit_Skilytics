import { Link } from "wouter";
import { useT } from "@/i18n";
import { skillLabel } from "@/lib/skill-label";
import { heatStatus } from "@/lib/team-heatmap";
import type { Company } from "@/lib/enterprise";
const words = {
  en: {
    title: "Team skill map",
    note: "Skills for chosen or suggested career directions. Colours show evidence, not a performance rating. Course completion is self-reported.",
    gap: "To learn",
    inferred: "Suggested from experience",
    profile: "In profile",
    course: "Course completed",
    na: "Not required here",
    person: "Person",
    empty: "Choose career paths to see the team map.",
    courses: "Find a course",
    priority: "People still to learn",
  },
  ms: {
    title: "Peta kemahiran pasukan",
    note: "Kemahiran bagi hala tuju kerjaya dipilih atau dicadangkan. Warna menunjukkan bukti, bukan penilaian prestasi. Penyempurnaan kursus dilapor sendiri.",
    gap: "Untuk dipelajari",
    inferred: "Cadangan pengalaman",
    profile: "Dalam profil",
    course: "Kursus selesai",
    na: "Tidak diperlukan di sini",
    person: "Individu",
    empty: "Pilih laluan kerjaya untuk melihat peta pasukan.",
    courses: "Cari kursus",
    priority: "Individu masih perlu belajar",
  },
  zh: {
    title: "团队技能地图",
    note: "已选或推荐职业方向所需的技能。颜色表示证据，并非绩效评级。课程完成情况由用户自行确认。",
    gap: "待学习",
    inferred: "根据经历推测",
    profile: "资料中已有",
    course: "课程已完成",
    na: "此方向不需要",
    person: "成员",
    empty: "选择职业方向后即可查看团队地图。",
    courses: "查找课程",
    priority: "仍需学习的人数",
  },
};
const tones = {
  gap: "bg-rose-100 text-rose-950",
  inferred: "bg-amber-100 text-amber-950",
  profile: "bg-emerald-100 text-emerald-950",
  course: "bg-sky-100 text-sky-950",
  na: "bg-muted/40 text-muted-foreground",
};
export function TeamHeatmap({
  company: c,
  base = "/hr/members",
}: {
  company: Company;
  base?: string;
}) {
  const { lang } = useT(),
    w = words[lang];
  const names = [...new Set(c.members.flatMap((m) => m.requiredSkills ?? []))]
    .sort(
      (a, b) =>
        c.members.filter((m) => heatStatus(m, b) === "gap").length -
          c.members.filter((m) => heatStatus(m, a) === "gap").length ||
        a.localeCompare(b),
    )
    .slice(0, 10);
  return (
    <section className="my-5 rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-bold">{w.title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{w.note}</p>
      <div className="my-3 flex flex-wrap gap-2">
        {(Object.keys(tones) as (keyof typeof tones)[]).map((s) => (
          <span key={s} className={`rounded-lg px-2 py-1 text-xs ${tones[s]}`}>
            {w[s]}
          </span>
        ))}
      </div>
      {!names.length ? (
        <p className="text-sm">{w.empty}</p>
      ) : (
        <div
          className="overflow-x-auto rounded-xl border"
          tabIndex={0}
          aria-label={w.title}
        >
          <table className="w-full border-separate border-spacing-1 text-xs">
            <caption className="sr-only">{w.note}</caption>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-36 bg-card p-2 text-left">
                  {w.person}
                </th>
                {names.map((n) => (
                  <th key={n} className="min-w-32 p-2">
                    <a
                      href={`${base.startsWith("/tvet") ? "/tvet/courses" : "/hr/courses"}?search=${encodeURIComponent(n)}`}
                      className="text-primary underline"
                      title={w.courses}
                    >
                      {skillLabel(n, lang)}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.members.map((m) => (
                <tr key={m.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-card p-2 text-left"
                  >
                    <Link
                      className="inline-flex min-h-11 items-center text-primary underline"
                      href={`${base}/${m.id}/intake`}
                    >
                      {m.name}
                    </Link>
                  </th>
                  {names.map((n) => {
                    const s = heatStatus(m, n);
                    return (
                      <td
                        key={n}
                        className={`rounded-lg p-2 text-center ${tones[s]}`}
                      >
                        {w[s]}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th className="sticky left-0 bg-card p-2 text-left">
                  {w.priority}
                </th>
                {names.map((n) => (
                  <td key={n} className="p-2 text-center font-bold">
                    {c.members.filter((m) => heatStatus(m, n) === "gap").length}{" "}
                    /{" "}
                    {
                      c.members.filter((m) => m.requiredSkills?.includes(n))
                        .length
                    }
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
