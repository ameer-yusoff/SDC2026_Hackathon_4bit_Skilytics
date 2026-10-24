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
| Slide Deck                       | N/A                                                               |
| Demo Video                       | N/A                                                               |

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
| Frontend      | TypeScript (v5.x), React (v18.x), Vite (v5.x), Tailwind CSS (v3.x), Radix UI / Shadcn UI, TanStack React Query (v5.x), Recharts (v2.x), Framer Motion (v12.x), Wouter (v3.x), Lucide React |
| Backend       | Node.js (v20.x), Express.js (v4.x), TypeScript (v5.x), Python (v3.10+), Zod (v3.x), Orval (v7.x), Tesseract.js (v7.x), PDF.js (v4.x/v1.x), Pino & Pino-HTTP (v9.x) |
| Database      | Neon Serverless PostgreSQL, Drizzle ORM (v0.x), Neon Serverless SDK (`@neondatabase/serverless`), `node-postgres` (`pg` v8.x) |
| AI / Compute  | RunPod Serverless GPU (H100 GPUs running Qwen 3.5-27b, Qwen3.5-9b), Google Gemini API (`Gemini-flash-lite 3.1` via `@google/genai`) |
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
│   │   └── reskill-ai/                  # React 18 + Vite Frontend SPA (PWA)
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
           ├──► Embedding & Database Layer (Drizzle ORM: src/lib/db)
           │      └──► Neon Serverless PostgreSQL (Profiles, RIASEC, Courses)
           │
           └──► External Data & Course Feeds (OpenDOSM, O*NET, Anthropic Index, etc.)
```

---

## How to Run

### Option 1 — Run on Replit (Recommended)

1. Import this repository on Replit via **Create Repl → Import from GitHub** (`https://github.com/ameer-yusoff/SDC2026_Hackathon_4bit_Skilytics`). (Replit Workspace Link: N/A)
2. Open the **Secrets** tab (🔒) and add the variables listed in `.env.example` / `src/.env.example`:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `RUNPOD_API_KEY`
   - `RUNPOD_ENDPOINT_ID`
3. Click **Run**. Replit uses `src/.replit` to start the full-stack workspace.

### Option 2 — Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/ameer-yusoff/SDC2026_Hackathon_4bit_Skilytics.git
cd SDC2026_Hackathon_4bit_Skilytics

# 2. (Optional) Create a Python virtual environment & install Python validation dependencies
python -m venv venv
venv\Scripts\activate        # MacOS/Linux: source venv/bin/activate
pip install -r requirements.txt

# 3. Install Node.js monorepo dependencies
cd src
pnpm install

# 4. Configure environment variables
copy .env.example .env            # then fill in your DATABASE_URL, GEMINI_API_KEY, RUNPOD_API_KEY, etc.

# 5. Run the application (starts API server & React frontend)
pnpm run dev
```

### Run Tests

```bash
cd src
pnpm test
```

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
- **Integration:** The backend API (`src/artifacts/api-server/src/lib/llm.ts`) and Python validation scripts send structured inference requests via REST API (`Python` and `CURL`) using `RUNPOD_API_KEY` to evaluate career paths and generate reskilling roadmaps, providing multi-vendor resilience alongside Google Gemini.

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

- **1. Time Management & Teamwork**
  - **Challenge:** Balancing university classes, assignments, and hackathon deadlines with limited technical expertise.
  - **Learning:** Improved time management, task prioritisation, and teamwork under pressure.
- **2. Technical & AI Development**
  - **Challenge:** Learning to deploy AI models using RunPod Serverless GPUs and building a complex full-stack web application.
  - **Learning:** Developed skills in AI deployment, prompt engineering, and LLM integration.
- **3. Unfamiliar Development Workflows**
  - **Challenge:** Adapting to unfamiliar development workflows and refining Skilytics within a tight deadline.
  - **Learning:** Improved GitHub collaboration, Canva design skills, and the ability to apply mentor feedback to enhance the project.

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
