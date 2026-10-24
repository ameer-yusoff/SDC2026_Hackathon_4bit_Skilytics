// Run with tsx. Only public documentation/data URLs are requested; no credentials are used.
import { writeFile } from "node:fs/promises";
import { SOURCES } from "./market";
import { pool } from "@workspace/db";
const tri = (en: string, ms: string, zh: string) => ({ en, ms, zh });
const groups = {
  open: tri(
    "Public downloadable data; no API key. Keep attribution and the publisher's release licence.",
    "Data awam boleh dimuat turun tanpa kunci API. Kekalkan atribusi dan lesen keluaran penerbit.",
    "公开可下载数据，无需密钥；保留署名并遵守发布版本的许可。",
  ),
  metadata: tri(
    "Public metadata without an API key. This is not a blanket open-content licence. Learning accounts, tools, credentials or exams may require payment or sign-in.",
    "Metadata awam tanpa kunci API. Ini bukan lesen kandungan terbuka menyeluruh. Akaun belajar, alat, sijil atau peperiksaan mungkin memerlukan bayaran atau log masuk.",
    "无需密钥的公开元数据，不代表全部内容均为开放许可。学习账号、工具、证书或考试可能收费或需要登录。",
  ),
  reference: tri(
    "Public reference material. Respect publisher rights; app mappings are editorial, not measured outcomes.",
    "Bahan rujukan awam. Hormati hak penerbit; pemetaan aplikasi bersifat editorial, bukan hasil terukur.",
    "公开参考资料。遵守发布者权利；应用映射由编辑制定，并非实测结果。",
  ),
  news: tri(
    "Public news metadata only, not full articles. Publisher copyright still applies; a rate-limit or timeout does not imply authentication is required.",
    "Metadata berita awam sahaja, bukan artikel penuh. Hak cipta penerbit kekal; had kadar atau timeout tidak bermakna auth diperlukan.",
    "仅使用公开新闻元数据，不包含全文。发布者版权仍适用；限流或超时不表示必须认证。",
  ),
  service: tri(
    "Authenticated AI service, not a public dataset. API key, provider limits and possible costs apply. No keys appear in this audit.",
    "Perkhidmatan AI dengan auth, bukan dataset awam. Memerlukan kunci API, tertakluk kepada had dan kemungkinan kos. Audit ini tidak memaparkan kunci.",
    "需要认证的AI服务，不是公开数据集。需要密钥，可能有配额和费用。本审核不显示密钥。",
  ),
  disabled: tri(
    "Disabled authenticated AI placeholder, not a public dataset. Enabling it requires private credentials and may incur costs.",
    "Placeholder AI ber-auth yang dimatikan, bukan dataset awam. Pengaktifan memerlukan kelayakan peribadi dan mungkin berkos.",
    "已禁用的认证AI预留服务，不是公开数据集。启用需要私有凭证并可能产生费用。",
  ),
  jobs: tri(
    "Public keyless vacancy API. Preserve attribution, original application links and location/expiry restrictions. Public access is not unrestricted redistribution permission.",
    "API vacancy awam tanpa kunci. Kekalkan atribusi, pautan permohonan asal serta had lokasi/tarikh luput. Akses awam bukan izin pengedaran semula tanpa had.",
    "无需密钥的公开招聘API。保留来源、原申请链接、地点及到期限制。公开访问不代表可无限制再分发。",
  ),
};
const licences: Record<string, string> = {
  onet: "O*NET Database · CC BY 4.0",
  onet_content_model: "O*NET attribution; app reference subset",
  onet_interest_profiler:
    "O*NET Tools Developer License · adapted items, not validated Mini-IP",
  aei_usage:
    "Hugging Face dataset card/release licence (currently MIT); retain attribution",
  aei_exposure:
    "Hugging Face dataset card/release licence (currently MIT); retain attribution",
  dosm_lfs_month: "data.gov.my publisher licence and attribution",
  bls_projections: "US BLS public data; reviewed US snapshot",
  freecodecamp_catalogue:
    "Repository licence applies to metadata; curriculum has separate content terms",
  githubskills_catalogue: "Each exercise repository's own licence",
  openlearn_catalogue:
    "OpenLearn content-specific licence; only selected metadata ingested",
  himalayas_jobs:
    "Himalayas API terms: original applicationLink, attribution, remove expired jobs; no onward syndication",
  remotive_jobs:
    "Remotive API terms: attribution and original link; 24h delay; no onward syndication; cache daily",
  remoteok_jobs:
    "RemoteOK API notice: follow link and attribution; no logo without permission",
  hrdcorp_elatih:
    "HRD Corp / e-LATiH public portal terms and national training framework",
};
const rows = [];
for (const source of SOURCES) {
  const kind =
    source.kind === "ai_endpoint"
      ? source.id === "gemini"
        ? "service"
        : "disabled"
      : source.id.endsWith("_jobs")
        ? "jobs"
        : ["gdelt_career_news", "career_news_rss"].includes(source.id)
          ? "news"
          : [
                "onet",
                "aei_usage",
                "aei_exposure",
                "dosm_lfs_month",
                "freecodecamp_catalogue",
                "githubskills_catalogue",
              ].includes(source.id)
            ? "open"
            : source.kind === "catalogue"
              ? "metadata"
              : "reference";
  let observation: {
    status: number | null;
    finalUrl: string;
    error: string | null;
  } = { status: null, finalUrl: source.url, error: null };
  try {
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(12000),
      headers: { Accept: "application/json,text/html,text/plain,*/*" },
    });
    observation = {
      status: response.status,
      finalUrl: response.url,
      error: null,
    };
    await response.body?.cancel();
  } catch (e) {
    observation.error = e instanceof Error ? e.name : "fetch_error";
  }
  rows.push({
    id: source.id,
    name: source.name,
    category: source.kind,
    access: kind,
    note: groups[kind],
    licence:
      licences[source.id] ??
      "Publisher terms apply; public availability alone does not establish an open-content licence",
    documentation: source.url,
    checkedAt: new Date().toISOString(),
    probe: observation,
  });
}
const learnRow = rows.find((r) => r.id === "course_catalogue");
if (learnRow) {
  learnRow.note = {
    en: "The legacy Learn catalogue URL used by this app was tested without credentials. The newer Microsoft Learn Platform API requires authenticated onboarding; it is a different interface. Public course metadata does not make exams, tools or course content unrestricted.",
    ms: "URL katalog Learn legasi yang digunakan aplikasi diuji tanpa kelayakan. Microsoft Learn Platform API yang baharu memerlukan onboarding dengan auth; ia antara muka berbeza. Metadata kursus awam tidak bermakna peperiksaan, alat atau kandungan boleh digunakan tanpa sekatan.",
    zh: "本应用使用的旧版Learn目录URL已无凭证测试。新版Microsoft Learn Platform API需要认证注册，两者是不同接口。公开课程元数据不代表考试、工具及内容可无限制使用。",
  };
  learnRow.licence =
    "Microsoft API/content terms; legacy public catalogue distinct from authenticated Learn Platform API";
}
const report = {
  reviewedAt: new Date().toISOString(),
  method:
    "Code inventory + official publisher documentation + unauthenticated public URL probe. HTTP result describes the checked URL only, not every API operation or a legal certification. Service probes check public documentation only.",
  candidates: {
    directory: "https://github.com/public-apis/public-apis#jobs",
    selected: "RemoteOK",
    notSelected: [
      "Adzuna, Jooble, Reed, USAJOBS, Findwork: API key required",
      "Upwork, Arbeitsamt: OAuth required",
      "Arbeitnow, DevITjobs UK: predominantly Europe/UK; not treated as Malaysian vacancies",
    ],
  },
  rows,
};
await writeFile(
  new URL("../../../../data/source-access-audit.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    sources: rows.length,
    publicSources: rows.filter(
      (r) => !["service", "disabled"].includes(r.access),
    ).length,
    services: rows.filter((r) => ["service", "disabled"].includes(r.access))
      .length,
    unavailableProbes: rows
      .filter((r) => r.probe.status !== 200)
      .map((r) => ({ id: r.id, ...r.probe })),
  }),
);
await pool.end();
