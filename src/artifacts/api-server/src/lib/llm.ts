// RunPod Serverless vLLM client (OpenAI-compatible). Only called on demand.
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { agentRoute, type RoutedAgent } from "./agent-routing";

export class AiNotConnectedError extends Error {}
export class AiTimeoutError extends Error {}
export class AiVisionUnsupportedError extends Error {}

type Tier = "main" | "light";
export type ChatImage = { mediaType: "image/png" | "image/jpeg" | "image/webp"; base64: string };
export type ChatTiming = {
  endpointTier: Tier;
  modelResolutionMs: number;
  endpointRequestMs: number;
  endpointWarmBeforeRequest: boolean | null;
  endpointStartupMs: number | null;
  readyToResponseMs: number | null;
};
type ChatOptions = { measureEndpointStartup?: boolean; agent?: RoutedAgent; timeoutMs?: number };
type ChatResult = { content: string; model: string; timing: ChatTiming };

/** Accepts a bare endpoint ID or a pasted URL such as https://api.runpod.ai/v2/<id>/run. */
function endpointId(raw: string | undefined): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  const m = v.match(/\/v2\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : v;
}

export type AiProvider = "runpod" | "gemini" | "mock";

function cfg(agent?: RoutedAgent) {
  const providerEnv = (agent ? agentRoute(agent).provider : undefined) ?? process.env["AI_PROVIDER"]?.toLowerCase().trim();
  let provider: AiProvider = "runpod";
  if (providerEnv === "mock" || process.env["AI_TEST_MODE"] === "true") {
    provider = "mock";
  } else if (providerEnv === "gemini" || (!providerEnv && process.env["GEMINI_API_KEY"]?.trim())) {
    provider = "gemini";
  } else {
    provider = "runpod";
  }

  const geminiKey = process.env["GEMINI_API_KEY"]?.trim();
  let geminiModel = (agent === "cv" ? process.env.GEMINI_CV_MODEL?.trim() : undefined) || process.env["GEMINI_MODEL"]?.trim() || "gemini-3.1-flash-lite";

  const apiKey = process.env["RUNPOD_API_KEY"]?.trim();
  const mainId = endpointId(process.env["RUNPOD_LLM_ENDPOINT_ID"]);
  const lightId = endpointId(process.env["RUNPOD_LIGHT_ENDPOINT_ID"]);

  return {
    provider,
    geminiKey,
    geminiModel,
    apiKey,
    mainId,
    lightId,
    // RunPod's vLLM worker serves the model under a lowercased id; see resolveModel().
    mainModel: process.env["RUNPOD_LLM_MODEL"]?.trim() || "qwen/qwen3.5-27b",
    lightModel: process.env["RUNPOD_LIGHT_MODEL"]?.trim() || "qwen/qwen3.5-9b",
  };
}

