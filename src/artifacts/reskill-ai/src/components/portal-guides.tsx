import { PageGuide, type GuideStep } from "./page-guide";
import { useT } from "@/i18n";
import { marketWords } from "@/i18n/market";
import { enterpriseWords } from "@/i18n/enterprise";
import { institutionWords } from "@/i18n/institution";

const copy = {
  en: {
    ai: "AI at work",
    aiBody:
      "Compare careers where AI could help everyday tasks. The podium ranks suggested careers; the percentage is task overlap, not job-loss risk.",
    demand: "Growing careers",
    demandBody:
      "Compare careers using the reviewed US BLS growth reference. This is a planning signal, not a count of Malaysian vacancies.",
    skills: "Skills in demand",
    skillsBody:
      "See learning priorities mapped from selected Malaysian occupation counts to O*NET skills. The index is not a measured shortage or percentage of employers.",
    year: "Choose a year",
    yearBody:
      "Move the 1–10-year slider. The highlighted year, chart and values move together. Read the before → after calculation and ask AI to explain that year; changing language reuses the saved answer.",
    evidence: "Check the reasons",
    evidenceBody:
      "AI uses current statistics and dated career, technology and AI headlines. References are linked. News helps explain possible drivers; it does not prove the scenario rate. Further years are more uncertain.",
    company: "Company Future",
    companyBody:
      "Start with your own team: matched exposure, learning gaps and progress. Explore the year scenario, then analyse learning priorities and proposed KPIs. Chat asks follow-up questions about that saved analysis.",
    grads: "Grads Future",
    gradsBody:
      "Compare current student learning with a separately labelled fictional 2024–2026 graduate example. Its employment scenario is synthetic. Analyse readiness and ask the institution advisor; it never reports this example as real employment.",
    progress: "Follow progress",
    progressBody:
      "Open an active learner to see course dates, completed courses and remaining practice. Completion is self-reported learning, not proof of job competence.",
    intake: "Review, choose, learn",
    intakeBody:
      "Open the CV modal or edit saved details. Completed Holland results stay fixed. Confirm intake, choose a career, then start a dated pathway. Returning learners open their progress.",
    required: "Compulsory and personalised",
    requiredBody:
      "Choose institution-required courses, then save. Unfinished timelines receive new requirements while keeping progress and existing dates. Personalised courses fill career gaps; completed awards stay unchanged.",
  },
  ms: {
    ai: "AI dalam kerja",
    aiBody:
      "Bandingkan kerjaya yang tugas hariannya boleh dibantu AI. Podium menyusun cadangan kerjaya; peratus ialah pertindihan tugas, bukan risiko kehilangan kerja.",
    demand: "Kerjaya berpotensi",
    demandBody:
      "Bandingkan kerjaya menggunakan rujukan pertumbuhan BLS Amerika Syarikat yang disemak. Ini petunjuk perancangan, bukan jumlah vacancy Malaysia.",
    skills: "Kemahiran diperlukan",
    skillsBody:
      "Lihat keutamaan belajar yang memadankan kiraan pekerjaan Malaysia terpilih kepada kemahiran O*NET. Indeks bukan jurang terukur atau peratus majikan.",
    year: "Pilih tahun",
    yearBody:
      "Gerakkan slider 1–10 tahun. Tahun, graf dan nilai berubah bersama. Lihat kiraan sebelum → selepas dan minta AI jelaskan tahun itu; pertukaran bahasa menggunakan jawapan tersimpan.",
    evidence: "Semak sebabnya",
    evidenceBody:
      "AI merujuk statistik semasa serta berita kerjaya, teknologi dan AI bertarikh. Rujukan disertakan. Berita membantu menerangkan kemungkinan pendorong, bukan membuktikan kadar senario. Tahun lebih jauh lebih tidak pasti.",
    company: "Masa depan syarikat",
    companyBody:
      "Mulakan dengan pasukan sendiri: pendedahan sepadan, jurang belajar dan kemajuan. Teroka senario tahun, kemudian analisis keutamaan belajar dan cadangan KPI. Chat menjawab soalan susulan tentang analisis tersimpan.",
    grads: "Masa depan graduan",
    gradsBody:
      "Bandingkan pembelajaran pelajar semasa dengan contoh graduan rekaan 2024–2026 yang berlabel berasingan. Senario pekerjaan itu sintetik. Analisis kesediaan dan tanya penasihat institusi; contoh ini bukan data pekerjaan sebenar.",
    progress: "Pantau kemajuan",
    progressBody:
      "Buka pelajar atau pekerja aktif untuk tarikh kursus, kursus selesai dan latihan yang masih diperlukan. Selesai belajar ialah laporan pengguna, bukan bukti kecekapan pekerjaan.",
    intake: "Semak, pilih, belajar",
    intakeBody:
      "Buka modal CV atau edit maklumat disimpan. Keputusan Holland lengkap kekal tetap. Sahkan intake, pilih kerjaya dan mulakan pathway bertarikh. Rekod aktif terus membuka kemajuan.",
    required: "Wajib dan peribadi",
    requiredBody:
      "Pilih kursus wajib institusi, kemudian simpan. Timeline belum lengkap menerima keperluan baharu sambil mengekalkan kemajuan dan tarikh sedia ada. Kursus peribadi mengisi jurang kerjaya; sijil lengkap kekal.",
  },
  zh: {
    ai: "工作中的AI",
    aiBody:
      "比较AI可能协助日常任务的职业。领奖台排列建议职业；百分比表示任务重叠，并非失业风险。",
    demand: "增长潜力职业",
    demandBody:
      "使用已审核的美国BLS增长参考比较职业。这是规划信号，不是马来西亚职位空缺数量。",
    skills: "需求技能",
    skillsBody:
      "将选定马来西亚职业数量映射至O*NET技能，显示学习优先级。该指数不是实测短缺或雇主百分比。",
    year: "选择年份",
    yearBody:
      "移动1–10年滑块，突出年份、图表及数值同步变化。查看前后计算并请AI解释该年；切换语言复用已保存回答。",
    evidence: "查看原因",
    evidenceBody:
      "AI参考当前统计及注明日期的职业、技术和AI新闻，附参考链接。新闻帮助解释可能因素，不能证明情景增长率；越远年份越不确定。",
    company: "公司未来",
    companyBody:
      "首先查看本团队匹配到的AI暴露度、学习差距和进度。探索年份情景，再分析学习重点和建议KPI。聊天针对已保存分析回答后续问题。",
    grads: "毕业生未来",
    gradsBody:
      "将真实学生学习与单独标记的2024–2026年虚构毕业生示例比较。就业情景为合成数据。分析准备度并询问机构顾问；示例并非机构真实就业数据。",
    progress: "跟踪进度",
    progressBody:
      "打开已开始学习者，查看课程日期、完成课程和待练习技能。完成情况为用户自报，并不证明工作能力。",
    intake: "核对、选择、学习",
    intakeBody:
      "打开简历窗口或编辑已保存资料。已完成的霍兰德结果保持固定。确认资料、选择职业并开始有日期的路径；再次访问直接显示进度。",
    required: "必修与个性化",
    requiredBody:
      "选择机构必修课并保存。未完成时间线保留进度和原日期并添加新要求。个性化课程补充职业差距；已完成证书保留。",
  },
};
export function usePortalGuide() {
  const { lang } = useT();
  return copy[lang];
}
export function MarketGuide({
  role = "individual",
}: {
  role?: "individual" | "hr" | "tvet";
}) {
  const { lang } = useT(),
    w = copy[lang];
  const steps: GuideStep[] = [];
  if (role !== "individual")
    steps.push({
      title: role === "hr" ? w.company : w.grads,
      body: role === "hr" ? w.companyBody : w.gradsBody,
    });
  steps.push(
    { title: w.ai, body: w.aiBody },
    { title: w.demand, body: w.demandBody },
    { title: w.skills, body: w.skillsBody },
    { title: w.year, body: w.yearBody },
    { title: w.evidence, body: w.evidenceBody },
  );
  return <PageGuide title={marketWords[lang].guide} steps={steps} />;
}
export function LearnerListGuide({
  institution = false,
}: {
  institution?: boolean;
}) {
  const { lang } = useT(),
    w = copy[lang];
  return (
    <PageGuide
      title={enterpriseWords[lang].guide}
      steps={[
        {
          title: institution
            ? institutionWords[lang].students
            : enterpriseWords[lang].employees,
          body: w.intakeBody,
        },
        { title: w.progress, body: w.progressBody },
        ...(institution ? [{ title: w.required, body: w.requiredBody }] : []),
      ]}
    />
  );
}
