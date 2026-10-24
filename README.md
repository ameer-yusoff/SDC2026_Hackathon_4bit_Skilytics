# 🚀 Skilytics 

### **AI-Powered Future-Ready Workforce & Career Reskilling Platform**
*Bridging the gap between "Who I am today" and "Where I can be in the AI Era"*

> A human-centred, AI-powered career analytics and workforce reskilling platform that tracks AI advancements and labour market signals to predict emerging skills, match individuals to future-proof roles, and generate personalised reskilling pathways for working adults, career switchers, students, fresh graduates, HR/L&D managers, and TVET/university career centres.

---

## Team Information

| Field                  | Details                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Team Name**          | 4bit                                                                                                          |
| **Team Domain**        | Domain 1 — Aiversecity Future-Ready Workforce Domain                                                          |
| **SDG Track (1–17)**   | SDG 4 — Quality Education, SDG 8 — Decent Work & Economic Growth, SDG 9 — Industry, Innovation & Infrastructure |
| **Team Leader**        | Muhammad Ameer Yusoff bin Azeri                                                                               |
| **University**         | Universiti Teknologi Malaysia (UTM)                                                                           |
| **Number of Members**  | 4                                                                                                             |

## Links

| Resource                         | Link                                                                 |
| -------------------------------- | -------------------------------------------------------------------- |
| GitHub Repository                | https://github.com/ameer-yusoff/SDC2026_Hackathon_4bit_Skilytics     |
| Replit Project                   | N/A                                                                  |
| Live Demo                        | https://skilytics.vercel.app/                                        |
| RunPod Endpoint (Qwen 3.5-27b)   | https://api.runpod.ai/v2/3pvoygmk4mn0ad/run                          |
| RunPod Endpoint (Qwen3.5-9b)     | https://api.runpod.ai/v2/bs50a57qmoqrpp/run                          |
| Slide Deck                       | TBA                                                                  |
| Demo Video                       | TBA                                                                  |

---

## Overview

### Problem

Driven by the rapid advancement of AI, industry skill demands now shift within months while academic and TVET syllabuses take years to adapt. This "curriculum lag" restricts access to market-aligned education (**SDG 4.3**) and leaves graduates and job seekers entering the workforce with outdated qualifications rather than the relevant technical and professional skills required by current employers (**SDG 4.4**). The resulting disconnect affects the entire job ecosystem: working individuals face job displacement without flexible reskilling pathways, career centers lack real-time labor market data to mentor students effectively, and high-growth industries suffer from severe talent shortages alongside rising graduate unemployment and job fragility. If not addressed, these enduring skill gaps negatively impact workforce productivity and technological innovation (**SDG 8.2**) and undermine full and productive employment (**SDG 8.5**). This forces students to choose between static curricula and an AI-driven economy without a real-time bridge to live industry expectations.

### Solution

**Skilytics** is a human-in-the-loop, AI-powered career navigation and workforce intelligence ecosystem built to bridge the gap between rapid technological disruption and human potential. Rather than replacing human decision-making, Skilytics acts as an empathetic career co-pilot and institutional analytics engine. It fuses multi-modal CV parsing, psychometric vocational profiling (**Holland Code / RIASEC**), practical lifestyle constraints (budget and time commitments), and live macroeconomic data to deliver actionable, step-by-step reskilling pathways—communicated through transparent, jargon-free **ELI5 ("Explain Like I'm 5")** AI reasoning. Simultaneously, Skilytics empowers HR leaders, L&D managers, and TVET/university career centres with an enterprise-grade portal to diagnose organizational AI exposure, map skill gaps, track talent mobility, and adapt academic curricula directly to the future of work and the **UN Sustainable Development Goals—focusing primarily on SDG 4 (Targets 4.3 & 4.4) and SDG 8 (Targets 8.2 & 8.5)**.

