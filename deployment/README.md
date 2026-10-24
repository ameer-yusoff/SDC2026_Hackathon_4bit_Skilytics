# Deployment and Infrastructure

Reference configurations and deployment helpers for Skilytics. The application workspace is [src](../src/); see the [main README](../README.md#how-to-run) for local setup. These files document intended settings, not a live export of hosting dashboards.

## File inventory

| File | Purpose |
| --- | --- |
| [vercel.json](vercel.json) | Root-layout frontend reference: builds through `src`, copies output to root `dist`, proxies `/api` to Render and provides an SPA fallback. Its commands assume the manifest and helper paths are available from the repository root. |
| [render.yaml](render.yaml) | Render blueprint reference: Node API service, Singapore region, `/api/healthz`, automatic deployment and private environment bindings. Its `npm run build:render` / `start:render` commands assume the orchestration package is at the service working directory. |
| [package.json](package.json) | Orchestration reference containing frontend build, API build/start, development and database commands. Relative `src` and `scripts` paths assume a repository-root layout; running it directly inside `deployment` will not resolve those paths. |
| [scripts/copy-dist.js](scripts/copy-dist.js) | Copies `src/artifacts/reskill-ai/dist/public` to root `dist`. The helper resolves the repository root from its own current location. |
| [pnpm-lock.yaml](pnpm-lock.yaml), [package-lock.json](package-lock.json) | Dependency lockfiles associated with the orchestration reference. The application workspace uses [src/pnpm-lock.yaml](../src/pnpm-lock.yaml). |
| [neon.ts](neon.ts) | Neon CLI configuration: managed Neon Auth disabled; newly created non-default branches have a seven-day TTL. This does not replace the application's own authentication or Drizzle schema. |
| [skills-lock.json](skills-lock.json) | Development-tool skill metadata. Not an inventory of runtime AI agents, models or application dependencies. |

## Frontend: Vercel

The workspace configuration is [src/vercel.json](../src/vercel.json). With Vercel's project root set to `src`, it declares:

- Install: `pnpm --filter @workspace/reskill-ai... install --frozen-lockfile`
- Build: `pnpm --filter @workspace/reskill-ai run build`
- Output: `artifacts/reskill-ai/dist/public`
- `/api/*` forwarding to the Render backend, followed by the SPA fallback.

There is also an artifact-level [vercel.json](../src/artifacts/reskill-ai/vercel.json). Choose the configuration that matches the hosting project's root directory; do not assume every reference file in this folder is automatically used.

## Backend: Render

From the `src` workspace, the API package commands are:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Install workspace dependencies before building. The entry point starts the API, seeds catalogue/demo references and schedules source refreshes. Provision the database schema separately using the setup instructions; startup is not a substitute for schema creation.

The blueprint's orchestration commands require the root-layout package described above. This folder currently contains that package as a reference, not at the repository root. Configure the service working directory and commands accordingly before a fresh deployment.

## Private environment settings

Use [src/.env.example](../src/.env.example) as the configuration guide. Set credentials in hosting secrets, not frontend variables or committed files:

- `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and a unique `SESSION_SECRET`.
- `GEMINI_API_KEY`, with optional `GEMINI_MODEL` / `GEMINI_CV_MODEL` overrides.
- Current routing: `AI_AGENT_ROUTING=gemini-only`, `RUNPOD_ENABLE_GENERATION=false`.
- RunPod endpoint IDs and credentials are optional while generation is paused. See [AI routing](../src/docs/ai-routing.md) before enabling hybrid routing.

The Render reference does not enumerate all Gemini/routing variables; supply those through the service environment. Use a Node runtime compatible with Vite when building the frontend: Node 20.19+ or 22.12+.

## Published addresses

- Frontend: [skilytics.vercel.app](https://skilytics.vercel.app)
- Backend: [Render API health endpoint](https://sdc2026-hackathon-4bit-skilytics.onrender.com/api/healthz)
- Database: Neon PostgreSQL, accessed by the backend through Drizzle ORM and `pg`.

Build output (`dist`), local environment files and credentials are excluded from Git. Hosting dashboard configuration and current service health must be checked separately when deploying.
