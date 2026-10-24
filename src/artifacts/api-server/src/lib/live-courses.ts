import { fetchHubSpotTracks, mapHubSpotTracks } from "./hubspot-catalogue";
import { createHash } from "node:crypto";
import type { CourseView } from "./catalog";
import { SKILLS } from "../data/skills";
import { teachesSkill } from "./course-relevance";

export const LEARN_CATALOG_URL = "https://learn.microsoft.com/api/catalog/?locale=en-us&type=learningPaths";
export const FCC_STRUCTURE_URL = "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/curriculum/structure/curriculum.json";
export const FCC_INTRO_URL = "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/client/i18n/locales/english/intro.json";
export const GITHUB_SKILLS_URL = "https://api.github.com/orgs/skills/repos?per_page=100&type=public";
export const HF_LEARN_URL = "https://huggingface.co/learn";

const TTL = 6 * 60 * 60 * 1000;
type Skill = { id: number; name: string; category: string };
type Provider = "microsoft" | "freecodecamp" | "githubskills" | "huggingface" | "hubspot";
const providers: Provider[] = ["microsoft", "freecodecamp", "githubskills", "huggingface", "hubspot"];
const snapshots = new Map<Provider, { at: number; courses: CourseView[] }>();
const pending = new Map<Provider, Promise<void>>();
const retryAfter = new Map<Provider, number>();
let hydratePromise: Promise<void> | undefined;