#### **Who Skilytics Is Built For**
1. **👩‍💻 Working Adults & Career Switchers:** Individuals at risk of job displacement or seeking a career pivot with transparent, step-by-step guidance and skill-gap breakdowns.
2. **🎓 Students & Fresh Graduates:** Emerging talent looking to understand their natural work preferences and build high-demand skills before entering the job market.
3. **🏢 HR & Learning & Development (L&D) Managers:** Corporate leaders planning company-wide reskilling strategies, tracking employee skill gaps, and monitoring team AI exposure.
4. **🏫 TVET & University Career Centres:** Educators and career advisors upgrading their curriculum structures and guiding students toward sustainable, high-growth career pathways.

### Key Features

- **🧠 Explain Like I'm 5 (ELI5) AI Reasoning Engine** — Complex labour statistics, skill gaps, and psychometric intersections are translated into friendly, easy-to-understand **ELI5 explanations**—ensuring every user understands *why* a career path or learning plan is recommended for them.
- **📄 Multi-Modal Skills Profile Intake (CV + RIASEC)** — Combines automated OCR/PDF resume parsing with the scientifically validated **Holland Code (RIASEC)** psychometric test, synthesised by AI to form a holistic profile of both technical capability and personal work preferences.
- **📡 Live AI-Trend Signal Layer & Market Pulse** — Integrates real-time, citable public data sources—displaying unemployment & participation rates, labour force trends, AI usage by role, and most AI-exposed roles.
- **🎯 Explainable Future-Role Matching & Skill Mapping** — Ranks best-fit future roles with transparent match scores, visual radar skill maps, and handling of future uncertainty (modelling moderate vs. fast AI disruption scenarios).
- **🗺️ Personalised Reskilling Pathways** — Generates ordered, time-bound learning plans tailored to the user's weekly study hours and budget constraints, utilizing accessible online courses and HRD Corp-claimable programmes.
- **🌍 Meaningful UN SDG Mapping** — Tags every recommended role and skill to relevant UN Sustainable Development Goals (**SDG 4** Quality Education, **SDG 8** Decent Work & Economic Growth, **SDG 9** Industry and Innovation & Infrastructure).
- **🏆 Gamified Workspace & Certification** — Tracks learning milestones, awards skill badges/achievements, and generates a verifiable **Certificate of Accomplishment** upon course completion.

### Tech Stack

| Layer         | Technology                                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend      | TypeScript (v5.x), React (v18.x), Vite (v6.x), Tailwind CSS (v3.x), Radix UI / Shadcn UI, Recharts (v2.x), Framer Motion (v12.x), Wouter (v3.x), TanStack React Query (v5.x), Lucide React |
| Backend       | Node.js (v20.x), Express.js (v4.x), TypeScript (v5.x), Zod (v3.x), Orval (v7.x), Pino & Pino-HTTP (v9.x)                                                               |
| Database      | Neon Serverless PostgreSQL (`@neondatabase/serverless`), Drizzle ORM (v0.x), `node-postgres` (`pg` v8.x)                                                               |
| AI / Compute  | RunPod Serverless GPU Endpoints (`Qwen 3.5-27b` & `Qwen3.5-9b`), Google Generative AI SDK (`@google/genai`), Python (v3.10+), Tesseract.js (v7.x), PDF.js (`pdfjs-dist` v4.x & `unpdf` v1.x) |
| Hosting / Dev | Replit (Foundational Code & Prototyping), Vercel (Frontend Hosting), Render (Backend Hosting)                                                                          |

#### **Languages, Frameworks & Libraries**

