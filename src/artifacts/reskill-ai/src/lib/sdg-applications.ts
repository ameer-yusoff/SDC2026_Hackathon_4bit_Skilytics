import { skillLabel } from "./skill-label";

export type SdgLang = "en" | "ms" | "zh";
type Tri = Record<SdgLang, string>;
// Reviewed examples of how a named skill can be used, not claims about a learner's ability.
const applications: { pattern: RegExp; action: Tri }[] = [
  {
    pattern: /git\b|version control/i,
    action: {
      en: "track code changes and restore a working version when a change breaks a tool",
      ms: "jejak perubahan kod dan pulihkan versi berfungsi apabila perubahan merosakkan alat",
      zh: "跟踪代码更改，在改动导致故障时恢复可用版本",
    },
  },
  {
    pattern: /reading comprehension|research/i,
    action: {
      en: "check instructions and sources before acting, so important details are not missed",
      ms: "semak arahan dan sumber sebelum bertindak supaya maklumat penting tidak terlepas",
      zh: "行动前核对说明和来源，避免遗漏重要细节",
    },
  },
  {
    pattern:
      /graphic design|visual design|ui design|ux design|figma|illustrat|photoshop|video|editing/i,
    action: {
      en: "test whether a layout or visual makes its message easy to understand",
      ms: "uji sama ada susun atur atau visual menjadikan mesej mudah difahami",
      zh: "测试版式或视觉内容是否让信息更容易理解",
    },
  },
  {
    pattern: /crm|customer relationship/i,
    action: {
      en: "record customer needs and follow-ups so a request is not forgotten",
      ms: "rekod keperluan pelanggan dan tindakan susulan supaya permintaan tidak dilupakan",
      zh: "记录客户需求和跟进事项，避免遗忘请求",
    },
  },
  {
    pattern: /absolute|relative units|responsive|\bcss\b|html/i,
    action: {
      en: "make page text and buttons fit a phone without hiding useful information",
      ms: "pastikan teks dan butang muat pada telefon tanpa menyembunyikan maklumat penting",
      zh: "让文字和按钮适合手机屏幕，不遮住重要信息",
    },
  },
  {
    pattern: /algorithm/i,
    action: {
      en: "compare ways to sort or search information so a tool responds faster",
      ms: "bandingkan cara menyusun atau mencari maklumat supaya alat bertindak lebih pantas",
      zh: "比较排序和查找信息的方法，让工具响应更快",
    },
  },
  {
    pattern: /\bsql\b|database/i,
    action: {
      en: "find duplicate records and combine tables before preparing a report",
      ms: "cari rekod berulang dan gabungkan jadual sebelum menyediakan laporan",
      zh: "在制作报告前找出重复记录并合并表格",
    },
  },
  {
    pattern: /excel|spreadsheet|power bi|tableau|visuali[sz]/i,
    action: {
      en: "turn figures into a clear chart so a team can spot delays or waste",
      ms: "tukar angka kepada carta jelas supaya pasukan nampak kelewatan atau pembaziran",
      zh: "把数字变成清晰图表，帮助团队发现延误或浪费",
    },
  },
  {
    pattern: /cyber|security|privacy/i,
    action: {
      en: "check access permissions and spot suspicious activity to protect people's information",
      ms: "semak kebenaran akses dan kesan aktiviti mencurigakan untuk melindungi maklumat orang lain",
      zh: "检查访问权限并识别可疑活动，保护他人的信息",
    },
  },
  {
    pattern:
      /machine learning|artificial intelligence|generative|\bai\b|automation/i,
    action: {
      en: "draft or sort routine work with AI, then check accuracy and private information before using it",
      ms: "gunakan AI untuk draf atau susun kerja rutin, kemudian semak ketepatan dan maklumat peribadi sebelum menggunakannya",
      zh: "用AI起草或整理日常工作，使用前检查准确性和隐私信息",
    },
  },
  {
    pattern:
      /python|javascript|typescript|\bjava\b|program|software|coding|developer/i,
    action: {
      en: "write and test a small tool that replaces a repeated manual step",
      ms: "tulis dan uji alat kecil yang menggantikan langkah manual berulang",
      zh: "编写并测试小工具，替代重复的手动步骤",
    },
  },
  {
    pattern: /statistics|mathematics|data|analytic/i,
    action: {
      en: "check figures and compare patterns before recommending a decision",
      ms: "semak angka dan bandingkan corak sebelum mencadangkan keputusan",
      zh: "检查数字并比较规律，再提出决策建议",
    },
  },
  {
    pattern: /bookkeeping|account|finance|administrative|record/i,
    action: {
      en: "check entries against receipts and keep records easy to trace",
      ms: "semak catatan dengan resit dan pastikan rekod mudah dijejaki",
      zh: "对照收据核查记录，让账目便于追踪",
    },
  },
  {
    pattern:
      /active listening|customer service|support|speaking|communication/i,
    action: {
      en: "ask a clear question and repeat the person's need before offering help",
      ms: "tanya soalan jelas dan sahkan keperluan seseorang sebelum menawarkan bantuan",
      zh: "先提出清楚的问题并确认对方需求，再提供帮助",
    },
  },
  {
    pattern: /writ|content|marketing|sales/i,
    action: {
      en: "write a clear, truthful message that helps a customer understand their options",
      ms: "tulis mesej jelas dan benar yang membantu pelanggan memahami pilihan mereka",
      zh: "撰写清晰、真实的信息，帮助客户了解选择",
    },
  },
  {
    pattern: /critical thinking|problem solving|decision/i,
    action: {
      en: "compare evidence and test a small fix before changing how the team works",
      ms: "bandingkan bukti dan uji pembaikan kecil sebelum mengubah cara pasukan bekerja",
      zh: "先比较证据并测试小改进，再改变团队的工作方式",
    },
  },
  {
    pattern: /time management|project|planning|monitoring/i,
    action: {
      en: "break a task into steps, set dates and spot delays early",
      ms: "pecahkan tugasan kepada langkah, tetapkan tarikh dan kesan kelewatan lebih awal",
      zh: "把任务分成步骤、设定日期并及早发现延误",
    },
  },
  {
    pattern: /teach|train|instruction|education|active learning/i,
    action: {
      en: "break a lesson into small steps and check whether the learner can practise them",
      ms: "pecahkan pelajaran kepada langkah kecil dan semak sama ada pelajar boleh mempraktikkannya",
      zh: "把课程分成小步骤，并检查学习者是否能够练习",
    },
  },
  {
    pattern: /accessib|inclusive|disabil/i,
    action: {
      en: "test keyboard access and readable text so more people can use a service",
      ms: "uji akses papan kekunci dan teks yang mudah dibaca supaya lebih ramai boleh menggunakan perkhidmatan",
      zh: "测试键盘操作和文字可读性，让更多人能够使用服务",
    },
  },
  {
    pattern: /energy|solar|renewable/i,
    action: {
      en: "compare energy use and identify where a task can use less power",
      ms: "bandingkan penggunaan tenaga dan kenal pasti tugasan yang boleh menggunakan kurang kuasa",
      zh: "比较能源使用，找出哪些工作可以减少用电",
    },
  },
  {
    pattern: /waste|inventory|supply chain|resource|sustainab/i,
    action: {
      en: "track what is used, reused and discarded before ordering more materials",
      ms: "jejak bahan digunakan, diguna semula dan dibuang sebelum memesan bekalan baharu",
      zh: "补充物料前先记录使用、再利用和丢弃的数量",
    },
  },
  {
    pattern: /climate|carbon|environment/i,
    action: {
      en: "compare emissions information before choosing a lower-impact option",
      ms: "bandingkan maklumat pelepasan sebelum memilih pilihan yang kurang memberi kesan",
      zh: "比较排放信息，再选择影响较小的方案",
    },
  },
  {
    pattern: /cloud|docker|aws|azure|devops|network/i,
    action: {
      en: "set up and monitor a service so people can keep using it when demand changes",
      ms: "sediakan dan pantau perkhidmatan supaya orang masih boleh menggunakannya apabila permintaan berubah",
      zh: "设置并监控服务，让需求变化时人们仍能正常使用",
    },
  },
];