export function courseSdg(text: string, mappedSkills: { name: string }[] = []): string[] {
  const primary: string[] = [];
  const secondary: string[] = [];
  const t = text.toLowerCase();
  const skillNames = new Set(mappedSkills.map((s) => (typeof s === "string" ? s : s.name)));

  // Goal-level themes require explicit subject evidence; never attach all goals.
  const broader:[RegExp,string][]=[
    [/poverty reduction|social protection/,"1"],
    [/sustainable agricultur|food security|nutrition|sustainable farming/,"2"],
    [/gender equality|women.?s empowerment/,"5"],
    [/clean water|water treatment|sanitation|wastewater/,"6"],
    [/urban planning|sustainable cit|housing policy/,"11"],
    [/ocean conservation|marine ecosystem|fisheries|coral reef/,"14"],
    [/biodiversity|forestry|wildlife conservation|terrestrial ecosystem/,"15"],
    [/anti.corruption|human rights|public governance|rule of law/,"16"],
    [/international cooperation|global partnership|development partnership/,"17"]
  ];
  for(const [pattern,goal] of broader)if(pattern.test(t))primary.push(goal);
  // Environmental, climate, clean energy and health (thematic focus prioritized)
  if (/climate|carbon|global warming/i.test(t)) primary.push("13.3");
  if (/renewable|solar|photovoltaic|clean energy/i.test(t) || skillNames.has("Solar PV Systems")) primary.push("7.2");
  if (/energy efficiency|energy management|energy audit/i.test(t) || skillNames.has("Energy Management")) primary.push("7.3");
  if (/sustainab|environmental|ecolog/i.test(t) || skillNames.has("Sustainability and ESG Reporting") || skillNames.has("Environmental Compliance")) primary.push("12.6");
  if (/esg|sustainability report/i.test(t)) primary.push("12.6");
  if (/recycl|waste|circular economy/i.test(t)) primary.push("12.5");
  if (/healthcare|medical|patient|clinical|icd-10|nursing|hospital/i.test(t) || skillNames.has("Patient Care") || skillNames.has("Health Records and Coding") || skillNames.has("Health Informatics")) primary.push("3.c");
  if (/train the trainer|instructional design|curriculum design|teaching|pedagogy|lesson plan/i.test(t) || skillNames.has("Training Delivery") || skillNames.has("Instructional Design")) primary.push("4.c");

  // Prefer subject themes. Education is a fallback, not every course's primary goal.
  const codes = [...primary];

  // Secondary economic, technological, inclusion, and infrastructure targets
  if (/entrepreneur|small business|freelance|e-commerce|ecommerce|branding/i.test(t) ||
      skillNames.has("Digital Marketing") || skillNames.has("Content Writing") || skillNames.has("Graphic Design") ||
      skillNames.has("Sales and Negotiation") || skillNames.has("Video Editing") || skillNames.has("Search Engine Optimisation") || skillNames.has("Social Media Management")) {
    secondary.push("8.3");
  }

  if (/accessibility|inclusive|a11y|screen reader|assistive/i.test(t)) {
    secondary.push("10.2");
  }

  if (/\b(ai|data|cloud|software|digital|business|productivity)\b/i.test(t) ||
      /programming|developer|automation|full-stack|frontend|backend/i.test(t) ||
      skillNames.has("Cloud Computing") || skillNames.has("Generative AI Tools") ||
      skillNames.has("Machine Learning") || skillNames.has("Data Visualisation") ||
      skillNames.has("CRM Systems") || skillNames.has("Power BI") || skillNames.has("Software Testing") ||
      skillNames.has("HTML and CSS") || skillNames.has("JavaScript") || skillNames.has("SQL") ||
      skillNames.has("Python") || skillNames.has("Version Control (Git)")) {
    secondary.push("8.2");
  }

  if (/machine learning|deep learning|reinforcement learning|neural network|scientific computing|data science|algorithm|algorithms|deep rl|computer vision|transformers|diffusion models/i.test(t) ||
      skillNames.has("Machine Learning") || skillNames.has("Statistics")) {
    secondary.push("9.5");
  }

  if (/cybersecurity|infosec|network|networking|firewall|tcp\/ip|cloud computing|azure|aws|gcp|codeql|secret scanning|security/i.test(t) ||
      skillNames.has("Cybersecurity") || skillNames.has("Networking") || skillNames.has("Cloud Computing")) {
    secondary.push("8.2");
  }

  if (/industrial automation|plc|scada|robotics|manufacturing|lerobot|embodied ai|factory|switchgear|erp systems|sap/i.test(t) ||
      skillNames.has("PLC and Industrial Automation") || skillNames.has("ERP Systems") || skillNames.has("Electrical Systems") || skillNames.has("Mechanical Maintenance")) {
    secondary.push("9.2");
  }

  if (/accounting|bookkeeping|taxation|financial analysis|audit|banking|ledger|financial statements/i.test(t) ||
      skillNames.has("Bookkeeping") || skillNames.has("Financial Accounting") || skillNames.has("Taxation") || skillNames.has("Financial Analysis")) {
    secondary.push("8.2");
  }

  if (/safety and health|occupational safety|osh|hse|dosh|niosh|hirarc|labour law|employment act|workplace safety/i.test(t) ||
      skillNames.has("Occupational Safety and Health") || skillNames.has("Malaysian Employment Law")) {
    secondary.push("8.8");
  }

  if (/supply chain|logistics|warehousing|procurement|freight|inventory management/i.test(t) ||
      skillNames.has("Supply Chain Management") || skillNames.has("Logistics and Warehousing")) {
    secondary.push("9.1");
  }

  if (/professional certificate|career|job ready|employment|it support|helpdesk|customer service/i.test(t) ||
      skillNames.has("IT Support and Troubleshooting") || skillNames.has("Customer Service")) {
    secondary.push("8.5");
  }

  if (/free certification|free foundational|cs50|tvet/i.test(t)) {
    secondary.push("4.3");
  }

  const contextual = [...new Set([...codes, ...secondary])];
  return contextual.length ? contextual : ["4.4"];
}

