import type {CareerNews} from "./career-news";
import { hashInput } from "./agents";
import type { companyData } from "./company";

type Company = Awaited<ReturnType<typeof companyData>>;
/** No names, employee IDs, raw CVs or cross-company records enter the advisor context. */
export function companyFutureContext(company: Company, years: number, news?:CareerNews) {
  return {
    ...company,
    members: company.members.map(({ id, name, ...m }) => m),
    updatedAt: undefined,
    years,
    news: news?{articles:news.articles.slice(0,12),stale:news.stale}:null,
    yearComparison: company.portal === "tvet" ? {previousYear:2026+years-1,selectedYear:2026+years,previous:Math.min(100,(company.institutionHistory?.annual.at(-1)?.rate??0)+2*(years-1)),selected:Math.min(100,(company.institutionHistory?.annual.at(-1)?.rate??0)+2*years),synthetic:true} : {previousYear:new Date().getFullYear()+years-1,selectedYear:new Date().getFullYear()+years,previous:company.avgExposure==null?null:100*(1-(1-company.avgExposure)*.95**(years-1)),selected:company.avgExposure==null?null:100*(1-(1-company.avgExposure)*.95**years)},
    baseYear: new Date().getFullYear(),
    graduateEmploymentScenario: company.portal === "tvet" ? {baseYear:2026,annualPercentagePointAssumption:2,cap:100,synthetic:true} : null,
    assumption:
      "Illustrative adoption scenario only: each year AI overlaps 5% of remaining tasks; no empirical company forecast, work-capacity or job-loss estimate. Skill gaps and completions are current observations, not future measurements.",
    suggestedKpis:
      "Label every target as a proposal, not a measured outcome. Use course completion, voluntary practice tasks and assessment of relevant gaps; never fabricated ROI.",
  };
}
export function companyAnalysisHash(
  organization: string | null,
  context: unknown,
) {
  return hashInput("company-future-v2", organization, context);
}
export function advisorRetrieval(company: Company, question: string, news?:CareerNews) {
  const terms = question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 2);
  // This is bounded catalogue retrieval, not a model-generated course list.
  const courses = company.courseSuggestions
    .map((course) => ({
      course,
      score: terms.filter((t) =>
        `${course.title} ${course.skills.join(" ")}`.toLowerCase().includes(t),
      ).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ course }) => course);
  return {
    courses,
    sources: [
      ...(news?.articles.slice(0,6).map(a=>({label:`${a.region}: ${a.title}`,url:a.url,dataDate:a.seenAt.slice(0,10)}))??[]),
      ...(company.portal === "tvet" ? [{label:"SYNTHETIC: graduate-employment-2024-2026.json",url:"/synthetic-data/graduate-employment-2024-2026.json",dataDate:"2026-10-24"}] : []),
      {
        label: "O*NET occupation references",
        url: "https://www.onetcenter.org/database.html",
        dataDate:
          company.sources.find((s) => s.id === "onet")?.dataDate ?? null,
      },
      {
        label: "Anthropic Economic Index",
        url: "https://huggingface.co/datasets/Anthropic/EconomicIndex",
        dataDate:
          company.sources.find((s) => s.id === "aei_exposure")?.dataDate ??
          null,
      },
      ...courses.map((c) => ({
        label: `${c.provider}: ${c.title}`,
        url: c.url,
        dataDate: null,
      })),
    ],
  };
}

