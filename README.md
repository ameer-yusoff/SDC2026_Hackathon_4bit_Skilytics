# Skilytics

> Empowering youth, jobseekers, and organisations with AI-driven skill intelligence, live labour data, and personalised learning pathways.

---

## Team Information

| Field                  | Details                                     |
| ---------------------- | ------------------------------------------- |
| **Team Name**          | 4bit                                        |
| **Team Domain**        | Domain 1                                    |
| **SDG Track (1–17)**   | SDG 4.3, 4.4, 8.2, & 8.5 (SDG 4: Quality Education & SDG 8: Decent Work and Economic Growth) |
| **Team Leader**        | Muhammad Ameer Yusoff bin Azeri             |
| **University**         | Universiti Teknologi Malaysia               |
| **Number of Members**  | 4                                           |

## Links

| Resource                         | Link                                                              |
| -------------------------------- | ----------------------------------------------------------------- |
| GitHub Repository                | https://github.com/ameer-yusoff/SDC2026_Hackathon_4bit_Skilytics  |
| Live Demo                        | https://skilytics.vercel.app                                      |
| RunPod Endpoint (Qwen 3.5-27b)   | https://api.runpod.ai/v2/3pvoygmk4mn0ad/run                       |
| RunPod Endpoint (Qwen3.5-9b)     | https://api.runpod.ai/v2/bs50a57qmoqrpp/run                       |
| Slide Deck                       | https://drive.google.com/file/d/1844_XLOdT_Aj30J95oGCap6r_7MMLmm4/view?usp=sharing                                                               |
| Demo Video                       | https://youtu.be/VEIoKEkvKLM                                                               |
| Submission Docs (GDrive)                       | https://drive.google.com/drive/folders/1U7oinIT5e4GN9I0DyWFv8Vw134N5u3do?usp=drive_link                                                             |

---

## Overview

### Problem

Industry skill demands change in months due to the rapid growth of AI, though academic and TVET syllabuses take years to adapt, severely limiting access to market-aligned higher education due to "curriculum lag" (SDG 4.3). As a result, graduates and job seekers enter the workforce with outdated qualifications rather than the relevant technical and professional skills required by current companies (SDG 4.4). Without flexible reskilling pathways and real-time labor market data, working individuals face displacement and talent shortages in high-growth industries coexist with rising graduate unemployment, negatively impacting full and productive employment (SDG 8.5) and national economic productivity (SDG 8.2).

### Solution

Skilytics is an AI-powered career guidance and reskilling platform that helps workers stay relevant by aligning their current skills with planned upskilling and reskilling to meet real job market demands. The platform uses a step-by-step AI-powered workflow that automatically extracts skills from uploaded CVs, runs a Holland Code (RIASEC) interest test, and compares user profiles against standardized O*NET job requirements. Specialized AI agents then evaluate how exposed a user's current role is to AI knowledge, identify specific skill gaps in the local market, and generate a personalised learning plan matched to trusted courses.

### Key Features

- **Multi-Modal Skills Profile Intake (CV + RIASEC)** — Extracts text, structure, and skills from PDF or scanned image CVs using Gemini API, Tesseract.js, and PDF.js, paired with a Holland Code (RIASEC) career interest profiling quiz.
- **Skill Gap and Automation Risk Analysis** — Evaluates a user's current role against standardized O*NET job taxonomies and the Anthropic Economic Index to measure task-level AI exposure and local market skill gaps.
- **Live AI-Trend Signal Layer & Market Pulse** — Integrates live national labor force statistics from OpenDOSM and job market feeds to benchmark real-time employment demands.
- **Personalised Reskilling Roadmap** — Generates custom learning pathways matched to verified courses from Microsoft Learn, freeCodeCamp, GitHub Skills, Hugging Face Learn, OpenLearn, and HubSpot Academy.
- **Tailored Multi-Scope Interfaces (Including ELI5 Engine)** — Features an "Explain Like I'm 5" (ELI5) interface for individuals, a cohort tracking portal for educators, and a workforce planning dashboard with HRD-claimable training discovery for enterprises.

### Tech Stack

