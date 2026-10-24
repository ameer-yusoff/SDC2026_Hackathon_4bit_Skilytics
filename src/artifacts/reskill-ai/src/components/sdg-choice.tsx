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
  return (
    <fieldset className="rounded-2xl border bg-card p-4">
      <legend className="px-1 text-sm font-bold">
        {learning
          ? lang === "ms"
            ? "Apakah yang anda mahu sokong melalui pembelajaran?"
            : lang === "zh"
              ? "你希望学习支持什么？"
              : "What would you like your learning to support?"
          : w.choose}
      </legend>
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
      <p className="mt-2 text-xs text-muted-foreground">
        {note ??
          (learning
            ? lang === "ms"
              ? "Tapis kursus mengikut tema pembelajaran."
              : lang === "zh"
                ? "按学习主题筛选课程。"
                : "Filter courses by learning theme."
            : w.note)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{lang==="ms"?"Tema dipaparkan mengikut padanan dalam senarai semasa. Semua 17 SDG boleh digunakan jika relevan.":lang==="zh"?"此处显示当前结果中有匹配的主题；相关时可采用全部17项目标。":"Themes shown have matches in the current list. Any of the 17 SDGs can apply when relevant."}</p>
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
const goalReasons = {
  en: [
    "Explore poverty reduction and access to support.",
    "Explore food security and sustainable agriculture.",
    "Build knowledge for health and well-being.",
    "Build skills and share learning opportunities.",
    "Support gender equality and empowerment.",
    "Explore clean water and sanitation.",
    "Learn about clean energy and efficient use.",
    "Practise productive work and employment skills.",
    "Build tools, research and better infrastructure.",
    "Learn inclusive and accessible practices.",
    "Explore safer and more sustainable communities.",
    "Learn responsible use of resources.",
    "Build knowledge for climate action.",
    "Explore protecting oceans and marine life.",
    "Learn to protect land, forests and wildlife.",
    "Learn accountable and inclusive practices.",
    "Build cooperation and shared learning.",
  ],
  ms: [
    "Terokai pengurangan kemiskinan dan akses sokongan.",
    "Terokai keselamatan makanan dan pertanian lestari.",
    "Bina pengetahuan kesihatan dan kesejahteraan.",
    "Bina kemahiran dan kongsi peluang pembelajaran.",
    "Sokong kesaksamaan gender dan pemerkasaan.",
    "Terokai air bersih dan sanitasi.",
    "Pelajari tenaga bersih dan penggunaan cekap.",
    "Latih kemahiran kerja produktif dan pekerjaan.",
    "Bina alat, penyelidikan dan infrastruktur lebih baik.",
    "Pelajari amalan inklusif dan mudah diakses.",
    "Terokai komuniti lebih selamat dan lestari.",
    "Pelajari penggunaan sumber secara bertanggungjawab.",
    "Bina pengetahuan tindakan iklim.",
    "Terokai perlindungan lautan dan hidupan marin.",
    "Pelajari perlindungan daratan, hutan dan hidupan liar.",
    "Pelajari amalan telus, bertanggungjawab dan inklusif.",
    "Bina kerjasama dan perkongsian pembelajaran.",
  ],
  zh: [
    "了解减贫与获得社会支持。",
    "了解粮食安全与可持续农业。",
    "学习健康与福祉知识。",
    "培养技能并分享学习机会。",
    "支持性别平等与赋权。",
    "了解清洁用水与卫生。",
    "学习清洁能源与高效利用。",
    "练习生产力与就业技能。",
    "发展工具、研究与基础设施。",
    "学习包容及无障碍实践。",
    "了解更安全、可持续的社区。",
    "学习负责任地使用资源。",
    "培养气候行动知识。",
    "了解保护海洋与海洋生命。",
    "学习保护陆地、森林与野生动物。",
    "学习负责、透明与包容的实践。",
    "建立合作与共享学习。",
  ],
};
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
              <p className="mt-1 text-xs">{goalReasons[lang][Number(g) - 1]}</p>
            </div>
          </div>
        ))}
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