export function generateDeterministicCompanyAnalysis(
  context: ReturnType<typeof companyFutureContext>,
  years: number,
): { en: string; ms: string; zh: string } {
  if(context.portal === "tvet") {
    const rows=context.institutionHistory?.annual ?? [];
    const baseline=rows.at(-1)?.rate;
    const scenario=baseline==null?null:Math.min(100,baseline+2*years);
    return {
      en:`### Synthetic graduate example\nThe fictional 2026 employment rate is ${baseline?.toFixed(1)??"unknown"}%. With an assumed +2 percentage points each year, the ${2026+years} example is ${scenario?.toFixed(1)??"unknown"}%. These are not this institution's measured results.\n\n### Current learning\nThere are ${context.profileCount} student records and ${context.completedCourses}/${context.totalCourses} course check-ins. Keep compulsory learning and personalised career practice visible.\n\n### Proposed review\nReview required-course completion and a small work sample every month. Set targets after checking the baseline; do not promise employment.`,
      ms:`### Contoh graduan sintetik\nKadar pekerjaan rekaan 2026 ialah ${baseline?.toFixed(1)??"tidak diketahui"}%. Dengan andaian +2 mata peratus setahun, contoh ${2026+years} ialah ${scenario?.toFixed(1)??"tidak diketahui"}%. Ini bukan hasil sebenar institusi ini.\n\n### Pembelajaran semasa\nTerdapat ${context.profileCount} rekod pelajar dan ${context.completedCourses}/${context.totalCourses} semakan selesai kursus. Bezakan kursus wajib dan latihan kerjaya peribadi.\n\n### Semakan dicadangkan\nSemak penyelesaian kursus wajib dan satu hasil kerja kecil setiap bulan. Tetapkan sasaran selepas menyemak asas; jangan janjikan pekerjaan.`,
      zh:`### 合成毕业生示例\n虚构的2026年就业率为${baseline?.toFixed(1)??"未知"}%。假设每年增加2个百分点，${2026+years}年的示例为${scenario?.toFixed(1)??"未知"}%。这些并非本机构实测结果。\n\n### 当前学习\n共有${context.profileCount}条学生记录，课程完成自报为${context.completedCourses}/${context.totalCourses}。请区分必修学习与个性化职业练习。\n\n### 建议回顾\n每月回顾必修完成情况和一份小型作品。核对基准后再设目标，不承诺就业。`,
    };
  }
  if(context.avgExposure==null)return {
   en:'### No matched AI observation\nThere is no matched exposure baseline, so no numeric AI scenario can be calculated. Review current learning gaps and use the linked public evidence to plan a small practice task. Proposed targets are not measured outcomes.',
   ms:'### Tiada pemerhatian AI sepadan\nTiada asas pendedahan sepadan, maka senario angka AI tidak boleh dikira. Semak jurang pembelajaran semasa dan gunakan bukti awam berpaut untuk merancang latihan kecil. Sasaran cadangan bukan hasil terukur.',
   zh:'### 没有匹配的AI观察\n缺少匹配的暴露度基准，无法计算AI数值情景。请核对当前学习差距，参考公开链接规划小型练习。建议目标并非实测结果。'
  };
  const currentExposure = context.avgExposure;
  const projectedExposure = 1 - (1 - currentExposure) * Math.pow(0.95, years);
  const topSkills =
    context.topGaps && context.topGaps.length
      ? context.topGaps
          .slice(0, 3)
          .map((g) => g.name)
          .join(", ")
      : "Data Analytics, AI-assisted Workflows, Practical Digital Skills";
  const avgGap = context.avgGap ?? 2.5;
  const targetGap = Math.max(0, Math.round((avgGap - 1.5) * 10) / 10);
  const targetYear = context.baseYear + years;

  return {
    en: `### What is changing\nAverage observed team AI task exposure is currently ${(currentExposure * 100).toFixed(1)}%. In this illustrative planning scenario (+${years} year${years > 1 ? "s" : ""}, by ${targetYear}), task overlap is projected to compound to approximately ${(projectedExposure * 100).toFixed(1)}%. AI task exposure reflects automated tools assisting day-to-day routine tasks (like drafting emails or standardizing spreadsheets), not employee displacement.\n\n### Team learning priorities\nPriority focus areas address key identified competency gaps (${topSkills}):\n- Combine existing domain experience with modern AI-assisted productivity tools.\n- Encourage practical workplace micro-learning rather than purely theoretical courses.\n- Support cross-functional sharing for departments with higher routine task exposure.\n\n### 3 Proposed measurable company KPIs\n- **Target 1 (6 Months)**: Achieve at least 75% completion rate across enrolled learning modules.\n- **Target 2 (12 Months)**: Reduce average individual skill gaps from ${avgGap.toFixed(1)} to under ${targetGap.toFixed(1)} practical competencies.\n- **Target 3 (Quarterly)**: Each active team member completes at least one voluntary 10-minute micro-practice task monthly.\n\n### Limitations & next review\nIllustrative planning model based on O*NET benchmark references and current profile inputs, not an empirical corporate forecast or performance appraisal. Next formal review recommended in 6 months.`,

    ms: `### Perubahan yang berlaku\nPendedahan tugasan AI yang diperhatikan bagi pasukan kini berada pada purata ${(currentExposure * 100).toFixed(1)}%. Berdasarkan senario perancangan ilustrasi ini (+${years} tahun, menjelang ${targetYear}), pertindihan tugasan diunjurkan mencecah kira-kira ${(projectedExposure * 100).toFixed(1)}%. Pendedahan tugasan AI mencerminkan alat bantuan digital bagi tugasan rutin harian (seperti draf e-mel atau pemformatan helaian data), bukan pengurangan tenaga kerja.\n\n### Keutamaan pembelajaran pasukan\nFokus utama merangkumi penyelesaian jurang kemahiran yang dikenal pasti (${topSkills}):\n- Gabungkan kepakaran bidang sedia ada dengan alat produktiviti berkuasa AI terkini.\n- Galakkan latihan amali di tempat kerja berbanding modul teori semata-mata.\n- Sokong perkongsian silang fungsi untuk unit kerja dengan pendedahan tugasan rutin yang lebih tinggi.\n\n### 3 Cadangan KPI syarikat boleh diukur\n- **Sasaran 1 (6 Bulan)**: Mencapai kadar penyelesaian sekurang-kurangnya 75% bagi modul pembelajaran yang didaftarkan.\n- **Sasaran 2 (12 Bulan)**: Mengurangkan purata jurang kemahiran individu daripada ${avgGap.toFixed(1)} kepada bawah ${targetGap.toFixed(1)} kecekapan amali.\n- **Sasaran 3 (Suku Tahunan)**: Setiap ahli pasukan aktif menyelesaikan sekurang-kurangnya satu latihan amali sukarela 10 minit setiap bulan.\n\n### Kekangan & semakan seterusnya\nModel perancangan ilustrasi berpandukan rujukan penanda aras O*NET dan profil semasa, bukan ramalan korporat mutlak atau penilaian prestasi pekerja. Semakan berkala seterusnya dicadangkan dalam tempoh 6 bulan.`,

    zh: `### 正在发生的变化\n当前团队观察到的AI任务重叠度平均为${(currentExposure * 100).toFixed(1)}%。在此规划情景下（+${years}年，至${targetYear}年），任务重叠预计将达到约${(projectedExposure * 100).toFixed(1)}%。AI任务重叠度仅代表数字化工具协助日常例行工作（如起草文档或整理电子表格），并非衡量岗位削减或人员替代。\n\n### 团队学习重点\n重点攻坚已识别的核心能力差距（${topSkills}）：\n- 将现有行业专业知识与现代化AI辅助生产力工具深度结合。\n- 鼓励开展工作场景实操微学习，而非单纯依赖理论培训。\n- 为日常例行任务重叠度较高的部门优先安排跨职能技能互助。\n\n### 3项拟议可衡量公司KPI\n- **目标 1（6个月）**：已注册学习路径课程的完成率达到至少75%。\n- **目标 2（12个月）**：将人均技能差距从${avgGap.toFixed(1)}项降低至${targetGap.toFixed(1)}项以下实用能力。\n- **目标 3（按季度）**：每位在职团队成员每月至少完成一项自愿性10分钟微学习实践。\n\n### 局限性与下次审查\n本规划情景基于O*NET基准数据及员工档案输入，非确定性企业预测或绩效考核指标。建议6个月后进行下一次正式审查。`,
  };
}