export function sdgApplication(
  subject: string,
  skills: string[],
  lang: SdgLang,
) {
  // The precise title wins; otherwise show the actual named skill used for the example.
  const direct = applications.find((a) => a.pattern.test(subject));
  const skill = skills.find((s) => applications.some((a) => a.pattern.test(s)));
  const match =
    direct ?? applications.find((a) => skill && a.pattern.test(skill));
  const evidence = direct ? subject : skill;
  if (!match || !evidence) return null;
  return {
    action: match.action[lang],
    evidence: direct ? subject : skillLabel(evidence, lang),
  };
}

/** Concrete wider benefit for the same supplied topic; a possible use, not a measured result. */
export function sdgWorkBenefit(
  subject: string,
  skills: string[],
  lang: SdgLang,
) {
  const cases: [RegExp, Tri][] = [
    [
      /html|css|responsive/i,
      {
        en: "Pages that work on different phones can make digital services easier to use, including on smaller screens.",
        ms: "Halaman yang berfungsi pada pelbagai telefon boleh memudahkan penggunaan perkhidmatan digital, termasuk pada skrin kecil.",
        zh: "适合不同手机的网页可以让数字服务更易使用，包括在小屏幕上。",
      },
    ],
    [
      /algorithm/i,
      {
        en: "Faster sorting and searching can cut waiting and unnecessary computer work when many people use a service.",
        ms: "Susunan dan carian lebih pantas boleh mengurangkan masa menunggu dan kerja komputer berlebihan apabila ramai menggunakan perkhidmatan.",
        zh: "更快的排序和查找可以在多人使用服务时减少等待及多余的计算。",
      },
    ],
    [
      /sql|database|record|account|bookkeeping/i,
      {
        en: "More reliable records can reduce reporting errors and help organisations use their money and time more carefully.",
        ms: "Rekod lebih boleh dipercayai boleh mengurangkan kesilapan laporan dan membantu organisasi menggunakan wang serta masa dengan lebih cermat.",
        zh: "更可靠的记录可以减少报告错误，帮助机构更谨慎地使用资金和时间。",
      },
    ],
    [
      /cyber|security|privacy/i,
      {
        en: "Protecting information can reduce service disruption and help people trust the digital tools they use.",
        ms: "Melindungi maklumat boleh mengurangkan gangguan perkhidmatan dan membantu orang mempercayai alat digital yang digunakan.",
        zh: "保护信息可以减少服务中断，帮助人们信任所使用的数字工具。",
      },
    ],
    [
      /machine learning|artificial intelligence|generative|\bai\b|automation/i,
      {
        en: "Carefully checked AI assistance can leave teams more time for useful work while keeping people responsible for decisions.",
        ms: "Bantuan AI yang disemak teliti boleh memberi pasukan lebih masa untuk kerja berguna, dengan manusia terus bertanggungjawab terhadap keputusan.",
        zh: "经过仔细核查的AI辅助可以让团队把更多时间用于有价值的工作，同时由人对决策负责。",
      },
    ],
    [
      /data|analytic|excel|power bi|statistics/i,
      {
        en: "Clearer evidence can help teams spot wasted effort and choose which service or process needs improvement first.",
        ms: "Bukti lebih jelas boleh membantu pasukan mengesan usaha terbuang dan memilih perkhidmatan atau proses yang perlu diperbaik dahulu.",
        zh: "更清晰的证据可以帮助团队发现无效工作，并确定应优先改进的服务或流程。",
      },
    ],
    [
      /python|javascript|program|software|developer|coding/i,
      {
        en: "Tested, reusable tools can reduce repeated manual work and make services more reliable for their users.",
        ms: "Alat yang diuji dan boleh digunakan semula boleh mengurangkan kerja manual berulang serta meningkatkan kebolehpercayaan perkhidmatan.",
        zh: "经过测试、可重复使用的工具可以减少重复手动工作，提高服务的可靠性。",
      },
    ],
  ];
  const direct = cases.find(([pattern]) => pattern.test(subject));
  const fromSkill = cases.find(([pattern]) =>
    skills.some((s) => pattern.test(s)),
  );
  return (direct ?? fromSkill)?.[1][lang] ?? null;
}

