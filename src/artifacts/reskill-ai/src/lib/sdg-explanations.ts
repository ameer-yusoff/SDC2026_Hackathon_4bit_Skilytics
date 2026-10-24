import { sdgApplication, sdgWorkBenefit } from "./sdg-applications";
import { skillLabel } from "./skill-label";
type Lang = "en" | "ms" | "zh";
const globalReasons: Record<Lang, string[]> = {
  en: [
    "More people can access basic support and opportunities.",
    "Food systems can become more secure and sustainable.",
    "Better knowledge can support healthier lives.",
    "More people can access useful learning and skills.",
    "People can have fairer opportunities regardless of gender.",
    "Communities need safe water and sanitation.",
    "Cleaner energy and less waste can help communities.",
    "Useful skills and better workflows can support productive, decent work.",
    "Better tools and research can support innovation and reliable services.",
    "Accessible services can help more people take part.",
    "Better planning can make communities safer and more sustainable.",
    "Careful use of materials can reduce waste.",
    "Understanding climate issues can support informed action.",
    "Healthy oceans support marine life and livelihoods.",
    "Protecting habitats supports forests and biodiversity.",
    "Clear, fair processes can support accountable institutions.",
    "Sharing knowledge can help organisations work towards shared goals.",
  ],
  ms: [
    "Lebih ramai boleh mengakses sokongan asas dan peluang.",
    "Sistem makanan boleh menjadi lebih terjamin dan lestari.",
    "Pengetahuan lebih baik boleh menyokong kehidupan sihat.",
    "Lebih ramai boleh mengakses pembelajaran dan kemahiran berguna.",
    "Peluang boleh menjadi lebih adil tanpa mengira gender.",
    "Komuniti memerlukan air selamat dan sanitasi.",
    "Tenaga lebih bersih dan kurang pembaziran boleh membantu komuniti.",
    "Kemahiran berguna dan cara kerja lebih baik boleh menyokong pekerjaan produktif dan wajar.",
    "Alat dan penyelidikan lebih baik boleh menyokong inovasi serta perkhidmatan yang boleh dipercayai.",
    "Perkhidmatan mudah diakses boleh membantu lebih ramai mengambil bahagian.",
    "Perancangan lebih baik boleh menjadikan komuniti lebih selamat dan lestari.",
    "Penggunaan bahan secara cermat boleh mengurangkan sisa.",
    "Memahami isu iklim boleh menyokong tindakan bermaklumat.",
    "Lautan sihat menyokong hidupan marin dan sumber rezeki.",
    "Melindungi habitat membantu hutan dan biodiversiti.",
    "Proses jelas dan adil boleh menyokong institusi bertanggungjawab.",
    "Perkongsian ilmu boleh membantu organisasi mencapai matlamat bersama.",
  ],
  zh: [
    "让更多人获得基本支持与机会。",
    "让粮食系统更安全、更可持续。",
    "更好的知识有助于健康生活。",
    "让更多人获得实用学习与技能。",
    "让机会更加公平，不因性别而异。",
    "社区需要安全用水与卫生条件。",
    "更清洁的能源与更少浪费有助于社区。",
    "实用技能与更好的流程有助于高效、体面的工作。",
    "更好的工具与研究有助于创新和可靠服务。",
    "无障碍服务能让更多人参与。",
    "更好的规划能让社区更安全、可持续。",
    "谨慎使用材料有助于减少浪费。",
    "理解气候问题有助于作出知情行动。",
    "健康海洋支持海洋生命与生计。",
    "保护栖息地有助于森林和生物多样性。",
    "明确、公平的流程有助于建设负责的机构。",
    "共享知识有助于组织共同实现目标。",
  ],
};
/** Explanations use explicit supplied topics/skills; they never claim measured outcomes. */
const topics: {
  pattern: RegExp;
  goals: string[];
  text: Record<Lang, string>;
}[] = [
  {
    pattern: /\bcss\b|html|responsive|front.end/i,
    goals: ["8", "9"],
    text: {
      en: "HTML and CSS help you build clear pages that fit different screens.",
      ms: "HTML dan CSS membantu anda membina halaman jelas yang sesuai pada pelbagai skrin.",
      zh: "HTML与CSS帮助你制作清晰、适合不同屏幕的网页。",
    },
  },
  {
    pattern:
      /machine learning|artificial intelligence|generative|\bai\b|automation/i,
    goals: ["8", "9"],
    text: {
      en: "AI tools can help you handle repeated tasks, while you check the results.",
      ms: "Alat AI boleh membantu anda mengurus tugas berulang, sambil anda menyemak hasilnya.",
      zh: "AI工具可以协助处理重复任务，由你检查结果。",
    },
  },
  {
    pattern: /algorithm|python|programming|software|developer|coding/i,
    goals: ["8", "9"],
    text: {
      en: "Coding helps you turn a problem into clear steps and build useful tools.",
      ms: "Pengekodan membantu anda memecahkan masalah kepada langkah jelas dan membina alat berguna.",
      zh: "编程帮助你把问题拆成清晰步骤，制作实用工具。",
    },
  },
  {
    pattern: /administrative|bookkeeping|accounting|records|office/i,
    goals: ["8"],
    text: {
      en: "Keeping records and everyday tasks organised helps you avoid mistakes and wasted time.",
      ms: "Menyusun rekod dan tugasan harian membantu anda mengelakkan kesilapan serta pembaziran masa.",
      zh: "整理记录与日常任务，帮助你减少错误和时间浪费。",
    },
  },

  {
    pattern: /data|analytic|statistics|\bsql\b|excel|power bi/i,
    goals: ["8", "9"],
    text: {
      en: "Working with data helps you spot patterns and make clearer decisions.",
      ms: "Mengolah data membantu anda melihat corak dan membuat keputusan lebih jelas.",
      zh: "处理数据帮助你发现规律，作出更清晰的判断。",
    },
  },
  {
    pattern: /marketing|content|sales|entrepreneur|business/i,
    goals: ["8"],
    text: {
      en: "Clear messages and business skills help you reach customers and organise your work.",
      ms: "Mesej jelas dan kemahiran perniagaan membantu anda mendekati pelanggan serta menyusun kerja.",
      zh: "清晰沟通与商业技能帮助你联系客户、安排工作。",
    },
  },
  {
    pattern: /train|teach|curriculum|instructional|education/i,
    goals: ["4"],
    text: {
      en: "Planning clear lessons helps you share skills in ways others can understand.",
      ms: "Merancang pelajaran jelas membantu anda berkongsi kemahiran dengan cara mudah difahami.",
      zh: "规划清楚的课程，帮助你用容易理解的方式传授技能。",
    },
  },
  {
    pattern: /accessib|inclusive|disability|screen reader/i,
    goals: ["10"],
    text: {
      en: "Accessible design helps you make tools usable by people with different needs.",
      ms: "Reka bentuk mudah diakses membantu anda menghasilkan alat untuk pelbagai keperluan pengguna.",
      zh: "无障碍设计帮助你制作适合不同需求人群的工具。",
    },
  },
  {
    pattern: /climate|carbon|warming/i,
    goals: ["13"],
    text: {
      en: "Learning about emissions helps you recognise where climate-friendly changes may help.",
      ms: "Mempelajari pelepasan membantu anda mengenal pasti perubahan yang lebih mesra iklim.",
      zh: "了解排放，帮助你识别哪些改变可能更有利于气候。",
    },
  },
  {
    pattern: /energy|solar|renewable/i,
    goals: ["7"],
    text: {
      en: "Energy knowledge helps you understand cleaner power and ways to use less.",
      ms: "Pengetahuan tenaga membantu anda memahami tenaga lebih bersih dan cara mengurangkan penggunaan.",
      zh: "能源知识帮助你理解更清洁的供电方式和节能方法。",
    },
  },
  {
    pattern: /waste|recycl|resource|sustainab|environment/i,
    goals: ["12"],
    text: {
      en: "Resource planning helps you use materials carefully instead of throwing them away.",
      ms: "Perancangan sumber membantu anda menggunakan bahan secara cermat dan mengurangkan pembuangan.",
      zh: "资源规划帮助你谨慎使用材料，减少丢弃。",
    },
  },
];
export function sdgExplanation(
  goal: string,
  subject: string,
  skills: string[],
  lang: Lang,
  context?: {
    kind?: "role" | "course" | "vacancy" | "pathway";
    matchedSkills?: string[];
    missingSkills?: string[];
  },
) {
  const n = Number(goal.split(".")[0]);
  if (!Number.isInteger(n) || n < 1 || n > 17) return null;
  const text = [subject, ...skills].join(" ");
  const topic =
    topics.find(
      (t) => t.goals.includes(String(n)) && t.pattern.test(subject),
    ) ??
    topics.find((t) => t.goals.includes(String(n)) && t.pattern.test(text));
  const evidenceSkills = skills.filter((s) => topic?.pattern.test(s));
  const application = sdgApplication(
    subject,
    evidenceSkills.length ? evidenceSkills : skills,
    lang,
  );
  const title = subject ? `“${subject}”` : "";
  const named =
    application?.evidence ?? evidenceSkills[0] ?? skills[0] ?? subject;
  const evidence = named ? skillLabel(named, lang) : "";
  const kind = context?.kind ?? "course";
  const framing = {
    en: {
      course: "In this course",
      role: "In this role",
      vacancy: "For this vacancy",
      pathway: "In your pathway",
    },
    ms: {
      course: "Dalam kursus ini",
      role: "Dalam peranan ini",
      vacancy: "Untuk kekosongan ini",
      pathway: "Dalam laluan anda",
    },
    zh: {
      course: "在这门课程中",
      role: "在这个职业中",
      vacancy: "对于此职位",
      pathway: "在你的路径中",
    },
  }[lang][kind];
  const personal = application
    ? {
        en: `${framing}${title ? ` ${title}` : ""}, you can practise how to ${application.action}.`,
        ms: `${framing}${title ? ` ${title}` : ""}, anda boleh berlatih untuk ${application.action}.`,
        zh: `${framing}${title}，你可以练习${application.action}。`,
      }[lang]
    : (topic?.text[lang] ??
      {
        en: `${title || "This choice"} is tagged to SDG ${n}. A specific work example has not been reviewed yet.`,
        ms: `${title || "Pilihan ini"} ditag kepada SDG ${n}. Contoh kegunaan khusus belum disemak.`,
        zh: `${title || "此选择"}标记为SDG ${n}，具体工作示例尚待审核。`,
      }[lang]);
  const matched = context?.matchedSkills
    ?.slice(0, 2)
    .map((s) => skillLabel(s, lang))
    .join(", ");
  const missing = context?.missingSkills
    ?.slice(0, 2)
    .map((s) => skillLabel(s, lang))
    .join(", ");
  const learner = [
    matched &&
      {
        en: `You already bring: ${matched}.`,
        ms: `Kemahiran sedia ada anda: ${matched}.`,
        zh: `你已具备：${matched}。`,
      }[lang],
    missing &&
      {
        en: `Next to practise: ${missing}.`,
        ms: `Seterusnya untuk dilatih: ${missing}.`,
        zh: `接下来练习：${missing}。`,
      }[lang],
  ]
    .filter(Boolean)
    .join(" ");
  return {
    personal,
    global:
      (n === 8 || n === 9
        ? sdgWorkBenefit(
            subject,
            evidenceSkills.length ? evidenceSkills : skills,
            lang,
          )
        : null) ??
      `${evidence ? { en: `Applied through ${evidence}: `, ms: `Melalui penggunaan ${evidence}: `, zh: `通过应用${evidence}：` }[lang] : ""}${globalReasons[lang][n - 1]}`,
    evidence: evidence || null,
    learner,
  };
}
export const goalReasons = {
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
