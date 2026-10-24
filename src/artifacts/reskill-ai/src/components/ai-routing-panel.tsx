import { useQuery } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { ErrorBox } from "./kit";
type Route = {
  agent: string;
  provider: string;
  model: string;
  tier: string;
  configured: boolean;
  runpodPlaceholder?: boolean;
};
const copy = {
  en: {
    title: "Models by agent",
    note: "Live server configuration. Configured means credentials are present, not that a generation has succeeded. Saved insights show the model that actually answered.",
    advisor: "Company Advisor",
    audit: "routed AI roles",
    logic:
      "These are bounded AI workflows with server-supplied context. Matching, Holland scoring, course scheduling and slider scenarios are deterministic code; translation is a shared utility, not another agent. No autonomous browsing or actions.",
    model: "Provider / model",
    ready: "Configured",
    missing: "Not configured",
    analyst: "Labour market analyst",
  },
  ms: {
    title: "Model mengikut agent",
    note: "Konfigurasi langsung pelayan. Dikonfigurasi bermaksud kelayakan akses tersedia, bukan penjanaan telah berjaya. Analisis yang disimpan menunjukkan model yang benar-benar menjawab.",
    advisor: "Penasihat Syarikat",
    audit: "peranan AI",
    logic:
      "Aliran AI ini menggunakan konteks yang dibekalkan pelayan. Padanan, skor Holland, jadual kursus dan senario slider dikira oleh kod; terjemahan ialah utiliti bersama, bukan ejen tambahan. Tiada pelayaran atau tindakan autonomi.",
    model: "Penyedia / model",
    ready: "Dikonfigurasi",
    missing: "Belum dikonfigurasi",
    analyst: "Penganalisis pasaran buruh",
  },
  zh: {
    title: "各智能体使用的模型",
    note: "服务器实时配置。已配置仅表示凭据存在，不代表生成已成功。已保存的分析会显示实际回答的模型。",
    advisor: "公司顾问",
    audit: "个AI角色",
    logic:
      "这些AI流程使用服务器提供的上下文。职位匹配、霍兰德评分、课程排期及滑块情景由代码计算；翻译是共用工具，并非额外智能体。不会自主浏览或执行操作。",
    model: "提供商／模型",
    ready: "已配置",
    missing: "未配置",
    analyst: "劳动力市场分析师",
  },
};
const tasks: Record<string, Record<string, string>> = {
  en: {
    cv: "Reads uploaded CV text/images and explains CV evidence.",
    holland:
      "Explains fixed Holland results; also powers saved employee summaries and translation.",
    profiler: "Explains profile strengths, time and budget.",
    fitter: "Explains ranked career matches and gaps.",
    planner:
      "Explains the supplied course timeline; code creates the schedule.",
    sdg: "Explains supplied SDG themes.",
    analyst:
      "Market outlook, selected-year evidence explanations, and saved company/institution analysis.",
    company_advisor:
      "Employer/institution follow-up chat using company data, saved analysis, recent turns and retrieved course references.",
  },
  ms: {
    cv: "Membaca teks/imej CV dan menerangkan bukti CV.",
    holland:
      "Menerangkan keputusan Holland tetap; turut menjana ringkasan pekerja dan terjemahan.",
    profiler: "Menerangkan kekuatan profil, masa dan bajet.",
    fitter: "Menerangkan padanan kerjaya dan jurang kemahiran.",
    planner: "Menerangkan timeline kursus; kod membina jadual.",
    sdg: "Menerangkan tema SDG yang dibekalkan.",
    analyst:
      "Prospek pasaran, penerangan bukti tahun dipilih dan analisis syarikat/institusi tersimpan.",
    company_advisor:
      "Chat susulan majikan/institusi menggunakan data syarikat, analisis disimpan, perbualan terkini dan rujukan kursus.",
  },
  zh: {
    cv: "读取上传的简历文字和图像，解释简历依据。",
    holland: "解释固定霍兰德结果；也用于员工摘要与翻译。",
    profiler: "解释个人优势、时间与预算。",
    fitter: "解释职业匹配排名与技能差距。",
    planner: "解释提供的课程时间线；排期由代码生成。",
    sdg: "解释提供的SDG主题。",
    analyst: "市场展望、所选年份依据解释，以及已保存的公司/机构分析。",
    company_advisor:
      "雇主/机构的后续对话，参考公司数据、已保存分析、近期对话和检索的课程资料。",
  },
};
export function AiRoutingPanel() {
  const { lang, tk } = useT();
  const c = copy[lang];
  const q = useQuery<Route[]>({
    queryKey: ["/api/ai/routing"],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") +
          "/api/ai/routing",
        { signal },
      );
      if (!response.ok) throw new Error("AI routing is unavailable");
      return response.json();
    },
    staleTime: 60000,
    retry: false,
  });
  return (
    <div
      className="mb-3 rounded-xl border border-border p-3"
      data-testid="ai-agent-routing"
    >
      <h4 className="font-semibold">
        {c.title}{" "}
        {q.data && (
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
            {q.data.length} {c.audit}
          </span>
        )}
      </h4>
      <p className="my-2 text-xs text-muted-foreground">{c.note}</p>
      <p className="mb-3 text-xs text-muted-foreground">{c.logic}</p>
      {q.isError ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : (
        <dl className="divide-y divide-border">
          {q.data?.map((r) => (
            <div
              key={r.agent}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 py-2 text-xs"
            >
              <dt className="font-semibold">
                {r.agent === "company_advisor"
                  ? c.advisor
                  : r.agent === "analyst"
                    ? c.analyst
                    : tk("agent", r.agent + ".name")}
                <p className="mt-1 font-normal text-muted-foreground">
                  {tasks[lang][r.agent]}
                </p>
              </dt>
              <dd className="min-w-0">
                <span className="block break-all">
                  {r.provider} / {r.model}
                </span>
                <span className="text-muted-foreground">
                  {r.configured ? c.ready : c.missing}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
