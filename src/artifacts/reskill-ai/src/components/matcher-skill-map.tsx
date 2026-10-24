import { SkillSdg } from "./skill-sdg";
import type { Profile, Role, RoleMatch } from "@workspace/api-client-react";
import { MapPin, ArrowUpRight, Check, Lightbulb, BookOpen } from "lucide-react";
import { SdgBadge } from "./kit";
import { useT } from "@/i18n";
import { roleTitle } from "@/lib/fmt";
import { skillLabel } from "@/lib/skill-label";

export const matcherWords = {
  en: {
    courseNote:
      "Courses are starting points, not proof of skill or professional qualifications.",
    inferred: "Suggested from experience",
    known: "Already in your profile",
    learn: "Next to learn",
    specific: "Tools & subject skills",
    basics: "Everyday work skills",
    unavailable: "No matched course yet",
    course: "Explore a course",
    showing: "Showing skill map",
    exposure: "AI exposure",
    noData: "Not available",
    exposureNote:
      "Anthropic: observed AI task exposure. Not a chance of losing your job; US occupation reference.",
    sdg: "SDG links reflect the work’s theme, not measured impact.",
    foundationNote:
      "Useful for the role too. These do not replace its tools and subject skills.",
    source: "Role requirements: O*NET",
    covered: "with courses",
    missing: "Other requirements · course not yet found",
    unknown: "Course coverage is being checked",
  },
  ms: {
    courseNote:
      "Kursus ialah titik mula, bukan bukti penguasaan kemahiran atau kelayakan profesional.",
    inferred: "Cadangan daripada pengalaman",
    known: "Sudah dalam profil",
    learn: "Untuk dipelajari",
    specific: "Alat & kemahiran bidang",
    basics: "Kemahiran asas kerja",
    unavailable: "Belum ada kursus sepadan",
    course: "Terokai kursus",
    showing: "Peta kemahiran dipaparkan",
    exposure: "Pendedahan AI",
    noData: "Tidak tersedia",
    exposureNote:
      "Anthropic: pendedahan tugasan kepada AI yang diperhatikan. Bukan kebarangkalian kehilangan kerja; rujukan pekerjaan AS.",
    sdg: "Kaitan SDG mengikut tema kerja, bukan impak yang diukur.",
    foundationNote:
      "Turut berguna untuk peranan ini. Ia melengkapkan alat dan kemahiran bidang.",
    source: "Keperluan peranan: O*NET",
    covered: "dengan kursus",
    missing: "Keperluan lain · kursus belum ditemui",
    unknown: "Liputan kursus sedang disemak",
  },
  zh: {
    courseNote: "课程是学习起点，并非技能掌握或专业资格的证明。",
    inferred: "根据经历推测",
    known: "已在资料中",
    learn: "接下来学习",
    specific: "工具与专业技能",
    basics: "日常工作技能",
    unavailable: "尚无匹配课程",
    course: "查看课程",
    showing: "当前技能地图",
    exposure: "AI 接触程度",
    noData: "暂无数据",
    exposureNote:
      "Anthropic：实际观察到的 AI 任务接触程度，并非失业概率；采用美国职业参考数据。",
    sdg: "SDG 关联反映工作主题，并非已测量的影响。",
    foundationNote: "这些技能同样重要，与工具及专业技能相辅相成。",
    source: "职位要求：O*NET",
    covered: "提供课程",
    missing: "其他要求 · 尚未找到课程",
    unknown: "正在检查课程覆盖情况",
  },
};

export { roleGoals } from "@/lib/sdg-choice";
import { roleGoals } from "@/lib/sdg-choice";
import { SdgReason } from "./sdg-choice";

export function RoleGoals({ role }: { role: Role }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roleGoals(role).map((code, i) => (
        <SdgBadge key={code} code={code} primary={i === 0} />
      ))}
    </div>
  );
}

