import audit from "../../../../data/source-access-audit.json";
import { useT } from "@/i18n";
const words = {
  en: {
    title: "Public access audit",
    access: "Access & use",
    licence: "Licence / terms",
    check: "Unauthenticated check",
    docs: "Publisher documentation",
    summary:
      "24 external sources reviewed: 21 data/reference sources and 3 AI service entries (including Google Gemini and RunPod). Public access does not mean unrestricted reuse. AI services require private credentials and are not public datasets.",
    privacy:
      "CVs, employee records, accounts, progress and saved AI replies are private user data, not public datasets. Demo CVs are fictional. Matches, SDG associations and future scenarios are derived application outputs.",
    probe:
      "A URL check tests that URL only. HTTP 403/429 or timeout is not proof of an auth requirement. OpenLearn returned 403 from this environment; its selected course metadata remains a reviewed snapshot, not a verified live feed.",
    review: "Reviewed",
    directory: "Vacancy API discovery",
    decision:
      "RemoteOK selected from public-apis and its official API tested without credentials. Adzuna, Jooble, Reed, Findwork and USAJOBS need keys; Upwork and Arbeitsamt need OAuth. Europe/UK feeds are not presented as Malaysian vacancies. Jobicy has been removed.",
  },
  ms: {
    title: "Audit akses awam",
    access: "Akses & penggunaan",
    licence: "Lesen / terma",
    check: "Semakan tanpa auth",
    docs: "Dokumentasi penerbit",
    summary:
      "24 sumber luaran disemak: 21 sumber data/rujukan dan 3 entri perkhidmatan AI (termasuk Google Gemini dan RunPod). Akses awam bukan izin penggunaan semula tanpa had. Perkhidmatan AI memerlukan kelayakan peribadi dan bukan dataset awam.",
    privacy:
      "CV, rekod pekerja, akaun, kemajuan dan jawapan AI tersimpan ialah data pengguna peribadi, bukan dataset awam. CV demo ialah rekaan. Padanan, kaitan SDG dan senario masa depan ialah hasil terbitan aplikasi.",
    probe:
      "Semakan URL hanya menguji URL tersebut. HTTP 403/429 atau timeout bukan bukti auth diperlukan. OpenLearn memulangkan 403 dari persekitaran ini; metadata kursus terpilih kekal sebagai snapshot disemak, bukan feed live yang disahkan.",
    review: "Disemak",
    directory: "Penemuan API vacancy",
    decision:
      "RemoteOK dipilih daripada public-apis dan API rasminya diuji tanpa kelayakan. Adzuna, Jooble, Reed, Findwork dan USAJOBS memerlukan kunci; Upwork dan Arbeitsamt memerlukan OAuth. Feed Eropah/UK tidak dipaparkan sebagai vacancy Malaysia. Jobicy telah dibuang.",
  },
  zh: {
    title: "公开访问审核",
    access: "访问与使用",
    licence: "许可 / 条款",
    check: "无认证检查",
    docs: "发布者文档",
    summary:
      "已审核24个外部来源：21个数据/参考来源及3个AI服务条目（包括Google Gemini与RunPod）。公开访问不代表无限制再利用。AI服务需要私有凭证，并非公开数据集。",
    privacy:
      "简历、员工记录、账号、进度及保存的AI回答属于私有用户数据，并非公开数据集。演示简历为虚构资料。匹配、SDG关联及未来情景是应用派生结果。",
    probe:
      "URL检查仅验证该URL。403、429或超时不等于需要认证。本环境访问OpenLearn返回403，因此所选课程仍标记为人工审核快照，而非已验证实时目录。",
    review: "审核日期",
    directory: "招聘API发现",
    decision:
      "从public-apis选择RemoteOK，并无凭证测试其官方API。Adzuna、Jooble、Reed、Findwork及USAJOBS需要密钥；Upwork及Arbeitsamt需要OAuth。欧洲/英国职位不会标为马来西亚招聘。Jobicy已移除。",
  },
};
export function SourceAccess({ id }: { id: string }) {
  const { lang } = useT(),
    w = words[lang],
    row = audit.rows.find((r) => r.id === id);
  if (!row) return null;
  return (
    <details className="mt-3 rounded-xl border bg-muted/20 p-3 text-xs">
      <summary className="cursor-pointer font-semibold">{w.access}</summary>
      <p className="mt-2 leading-relaxed">{row.note[lang]}</p>
      <dl className="mt-3 space-y-2">
        <div>
          <dt className="text-muted-foreground">{w.licence}</dt>
          <dd className="break-words">{row.licence}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{w.check}</dt>
          <dd>
            {row.probe.status === null
              ? row.probe.error
              : `HTTP ${row.probe.status}`}{" "}
            · {row.checkedAt.slice(0, 10)}
          </dd>
        </div>
      </dl>
      <a
        href={row.documentation}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex min-h-11 items-center underline"
      >
        {w.docs} ↗
      </a>
    </details>
  );
}
export function SourceAccessAudit() {
  const { lang } = useT(),
    w = words[lang];
  return (
    <section className="mb-5 space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-bold">{w.title}</h2>
      <p className="text-sm">{w.summary}</p>
      <p className="text-xs text-muted-foreground">
        {w.review}: {audit.reviewedAt.slice(0, 10)}
      </p>
      <details className="rounded-xl border p-3 text-sm">
        <summary className="cursor-pointer font-semibold">
          {w.directory}
        </summary>
        <p className="mt-2">{w.decision}</p>
        <a
          href={audit.candidates.directory}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center text-primary underline"
        >
          public-apis / Jobs ↗
        </a>
      </details>
      <p className="text-xs leading-relaxed text-muted-foreground">{w.probe}</p>
      <p className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed">
        {w.privacy}
      </p>
    </section>
  );
}

export function auditedSourceDescription(id: string, lang: "en" | "ms" | "zh") {
  return audit.rows.find((r) => r.id === id)?.note[lang];
}
