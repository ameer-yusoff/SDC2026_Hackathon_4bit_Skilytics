type Tri = { en: string; ms: string; zh: string };
export type SkillSdgLink = {
  code: string;
  target: string;
  basis: "topic" | "work-context";
  topic: Tri;
  reason: Tri;
  sourceUrl: string;
};
const topics: [RegExp, string, string, Tri, Tri][] = [
  [
    /accessib|inclusive|disabil/i,
    "10",
    "10.2",
    { en: "Accessible tools", ms: "Alat mudah diakses", zh: "无障碍工具" },
    {
      en: "Make tools easier for people with different needs to use.",
      ms: "Jadikan alat lebih mudah digunakan orang dengan keperluan berbeza.",
      zh: "让不同需要的人都能更容易使用工具。",
    },
  ],
  [
    /teach|instruction|training|curriculum|education/i,
    "4",
    "4.4",
    { en: "Sharing skills", ms: "Berkongsi kemahiran", zh: "传授技能" },
    {
      en: "Help other people learn useful skills, one clear step at a time.",
      ms: "Bantu orang lain belajar kemahiran berguna, satu langkah mudah pada satu masa.",
      zh: "一步一步帮助他人学习实用技能。",
    },
  ],
  [
    /solar|renewable|energy efficiency/i,
    "7",
    "7.3",
    {
      en: "Using energy wisely",
      ms: "Guna tenaga dengan bijak",
      zh: "合理使用能源",
    },
    {
      en: "Use this knowledge to waste less energy in practical work.",
      ms: "Gunakan ilmu ini untuk mengurangkan pembaziran tenaga dalam kerja.",
      zh: "把知识用于工作，减少能源浪费。",
    },
  ],
  [
    /climate|carbon|environment/i,
    "13",
    "13.3",
    { en: "Understanding climate", ms: "Memahami iklim", zh: "了解气候" },
    {
      en: "Understand environmental information and choose less harmful ways to work.",
      ms: "Fahami maklumat alam sekitar dan pilih cara kerja yang kurang memudaratkan.",
      zh: "理解环境信息，选择影响较小的工作方式。",
    },
  ],
  [
    /supply chain|inventory|waste|resource management|sustainab/i,
    "12",
    "12.2",
    { en: "Less waste", ms: "Kurang pembaziran", zh: "减少浪费" },
    {
      en: "Plan resources carefully so useful materials are not wasted.",
      ms: "Rancang sumber dengan teliti supaya bahan berguna tidak dibazirkan.",
      zh: "仔细规划资源，减少有用材料的浪费。",
    },
  ],
  [
    /anti.corruption|governance|compliance/i,
    "16",
    "16.6",
    { en: "Trustworthy systems", ms: "Sistem dipercayai", zh: "可信赖的系统" },
    {
      en: "Help people handle information responsibly and build trust in services.",
      ms: "Bantu orang mengurus maklumat dengan bertanggungjawab dan membina kepercayaan.",
      zh: "帮助人们负责任地处理信息，建立服务信任。",
    },
  ],
  [
    /cyber|security|privacy|python|sql|program|software|data|cloud|machine|ai\b|artificial|web|html|css|network|database/i,
    "9",
    "9.5",
    {
      en: "Better digital tools",
      ms: "Alat digital lebih baik",
      zh: "更好的数字工具",
    },
    {
      en: "Use this skill to build or improve tools that help people solve problems.",
      ms: "Gunakan kemahiran ini untuk membina atau memperbaik alat yang menyelesaikan masalah.",
      zh: "用这项技能改进或创建工具，帮助人们解决问题。",
    },
  ],
  [
    /health|safety|first aid/i,
    "8",
    "8.8",
    { en: "Safer work", ms: "Kerja lebih selamat", zh: "更安全的工作" },
    {
      en: "Recognise hazards and choose safer ways to work.",
      ms: "Kenal pasti bahaya dan pilih cara kerja lebih selamat.",
      zh: "识别风险，选择更安全的工作方式。",
    },
  ],
];
export function skillSdgLinks(name: string): SkillSdgLink[] {
  const hit = topics.find(([re]) => re.test(name));
  if (hit) {
    const [, code, target, topic, reason] = hit;
    return [
      {
        code,
        target,
        basis: "topic",
        topic,
        reason,
        sourceUrl: `https://sdgs.un.org/goals/goal${code}`,
      },
    ];
  }
  return [
    {
      code: "8",
      target: "8.2",
      basis: "work-context",
      topic: {
        en: "Better everyday work",
        ms: "Kerja harian lebih baik",
        zh: "改善日常工作",
      },
      reason: {
        en: "Practise this skill to do useful work more clearly and carefully. The link comes from its workplace use, not proof of economic impact.",
        ms: "Latih kemahiran ini untuk bekerja dengan lebih jelas dan teliti. Kaitan ini daripada kegunaan di tempat kerja, bukan bukti impak ekonomi.",
        zh: "练习这项技能，更清晰细致地完成工作。关联来自工作用途，并非经济影响的证明。",
      },
      sourceUrl: "https://sdgs.un.org/goals/goal8",
    },
  ];
}