| Layer         | Technology                   |
| ------------- | ---------------------------- |
| Frontend      | TypeScript 5.9, React 19.1, Vite 7.3, Tailwind CSS 4.1, Radix UI / Shadcn UI, TanStack React Query 5, Recharts 2, Framer Motion 12, Wouter 3, Lucide React |
| Backend       | Node.js 20.19+ or 22.12+ (Vite-compatible runtime), Express 5, TypeScript 5.9, Zod 3, Orval 8, Tesseract.js 7, PDF.js 4, unpdf 1, Pino 9 / Pino-HTTP 10 |
| Database      | Neon PostgreSQL, Drizzle ORM 0.45, `node-postgres` (`pg` 8); schema in `src/lib/db` |
| AI / Compute  | Google Gemini (`gemini-3.1-flash-lite`, configurable) through a server-side REST client; RunPod Qwen3.5-27B / Qwen3.5-9B integration is temporarily paused to conserve credits |
| Hosting / Dev | Vercel (Frontend), Render (Backend API), Replit (Cloud IDE & Staging), GitHub |

---

## Project Structure

```text
.
├── .agents/                             # AI agent skills & Neon PostgreSQL references
├── deployment/                          # Cloud deployment configurations
│   ├── scripts/
│   │   └── copy-dist.js
│   ├── neon.ts
│   ├── package.json
│   ├── render.yaml                      # Render backend deployment config
│   └── vercel.json                      # Vercel frontend deployment config
├── src/                                 # Main pnpm monorepo workspace
│   ├── artifacts/
│   │   ├── api-server/                  # Express.js + TypeScript Backend API server
│   │   │   └── src/
│   │   │       ├── data/                # O*NET, RIASEC, BLS, & course datasets
│   │   │       ├── lib/                 # AI agents, LLM routing, CV parsing, & unit tests
│   │   │       └── routes/              # REST API route handlers
│   │   ├── mockup-sandbox/              # Rapid UI prototyping sandbox
│   │   └── reskill-ai/                  # React 19 + Vite Frontend SPA (PWA)
│   │       ├── public/                  # Static assets, SDG icons, demo CVs, & RunPod proofs
│   │       └── src/
│   │           ├── components/          # UI & feature components (heatmaps, portals, etc.)
│   │           ├── i18n/                # Multi-language dictionaries (EN / BM / ZH)
│   │           ├── lib/                 # Frontend utilities, state, & unit tests
│   │           └── pages/               # Application route views
│   ├── data/                            # Source access audit logs
│   ├── docs/                            # Technical & architectural documentation
│   ├── lib/
│   │   ├── api-client-react/            # Orval-generated React Query API hooks
│   │   ├── api-spec/                    # OpenAPI specification (openapi.yaml)
│   │   ├── api-zod/                     # Generated Zod validation schemas
│   │   └── db/                          # Drizzle ORM schemas & SQL migrations
│   ├── scripts/                         # Database backup & maintenance scripts
│   ├── synthetic-data/                  # Evaluation career personas & TVET datasets
│   ├── testing/demo-cv/                 # Sample PDF & JPEG resumes for testing
│   ├── .env.example                     # Workspace environment variables template
│   ├── .replit                          # Replit workspace run configuration
│   ├── package.json                     # Workspace scripts & dependencies
│   └── pnpm-workspace.yaml              # Monorepo workspace definition
├── submission/                          # Required submission documents
│   ├── 1. SDC2026_4bit_Preliminary.pdf      # Preliminary submission
│   ├── 2. SDC2026_4bit_TechDeclaration.pdf  # Technology declaration
│   ├── SDC2026_4bit_Replit_POU.pdf          # Replit proof of use
│   └── SDC2026_4bit_Runpod_POU.pdf          # RunPod proof of use
├── .env.example                         # Root environment variables template
├── .gitignore
├── LICENSE
├── requirements.txt                     # Python dependencies for model testing & validation
└── README.md
```

### Architecture

```text
User ──► Vercel (React + Vite SPA: src/artifacts/reskill-ai)
           │
           ▼
      Render (Node.js + Express API: src/artifacts/api-server)
           │
           ├──► AI Service Layer (src/artifacts/api-server/src/lib/llm.ts)
           │      ├──► RunPod Serverless GPU (Qwen 3.5-27b / Qwen3.5-9b)
           │      └──► Google Gemini API (Gemini-flash-lite 3.1)
           │
           ├──► Database Layer (Drizzle ORM + pg: src/lib/db)
           │      └──► Neon Serverless PostgreSQL (Profiles, RIASEC, Courses)
           │
           └──► External Data & Course Feeds (OpenDOSM, O*NET, Anthropic Index, etc.)
```

---

## How to Run

### Option 1 — Run on Replit (Recommended)