| Name & Version | Purpose in Project | License |
| :--- | :--- | :---: |
| **TypeScript** `(v5.x)` | Primary programming language used across both frontend and backend for type-safe application development. | Apache 2.0 |
| **Node.js** `(v20.x)` | Runtime environment powering the backend API server, automated build scripts, and local developer environment. | MIT |
| **Python** `(v3.10+)` | Scripting language used for model testing, sending structured inference requests to RunPod, and data validation. | PSF License |
| **React** `(v18.x)` | Frontend library for building the interactive user interface, assessment workflows, and dashboard components. | MIT |
| **Vite** `(v6.x)` | Frontend tooling and development server providing fast bundling and hot-module replacement. | MIT |
| **Tailwind CSS** `(v3.x)` | Utility-first CSS framework used for styling responsive, modern user interface layouts. | MIT |
| **Radix UI / Shadcn UI** `(Latest)` | Unstyled, accessible component primitives used to construct dialogs, tabs, progress bars, and forms. | MIT |
| **Lucide React** `(v0.x)` | Icon library providing consistent vector icons across the platform interface. | ISC |
| **TanStack React Query** `(v5.x)` | Asynchronous state management library handling API data caching, background fetching, and server state synchronization. | MIT |
| **Express.js** `(v4.x)` | Minimalist backend web framework routing API requests for CV processing, user profiling, and market data queries. | MIT |
| **Zod** `(v3.x)` | Schema declaration and validation library enforcing structured, type-safe inputs and outputs for API routes and AI payloads. | MIT |
| **Orval** `(v7.x)` | OpenAPI code generator creating type-safe TypeScript React Query hooks and fetch clients directly from OpenAPI specs. | MIT |
| **Drizzle ORM** `(v0.x)` | TypeScript Object Relational Mapper used for database schema declaration, migrations, and type-safe database queries. | Apache 2.0 |
| **Neon Serverless SDK** `(@neondatabase/serverless)` | Serverless PostgreSQL driver connecting the backend to cloud Neon database instances via WebSockets/HTTP. | Apache 2.0 / MIT |
| **Google Generative AI SDK** `(@google/genai)` | Client SDK for interacting with the Gemini API to execute resume parsing, interest extraction, and career reasoning. | Apache 2.0 |
| **Tesseract.js** `(v7.x)` | Primary OCR engine to extract text from image/scanned CV files (scanned images like JPEG/PNG). | Apache 2.0 |
| **PDF.js** `(pdfjs-dist & unpdf)` `(v4.x / v1.x)` | Extracts text, structure, and metadata from PDF-formatted CV files. | Apache 2.0 |
| **Recharts** `(v2.x)` | Generates interactive data visualizations, radar charts (6 competency scores), and analytics charts in the dashboard. | MIT |
| **Framer Motion** `(v12.x)` | Handles micro-animations, score card transitions, and smooth UI interactivity. | MIT |
| **Wouter** `(v3.x)` | Client-side routing library used for frontend page navigation. | MIT |
| **node-postgres (`pg`)** `(v8.x)` | The actual driver that connects the Node.js backend directly to the Neon Postgres database. | MIT |
| **Pino & Pino-HTTP** `(v9.x)` | High-performance logging system for backend error monitoring and request auditing. | MIT |

---

## Project Structure