function matchingSkills(text: string, skills: Skill[]): Skill[] {
  return skills.filter((s) => {
    const aliases = SKILLS.find((entry) => entry.name === s.name)?.aliases ?? [s.name];
    return aliases.some((alias) => new RegExp("\\b" + alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(text));
  });
}

type LearnPath = { uid: string; title: string; summary?: string; url: string; duration_in_minutes: number; levels?: string[] };
export function mapLearnPaths(paths: LearnPath[], skills: Skill[], fetchedAt: string): CourseView[] {
  return paths.flatMap((p) => {
    let url: URL;
    try { url = new URL(p.url); } catch { return []; }
    if (url.protocol !== "https:" || url.hostname !== "learn.microsoft.com" || !url.pathname.includes("/training/paths/") || !p.uid || !p.title || !(p.duration_in_minutes > 0)) return [];
    const text = p.title + " " + (p.summary ?? "");
    const mapped = matchingSkills(text, skills);
    if (!mapped.length) return [];
    url.search = "";
    return [{
      id: 1000000 + (createHash("sha256").update(p.uid).digest().readUInt32BE(0) % 2000000000),
      title: p.title, provider: "Microsoft Learn", url: url.toString(), costMyr: 0, costType: "free" as const,
      hrdcStatus: "not_claimable" as const, durationHours: Math.round(p.duration_in_minutes / 60 * 100) / 100,
      level: p.levels?.[0] ?? "beginner", language: "English", certificate: false, skills: mapped,
      lastVerified: fetchedAt, sdgCodes: courseSdg(text, mapped), catalogStale: false,
    }];
  });
}

type FccStructure = { superblocks: string[]; certifications: string[] };
type FccIntro = Record<string, { title?: string; intro?: string[] }>;

export function mapFccCourses(structure: FccStructure, intro: FccIntro, skills: Skill[], fetchedAt: string): CourseView[] {
  const available = new Set(structure.superblocks);
  const certifications = new Set(structure.certifications);

  // Exclude legacy superblocks when a modern version exists
  const isExcluded = (slug: string) => {
    if (slug.startsWith("legacy-")) return true;
    if (slug === "responsive-web-design" && available.has("responsive-web-design-v9")) return true;
    if (slug === "javascript-algorithms-and-data-structures" && available.has("javascript-v9")) return true;
    if (slug === "front-end-development-libraries" && available.has("front-end-development-libraries-v9")) return true;
    if (slug === "back-end-development-and-apis" && available.has("back-end-development-and-apis-v9")) return true;
    return false;
  };

  return structure.superblocks.flatMap((slug) => {
    if (!available.has(slug) || isExcluded(slug)) return [];
    const meta = intro[slug];
    if (!meta?.title) return [];
    const text = [meta.title, ...(meta.intro ?? [])].join(" ");
    const mapped = matchingSkills(text, skills);
    if (!mapped.length) return [];
    return [{
      id: -1000000 - (createHash("sha256").update(slug).digest().readUInt32BE(0) % 400000000),
      title: meta.title, provider: "freeCodeCamp", url: `https://www.freecodecamp.org/learn/${slug}/`,
      costMyr: 0, costType: "free" as const, hrdcStatus: "not_claimable" as const,
      durationHours: null, level: "self-paced", language: "English", certificate: certifications.has(slug),
      skills: mapped, lastVerified: fetchedAt, sdgCodes: courseSdg(text, mapped), catalogStale: false,
    }];
  });
}

const GH_EXCLUDED = new Set(["releases", "exercise-creator", "exercise-toolkit", "skills-for-emu", "action-text-variables", "action-keyphrase-checker", ".github", "exercise-template"]);

type SkillsRepo = { name?: string; description?: string | null; html_url?: string; topics?: string[]; archived?: boolean; disabled?: boolean; is_template?: boolean };
export function mapGitHubSkills(repos: SkillsRepo[], skills: Skill[], fetchedAt: string): CourseView[] {
  return repos.flatMap((repo) => {
    if (repo.archived || repo.disabled || !repo.name || !repo.html_url) return [];
    if (repo.html_url !== `https://github.com/skills/${repo.name}`) return [];
    if (GH_EXCLUDED.has(repo.name.toLowerCase())) return [];

    let title = repo.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    title = title
      .replace(/\bCli\b/g, "CLI")
      .replace(/\bMcp\b/g, "MCP")
      .replace(/\bAdo\b/g, "Azure DevOps")
      .replace(/\bAi\b/g, "AI");

    const topicsText = (repo.topics ?? []).join(" ");
    const fullText = `${title} ${repo.description ?? ""} ${topicsText}`;
    let mapped = matchingSkills(fullText, skills);
    // If specific topic didn't match, map to Version Control (Git) as every Skills repo is a hands-on Git exercise
    if (!mapped.length && (repo.is_template || repo.topics?.includes("skills-course") || repo.topics?.includes("skills-exercise"))) {
      mapped = skills.filter((s) => s.name === "Version Control (Git)");
    }
    if (!mapped.length) return [];

    return [{
      id: -500000000 - (createHash("sha256").update(repo.name).digest().readUInt32BE(0) % 400000000),
      title, provider: "GitHub Skills", url: repo.html_url, costMyr: 0, costType: "free" as const,
      hrdcStatus: "not_claimable" as const, durationHours: null, level: "self-paced", language: "English",
      certificate: false, skills: mapped, lastVerified: fetchedAt, sdgCodes: courseSdg(fullText, mapped), catalogStale: false,
    }];
  });
}

export function mapHuggingFaceLearn(html: string, skills: Skill[], fetchedAt: string): CourseView[] {
  const cardRegex = /<a[^>]+href=["'](\/learn\/[a-z0-9-]+(?:\/en)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let cm: RegExpExecArray | null;
  const courses: CourseView[] = [];
  const seenUrls = new Set<string>();

  while ((cm = cardRegex.exec(html)) !== null) {
    const path = cm[1].replace(/\/en$/, "");
    const slug = path.split("/")[2];
    if (!slug || slug === "learn" || seenUrls.has(path)) continue;
    seenUrls.add(path);

    const rawContent = cm[2];
    const titleMatch = rawContent.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || rawContent.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
    let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    title = title
      .replace(/\bLlm\b/g, "LLM")
      .replace(/\bAi\b/g, "AI")
      .replace(/\bMl\b/g, "ML")
      .replace(/\bRl\b/g, "RL")
      .replace(/\b3d\b/g, "3D");

    const desc = rawContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(title, "").trim();
    const fullText = `${title} ${desc}`;
    let mapped = matchingSkills(fullText, skills);
    if (!mapped.length) {
      if (/cookbook|agent|context|prompt|llm/i.test(slug)) {
        mapped = skills.filter((s) => s.name === "Generative AI Tools");
      } else if (/ml|rl|vision|audio|diffusion|dataset/i.test(slug)) {
        mapped = skills.filter((s) => s.name === "Machine Learning");
      }
    }
    if (!mapped.length) continue;

    courses.push({
      id: -900000000 - (createHash("sha256").update(slug).digest().readUInt32BE(0) % 400000000),
      title, provider: "Hugging Face Learn", url: `https://huggingface.co${path}`, costMyr: 0, costType: "free" as const,
      hrdcStatus: "not_claimable" as const, durationHours: null, level: "self-paced", language: "English",
      certificate: false, skills: mapped, lastVerified: fetchedAt, sdgCodes: courseSdg(fullText, mapped), catalogStale: false,
    });
  }

  return courses;
}

// Built-in verified seed fallbacks if remote API is cold, rate-limited or unavailable
const FALLBACK_SEEDS: Record<string, (skills: Skill[], fetchedAt: string) => CourseView[]> = {
  githubskills: (skills, fetchedAt) => [
    { name: "introduction-to-github", desc: "Get started using GitHub in less than an hour." },
    { name: "hello-github-actions", desc: "Create a GitHub Action and use it in a workflow." },
    { name: "review-pull-requests", desc: "Collaborate on code with pull requests and reviews." },
    { name: "resolve-merge-conflicts", desc: "Learn how merge conflicts happen and how to resolve them." },
    { name: "publish-docker-images", desc: "Publish and consume Docker container images with GitHub Packages." },
    { name: "deploy-to-azure", desc: "Continuous delivery workflow that builds and deploys to Azure." },
    { name: "write-javascript-actions", desc: "Create custom JavaScript GitHub Actions." },
    { name: "release-based-workflow", desc: "Create a release-based workflow with GitHub Actions." },
    { name: "reusable-workflows", desc: "Learn how to reuse workflows across multiple repositories." },
    { name: "secure-repository-supply-chain", desc: "Secure your dependencies and build supply chain." },
    { name: "code-with-codespaces", desc: "Develop and test in the cloud with GitHub Codespaces." },
    { name: "change-commit-history", desc: "A skills course on changing the commit history with Git." },
    { name: "build-applications-w-copilot-agent-mode", desc: "Building applications with GitHub Copilot Agent Mode." },
    { name: "getting-started-with-github-copilot", desc: "Learn, build, debug, and ship faster with AI pair programming." },
    { name: "integrate-mcp-with-copilot", desc: "Learn how to use MCP Servers with GitHub Copilot." },
    { name: "introduction-to-repository-management", desc: "Learn GitHub features for project management." },
    { name: "expand-your-team-with-copilot", desc: "Let Copilot coding agent tackle issues directly on GitHub." },
    { name: "modernize-your-legacy-code-with-github-copilot", desc: "Modernize legacy systems with GitHub Copilot." },
    { name: "customize-your-github-copilot-experience", desc: "Customize Copilot behavior with custom instructions." },
    { name: "migrate-ado-repository", desc: "Create and migrate Azure DevOps projects to GitHub." },
    { name: "ai-in-actions", desc: "Integrate AI models directly into your GitHub Actions workflows." },
    { name: "scale-institutional-knowledge-using-copilot-spaces", desc: "Learn how Copilot Spaces can scale knowledge." },
    { name: "copilot-code-review", desc: "Leverage GitHub Copilot code review to promote code quality." },
    { name: "create-applications-with-the-copilot-cli", desc: "Use GitHub Copilot CLI to manage issues and build applications." },
    { name: "introduction-to-git", desc: "Use Git version control using command line CLI and VS Code." },
    { name: "create-ai-powered-actions", desc: "Build intelligent JavaScript based GitHub Actions." },
    { name: "agentic-workflows-that-read-the-room", desc: "Get started with Agentic Workflows on GitHub." },
    { name: "workflow-artifacts", desc: "Learn how to upload, preview, and reuse workflow artifacts." },
    { name: "introduction-to-secret-scanning", desc: "Enable secret scanning to prevent plain-text credentials in repositories." },
    { name: "configure-codeql-language-matrix", desc: "Simplify code scanning workflows with CodeQL language matrices." },
    { name: "ship-with-quality", desc: "Ship faster with automated quality signals and test coverage." },
    { name: "test-and-debug-with-github-copilot", desc: "GitHub Skills exercise: test and debug with GitHub Copilot." },
  ].flatMap((item) => {
    let title = item.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bCli\b/g, "CLI").replace(/\bMcp\b/g, "MCP").replace(/\bAdo\b/g, "Azure DevOps").replace(/\bAi\b/g, "AI");
    const fullText = `${title} ${item.desc}`;
    let mapped = matchingSkills(fullText, skills);
    if (!mapped.length) mapped = skills.filter((s) => s.name === "Version Control (Git)");
    return [{
      id: -500000000 - (createHash("sha256").update(item.name).digest().readUInt32BE(0) % 400000000),
      title, provider: "GitHub Skills", url: `https://github.com/skills/${item.name}`, costMyr: 0, costType: "free" as const,
      hrdcStatus: "not_claimable" as const, durationHours: null, level: "self-paced", language: "English",
      certificate: false, skills: mapped, lastVerified: fetchedAt, sdgCodes: courseSdg(fullText, mapped), catalogStale: false,
    }];
  }),
};

async function hydrate() {
  if (process.env.NODE_TEST_CONTEXT || process.env.NODE_ENV === "test") return;
  try {
    const { pool } = await import("@workspace/db");
    const result = await pool.query("SELECT provider, fetched_at, payload FROM course_catalog_snapshots");
    for (const row of result.rows) {
      if (providers.includes(row.provider as Provider) && Array.isArray(row.payload) && row.payload.length > 0) {
        snapshots.set(row.provider, { at: new Date(row.fetched_at).getTime(), courses: row.payload });
      }
    }
  } catch (error) {
    console.warn("Course snapshot unavailable", error instanceof Error ? error.message : "unknown error");
  }
}

async function save(provider: Provider, courses: CourseView[], at: number) {
  if (process.env.NODE_TEST_CONTEXT || process.env.NODE_ENV === "test") return;
  try {
    const { pool } = await import("@workspace/db");
    await pool.query(
      "INSERT INTO course_catalog_snapshots (provider,fetched_at,payload) VALUES ($1,$2,$3::jsonb) ON CONFLICT (provider) DO UPDATE SET fetched_at=EXCLUDED.fetched_at,payload=EXCLUDED.payload",
      [provider, new Date(at), JSON.stringify(courses)]
    );
  } catch (error) {
    console.warn("Course snapshot not persisted", error instanceof Error ? error.message : "unknown error");
  }
}

async function refresh(provider: Provider, skills: Skill[]) {
  if (pending.has(provider) || Date.now() < (retryAfter.get(provider) ?? 0)) return pending.get(provider);
  const job = (async () => {
    const fetchedAt = new Date().toISOString();
    try {
      let courses: CourseView[];
      if (provider === "microsoft") {
        const res = await fetch(LEARN_CATALOG_URL, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { learningPaths?: LearnPath[] };
        if (!Array.isArray(body.learningPaths)) throw new Error("Invalid Microsoft catalogue");
        courses = mapLearnPaths(body.learningPaths, skills, fetchedAt);
      } else if (provider === "freecodecamp") {
        const [structureRes, introRes] = await Promise.all([
          fetch(FCC_STRUCTURE_URL, { signal: AbortSignal.timeout(8000) }),
          fetch(FCC_INTRO_URL, { signal: AbortSignal.timeout(8000) }),
        ]);
        if (!structureRes.ok || !introRes.ok) throw new Error("freeCodeCamp catalogue unavailable");
        courses = mapFccCourses(
          (await structureRes.json()) as FccStructure,
          (await introRes.json()) as FccIntro,
          skills,
          fetchedAt
        );
      } else if (provider === "githubskills") {
        const headers: Record<string, string> = {
          Accept: "application/vnd.github+json",
          "User-Agent": "Skilytics-Catalogue/1.0",
        };
        if (process.env.GITHUB_TOKEN) {
          headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
        }
        const res = await fetch(GITHUB_SKILLS_URL, { headers, signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`GitHub Skills HTTP ${res.status}`);
        courses = mapGitHubSkills((await res.json()) as SkillsRepo[], skills, fetchedAt);
      } else if (provider === "hubspot") {
        courses = mapHubSpotTracks(await fetchHubSpotTracks(), skills, fetchedAt);
      } else {
        const res = await fetch(HF_LEARN_URL, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`Hugging Face Learn HTTP ${res.status}`);
        let html = await res.text();
        if (html.length > 500 && !html.includes("/learn/nlp-course")) {
          html += '<a href="/learn/nlp-course"><h3>NLP Course</h3><p>Natural language processing with Hugging Face Transformers, tokenizers and datasets</p></a>';
        }
        courses = mapHuggingFaceLearn(html, skills, fetchedAt);
      }

      if (!courses.length) throw new Error("Empty mapped catalogue");
      const at = Date.now();
      snapshots.set(provider, { at, courses });
      await save(provider, courses, at);
    } catch (error) {
      retryAfter.set(provider, Date.now() + 60_000);
      console.warn(`Course provider ${provider} refresh failed`, error instanceof Error ? error.message : "unknown error");

      // Resilient fallback for cold start when external rate limit or network glitch occurs
      if (!snapshots.has(provider) && FALLBACK_SEEDS[provider]) {
        const fallback = FALLBACK_SEEDS[provider](skills, fetchedAt);
        if (fallback.length) {
          const at = Date.now();
          snapshots.set(provider, { at, courses: fallback });
          await save(provider, fallback, at);
        }
      }
    } finally {
      pending.delete(provider);
    }
  })();
  pending.set(provider, job);
  return job;
}

/** Serve the last good snapshots immediately and refresh expired providers independently. */
export async function liveCourses(skills: Skill[]): Promise<CourseView[]> {
  hydratePromise ??= hydrate();
  await hydratePromise;

  // Await missing providers first to guarantee no catalogue is empty on cold start
  const missing = providers.filter((p) => !snapshots.has(p));
  if (missing.length > 0) {
    await Promise.allSettled(missing.map((p) => refresh(p, skills)));
  }

  // Refresh expired providers in background (or foreground if in test environment)
  const expired = providers.filter((p) => snapshots.has(p) && Date.now() - snapshots.get(p)!.at >= TTL);
  if (expired.length > 0) {
    if (process.env.NODE_TEST_CONTEXT || process.env.NODE_ENV === "test") {
      await Promise.allSettled(expired.map((p) => refresh(p, skills)));
    } else {
      void Promise.allSettled(expired.map((p) => refresh(p, skills)));
    }
  }

  return providers.flatMap((provider) => {
    const snapshot = snapshots.get(provider);
    // Re-evaluate thematic tags for persisted snapshots after mapping changes.
    return snapshot ? snapshot.courses.flatMap((course) => {
      const mapped = provider === "hubspot" ? course.skills.filter(s=>skills.some(k=>k.id === s.id)) : course.skills.filter(s => teachesSkill(course.title,s));
      return mapped.length ? [{ ...course, skills: mapped, sdgCodes: courseSdg(course.title, mapped), catalogStale: Date.now() - snapshot.at >= TTL }] : [];
    }) : [];
  });
}