1. Import this repository on Replit via **Create Repl → Import from GitHub** (`https://github.com/ameer-yusoff/SDC2026_Hackathon_4bit_Skilytics`). Open `src` as the workspace directory; the Replit configuration is `src/.replit`.
2. Add `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, a unique `SESSION_SECRET`, and `GEMINI_API_KEY` to **Secrets**. Use the Gemini routing settings in `src/.env.example`. RunPod credentials are optional while its integration is paused.
3. In the `src` directory, follow the install, database setup and two-terminal commands below. The repository does not define a complete one-click Replit Run workflow.

### Option 2 — Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/ameer-yusoff/SDC2026_Hackathon_4bit_Skilytics.git
cd SDC2026_Hackathon_4bit_Skilytics

# 2. Install dependencies (Node.js 20.19+ or 22.12+, pnpm 9.15.4)
cd src
pnpm install

# 3. Configure environment variables (Windows)
copy .env.example .env
# macOS/Linux: cp .env.example .env
# Fill DATABASE_URL, DATABASE_URL_UNPOOLED, SESSION_SECRET and GEMINI_API_KEY.
# For RunPod main/light configuration, use the settings below.

# 4. On a NEW development database, create the schema; review Drizzle's prompts.
pnpm db:push

# 5. Terminal 1, from src: start the API (default http://localhost:5000)
pnpm dev:api

# 6. Terminal 2, from src: start the frontend (default http://localhost:3000)
pnpm run dev
```

`pnpm run dev` displays the frontend only. Its `/api` proxy expects the separately running API at port 5000; set `API_URL` for another API address. API startup seeds the built-in catalogue and fictional demo accounts, then starts source refreshes. Use a separate development database. Python is not required to run the web application; `requirements.txt` lists optional Python tooling, and no Python validation scripts are currently committed.

### RunPod Main and Light API Configuration

Add the following settings to `src/.env`, or the backend hosting service's private environment. Both endpoints use `RUNPOD_API_KEY`; endpoint URLs are not API keys. Never put the private key in frontend code or Git.

```dotenv
RUNPOD_API_KEY=your_private_runpod_api_key

# Main: Qwen3.5-27B
RUNPOD_LLM_ENDPOINT_ID=3pvoygmk4mn0ad
RUNPOD_LLM_MODEL=qwen/qwen3.5-27b
# Request URL: https://api.runpod.ai/v2/3pvoygmk4mn0ad/run

# Light: Qwen3.5-9B
RUNPOD_LIGHT_ENDPOINT_ID=bs50a57qmoqrpp
RUNPOD_LIGHT_MODEL=qwen/qwen3.5-9b
# Request URL: https://api.runpod.ai/v2/bs50a57qmoqrpp/run

# Current default: Gemini active, RunPod generation paused to conserve credits.
AI_AGENT_ROUTING=gemini-only
RUNPOD_ENABLE_GENERATION=false
```

To deliberately enable the RunPod routes, change `AI_AGENT_ROUTING=hybrid` and `RUNPOD_ENABLE_GENERATION=true`, then restart the API. Keep `GEMINI_API_KEY` configured: CV and Profiler still use Gemini in hybrid routing. Main handles Fitter, Planner, Analyst and Company Advisor; Light handles Holland and SDG. See [AI routing](src/docs/ai-routing.md) for details.

### Run Tests

```bash
cd src
# Pure routing and intake logic checks; no database or AI credits required
pnpm --filter @workspace/api-server exec tsx --test src/lib/agent-routing.test.ts src/lib/intake-replacement.test.ts

# Frontend logic regression checks
pnpm --filter @workspace/reskill-ai exec tsx --test src/lib/*.test.ts

# Compile-time checks
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/reskill-ai typecheck
```

The workspace has no root `test` script. The complete backend suite is `pnpm --filter @workspace/api-server test`; some tests create and delete database fixtures, so run it only with `DATABASE_URL` pointing to a dedicated test database with the schema already created. Do not use the production database for integration tests.

---

## How We Use Replit *(Required)*

- **Development & Scaffolding:** Used as our cloud IDE and staging environment (`src/.replit`) along with Replit Agent tools for full-stack project scaffolding, rapid UI mockup prototyping (`src/artifacts/mockup-sandbox`), building core features, and connecting our Neon PostgreSQL database in a shared workspace.
- **Testing & Prototyping:** Enabled fast interactive testing, sandbox debugging, and multi-agent development so our team could quickly fix mistakes and launch working web tools.
- **Secrets:** API keys and system credentials remain protected in environment secrets on the backend server, never exposed in the public repository.

📄 Proof of use: [`submission/3. SDC2026_4bit_Replit_POU.pdf`](submission/3.%20SDC2026_4bit_Replit_POU.pdf)

## How We Use RunPod *(Required)*