```
.
├── .agents/
│   └── skills/                              # Neon & PostgreSQL agent skill references
├── deployment/                              # Cloud deployment configurations & build scripts
│   ├── scripts/
│   │   └── copy-dist.js                     # Production build asset bundler
│   ├── README.md                            # Deployment documentation
│   ├── neon.ts                              # Neon database setup utility
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── render.yaml                          # Render backend deployment configuration
│   └── vercel.json                          # Vercel frontend hosting configuration
├── src/                                     # Primary application monorepo workspace
│   ├── .agents/
│   │   └── memory/                          # Architectural & runtime notes (CV, RunPod, onboarding)
│   ├── artifacts/
│   │   ├── api-server/                      # Node.js + Express Backend API Server
│   │   │   ├── scripts/                     # Public catalogue refresh scripts
│   │   │   └── src/
│   │   │       ├── data/                    # RIASEC, O*NET, BLS projections, skills & roles datasets
│   │   │       ├── lib/                     # Core logic: RunPod LLM routing (llm.ts), OCR/CV, scoring & unit tests
│   │   │       ├── middlewares/             # Express middlewares
│   │   │       ├── routes/                  # REST API routes (ai, auth, catalog, cohort, health, market, profiles)
│   │   │       ├── app.ts                   # Express app configuration
│   │   │       └── index.ts                 # Backend server entry point
│   │   ├── mockup-sandbox/                  # UI component preview sandbox (React + Vite)
│   │   └── reskill-ai/                      # Skilytics Frontend SPA (React 18 + Vite 6 + Tailwind CSS)
│   │       ├── public/                      # Static assets, SDG icons, and demo CVs
│   │       └── src/
│   │           ├── components/              # Guided journey, Skill Map, Holland story, Market Outlook & UI kit
│   │           ├── hooks/                   # Custom React hooks
│   │           ├── i18n/                    # Multilingual translations (EN, MS, ZH)
│   │           ├── lib/                     # Frontend utilities, learning journey & study calendar logic
│   │           └── pages/                   # Portal pages (onboarding, profile, me, catalog, market, cohort, public)
│   ├── attached_assets/                     # Design reports and visual reference assets
│   ├── docs/                                # Internal documentation (ai-routing.md, audits, verification)
│   ├── lib/
│   │   ├── api-client-react/                # Orval-generated TypeScript React Query hooks & fetch client
│   │   ├── api-spec/                        # OpenAPI 3.0 specification (openapi.yaml) & Orval config
│   │   ├── api-zod/                         # Generated Zod validation schemas & TypeScript types
│   │   └── db/                              # Drizzle ORM schema, SQL migrations & Neon Postgres driver
│   ├── scripts/                             # Database backup & guest draft cleanup utilities
│   ├── testing/
│   │   └── demo-cv/                         # Demo CV fixtures (PDF/JPEG) and sample user profiles
│   ├── .env.example                         # Workspace environment variable template
│   ├── .replit                              # Replit workspace configuration
│   ├── package.json                         # Monorepo scripts and workspace configuration
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml                  # pnpm workspace definition
│   └── replit.md
├── submission/                              # Required submission documents
│   ├── SDC2026_4bit_Preliminary.pdf         # Preliminary submission
│   ├── SDC2026_4bit_TechDeclaration.pdf     # Technology declaration
│   ├── SDC2026_4bit_Replit_POU.pdf          # Replit proof of use
│   └── SDC2026_4bit_Runpod_POU.pdf          # RunPod proof of use
├── .env.example                             # Root environment variables template
├── .gitignore
├── LICENSE                                  # Apache License 2.0
├── requirements.txt                         # Python dependencies for RunPod testing & validation
└── README.md
```

### Architecture

```
User ──► Replit / Web App (React Frontend & Express API) ──► RunPod Serverless Endpoints (Qwen 3.5-27b & Qwen3.5-9b)
                                │
                                └──► Response returned to user
```

#### **System Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE (FRONTEND)                        │
│     React 18 + Vite 6 + Tailwind CSS + Radix UI + Recharts + Wouter     │
│        (Hosted on Vercel | Captures CV, Goals & RIASEC Responses)       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ REST API / Type-Safe Orval Client
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API SERVER                             │
│              Node.js 20 + Express.js + Zod + Pino Logger                │
│     (Hosted on Render | Routing, Auth, Evaluation & Market Queries)     │
└───────────────┬───────────────────────────────────────┬─────────────────┘
                │                                       │
                ▼                                       ▼
