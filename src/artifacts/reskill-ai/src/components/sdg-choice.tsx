import { sdgExplanation } from "@/lib/sdg-explanations";
import { useId } from "react";
import { Filter, RotateCcw, ChevronDown } from "lucide-react";
import { useT } from "@/i18n";
import { roleGoals } from "@/lib/sdg-choice";
import { SdgBadge } from "./kit";
const words = {
  en: {
    choose: "What would you like your work to support?",
    all: "All themes",
    note: "Filters work themes. Your skills score stays the same; these are not measured SDG outcomes.",
    empty: "No matching careers yet. Try another theme.",
    title: "How your learning connects",
    learn: "4.3 · 4.4: Build useful skills through accessible learning.",
    work: "8.2 · 8.5: Practise better ways to work and prepare for employment.",
    limit:
      "A learning goal, not proof of a job, productivity gain or measured UN impact.",
    role: "Explore work linked to",
    guard: "Catalogue-based choices",
    guardNote:
      "Roles and course links come from our source catalogue. Review requirements and current prices with the provider. AI explanations can be wrong.",
    synthetic: "Fictional demo profiles · not real people",
  },
  ms: {
    choose: "Apakah yang anda mahu sokong melalui kerja?",
    all: "Semua tema",
    note: "Menapis tema kerja. Skor kemahiran kekal sama; bukan hasil SDG yang diukur.",
    empty: "Belum ada kerjaya sepadan. Cuba tema lain.",
    title: "Kaitan pembelajaran anda",
    learn:
      "4.3 · 4.4: Bina kemahiran berguna melalui pembelajaran yang mudah diakses.",
    work: "8.2 · 8.5: Latih cara kerja lebih baik dan bersedia untuk pekerjaan.",
    limit:
      "Matlamat pembelajaran, bukan bukti pekerjaan, peningkatan produktiviti atau impak PBB yang diukur.",
    role: "Terokai kerja berkaitan",
    guard: "Pilihan berdasarkan katalog",
    guardNote:
      "Peranan dan pautan kursus daripada katalog sumber kami. Semak syarat dan harga semasa dengan penyedia. Penjelasan AI boleh tersilap.",
    synthetic: "Profil demo rekaan · bukan individu sebenar",
  },
  zh: {
    choose: "你希望工作支持什么？",
    all: "所有主题",
    note: "按工作主题筛选。技能分数不变；这些不是实测的SDG成果。",
    empty: "暂无匹配职业，请尝试其他主题。",
    title: "学习与目标的联系",
    learn: "4.3 · 4.4：通过易于获取的学习机会培养实用技能。",
    work: "8.2 · 8.5：练习更好的工作方法，为就业做好准备。",
    limit: "这是学习目标，不代表已获得工作、提高生产力或实现联合国实测影响。",
    role: "探索与以下目标相关的工作",
    guard: "基于目录的选择",
    guardNote:
      "职位与课程链接来自来源目录。请向机构确认要求与最新价格。AI解释可能出错。",
    synthetic: "虚构示例资料 · 非真实人物",
  },
};
export function SdgChoice({
  goals,
  value,
  onChange,
  learning = false,
  note,
}: {
  goals: string[];
  value: string;
  onChange: (v: string) => void;
  learning?: boolean;
  note?: string;
}) {
  const { lang, tk } = useT(),
    w = words[lang];
  const inputId = useId();
  const available = [...new Set(goals.map((g) => g.split(".")[0]))].filter(
    (g) => /^(?:[1-9]|1[0-7])$/.test(g),
  );
  const current = value === "all" || available.includes(value) ? value : "all";
  const label =
    lang === "ms" ? "Tema SDG" : lang === "zh" ? "SDG主题" : "SDG theme";
  const reset =
    lang === "ms"
      ? "Reset penapis SDG"
      : lang === "zh"
        ? "重置SDG筛选"
        : "Reset SDG filter";
  return (
    <fieldset
      className="min-w-0 rounded-2xl border bg-card p-3 sm:p-4"
      data-testid="sdg-filter"
    >
      <legend id={inputId + "-label"} className="px-1 text-sm font-bold">
        <span className="sm:hidden">{label}</span>
        <span className="hidden sm:inline">
          {learning
            ? lang === "ms"
              ? "Apakah yang anda mahu sokong melalui pembelajaran?"
              : lang === "zh"
                ? "你希望学习支持什么？"
                : "What would you like your learning to support?"
            : w.choose}
        </span>
      </legend>
      <div className="flex min-w-0 items-center gap-2 sm:hidden">
        <div
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 focus-within:ring-2 focus-within:ring-primary/40 ${current !== "all" ? "border-primary/40 bg-primary/5" : "bg-background"}`}
        >
          {current === "all" ? (
            <Filter
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-primary"
            />
          ) : (
            <img
              key={current}
              src={`/sdg/${current}.png`}
              alt=""
              className="h-8 w-8 shrink-0 motion-safe:animate-in motion-safe:fade-in"
            />
          )}
          <select
            id={inputId}
            aria-labelledby={inputId + "-label"}
            className="min-h-12 min-w-0 flex-1 appearance-none bg-transparent pr-1 text-base font-medium focus:outline-none"
            value={current}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="all">{w.all}</option>
            {available.map((g) => (
              <option key={g} value={g}>
                {tk("sdg", g)}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none h-4 w-4 shrink-0"
          />
        </div>
        {current !== "all" && (
          <button
            type="button"
            aria-label={reset}
            title={reset}
            onClick={() => onChange("all")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-background text-primary active:scale-95 motion-safe:transition-transform"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="hidden flex-wrap gap-2 sm:flex">
        {["all", ...available].map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={current === g}
            onClick={() => onChange(g)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary motion-safe:transition-colors ${current === g ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {g !== "all" && (
              <img
                src={`/sdg/${g}.png`}
                alt=""
                loading="lazy"
                className="h-8 w-8 object-contain"
              />
            )}
            {g === "all" ? w.all : tk("sdg", g)}
          </button>
        ))}
      </div>
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="min-h-10 cursor-pointer content-center font-medium">
          {lang === "ms"
            ? "Tentang penapis ini"
            : lang === "zh"
              ? "关于此筛选"
              : "About this filter"}
        </summary>
        <p className="pb-2 leading-relaxed">
          {note ??
            (learning
              ? lang === "ms"
                ? "Tapis kursus mengikut tema pembelajaran."
                : lang === "zh"
                  ? "按学习主题筛选课程。"
                  : "Filter courses by learning theme."
              : w.note)}{" "}
          {lang === "ms"
            ? "Hanya tema yang ada padanan dipaparkan. Kesemua 17 SDG disokong jika relevan."
            : lang === "zh"
              ? "仅显示有匹配的主题，相关时支持全部17项目标。"
              : "Only themes with matches are shown. All 17 goals are supported when relevant."}
        </p>
      </details>
    </fieldset>
  );
}

export function SdgReason({
  role,
}: {
  role: { title: string; sector: string; skills?: { name: string }[] };
}) {
  return (
    <SdgExplanation
      goals={roleGoals(role)}
      kind="role"
      subject={role.title}
      skills={role.skills?.map((s) => s.name)}
    />
  );
}
export function SdgExplanation({
  goals,
  subject = "",
  skills = [],
  kind = "course",
  expanded = false,
}: {
  goals: string[];
  subject?: string;
  skills?: string[];
  kind?: "course" | "role" | "vacancy" | "pathway";
  expanded?: boolean;
}) {
  const { lang, tk } = useT();
  const selected = [...new Set(goals.map((g) => g.split(".")[0]))].filter((g) =>
    /^(?:[1-9]|1[0-7])$/.test(g),
  );
  if (!selected.length) return null;
  const w = {
    en: {
      title: "Why these SDGs?",
      you: "For you",
      world: "Bigger picture",
      note: "A possible link through the topic, not measured impact or a job guarantee.",
      vacancy:
        "These themes refer to a similar occupation. They are not an assessment of this employer.",
    },
    ms: {
      title: "Mengapa SDG ini?",
      you: "Untuk anda",
      world: "Gambaran global",
      note: "Kaitan yang mungkin melalui topik ini, bukan impak diukur atau jaminan pekerjaan.",
      vacancy:
        "Tema ini merujuk pekerjaan seumpama. Ia bukan penilaian terhadap majikan ini.",
    },
    zh: {
      title: "为什么关联这些SDG？",
      you: "对你而言",
      world: "放眼全球",
      note: "这是主题上的可能联系，并非实测影响或就业保证。",
      vacancy: "这些主题参考相似职业，并非对该雇主的评估。",
    },
  }[lang];
  return (
    <details
      open={expanded || undefined}
      className="group/sdg mt-3 min-w-0 rounded-xl border border-primary/15 bg-primary/[0.025] px-3 text-xs"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-primary">
        {w.title}
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 group-open/sdg:rotate-180 motion-safe:transition-transform"
        />
      </summary>
      <div className="space-y-3 pb-3">
        {selected.map((g) => {
          const reason = sdgExplanation(g, subject, skills, lang)!;
          return (
            <div
              key={g}
              className="rounded-lg bg-card p-3 motion-safe:animate-in motion-safe:fade-in"
            >
              <div className="mb-2 flex items-center gap-2">
                <SdgBadge code={g} compact />
                <b>{tk("sdg", g)}</b>
              </div>
              <p className="leading-relaxed">
                <b>{w.you}: </b> {reason.personal}
              </p>
              <p className="mt-2 leading-relaxed">
                <b>{w.world}: </b> {reason.global}
              </p>
            </div>
          );
        })}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {kind === "vacancy" ? w.vacancy + " " : ""}
          {w.note}
        </p>
      </div>
    </details>
  );
}
export function SdgContribution({ goals = [] }: { goals?: string[] }) {
  const { lang, tk } = useT(),
    w = words[lang];
  const selected = [...new Set(goals.map((g) => g.split(".")[0]))].filter(
    (g) => Number.isInteger(Number(g)) && Number(g) >= 1 && Number(g) <= 17,
  );
  if (!selected.length) return null;
  return (
    <section
      className="my-4 rounded-2xl border bg-card p-4"
      aria-label={w.title}
    >
      <h3 className="font-bold">
        {lang === "ms"
          ? "Tema SDG dalam laluan anda"
          : lang === "zh"
            ? "学习路径中的SDG主题"
            : "SDG themes in your pathway"}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {lang === "ms"
          ? "Berdasarkan topik kursus yang dipilih, daripada 17 matlamat SDG."
          : lang === "zh"
            ? "依据所选课程主题，可关联全部17项目标。"
            : "Based on selected course topics, across all 17 goals."}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {selected.map((g) => (
          <div
            key={g}
            className="flex items-start gap-3 rounded-xl bg-muted/30 p-3"
          >
            <SdgBadge code={g} />
            <div>
              <b className="text-sm">{tk("sdg", g)}</b>
              <p className="mt-1 text-xs">
                {sdgExplanation(g, "", [], lang)?.personal}
              </p>
            </div>
          </div>
        ))}
      </div>
      <SdgExplanation goals={selected} kind="pathway" />
      <p className="mt-3 text-xs text-muted-foreground">{w.limit}</p>
    </section>
  );
}
export function CatalogueGuard() {
  const { lang } = useT(),
    w = words[lang];
  return (
    <details className="rounded-xl border bg-muted/20 px-4 py-3 text-xs">
      <summary className="cursor-pointer font-semibold">{w.guard}</summary>
      <p className="mt-2">{w.guardNote}</p>
      <a
        className="mt-2 inline-flex min-h-11 items-center text-primary underline"
        href="/sources"
      >
        {lang === "ms"
          ? "Sumber data & model AI"
          : lang === "zh"
            ? "数据来源与AI模型"
            : "Data sources & AI models"}
      </a>
    </details>
  );
}
export function SyntheticBadge() {
  const { lang } = useT();
  return (
    <p className="my-2 w-fit rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900">
      {words[lang].synthetic}
    </p>
  );
}