export async function aiStatus() {
  const c = cfg();
  if (c.provider === "mock") {
    return {
      connected: true,
      provider: "Mock Testing Engine (Zero Credit)",
      mainModel: "mock-engine-v1",
      lightModel: "mock-engine-v1",
      mainConfigured: true,
      lightConfigured: true,
      mainStatus: "ok" as const,
      mainDetail: "Local deterministic extraction active. Zero credits consumed, instant response.",
      mainError: null,
      lightStatus: "ok" as const,
      lightDetail: "Local deterministic extraction active.",
      lightError: null,
      message: "Testing mode active. Fast, zero-credit CV reading enabled.",
    };
  }

  if (c.provider === "gemini") {
    const health = await endpointHealth("main");
    const configured = !!c.geminiKey;
    return {
      connected: health.status === "ok",
      provider: "Google Gemini (Free API)",
      mainModel: c.geminiModel,
      lightModel: c.geminiModel,
      mainConfigured: configured,
      lightConfigured: configured,
      mainStatus: health.status,
      mainDetail: health.detail,
      mainError: health.error,
      lightStatus: health.status,
      lightDetail: health.detail,
      lightError: health.error,
      message: !configured
        ? "Google Gemini API not configured. Set GEMINI_API_KEY in .env."
        : health.status === "ok"
          ? "Google Gemini Free API connected and ready."
          : `Google Gemini API health check failed: ${health.error}`,
    };
  }


  // RunPod (default)
  const mainConfigured = !!(c.apiKey && c.mainId);
  const lightConfigured = !!(c.apiKey && c.lightId);
  const [mainHealth, lightHealth] = await Promise.all([
    mainConfigured ? endpointHealth("main") : Promise.resolve({ status: "not_configured" as const, detail: null, error: null }),
    lightConfigured ? endpointHealth("light") : Promise.resolve({ status: "not_configured" as const, detail: null, error: null }),
  ]);
  return {
    connected: mainHealth.status === "ok",
    provider: "RunPod Serverless (vLLM)",
    mainModel: mainConfigured ? c.mainModel : null,
    lightModel: lightConfigured ? c.lightModel : null,
    mainConfigured,
    lightConfigured,
    mainStatus: mainHealth.status,
    mainDetail: mainHealth.detail,
    mainError: mainHealth.error,
    lightStatus: lightHealth.status,
    lightDetail: lightHealth.detail,
    lightError: lightHealth.error,
    message: !mainConfigured
      ? "AI engine not connected. Set RUNPOD_API_KEY and RUNPOD_LLM_ENDPOINT_ID, or use GEMINI_API_KEY for free AI."
      : mainHealth.status !== "ok"
        ? `Main AI endpoint is unavailable or its served model does not match the configuration: ${mainHealth.error ?? "health check failed"}`
        : lightConfigured && lightHealth.status !== "ok"
          ? `Main AI endpoint is ready, but the light endpoint is unavailable or its served model does not match the configuration: ${lightHealth.error ?? "health check failed"}`
          : lightConfigured
            ? "AI engine ready. Main and light endpoint models are verified."
            : "AI engine ready on the main model. No light endpoint set, so every agent uses the main model.",
  };
}

const servedModel = new Map<string, string>();

/**
 * RunPod may lowercase the served model id. Only use an advertised model that
 * matches the configured model; silently selecting a different model masks bad configuration.
 */
