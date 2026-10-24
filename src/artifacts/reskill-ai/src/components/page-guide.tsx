import { createContext, useContext, useEffect, useState } from "react";
import { CircleHelp, RotateCcw } from "lucide-react";
import { useT } from "@/i18n";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export const TourHighlight = createContext<{
  href: string | null;
  setHref: (href: string | null) => void;
}>({ href: null, setHref: () => {} });
export function GuideButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="h-11 w-11 shrink-0 rounded-full"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <CircleHelp className="h-5 w-5" />
    </Button>
  );
}
export type GuideStep = { title: string; body: string; href?: string };
export function PageGuide({
  title,
  steps,
  storageKey,
  enabled = true,
}: {
  title: string;
  steps: GuideStep[];
  storageKey?: string;
  enabled?: boolean;
}) {
  const { lang } = useT();
  const highlight = useContext(TourHighlight);
  const [open, setOpen] = useState(false),
    [step, setStep] = useState(0);
  const w = {
    en: ["Previous", "Next", "Got it", "Start again"],
    ms: ["Sebelumnya", "Seterusnya", "Faham", "Ulang dari awal"],
    zh: ["上一步", "下一步", "明白了", "重新开始"],
  }[lang];
  useEffect(() => {
    if (!storageKey || !enabled) return;
    try {
      setOpen(localStorage.getItem(storageKey) !== "seen");
    } catch {
      setOpen(true);
    }
    setStep(0);
  }, [storageKey, enabled]);
  const href = open ? (steps[step]?.href ?? null) : null;
  useEffect(() => {
    highlight.setHref(href);
    return () => highlight.setHref(null);
  }, [href, highlight.setHref]);
  const close = () => {
    setOpen(false);
    if (storageKey)
      try {
        localStorage.setItem(storageKey, "seen");
      } catch {}
  };
  return (
    <>
      <GuideButton
        label={title}
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
      />
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-5"
          closeLabel={
            lang === "ms"
              ? "Tutup panduan"
              : lang === "zh"
                ? "关闭指南"
                : "Close guide"
          }
          data-testid="page-walkthrough"
        >
          <DialogTitle className="pr-8">{title}</DialogTitle>
          <DialogDescription>
            {step + 1} / {steps.length}
          </DialogDescription>
          <div className="flex gap-1" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <div className="rounded-xl bg-[hsl(var(--gold-soft))] p-5">
            <h3 className="font-bold">{steps[step].title}</h3>
            <p className="mt-2 text-sm leading-relaxed">{steps[step].body}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={w[3]}
              onClick={() => setStep(0)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="ml-auto min-w-0 flex-1 whitespace-normal px-2 text-xs sm:flex-none sm:px-4 sm:text-sm"
              disabled={step === 0}
              onClick={() => setStep((n) => n - 1)}
            >
              {w[0]}
            </Button>
            <Button className="min-w-0 flex-1 whitespace-normal px-2 text-xs sm:flex-none sm:px-4 sm:text-sm"
              onClick={() =>
                step === steps.length - 1 ? close() : setStep((n) => n + 1)
              }
            >
              {step === steps.length - 1 ? w[2] : w[1]}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export const guides = {
  en: {
    title: "How to use this page",
    providers: "All course providers",
    scope:
      "Build skills online. Some careers need prior experience; a course is not a job qualification.",
    roles: [
      [
        "Find a direction",
        "Search a career or skill, then choose a sector to narrow the list.",
      ],
      [
        "Learn the skills",
        "Open a career to see its skills and matching online courses. Clinical work and physical trades are outside these learning paths.",
      ],
      [
        "Read the signals",
        "AI exposure describes observed task assistance, not the chance of losing a job. SDG icons show related global goals.",
      ],
    ],
    courses: [
      [
        "Choose a provider",
        "Use the provider filter to explore courses from a learning platform you prefer.",
      ],
      [
        "Check the essentials",
        "Each card shows the provider, time, skills and one cost label. Free learning may have a separate exam or certificate fee.",
      ],
      [
        "Start learning",
        "Open takes you to the provider. SDG icons show the course’s theme; check the latest details there.",
      ],
    ],
    sources: [
      [
        "Know where it comes from",
        "Datasets and news feeds provide references. Catalogues list courses or vacancies. AI services explain the supplied evidence; they are not datasets.",
      ],
      [
        "Check freshness",
        "Look at the data period and last check. An error can mean the app is showing its last saved snapshot.",
      ],
      [
        "Look deeper",
        "Expand a source for its method, limits and licence. Scenario numbers are examples, not promises.",
      ],
    ],
    workspaceTitle: "A quick tour of your workspace",
    workspace: [
      [
        "Workspace",
        "Your home base: see your next course, deadline and progress. Mark finished courses to earn badges.",
      ],
      [
        "Roles",
        "Explore careers you can build skills for online. Open one to see what to learn.",
      ],
      [
        "Courses",
        "Find online lessons by provider. Open a course to learn on the provider’s website.",
      ],
      [
        "Market",
        "Explore possible changes in careers and AI. Move the year slider and compare the trends.",
      ],
      [
        "Data sources",
        "See where the facts come from, when they were checked and what they can tell you.",
      ],
    ],
  },
  ms: {
    title: "Cara menggunakan halaman ini",
    providers: "Semua penyedia kursus",
    scope:
      "Bina kemahiran dalam talian. Sesetengah kerjaya memerlukan pengalaman; kursus bukan kelayakan pekerjaan.",
    roles: [
      [
        "Cari hala tuju",
        "Cari kerjaya atau kemahiran, kemudian pilih sektor untuk mengecilkan senarai.",
      ],
      [
        "Pelajari kemahiran",
        "Buka kerjaya untuk melihat kemahiran dan kursus dalam talian berkaitan. Kerja klinikal dan kerja fizikal khusus tidak termasuk dalam laluan ini.",
      ],
      [
        "Fahami petunjuk",
        "Pendedahan AI menunjukkan bantuan pada tugasan yang diperhatikan, bukan kebarangkalian hilang kerja. Ikon SDG menunjukkan matlamat global berkaitan.",
      ],
    ],
    courses: [
      [
        "Pilih penyedia",
        "Gunakan penapis penyedia untuk melihat kursus daripada platform pilihan anda.",
      ],
      [
        "Semak perkara penting",
        "Kad menunjukkan penyedia, masa, kemahiran dan satu label kos. Pembelajaran percuma mungkin mengenakan bayaran peperiksaan atau sijil berasingan.",
      ],
      [
        "Mula belajar",
        "Buka membawa anda ke laman penyedia. Ikon SDG menunjukkan tema kursus; semak butiran terkini di sana.",
      ],
    ],
    sources: [
      [
        "Kenali sumbernya",
        "Dataset dan feed berita memberi rujukan. Katalog menyenaraikan kursus atau vacancy. Perkhidmatan AI menerangkan bukti dibekalkan; ia bukan dataset.",
      ],
      [
        "Semak tarikh",
        "Lihat tempoh data dan semakan terakhir. Ralat mungkin bermaksud aplikasi menggunakan snapshot terakhir yang disimpan.",
      ],
      [
        "Lihat lebih lanjut",
        "Kembangkan sumber untuk kaedah, had dan lesen. Angka senario ialah contoh, bukan jaminan.",
      ],
    ],
    workspaceTitle: "Lawatan ringkas ruang kerja anda",
    workspace: [
      [
        "Ruang kerja",
        "Tempat utama anda: lihat kursus seterusnya, tarikh akhir dan kemajuan. Tandakan kursus selesai untuk mendapat lencana.",
      ],
      [
        "Kerjaya",
        "Terokai kerjaya yang kemahirannya boleh dibina dalam talian. Buka satu untuk melihat apa yang perlu dipelajari.",
      ],
      [
        "Kursus",
        "Cari pembelajaran dalam talian mengikut penyedia. Buka kursus untuk belajar di laman penyedia.",
      ],
      [
        "Pasaran",
        "Terokai kemungkinan perubahan kerjaya dan AI. Gerakkan slider tahun dan bandingkan trend.",
      ],
      [
        "Sumber data",
        "Lihat dari mana fakta diambil, bila disemak dan apa yang boleh diterangkan olehnya.",
      ],
    ],
  },
  zh: {
    title: "如何使用本页",
    providers: "所有课程机构",
    scope: "在线培养技能。部分职业需要已有经验；课程不等于就业资格。",
    roles: [
      ["找到方向", "搜索职业或技能，再选择行业缩小范围。"],
      [
        "学习所需技能",
        "打开职业查看技能和配套在线课程。这些路径不涵盖临床工作或需现场实操的工种。",
      ],
      [
        "理解指标",
        "AI 参与度表示已观察到的任务协助，并非失业概率。SDG 图标表示相关全球目标。",
      ],
    ],
    courses: [
      ["选择机构", "通过机构筛选，探索你偏好的学习平台。"],
      [
        "查看重点",
        "每张卡显示机构、时长、技能和一个费用标签。免费学习可能另收考试或证书费。",
      ],
      [
        "开始学习",
        "打开链接前往机构网站。SDG 图标表示课程主题，请在那里核对最新详情。",
      ],
    ],
    sources: [
      ["了解来源", "数据集和新闻提供参考；目录列出课程或职位。AI服务解释提供的依据，本身不是数据集。"],
      [
        "核对日期",
        "查看数据时期和最近检查时间。错误可能表示正在显示上次保存的快照。",
      ],
      [
        "进一步了解",
        "展开来源查看方法、限制与许可。情景数字是示例，并非保证。",
      ],
    ],
    workspaceTitle: "快速认识你的工作区",
    workspace: [
      [
        "工作区",
        "你的主页：查看下一门课程、截止日期和进度。勾选已完成课程获得徽章。",
      ],
      ["职业", "探索可通过在线学习培养技能的职业。打开一个了解需要学什么。"],
      ["课程", "按机构查找在线课程。打开课程，在机构网站上学习。"],
      ["市场", "探索职业与 AI 的可能变化。移动年份滑块，比较趋势。"],
      ["数据来源", "查看事实的来源、检查日期，以及它们能说明什么。"],
    ],
  },
};
export const guideSteps = (items: string[][]) =>
  items.map(([title, body]) => ({ title, body }));
