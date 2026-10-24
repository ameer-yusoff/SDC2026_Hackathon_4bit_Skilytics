export type RoutedAgent =
  | "cv"
  | "holland"
  | "profiler"
  | "fitter"
  | "planner"
  | "sdg"
  | "analyst"
  | "company_advisor";
export function agentRoute(agent: RoutedAgent) {
  if (process.env.AI_PROVIDER) {
    return {
      agent,
      provider: process.env.AI_PROVIDER as any,
      tier: (["holland", "sdg", "cv"].includes(agent) ? "light" : "main") as
        "main" | "light",
    };
  }
  const runpod = [
    "holland",
    "fitter",
    "planner",
    "sdg",
    "analyst",
    "company_advisor",
  ].includes(agent);
  const hybrid =
    process.env.AI_AGENT_ROUTING === "hybrid" &&
    process.env.RUNPOD_ENABLE_GENERATION === "true";
  const provider =
    (hybrid && runpod) ||
    (!process.env.GEMINI_API_KEY &&
      process.env.RUNPOD_API_KEY &&
      process.env.RUNPOD_ENABLE_GENERATION === "true")
      ? "runpod"
      : "gemini";
  return {
    agent,
    provider,
    tier: (["holland", "sdg", "cv"].includes(agent) ? "light" : "main") as
      "main" | "light",
  };
}
export const ROUTED_AGENTS: readonly RoutedAgent[] = [
  "cv",
  "holland",
  "profiler",
  "fitter",
  "planner",
  "sdg",
  "analyst",
  "company_advisor",
];
export function agentRoutes() {
  return ROUTED_AGENTS.map((agent) => {
    const route = agentRoute(agent);
    const provider =
      process.env.AI_TEST_MODE === "true"
        ? "mock"
        : (route.provider ??
          process.env.AI_PROVIDER ??
          (process.env.GEMINI_API_KEY ? "gemini" : "runpod"));
    const light =
      route.tier === "light" && !!process.env.RUNPOD_LIGHT_ENDPOINT_ID;
    return {
      ...route,
      provider,
      runpodPlaceholder: process.env.RUNPOD_ENABLE_GENERATION !== "true",
      model:
        provider === "mock"
          ? "mock-engine-v1"
          : provider === "gemini"
            ? (agent === "cv" ? process.env.GEMINI_CV_MODEL : undefined) ||
              process.env.GEMINI_MODEL ||
              "gemini-3.1-flash-lite"
            : light
              ? process.env.RUNPOD_LIGHT_MODEL || "qwen/qwen3.5-9b"
              : process.env.RUNPOD_LLM_MODEL || "qwen/qwen3.5-27b",
      configured:
        provider === "mock"
          ? true
          : provider === "gemini"
            ? !!process.env.GEMINI_API_KEY
            : !!process.env.RUNPOD_API_KEY &&
              !!process.env.RUNPOD_LLM_ENDPOINT_ID,
    };
  });
}