async function resolveModel(endpoint: string, configured: string, apiKey: string): Promise<string> {
  const known = servedModel.get(endpoint);
  if (known?.toLowerCase() === configured.toLowerCase()) return known;
  servedModel.delete(endpoint);
  try {
    const res = await fetch(`https://api.runpod.ai/v2/${endpoint}/openai/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(2_500),
    });
    if (res.ok) {
      const j = (await res.json()) as { data?: { id: string }[] };
      const ids = j.data?.map((d) => d.id) ?? [];
      const match = ids.find((id) => id.toLowerCase() === configured.toLowerCase());
      if (match) {
        servedModel.set(endpoint, match);
        return match;
      }
      throw new Error(`Configured model "${configured}" is not served by the endpoint (served: ${ids.join(", ") || "none"}).`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Configured model ")) throw err;
    // Endpoint cold or models endpoint timed out; use the configured name for now.
  }
  servedModel.set(endpoint, configured);
  return configured;
}

export async function chat(tier: Tier, system: string, user: string, options?: ChatOptions): Promise<ChatResult> {
  return chatRequest(tier, system, user, undefined, options);
}

export async function chatWithImage(tier: Tier, system: string, user: string, image: ChatImage, options?: ChatOptions): Promise<ChatResult> {
  return chatWithImages(tier, system, user, [image], options);
}

export async function chatWithImages(tier: Tier, system: string, user: string, images: ChatImage[], options?: ChatOptions): Promise<ChatResult> {
  if (!images.length) throw new Error("At least one image is required.");
  return chatRequest(tier, system, user, images, options);
}

async function chatRequest(tier: Tier, system: string, user: string, images?: ChatImage[], options?: ChatOptions): Promise<ChatResult> {
  const requestKey = createHash("sha256")
    .update(tier).update("\0").update(system).update("\0").update(user).update("\0")
    .update(images?.map((image) => `${image.mediaType}\0${createHash("sha256").update(image.base64).digest("hex")}`).join("\0") ?? "")
    .update(options?.measureEndpointStartup ? "\0measure-startup" : "")
    .update(options?.agent ?? "")
    .digest("hex");
  const inFlight = pendingChats.get(requestKey);
  if (inFlight) return inFlight;

  const request = generateChat(tier, system, user, images, options);
  pendingChats.set(requestKey, request);
  try {
    return await request;
  } finally {
    if (pendingChats.get(requestKey) === request) pendingChats.delete(requestKey);
  }
}

const pendingChats = new Map<string, Promise<ChatResult>>();

async function readyWorkerCount(endpoint: string, apiKey: string): Promise<number | null> {
  try {
    const response = await fetch(`https://api.runpod.ai/v2/${endpoint}/health`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { workers?: Record<string, number> };
    const workers = body.workers;
    if (!workers || !Number.isFinite(workers["ready"])) return null;
    const runningWorkers = Number.isFinite(workers["running"]) ? workers["running"]! : 0;
    return workers["ready"]! + runningWorkers;
  } catch {
    return null;
  }
}

async function waitForEndpointStartup(
  endpoint: string,
  apiKey: string,
  startedAt: number,
  requestSettled: () => boolean,
): Promise<number | null> {
  const deadline = startedAt + 75_000;
  while (!requestSettled() && performance.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    if (requestSettled()) return null;
    const activeWorkers = await readyWorkerCount(endpoint, apiKey);
    if (activeWorkers !== null && activeWorkers > 0) return Math.round(performance.now() - startedAt);
  }
  return null;
}

function mockGenerateChat(system: string, user: string, images?: ChatImage[]): string {
  // 1. Multimodal CV extraction
  if (system.includes("imagePages") || system.includes("mixed text and image pages")) {
    let sourceText = "";
    try {
      const parsed = JSON.parse(user) as { textPages?: { text: string }[] };
      if (parsed.textPages?.length) {
        sourceText = parsed.textPages.map((p) => p.text).filter(Boolean).join("\n\n");
      }
    } catch {}

    const textToUse = sourceText || "Ungku Babas bin Ungku Samad\nSINE DORBY\nBusiness Operation Intern\nOct 2023 - Mar 2024\nUniversiti Teknologi Malaysia\nBachelor of Real Estate\nJuly, 2019 - Oct, 2024\n\nSPM : 8A 1B\nGained experience in managing daily operations, coordinating tasks, analysing business processes, and improving workflow efficiency.";

    const findMatch = (pattern: RegExp): { value: string; quote: string } | null => {
      const m = pattern.exec(textToUse);
      if (m) {
        const val = (m[1] || m[0]).trim();
        return { value: val, quote: val };
      }
      return null;
    };

    const name = findMatch(/\b([A-Z][a-zA-Z'./-]+(?:\s+(?:A\/L|A\/P|bin|binti|[A-Z][a-zA-Z'./-]+)){1,4})\b/) || { value: "Ungku Babas bin Ungku Samad", quote: "Ungku Babas bin Ungku Samad" };
    const currentRole = findMatch(/\b((?:Senior\s+|Junior\s+|Lead\s+)?(?:Machine\s+Learning\s+Engineer|Data\s+Analyst|Software\s+Engineer|Business\s+Operation\s+Intern|Operations\s+Intern|Project\s+Manager|Machine\s+Operator|Executive|Consultant|Intern(?:ship)?|Officer|Coordinator|Technician))\b/i) || { value: "Business Operation Intern", quote: "Business Operation Intern" };
    const organization = findMatch(/\b(Inari\s+Amertron\s+Berhad|Inari\s+Amertron|SINE\s+DORBY|Universiti\s+Teknologi\s+Malaysia|Monash\s+University|MMU|Petronas|Intel)\b/i) || { value: "SINE DORBY", quote: "SINE DORBY" };
    const education = findMatch(/\b((?:Master|Bachelor|Diploma|Doctorate|SPM|Degree)\s+(?:of|in)?\s+[^\n\r,]+)/i) || { value: "Bachelor of Real Estate", quote: "Bachelor of Real Estate" };
    const experience = findMatch(/(?:Business Operation Intern|Lead ML Engineer|Led cross-functional|Gained experience)[^\n\r.]*/i) || { value: "Business Operation Intern", quote: "Business Operation Intern" };

    return JSON.stringify({
      imagePages: [
        {
          pageNumber: 1,
          text: textToUse,
        },
      ],
      profile: {
        name,
        currentRole,
        organization,
        education,
        experience,
      },
    });
  }

  // 2. Text CV extraction
  if (system.includes("userCvChunks") || system.includes("extract CV facts as strict JSON")) {
    let sourceText = user;
    try {
      const parsed = JSON.parse(user) as { userCvChunks?: { content: string }[] };
      if (parsed.userCvChunks?.length) {
        sourceText = parsed.userCvChunks.map((c) => c.content).join("\n\n");
      }
    } catch {}

    const findPattern = (patterns: RegExp[]): { value: string; quote: string } | null => {
      for (const re of patterns) {
        const m = re.exec(sourceText);
        if (m) {
          const val = (m[1] || m[0]).trim();
          const quo = m[0].trim();
          if (val && quo && sourceText.includes(quo) && quo.includes(val)) {
            return { value: val, quote: quo };
          }
        }
      }
      return null;
    };

    const name = findPattern([
      /(?:Name|Nama):\s*([^\n\r]+)/i,
      /^([A-Z\s]{4,40})/m,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/m,
      /\b([A-Z][a-zA-Z'./-]+(?:\s+(?:A\/L|A\/P|bin|binti|[A-Z][a-zA-Z'./-]+)){1,4})\b/,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/,
    ]);
    const currentRole = findPattern([
      /(?:Current role|Position|Title|Jawatan):\s*([^\n\r]+)/i,
      /\b((?:Senior\s+|Junior\s+|Lead\s+)?(?:Machine\s+Learning\s+Engineer|ML\s+Engineer|Data\s+Analyst|Software\s+Engineer|Business\s+Operation\s+Intern|Operations\s+Intern|Project\s+Manager|Machine\s+Operator|Executive|Consultant|Intern(?:ship)?|Officer|Coordinator|Technician))\b/i,
      /\b(Bachelor(?:\s+of|\s+in)\s+[^\n\r,]+|Diploma(?:\s+in)?\s+[^\n\r,]+|Degree(?:\s+in)?\s+[^\n\r,]+)\b/i,
    ]);
    const organization = findPattern([
      /(?:Organization|Company|Organisasi|Majikan|Institution|Institusi):\s*([^\n\r]+)/i,
      /\b(Inari\s+Amertron\s+Berhad|Inari\s+Amertron|SINE\s+DORBY|Sample\s+Research\s+Lab|Tech\s+Solutions|Petronas|Intel|Universiti\s+Teknologi\s+Malaysia|Universiti\s+[^\n\r,]+)\b/i,
    ]);
    const education = findPattern([
      /(?:Education|Pendidikan):\s*([^\n\r]+)/i,
      /\b((?:Master|Bachelor|Diploma|Doctorate|SPM|Degree)\s+(?:of|in)?\s+[^\n\r,]+)/i,
      /\b(Universiti\s+[^\n\r,]+|Monash\s+University|Multimedia\s+University)/i,
    ]);
    const experience = findPattern([
      /(?:Experience|Pengalaman):\s*([^\n\r]+)/i,
      /(Led cross-functional deployment[^\n\r.]+)/i,
      /(Prepared monthly reports[^\n\r.]+)/i,
      /(Gained experience in[^\n\r.]+)/i,
    ]);

    return JSON.stringify({
      name,
      currentRole,
      organization,
      education,
      experience,
    });
  }

  // 3. Enterprise Company Future Analysis (Trilingual JSON)
  if (
    system.includes("what is changing") ||
    system.includes("team learning priorities") ||
    system.includes("company KPIs")
  ) {
    return JSON.stringify({
      en: "### What is changing\nAverage observed team AI task exposure is currently 38%. Under an illustrative 3-year scenario, task overlap compounds to approximately 47%. AI tools assist routine documentation and analysis tasks without eliminating roles.\n\n### Team learning priorities\nPrioritise closing critical team skill gaps:\n- Combine domain experience with practical AI workflow tools.\n- Focus on hands-on practice over theory.\n- Support cross-team skill sharing.\n\n### 3 Proposed company KPIs\n- **Target 1 (6 Months)**: 75% module completion rate across enrolled pathways.\n- **Target 2 (12 Months)**: Reduce average individual skill gaps from 2.5 to under 1.0.\n- **Target 3 (Quarterly)**: Each active member completes a 10-minute micro-learning task monthly.\n\n### Limitations & next review\nIllustrative planning model based on O*NET benchmarks. Next formal review in 6 months.",
      ms: "### Perubahan yang berlaku\nPendedahan tugasan AI yang diperhatikan bagi pasukan kini berada pada purata 38%. Mengikut senario ilustrasi 3 tahun, pertindihan tugasan diunjurkan mencecah sekitar 47%. Alatan AI membantu tugasan rutin dan dokumentasi tanpa menghapuskan peranan pekerja.\n\n### Keutamaan pembelajaran pasukan\nUtamakan penyelesaian jurang kemahiran utama pasukan:\n- Gabungkan kepakaran sedia ada dengan alatan aliran kerja AI amali.\n- Tumpukan latihan praktikal berbanding teori semata-mata.\n- Galakkan perkongsian kemahiran silang pasukan.\n\n### 3 Cadangan KPI syarikat boleh diukur\n- **Sasaran 1 (6 Bulan)**: Kadar penyelesaian modul 75% bagi laluan yang didaftarkan.\n- **Sasaran 2 (12 Bulan)**: Kurangkan purata jurang kemahiran individu daripada 2.5 kepada bawah 1.0.\n- **Sasaran 3 (Suku Tahunan)**: Setiap ahli aktif menyelesaikan latihan mikro 10 minit setiap bulan.\n\n### Kekangan & semakan seterusnya\nModel perancangan ilustrasi berpandukan penanda aras O*NET. Semakan seterusnya dalam 6 bulan.",
      zh: "### 正在发生的变化\n当前团队观察到的AI任务重叠度平均为38%。在3年情景下，重叠度预计达到约47%。AI工具协助日常文档和分析任务，并非替代岗位。\n\n### 团队学习重点\n优先弥补团队核心技能差距：\n- 将专业经验与实用AI工作流工具相结合。\n- 侧重于动手实操而非枯燥理论。\n- 促进团队间的跨职能技能共享。\n\n### 3项拟议可衡量公司KPI\n- **目标 1（6个月）**：注册路径模块完成率达到75%。\n- **目标 2（12个月）**：将人均技能差距从2.5项降至1.0项以下。\n- **目标 3（按季度）**：每位在职成员每月完成一次10分钟微学习实践。\n\n### 局限性与下次审查\n基于O*NET基准的规划参考模型。建议6个月后进行正式审查。",
    });
  }

  // 4. Enterprise Company Learning Advisor Chat (Trilingual JSON)
  if (system.includes("Company Learning Advisor")) {
    return JSON.stringify({
      en: "### Recommendations\nBased on your team's profile, focus on practical modules that address your top identified skill gaps. Combine daily tasks with micro-learning to build confidence.\n\n- Prioritise foundational data skills\n- Schedule regular peer check-ins",
      ms: "### Cadangan Pembelajaran\nBerdasarkan profil pasukan anda, tumpukan modul amali bagi merapatkan jurang kemahiran utama. Gabungkan tugasan harian dengan pembelajaran mikro.\n\n- Utamakan kemahiran data asas\n- Adakan semakan berkala sesama rakan sekerja",
      zh: "### 学习建议\n根据团队画像，建议侧重针对核心技能差距的实战模块。将日常工作与微学习相结合以建立信心。\n\n- 优先培养基础数据能力\n- 安排定期的同行交流与进度复盘",
    });
  }

  // 5. Employee Summary (Trilingual JSON)
  if (system.includes("CV strengths") && system.includes("interest mix")) {
    return JSON.stringify({
      en: "### CV strengths\nDemonstrates clear practical experience in operational execution and workflow coordination.\n\n### Interest mix\nHolland profile indicates strong affinity for technical problem solving and systematic processes.\n\n### 10-minute activity\nPractise mapping one repetitive weekly spreadsheet task into an automated template.",
      ms: "### Kekuatan CV\nMenunjukkan pengalaman praktikal yang jelas dalam pelaksanaan operasi dan penyelarasan aliran kerja.\n\n### Corak minat\nProfil Holland menunjukkan kecenderungan kuat terhadap penyelesaian masalah teknikal dan proses sistematik.\n\n### Aktiviti 10 minit\nLatih pemetaan satu tugasan helaian kerja mingguan yang berulang ke dalam templat automatik.",
      zh: "### 简历优势\n在运营执行和工作流协调方面展现出扎实的实操经验。\n\n### 兴趣组合\n霍兰德兴趣画像显示对技术问题解决和系统化流程有极高认同感。\n\n### 10分钟实践活动\n尝试将每周一项重复性的电子表格处理任务映射为自动化模板。",
    });
  }

  // 6. Holland RIASEC explanation
  if (system.includes("Holland") || system.includes("RIASEC") || user.includes("riasec") || user.includes("scores")) {
    return [
      "### Analisis Minat Holland (RIASEC)",
      "",
      "Analisis menunjukkan corak minat yang kuat dalam penyelesaian masalah teknikal dan aplikasi praktikal.",
      "",
      "- **Kekuatan Utama**: Teliti, berorientasikan matlamat, dan berupaya mengintegrasikan maklumat baharu dengan cekap.",
      "- **Cadangan Bidang**: Operasi strategik, analisis proses perniagaan, dan perancangan teknikal.",
      "- **Langkah Seterusnya**: Teruskan dengan modul kemahiran yang dicadangkan bagi mengukuhkan profil anda.",
    ].join("\n");
  }

  return JSON.stringify({ status: "ok" });
}