export function generateDeterministicAdvisorReply(
  company: Company,
  question: string,
  retrieved: ReturnType<typeof advisorRetrieval>,
  years: number,
): { en: string; ms: string; zh: string } {
  const topCourses = retrieved.courses.slice(0, 3);
  const courseListEn =
    topCourses.map((c) => `- [${c.title}](${c.url}) (${c.provider})`).join("\n") ||
    "- Practical workplace digital literacy and analytics modules.";
  const courseListMs =
    topCourses.map((c) => `- [${c.title}](${c.url}) (${c.provider})`).join("\n") ||
    "- Modul literasi digital dan analitik praktikal di tempat kerja.";
  const courseListZh =
    topCourses.map((c) => `- [${c.title}](${c.url}) (${c.provider})`).join("\n") ||
    "- 实用工作场所数字素养与分析模块。";

  return {
    en: `### Advisor Recommendations\nRegarding "${question}":\n\nBased on your team's current skill profile and ${years}-year planning horizon, prioritize targeted hands-on modules:\n${courseListEn}\n\nFocus on 10-minute micro-learning tasks to build immediate practical confidence without disrupting day-to-day operations. Next review recommended in 6 months.`,
    ms: `### Cadangan Penasihat\nMengenai "${question}":\n\nBerdasarkan profil kemahiran semasa pasukan dan tempoh perancangan ${years} tahun, utamakan modul amali bersasar berikut:\n${courseListMs}\n\nTumpukan kepada latihan mikro 10 minit bagi membina keyakinan praktikal serta-merta tanpa mengganggu operasi harian. Semakan seterusnya dicadangkan dalam tempoh 6 bulan.`,
    zh: `### 顾问建议\n关于“${question}”：\n\n结合团队当前技能画像与${years}年规划期，建议优先学习以下针对性实操模块：\n${courseListZh}\n\n鼓励开展10分钟微学习实践，在不影响日常业务运转的前提下快速建立实战信心。建议6个月后进行下次审查。`,
  };
}