export type SkillContext = {
  subject?: string;
  status?: "known" | "inferred" | "learn";
};

export function skillPersonalNote(
  name: string,
  context: SkillContext,
  lang: SdgLang,
) {
  const skill = skillLabel(name, lang);
  const action = sdgApplication(name, [], lang)?.action;
  const place = context.subject ? `“${context.subject}”` : "";
  const status = {
    en: {
      known:
        "Your profile already lists this skill; practise applying it here.",
      inferred:
        "Your experience suggests this skill; check it before treating it as confirmed.",
      learn: "This is a skill to learn for this choice.",
    },
    ms: {
      known:
        "Profil anda sudah menyenaraikan kemahiran ini; latih penggunaannya di sini.",
      inferred:
        "Pengalaman anda mencadangkan kemahiran ini; semak dahulu sebelum menganggapnya disahkan.",
      learn: "Ini kemahiran untuk anda pelajari bagi pilihan ini.",
    },
    zh: {
      known: "资料中已列出这项技能；可以在此练习应用。",
      inferred: "经历显示你可能具备这项技能，确认前请先核实。",
      learn: "这是这个选择需要学习的技能。",
    },
  }[lang];
  const example = action
    ? {
        en: `${place ? `For ${place}, ` : ""}use ${skill} to ${action}.`,
        ms: `${place ? `Untuk ${place}, ` : ""}gunakan ${skill} untuk ${action}.`,
        zh: `${place ? `在${place}中，` : ""}应用${skill}：${action}。`,
      }[lang]
    : {
        en: `${place ? `${place} lists ` : "This choice lists "}${skill}. A more specific example of its SDG contribution has not been reviewed yet.`,
        ms: `${place || "Pilihan ini"} menyenaraikan ${skill}. Contoh lebih khusus sumbangan SDG kemahiran ini belum disemak.`,
        zh: `${place || "此选择"}列出${skill}。这项技能与SDG关联的具体示例尚待审核。`,
      }[lang];
  return { example, status: context.status ? status[context.status] : null };
}