┌───────────────────────────────────┐   ┌─────────────────────────────────┐
│        AI MODEL & OCR LAYER       │   │          DATABASE LAYER         │
│ • RunPod Serverless LLMs (Python) │   │ • Drizzle ORM + node-postgres   │
│ • Google Gemini SDK (@google/genai│   │ • Neon Serverless PostgreSQL    │
│ • Tesseract.js & PDF.js (CV Parse)│   │   (Profiles, Skills & Catalog)  │
└───────────────────────────────────┘   └─────────────────────────────────┘
```

* **User Interface (Frontend):** A React single-page application built with Vite (`src/artifacts/reskill-ai`) that captures user interactions, profile configurations, and RIASEC assessment responses.
* **Backend API:** A Node.js Express server (`src/artifacts/api-server`) that processes client REST requests, handling routing, authentication, and core evaluation logic.
* **AI Model / API:** Interacts with AI agent services (`src/artifacts/api-server/src/lib/llm.ts`) via RunPod Serverless GPU Endpoints (`Qwen 3.5-27b` & `Qwen3.5-9b`) and Google Gemini to process CVs, evaluate skill gaps, and generate AI-driven ELI5 career recommendations.
* **Database Layer:** Managed via Drizzle ORM (`src/lib/db`) connected to a Neon Serverless PostgreSQL database, storing user profiles, skill matrices, and course catalog items.
* **Cloud Hosting:** Foundational code built in **Replit** (`src/.replit`), with cloud infrastructure deployed via **Render** (`deployment/render.yaml`) for backend deployment and **Vercel** (`deployment/vercel.json`) for frontend hosting.

---

## ⚙️ Environment Requirements (`.env`)

Before running the application locally or deploying backend services, ensure you configure your environment variables. Create a `.env` file in the root directory (and/or `src/.env`) and populate it with the following configuration:

```env
# ==========================================
# Database Configuration (PostgreSQL)
# ==========================================
DATABASE_URL="your_postgres_database_url_here"
DATABASE_URL_UNPOOLED="your_unpooled_postgres_database_url_here"

# ==========================================
# Server Configuration
# ==========================================
PORT=5000
NODE_ENV=development
LOG_LEVEL=info

# ==========================================
# Authentication & Session Security
# ==========================================
SESSION_SECRET="your_session_secret_here"

# ==========================================
# AI & LLM Inference Configuration (RunPod)
# ==========================================
RUNPOD_API_KEY="your_runpod_api_key_here"
RUNPOD_LLM_ENDPOINT_ID="3pvoygmk4mn0ad"
RUNPOD_LLM_MODEL="Qwen 3.5-27b"
RUNPOD_LIGHT_ENDPOINT_ID="bs50a57qmoqrpp"
RUNPOD_LIGHT_MODEL="Qwen3.5-9b"

# ==========================================
# Google Generative AI Configuration (Gemini)
# ==========================================
GEMINI_API_KEY="your_gemini_api_key_here"
```

### Environment Variable Descriptions

The table below describes each required variable, sorted alphabetically to align with the deployment configuration:

| Variable Name | Required | Default / Example | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host/db?sslmode=require` | Pooled PostgreSQL connection string (Neon Serverless PostgreSQL) used for application-level data queries through Drizzle ORM. |
| `DATABASE_URL_UNPOOLED` | Yes | `postgresql://user:pass@host/db?sslmode=require` | Direct (unpooled) PostgreSQL connection string dedicated to running database schema migrations and direct management commands. |
| `GEMINI_API_KEY` | Yes | `AIzaSy...` | Google Gemini API key (`@google/genai`) utilized for resume parsing, document understanding, and structured skill extraction. |
| `LOG_LEVEL` | No | `info` | Logging verbosity level for the Pino logging service (options: `fatal`, `error`, `warn`, `info`, `debug`, `trace`). |
| `NODE_ENV` | No | `development` | Target execution runtime environment (`development`, `test`, or `production`). |
| `PORT` | No | `5000` | Local or containerized TCP port on which the Express application server listens for incoming HTTP traffic. |
| `RUNPOD_API_KEY` | Yes | `rpa_...` | Authentication token used to authorize requests against RunPod Serverless GPU endpoints. |
| `RUNPOD_LIGHT_ENDPOINT_ID` | Yes | `bs50a57qmoqrpp` | RunPod serverless endpoint identifier designated for fast, low-latency reasoning and lighter language model tasks (`https://api.runpod.ai/v2/bs50a57qmoqrpp/run`). |
| `RUNPOD_LIGHT_MODEL` | Yes | `Qwen3.5-9b` | Model checkpoint identifier loaded on the lightweight RunPod serverless worker. |
| `RUNPOD_LLM_ENDPOINT_ID` | Yes | `3pvoygmk4mn0ad` | Primary RunPod serverless endpoint identifier assigned for complex analytical reasoning, career path synthesis, and deep evaluations (`https://api.runpod.ai/v2/3pvoygmk4mn0ad/run`). |
| `RUNPOD_LLM_MODEL` | Yes | `Qwen 3.5-27b` | Primary large language model checkpoint identifier deployed on the main RunPod compute worker. |
| `SESSION_SECRET` | Yes | `generate-a-strong-random-key` | High-entropy cryptographic string used to sign, verify, and secure HTTP session cookies against tampering. |

---

## How to Run

### Option 1 — Run on Replit (Recommended)

1. Import the [GitHub Repository](https://github.com/ameer-yusoff/SDC2026_Hackathon_4bit_Skilytics) into Replit via **Create Repl → Import from GitHub**.
2. Open the **Secrets** tab (🔒) and add the variables listed in `.env.example`:
   - `DATABASE_URL`
   - `DATABASE_URL_UNPOOLED`
   - `SESSION_SECRET`
   - `RUNPOD_API_KEY`
   - `RUNPOD_LLM_ENDPOINT_ID` (`3pvoygmk4mn0ad`)
   - `RUNPOD_LLM_MODEL` (`Qwen 3.5-27b`)
   - `RUNPOD_LIGHT_ENDPOINT_ID` (`bs50a57qmoqrpp`)
   - `RUNPOD_LIGHT_MODEL` (`Qwen3.5-9b`)
   - `GEMINI_API_KEY`
3. Click **Run**. Replit uses `src/.replit` to install workspace dependencies and start the full-stack application.

### Option 2 — Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/ameer-yusoff/SDC2026_Hackathon_4bit_Skilytics.git
cd SDC2026_Hackathon_4bit_Skilytics

# 2. (Optional) Create a Python virtual environment for RunPod scripts
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env            # then fill in your values (see Environment Requirements above)
cp src/.env.example src/.env

# 4. Install monorepo dependencies & start the development servers
cd src
pnpm install
pnpm run dev
```

### Run Tests

```bash
cd src
pnpm test
```

---

## 🧭 How to Use Skilytics (Step-by-Step Guide)

You can access the live platform directly at **[https://skilytics.vercel.app/](https://skilytics.vercel.app/)**. 

> 💡 **Note on Saving Progress:** You can explore the intake and analytics tools immediately, but to **save your assessment results, track your workspace progress, and claim certificates**, make sure to **Sign Up / Log In** with an account!

### 👤 Portal 1: For Workers, Career Switchers, Students & Graduates

```
[1. Upload CV] ➔ [2. Goals & Budget] ➔ [3. RIASEC Test] ➔ [4. AI ELI5 Synthesis] ➔ [5. Role Match & Skill Map] ➔ [6. Custom Pathway] ➔ [7. Workspace & Certificate]
```

1. **Step 1: CV Upload & AI Interpretation**
   * Upload your CV/Resume (supports PDF or scanned image formats).
   * Our AI and OCR engine (`PDF.js` & `Tesseract.js`) automatically extracts your work history, education, and existing skills.
   * **Review & Confirm:** Inspect the extracted details and edit or confirm their accuracy before proceeding.
2. **Step 2: Set Learning Goals & Plan Constraints**
   * Define your personal career objectives (e.g., transitioning industries, upskilling in your current role, or entering the workforce).
   * Input your practical constraints, including your **allocated weekly study time** (hours/week) and your **training budget**.
3. **Step 3: Complete the Holland Code (RIASEC) Questionnaire**
   * Answer an interactive psychometric questionnaire covering the six RIASEC dimensions (*Realistic, Investigative, Artistic, Social, Enterprising, Conventional*) to uncover the work environments and skill types that naturally suit you.
4. **Step 4: AI Synthesis & Final Intake Summary (with ELI5 Explanations)**
   * View your Holland Code results alongside a **special AI synthesis feature** that merges your past experience (CV) with your personality profile (RIASEC).
   * Read the **Final Intake Summary**, powered by our **ELI5 ("Explain Like I'm 5") AI engine**, which breaks down your strengths and career readiness in plain, jargon-free language.
5. **Step 5: Explore Suggested Career Paths & Your Skill Map**
   * Receive ranked future career recommendations complete with explainable match scores, SDG tags, and AI disruption scenarios.
   * Inspect your interactive **Skill Map** (radar and competency charts) comparing your current skill levels against the target requirements of your chosen role.
6. **Step 6: Customise Your Reskilling Plan & Timeline**
   * Review curated course recommendations specifically selected to bridge your identified skill gaps.
   * Adjust your **learning timeline** and **weekly training investment** (time and cost).
   * Read transparent **AI explanations on why you should choose the suggested plan**, detailing how each module maximizes ROI for your career transition.
7. **Step 7: Track Progress in Workspace, Earn Achievements & Get Certified**
   * Save your chosen pathway to your personal **Workspace**.
   * Track your ongoing course modules, unlock **Learner Achievements / Badges**, and upon completing your courses, receive an official **Certificate of Accomplishment** to celebrate your milestone!
8. **Step 8: Explore Role Library, Course Catalogue, Market Pulse & Data Sources**
   * **Role Library:** Browse comprehensive job profiles across diverse economic sectors.
   * **Courses:** Explore the full catalogue of free, low-cost, and claimable training programmes.
   * **Market Pulse:** Analyze live macroeconomic and AI indicators, including:
     * *Unemployment & Participation Rates*
     * *Labour Force Trends*
     * *AI Usage by Role*
     * *Most AI-Exposed Roles*
   * **Data Sources:** Inspect the transparent documentation of all AI services, open datasets, and catalogues powering the platform, including clear explanations of how each data source operates.

### 🏢 Portal 2: For Employers, HR Managers & Educators (TVET / Universities)

Switch to the **Employer & Educator Portal** to manage organisational reskilling and curriculum alignment:

1. **Step 1: Company & Institution Dashboard Overview**
   * Access a dedicated macro-view built for your company, department, or academic cohort.
   * Instantly monitor **AI Exposure by Team Member**, identify **Top Organisational Skill Gaps**, view aggregated **RIASEC Interest Profiles**, and discover **Recommended Courses for Common Gaps**.
2. **Step 2: Employee / Student Roster Management & Tracking**
   * Navigate to the **Employee / Talent Tracking Section** to view individual profiles, skill readiness, and active reskilling progress.
   * **Add New Members:** Easily onboard new employees or students to the portal to evaluate their skills and assign targeted training pathways.
3. **Step 3: Curriculum & L&D Strategy Alignment**
   * Leverage the shared **Course Catalogue**, **Market Pulse** (unemployment trends, AI exposure by role, labour force shifts), and **Data Sources** to restructure corporate training programs or modernize university/TVET curricula in step with real-world industry demand.

---

## How We Use Replit *(Required)*

We used **Replit** to build the foundational code of the Skilytics website and structure our full-stack monorepo workspace:

- **Foundational Code & Prototyping:** Built the core full-stack architecture inside Replit (`src/.replit` and `src/replit.md`), organizing the workspace into modular packages: the React + Vite frontend (`src/artifacts/reskill-ai`), the Express backend API server (`src/artifacts/api-server`), the UI component sandbox (`src/artifacts/mockup-sandbox`), and shared OpenAPI/Zod/Drizzle libraries (`src/lib/`).
- **Database & API Integration:** Configured Drizzle ORM migrations and Neon Serverless PostgreSQL connectivity alongside our AI agent routing layer within the Replit development environment.
- **Secrets Management:** All API keys and credentials (`DATABASE_URL`, `RUNPOD_API_KEY`, `RUNPOD_LLM_ENDPOINT_ID`, `RUNPOD_LIGHT_ENDPOINT_ID`, `GEMINI_API_KEY`, `SESSION_SECRET`) are stored securely in environment secrets and never hardcoded in the repository.

📄 Proof of use: [`submission/SDC2026_4bit_Replit_POU.pdf`](submission/SDC2026_4bit_Replit_POU.pdf)

## How We Use RunPod *(Required)*

We deploy and consume **Qwen 3.5-27b** and **Qwen3.5-9b** hosted on **RunPod Serverless GPU Endpoints** to power our dual-tier AI reasoning architecture:

- **Primary Deep-Reasoning Workload (`Suggested: Qwen 3.5-27b`):**
  - **Endpoint:** `https://api.runpod.ai/v2/3pvoygmk4mn0ad/run` 
  - **Role in Skilytics:** Handles complex analytical reasoning, multi-modal CV + Holland Code (RIASEC) psychometric synthesis, deep skill-gap evaluations, and generating personalised reskilling pathways.
- **Lightweight Low-Latency Workload (`Suggested: Qwen3.5-9b`):**
  - **Endpoint:** `https://api.runpod.ai/v2/bs50a57qmoqrpp/run` 
  - **Role in Skilytics:** Handles fast, low-latency inference for interactive UI reasoning, quick skill/role lookups, and friendly **ELI5 ("Explain Like I'm 5")** career summaries.
- **Integration:** Our backend AI routing engine (`src/artifacts/api-server/src/lib/llm.ts` & `agent-routing.ts`) dynamically dispatches structured prompts to the RunPod Serverless endpoints using `RUNPOD_API_KEY`, `RUNPOD_LLM_ENDPOINT_ID`, and `RUNPOD_LIGHT_ENDPOINT_ID`.

Example request:

```bash
# Primary Qwen 3.5-27b RunPod Serverless Endpoint
curl -X POST https://api.runpod.ai/v2/3pvoygmk4mn0ad/run \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "Synthesize user CV skills with their RIASEC profile and generate an explainable ELI5 reskilling pathway."
    }
  }'

# Lightweight Qwen3.5-9b RunPod Serverless Endpoint
curl -X POST https://api.runpod.ai/v2/bs50a57qmoqrpp/run \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "prompt": "Explain this labour market AI exposure score in simple ELI5 terms."
    }
  }'
```

📄 Proof of use: [`submission/SDC2026_4bit_Runpod_POU.pdf`](submission/SDC2026_4bit_Runpod_POU.pdf)

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

- [ ] **Resume Repair** — An intelligent resume auditing feature that checks whether a user's profile (role descriptions, awards, and extracurricular participation) aligns with the specific job or position they are applying for, providing actionable edits to improve their match rate.
- [ ] **Disability Care** — A dedicated inclusive employment feature designed to help people with disabilities find suitable physical or remote job opportunities. Additionally, in the Enterprise Portal, employers can optionally open dedicated recruitment tracks for candidates with disabilities.
- [ ] **AI Mock Interview** — A live Text-to-Speech (TTS) interactive AI interviewer that converses with users in real time for realistic job interview demonstration, practice, and preparation.
- [ ] **Human-Based Coaching Plan** — Direct human mentorship integration offering personalised 1-on-1 career coaching sessions through WhatsApp.

## Team

| Name                                       | Role            | GitHub                                             |
| ------------------------------------------ | --------------- | -------------------------------------------------- |
| Muhammad Ameer Yusoff bin Azeri            | Full Stack Dev  | [@ameer-yusoff](https://github.com/ameer-yusoff)   |
| Wan Muazzam bin Wan Ridhuan                | Records Manager | [@wanmuazzam88](https://github.com/wanmuazzam88)   |
| Muhammad Alief Akmal Shah bin Mahzan       | Quality Control | [@aliefakmal](https://github.com/aliefakmal)       |
| Muhammad Haris Ikhwan bin Muhammad Hanafi  | Keynote Speaker | [@Aeris022-RE](https://github.com/Aeris022-RE)     |

---

## Submission Checklist

- [ ] Team name, domain (Domain 1 / Domain 2) and SDG track filled in
- [ ] Slide deck link added
- [ ] Demo video link added
- [ ] Replit used, with proof of use in `submission/`
- [ ] RunPod used, with proof of use in `submission/`
- [ ] Preliminary submission completed (`SDC2026_4bit_Preliminary.pdf`)
- [ ] Technology declaration completed (`SDC2026_4bit_TechDeclaration.pdf`)
- [ ] Submission files renamed with your team name (replace `TeamName`)
- [ ] "How to Run" steps verified
- [ ] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).

### 📜 Third-Party Licenses & Attributions

This project relies on open-source libraries under permissive licenses. We gratefully acknowledge the creators and maintainers of the following ecosystems:

* **MIT License:**
  * `React`, `Vite`, `Express`, `Tailwind CSS`, `TanStack Query`, `Radix UI`, `Zod`, `Orval`, `Node.js`, `Recharts`, `Framer Motion`, `Wouter`, `node-postgres (pg)`, `Pino & Pino-HTTP`.
* **ISC License:**
  * `Lucide React`.
* **Apache License 2.0:**
  * `TypeScript`, `Drizzle ORM`, `Tesseract.js`, `PDF.js (pdfjs-dist & unpdf)`, `Google Generative AI SDK (@google/genai)`, `Neon Serverless SDK`.
* **PSF License (Python Software Foundation):**
  * `Python`.
