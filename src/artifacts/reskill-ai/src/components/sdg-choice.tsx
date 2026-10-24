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
}: {
  goals: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { lang, tk } = useT(),
    w = words[lang];
  return (
    <fieldset className="rounded-2xl border bg-card p-4">
      <legend className="px-1 text-sm font-bold">{w.choose}</legend>
      <div className="flex flex-wrap gap-2">
        {["all", ...goals].map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={value === g}
            onClick={() => onChange(g)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold ${value === g ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {g !== "all" && (
              <img
                src={`/sdg/${g}.png`}
                alt=""
                className="h-8 w-8 object-contain"
              />
            )}
            {g === "all" ? w.all : tk("sdg", g)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{w.note}</p>
    </fieldset>
  );
}
export function SdgReason({
  role,
}: {
  role: { title: string; sector: string };
}) {
  const { lang, tk } = useT(),
    w = words[lang];
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      {w.role}{" "}
      {roleGoals(role)
        .map((g) => tk("sdg", g))
        .join(" · ")}
      .
    </p>
  );
}
export function SdgContribution() {
  const { lang } = useT(),
    w = words[lang];
  return (
    <section
      className="my-4 rounded-2xl border bg-card p-4"
      aria-label={w.title}
    >
      <h3 className="font-bold">{w.title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <SdgBadge code="4" />
          <p className="text-sm">{w.learn}</p>
        </div>
        <div className="flex items-center gap-3">
          <SdgBadge code="8" />
          <p className="text-sm">{w.work}</p>
        </div>
      </div>
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
