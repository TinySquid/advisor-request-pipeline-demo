# Advisor Request Pipeline Demo

Agent-powered real estate lead processing pipeline. Advisor drops a plain-text or voice note, multi-agent workflow extracts entities, generates CRM contact, follow-up email, task, and property search params.

## Stack

- Mastra (agent orchestration) + Hono (API) + React 19 + shadcn/ui (frontend)
- Zod v4 for schemas, Tailwind CSS v4 for styling
- npm workspaces with pnpm (packages: server, web, packages/shared)

## Commands

- `pnpm dev` — start both server (port 3000) and web (port 5173) concurrently
- `pnpm dev:server` / `pnpm dev:web` — individual services
- `pnpm build` — build both
- `pnpm lint` / `pnpm lint:fix` / `pnpm format` — code quality

## Workspace Layout

- `server/src/` — Hono + Mastra backend
- `web/src/` — React + shadcn frontend (Vite)
- `packages/shared/src/` — shared Zod schemas and types (`@repo/shared`)

Both server and web import from `@repo/shared`. Edit schemas there first, types propagate.

## Key Architecture

- 4 Mastra agents (intent-classifier, crm-writer, email-drafter, task-creator) inside 1 workflow
- Workflow flow: classify → parallel(crm + email + task) → assemble (pure TS, no LLM)
- Custom route: `POST /api/process-request` (thin wrapper over workflow)
- MastraServer also auto-exposes agents/workflows under `/api/agents/*` and `/api/workflows/*`
- Production: Hono serves built Vite app as static files from `web/dist/`
- Dev: Vite proxies `/api/*` to Hono at localhost:3000

## Important Details

- All agents use model defined in `server/src/mastra/model.ts`)
- Structured output schemas passed at call time, not agent definition time
- Zod v4 is used — API differs from v3 (e.g., `z.coerce.number()`, `z.enum()` syntax)
- Frontend types in `packages/shared/src/types.ts` mirror the Zod schemas
- shadcn components live in `web/src/components/ui/` — do not lint or manually edit these, use the shadcn CLI
- Dark theme forced on always (`class="dark"` on `<html>`), no toggle
- Voice input uses Web Speech API (Chrome/Edge/Safari only, graceful fallback for Firefox)
- `web/src/hooks/use-speech-recognition.ts` + `web/src/types/speech-recognition.d.ts` handle browser API

## API Contract

`POST /api/process-request`

- Request: `{ "note": "string" }`
- Response 200: `{ contact, email, task, propertySearch }` (see `PipelineResultSchema` in shared)
- Response 400: `{ "error": "..." }`
- Response 500: `{ "error": "...", "details": "..." }`
  `GET /api/health` — returns `{ "status": "ok" }`

## Coding Conventions

- TypeScript strict mode throughout
- ESLint ignores `web/src/components/ui/` (shadcn generated)
- Unused vars prefixed with `_` are allowed
- React: functional components only, hooks for state (no state library)
- No database, no auth — fully stateless

## Reference Docs

- `docs/API.md` — full API spec, error handling, static serving details
- `docs/MASTRA.md` — agent definitions, workflow implementation, Mastra patterns
- `docs/UI.md` — component tree, state management, responsive behavior