export function AiExposure({ role }: { role: Role }) {
  const { lang } = useT();
  const w = matcherWords[lang];
  const pct =
    role.aiExposure == null || !Number.isFinite(role.aiExposure)
      ? null
      : Math.round(Math.min(1, Math.max(0, role.aiExposure)) * 100);
  return (
    <div className="my-3 min-w-40" title={w.exposureNote}>
      <div className="mb-1 flex justify-between gap-3 text-xs">
        <span>{w.exposure}</span>
        <b>{pct == null ? w.noData : `${pct}%`}</b>
      </div>
      {pct != null && (
        <div
          role="progressbar"
          aria-label={`${w.exposure} · ${roleTitle(role, lang)}`}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-violet-500 motion-safe:transition-[width] motion-safe:duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function MatcherSkillMap({
  match,
  p,
  rank,
}: {
  match: RoleMatch;
  p: Profile;
  rank?: number;
}) {
  const { lang } = useT();
  const w = matcherWords[lang];
  const skills = match.role.skills;
  const groups = [
    {
      title: w.specific,
      skills: skills.filter(
        (s) => s.category !== "Human" && (s.courseCount ?? 0) > 0,
      ),
    },
    { title: w.basics, skills: skills.filter((s) => s.category === "Human") },
  ];
  const uncovered = skills.filter(
    (s) =>
      s.category !== "Human" && (s.courseCount === 0 || s.courseCount == null),
  );
  function tile(s: Role["skills"][number], i: number) {
    const known = match.matchedSkills.some((k) => k.skillId === s.skillId);
    const inferred =
      known &&
      !p.skills.some((k) => k.skillId === s.skillId && k.status !== "inferred");
    const Icon = inferred ? Lightbulb : known ? Check : BookOpen;
    return (
      <div
        key={s.skillId}
        style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
        className={`motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 rounded-xl border p-3 text-sm transition-shadow hover:shadow-md ${inferred ? "border-sky-500/40 bg-sky-500/10" : known ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}
      >
        <b>{skillLabel(s.name, lang)}</b>
        <SkillSdg
          name={s.name}
          subject={roleTitle(match.role, lang)}
          status={inferred ? "inferred" : known ? "known" : "learn"}
        />
        <p className="mt-2 flex items-center gap-1 text-xs">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {inferred ? w.inferred : known ? w.known : w.learn}
        </p>
        {s.courseUrl && (
          <a
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2"
            href={s.courseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {w.course} <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
        {!s.courseUrl && (
          <p className="mt-2 text-xs text-muted-foreground">
            {s.courseCount == null ? w.unknown : w.unavailable}
          </p>
        )}
      </div>
    );
  }
  return (
    <section
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 rounded-2xl border border-primary/30 bg-card p-5"
      aria-label={`${w.showing}: ${roleTitle(match.role, lang)}`}
    >
      <div className="mb-4 flex items-center gap-2 font-bold text-primary">
        <MapPin className="h-5 w-5" />
        <span>
          {rank ? `#${rank} · ` : ""}
          {w.showing} · {roleTitle(match.role, lang)}
        </span>
      </div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {[
          ["bg-emerald-500", w.known],
          ["bg-sky-500", w.inferred],
          ["bg-amber-500", w.learn],
        ].map(([color, label]) => (
          <span key={color} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded ${color}`} />
            {label}
          </span>
        ))}
      </div>
      {groups.map(
        (g) =>
          g.skills.length > 0 && (
            <div
              key={g.title === w.specific ? "specific" : "basics"}
              className="mb-5"
            >
              <h4 className="mb-2 text-sm font-bold">
                {g.title}{" "}
                {g.title === w.specific && (
                  <span className="font-normal text-muted-foreground">
                    · {w.covered}
                  </span>
                )}
              </h4>
              {g.title === w.basics && (
                <p className="mb-2 text-xs text-muted-foreground">
                  {w.foundationNote}
                </p>
              )}
              <div className="grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.skills.map(tile)}
              </div>
            </div>
          ),
      )}
      {uncovered.length > 0 && (
        <details className="rounded-xl border border-dashed p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            {w.missing} ({uncovered.length})
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {uncovered.map((s) => (
              <div key={s.skillId} className="text-xs">
                <b>{skillLabel(s.name, lang)}</b>
                <SkillSdg name={s.name} subject={roleTitle(match.role, lang)} />
                <p className="text-muted-foreground">
                  {s.courseCount == null ? w.unknown : w.unavailable}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
      <SdgReason
        role={match.role}
        matchedSkills={match.matchedSkills
          .filter((s) =>
            p.skills.some(
              (k) => k.skillId === s.skillId && k.status !== "inferred",
            ),
          )
          .map((s) => s.name)}
        missingSkills={match.gapSkills.map((s) => s.name)}
      />
      <p className="mt-3 text-xs text-muted-foreground">{w.courseNote}</p>
      {match.role.sourceUrl && (
        <a
          className="mt-4 inline-block text-xs underline"
          href={match.role.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {w.source} · {match.role.sourceVersion} ·{" "}
          {match.role.sourceFetchedAt?.slice(0, 10) ?? "—"}
        </a>
      )}
    </section>
  );
}