- **Workload:** Serverless cloud GPU compute (H100 GPUs) hosting Docker containers to run open-source decision models (`Qwen 3.5-27b`, and `Qwen3.5-9b`) with automatic scale-to-zero.
- **Setup:** Configured scale-to-zero serverless workers deployed as **RunPod Serverless Endpoints**:
  - **Qwen 3.5-27b:** `https://api.runpod.ai/v2/3pvoygmk4mn0ad/run`
  - **Qwen3.5-9b:** `https://api.runpod.ai/v2/bs50a57qmoqrpp/run`
- **Integration:** The backend REST client (`src/artifacts/api-server/src/lib/llm.ts`) supports RunPod using `RUNPOD_API_KEY`, `RUNPOD_LLM_ENDPOINT_ID` and `RUNPOD_LIGHT_ENDPOINT_ID`. RunPod generation is currently paused to conserve credits; Gemini serves the eight routed AI roles. See `src/docs/ai-routing.md` for configuration and workflow boundaries. OpenJev is not integrated in the committed application.

Example request:

```bash
curl -X POST https://api.runpod.ai/v2/3pvoygmk4mn0ad/run \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": {"prompt": "Evaluate skill gaps and generate reskilling roadmap"}}'
```

📄 Proof of use: [`submission/4. SDC2026_4bit_RunPod_POU.pdf`](submission/4.%20SDC2026_4bit_RunPod_POU.pdf) (see also screenshots in `src/artifacts/reskill-ai/public/proof/`)

---

## Challenges & Learnings

### Challenges We Faced
- This was our team's very first time participating in a hackathon. Managing our schedule was a major challenge—our mornings through evenings were packed with university lectures at UTM, followed by replacement classes at night and ongoing university assignments that had to be completed alongside building Skilytics.
- Our team had a limited number of experienced programming and technical specialists to build the complex full-stack web application together, requiring us to step outside our comfort zones and divide responsibilities strategically.
- Because this was our first time working with RunPod Serverless GPU technology, it took dedicated time and troubleshooting to learn how to deploy, configure, and call AI models (`Qwen 3.5-27b` and `Qwen3.5-9b`) within their serverless environment.

### What Our Team Learned
-  Despite our packed academic schedules, we learned how to prioritize tasks, manage our time discipline, and collaborate effectively as a team under tight deadlines.
-  We learned how to write structured, accurate prompts to guide LLMs into producing consistent career analytics, skill-gap mappings, and jargon-free ELI5 explanations.
-  We explored new ways to use GitHub to manage a multi-package repository, track changes, and organize project documentation.
-  We strengthened our design skills by learning how to design, edit, and polish project visuals and presentation assets using Canva.
-  During our mentoring sessions, we gained invaluable experience and practical advice from professional panel mentor, whose feedback directly helped us refine and improve our web application.

## Future Improvements

- [ ] **Resume Repair** — Checks whether a user's profile, achievements, and experience align with the target job.
- [ ] **Disability Care** — Matches persons with disabilities to suitable on-site or remote jobs, with optional employer-led inclusive recruitment.
- [ ] **AI Mock Interview** — Live TTS AI interacting with users for demonstration and preparation.

## Team

| Name                                         | Role            | GitHub                                           |
| -------------------------------------------- | --------------- | ------------------------------------------------ |
| Muhammad Ameer Yusoff bin Azeri              | Full Stack Dev  | [@ameer-yusoff](https://github.com/ameer-yusoff) |
| Wan Muazzam bin Wan Ridhuan                  | Records Manager | [@wanmuazzam88](https://github.com/wanmuazzam88) |
| Muhammad Alief Akmal Shah bin Mahzan         | Quality Control | [@aliefakmal](https://github.com/aliefakmal)     |
| Muhammad Haris Ikhwan bin Muhammad Hanafi    | Keynote Speaker | [@Aeris022-RE](https://github.com/Aeris022-RE)   |

---

## Submission Checklist

- [x] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [x] Slide deck link added
- [x] Demo video link added
- [x] Replit used, with proof of use in `submission/`
- [x] RunPod used, with proof of use in `submission/`
- [x] Preliminary submission completed (`SDC2026_4bit_Preliminary.pdf`)
- [x] Technology declaration completed (`SDC2026_4bit_TechDeclaration.pdf`)
- [x] Submission files renamed with your team name (replace `TeamName`)
- [x] "How to Run" steps verified
- [x] No API keys or secrets committed to the repository

## License
This project is licensed under the Apache License 2.0, MIT License, & ISC License.