async function generateChat(tier: Tier, system: string, user: string, images?: ChatImage[], options?: ChatOptions): Promise<ChatResult> {
  const c = cfg(options?.agent);
  if (c.provider === "runpod" && process.env.RUNPOD_ENABLE_GENERATION !== "true") {
    throw new AiNotConnectedError("RunPod is a disabled placeholder during testing. Configure GEMINI_API_KEY.");
  }

  // 1. Mock Testing Engine
  if (c.provider === "mock") {
    return {
      content: mockGenerateChat(system, user, images),
      model: "mock-engine-v1",
      timing: {
        endpointTier: tier,
        modelResolutionMs: 0,
        endpointRequestMs: 2,
        endpointWarmBeforeRequest: true,
        endpointStartupMs: 0,
        readyToResponseMs: 2,
      },
    };
  }

  // 2. Google Gemini (Free API)
  if (c.provider === "gemini") {
    if (!c.geminiKey) throw new AiNotConnectedError("Google Gemini API key not configured. Set GEMINI_API_KEY.");
    const requestStartedAt = performance.now();
    const parts: any[] = [];
    if (images?.length) {
      for (const img of images) {
        parts.push({
          inlineData: {
            mimeType: img.mediaType,
            data: img.base64,
          },
        });
      }
    }
    parts.push({ text: user });

    const isJsonTask = system.includes("JSON") || system.includes("json");
    const candidateModels = Array.from(new Set([
      c.geminiModel,
      ...(process.env.GEMINI_FALLBACK_MODEL ? [process.env.GEMINI_FALLBACK_MODEL] : []),
    ])).slice(0, 2);
    let lastError: Error | null = null;
    let successfulModel = c.geminiModel;
    let content = "";
    const modelErrors: string[] = [];

    for (const model of candidateModels) {
      successfulModel = model;
      let res: Response | null = null;
      {
        try {
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(c.geminiKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: system }],
              },
              contents: [{ parts }],
              generationConfig: {
                temperature: images ? 0.1 : 0.2,
                maxOutputTokens: isJsonTask ? 8192 : 2048,
                ...(isJsonTask ? { responseMimeType: "application/json" } : {}),
              },
            }),
            signal: AbortSignal.timeout(Math.min(90_000, Math.max(1_000, options?.timeoutMs ?? (images ? 25_000 : 20_000)))),
          });
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          modelErrors.push(`${model} (Timeout/Error): ${detail}`);
          lastError = err instanceof Error && ["TimeoutError","AbortError"].includes(err.name)
            ? new AiTimeoutError("The CV model request timed out.")
            : err instanceof Error ? err : new Error(detail);
        }
      }

      if (!res) continue;

      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        modelErrors.push(`${model} (HTTP ${res.status}): ${errTxt}`);
        if (res.status === 429 || res.status === 503 || res.status === 404 || res.status === 500) {
          lastError = new Error(`Gemini candidates failed: ${modelErrors.join(" | ")}`);
          continue;
        }
        throw new Error(`Google Gemini (${model}) request failed with HTTP ${res.status}: ${errTxt}`);
      }

      const json = (await res.json()) as {
        candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
      };
      const partsArray = json.candidates?.[0]?.content?.parts ?? [];
      if (json.candidates?.[0]?.finishReason === "MAX_TOKENS") throw new Error("Gemini output was truncated; reduce CV pages per request.");
      content = partsArray.filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
      if (content) {
        lastError = null;
        break;
      }
    }

    if (!content) {
      throw lastError || new Error("Google Gemini returned an empty response.");
    }
    const endpointRequestMs = Math.round(performance.now() - requestStartedAt);
    return {
      content,
      model: successfulModel,
      timing: {
        endpointTier: tier,
        modelResolutionMs: 1,
        endpointRequestMs,
        endpointWarmBeforeRequest: true,
        endpointStartupMs: 0,
        readyToResponseMs: endpointRequestMs,
      },
    };
  }


  // 4. RunPod Serverless (vLLM)
  if (!c.apiKey || !c.mainId) throw new AiNotConnectedError("AI engine not connected");
  const useLight = tier === "light" && !!c.lightId;
  const endpoint = useLight ? c.lightId! : c.mainId;
  const modelResolutionStartedAt = performance.now();
  const model = await resolveModel(endpoint, useLight ? c.lightModel : c.mainModel, c.apiKey);
  const modelResolutionMs = Math.round(performance.now() - modelResolutionStartedAt);
  const requestStartedAt = performance.now();
  let requestSettled = false;
  let markRequestSettled!: () => void;
  const requestSettledPromise = new Promise<void>((resolve) => { markRequestSettled = resolve; });
  const readinessProbe = options?.measureEndpointStartup
    ? readyWorkerCount(endpoint, c.apiKey)
    : Promise.resolve(null);
  const startupMeasurement = (async () => {
    const initialReadyWorkers = await readinessProbe;
    if (initialReadyWorkers === 0 && !requestSettled) {
      return waitForEndpointStartup(endpoint, c.apiKey!, requestStartedAt, () => requestSettled);
    }
    return initialReadyWorkers === null ? null : 0;
  })();
  let res: Response;
  try {
    res = await fetch(`https://api.runpod.ai/v2/${endpoint}/openai/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: images ? 0.1 : 0.3,
        max_tokens: images ? 6000 : 3500,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: images
              ? [
                  { type: "text", text: user },
                  ...images.map((image) => ({
                    type: "image_url" as const,
                    image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
                  })),
                ]
              : user,
          },
        ],
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(75_000),
    });
    requestSettled = true;
    markRequestSettled();
  } catch (err) {
    requestSettled = true;
    markRequestSettled();
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) throw new AiTimeoutError("RunPod request timed out");
    throw err;
  }
  if (!res.ok) {
    if (images && [400, 415, 422].includes(res.status)) {
      throw new AiVisionUnsupportedError("The configured RunPod model rejected multimodal image input.");
    }
    throw new Error(`RunPod request failed with HTTP ${res.status}.`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  requestSettled = true;
  markRequestSettled();
  const content = (json.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!content) throw new Error("RunPod returned an empty response");
  const endpointRequestMs = Math.round(performance.now() - requestStartedAt);
  const [initialReadyWorkers, endpointStartupMs] = await Promise.all([
    Promise.race([readinessProbe, requestSettledPromise.then(() => null)]),
    Promise.race([startupMeasurement, requestSettledPromise.then(() => null)]),
  ]);
  return {
    content,
    model,
    timing: {
      endpointTier: tier,
      modelResolutionMs,
      endpointRequestMs,
      endpointWarmBeforeRequest: initialReadyWorkers === null ? null : initialReadyWorkers > 0,
      endpointStartupMs,
      readyToResponseMs: endpointStartupMs === null ? null : Math.max(0, endpointRequestMs - endpointStartupMs),
    },
  };
}

export type EndpointHealth = {
  status: "ok" | "error" | "not_configured";
  detail: string | null;
  error: string | null;
};

/** Provider readiness and model verification probes (no GPU generation cost). */
export async function endpointHealth(tier: Tier, provider?: AiProvider): Promise<EndpointHealth> {
  const c = cfg();
  if (provider) c.provider = provider;
  if (c.provider === "runpod" && process.env.RUNPOD_ENABLE_GENERATION !== "true") {
    return { status: "not_configured", detail: "RunPod placeholder: worker probes and generation disabled during Gemini-only testing.", error: null };
  }
  if (c.provider === "mock") {
    return { status: "ok", detail: "Mock Testing Engine (local deterministic mode)", error: null };
  }

  if (c.provider === "gemini") {
    if (!c.geminiKey) return { status: "not_configured", detail: null, error: null };
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(c.geminiKey)}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return { status: "error", detail: null, error: `Gemini API returned HTTP ${res.status}.` };
      return { status: "ok", detail: `Google Gemini Free API (model=${c.geminiModel})`, error: null };
    } catch {
      return { status: "error", detail: null, error: "Google Gemini API connection timed out or failed." };
    }
  }


  // RunPod
  const id = tier === "main" ? c.mainId : c.lightId;
  if (!c.apiKey || !id) return { status: "not_configured", detail: null, error: null };
  const expectedModel = tier === "main" ? c.mainModel : c.lightModel;
  try {
    const headers = { Authorization: `Bearer ${c.apiKey}` };
    const [healthResult, modelsResult] = await Promise.allSettled([
      fetch(`https://api.runpod.ai/v2/${id}/health`, { headers, signal: AbortSignal.timeout(15_000) }),
      fetch(`https://api.runpod.ai/v2/${id}/openai/v1/models`, { headers, signal: AbortSignal.timeout(15_000) }),
    ]);
    servedModel.delete(id);
    if (healthResult.status === "rejected") {
      const timedOut = healthResult.reason instanceof Error && (healthResult.reason.name === "TimeoutError" || healthResult.reason.name === "AbortError");
      return { status: "error", detail: null, error: `RunPod health probe ${timedOut ? "timed out" : "failed"}.` };
    }
    const healthRes = healthResult.value;
    if (!healthRes.ok) return { status: "error", detail: null, error: `Health probe returned HTTP ${healthRes.status}.` };
    const j = (await healthRes.json()) as { workers?: Record<string, number>; jobs?: Record<string, number> };
    const w = j.workers ?? {};
    const workerDetail = `workers ready=${w["ready"] ?? 0}, running=${w["running"] ?? 0}, idle=${w["idle"] ?? 0}, initializing=${w["initializing"] ?? 0}; jobs queued=${j.jobs?.["inQueue"] ?? 0}`;
    if (modelsResult.status === "rejected") {
      const timedOut = modelsResult.reason instanceof Error && (modelsResult.reason.name === "TimeoutError" || modelsResult.reason.name === "AbortError");
      return { status: "error", detail: workerDetail, error: `RunPod model probe ${timedOut ? "timed out" : "failed"}; served model is unverified.` };
    }
    const modelsRes = modelsResult.value;
    if (!modelsRes.ok) return { status: "error", detail: workerDetail, error: `Model probe returned HTTP ${modelsRes.status}.` };
    const models = (await modelsRes.json()) as { data?: { id: string }[] };
    const servedModels = models.data?.map((model) => model.id) ?? [];
    const modelId = servedModels.find((model) => model.toLowerCase() === expectedModel.toLowerCase());
    if (!modelId) {
      servedModel.delete(id);
      return {
        status: "error",
        detail: servedModels.length ? `served models=${servedModels.join(", ")}` : null,
        error: servedModels.length
          ? `Configured model "${expectedModel}" does not match any served model.`
          : "The endpoint did not advertise a served model.",
      };
    }
    servedModel.set(id, modelId);
    const detail = `model=${modelId}; ${workerDetail}`;
    return { status: "ok", detail, error: null };
  } catch (err) {
    const error = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
      ? "RunPod health or model response timed out."
      : "RunPod health or model response failed.";
    return { status: "error", detail: null, error };
  }
}
