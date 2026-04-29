# API Specification

## Overview

Hono HTTP server that:

1. Serves the built Vite frontend as static files (production)
2. Exposes the Mastra agent/workflow endpoints via `MastraServer` adapter
3. Provides a custom route: `POST /api/process-request`

---

### What `MastraServer.init()` does

Registers these routes automatically:

- `POST /api/agents/:agentId/generate` — call an agent directly
- `POST /api/agents/:agentId/stream` — stream an agent response
- `POST /api/workflows/:workflowId/start` — start a workflow
- `POST /api/workflows/:workflowId/stream` — stream a workflow
- Various other Mastra endpoints for Studio

These exist alongside our custom route. Studio can use them to inspect agents/workflows.

---

## Environment Variables

```env
# Required — Google AI Studio API key for Gemini 2.5 Flash
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# Optional — server port (defaults to 3000)
PORT=3000
```

Mastra reads `GOOGLE_GENERATIVE_AI_API_KEY` automatically when `model: 'google/gemini-2.5-flash'` is specified on agents.

---

## Routes

### `POST /api/process-request`

**File:** `src/routes/process.ts`

**Request:**

```json
{
  "note": "Met Sarah Chen at an open house on 5th Ave. She's looking for a 2BR under $2M..."
}
```

**Validation:**

- `note` must be a non-empty string
- Return 400 if missing or empty

**Response 200:**

```json
{
  "contact": {
    "name": "Sarah Chen",
    "email": "sarah.chen@email.com",
    "phone": null,
    "tags": ["buyer", "2BR", "under-$2M", "open-house"],
    "leadScore": 8,
    "source": "Open House - 5th Ave",
    "notes": "Met at open house. Looking for 2BR under $2M, moving in 6 months.",
    "status": "new"
  },
  "email": {
    "to": "contact@email.com",
    "subject": "Great meeting you at the 5th Ave open house!",
    "body": "Hi Sarah,\n\nIt was wonderful meeting you...",
    "tone": "warm professional",
    "cta": "Schedule a viewing at your earliest convenience"
  },
  "task": {
    "description": "Follow up with Sarah Chen",
    "dueDate": "2026-05-04",
    "priority": "high",
    "category": "lead-follow-up",
    "assignee": "advisor"
  },
  "propertySearch": {
    "type": "2BR",
    "budgetMax": 2000000,
    "budgetMin": null,
    "timeline": "6 months",
    "location": "5th Ave area"
  }
}
```

**Response 400:**

```json
{ "error": "note is required and must be a non-empty string" }
```

**Response 500:**

```json
{ "error": "Failed to process request", "details": "..." }
```

---

### `GET /api/health`

Returns server health. No auth needed.

```json
{ "status": "ok", "timestamp": "2026-04-27T12:00:00.000Z" }
```

---

### Mastra Auto-Exposed Endpoints

These are registered by `MastraServer.init()` and available for Studio or direct API use:

| Endpoint                            | Method | Purpose                  |
| ----------------------------------- | ------ | ------------------------ |
| `/api/agents/:agentId/generate`     | POST   | Call an agent directly   |
| `/api/agents/:agentId/stream`       | POST   | Stream an agent response |
| `/api/workflows/:workflowId/start`  | POST   | Start a workflow run     |
| `/api/workflows/:workflowId/stream` | POST   | Stream a workflow run    |

These are bonus — our main route uses the workflow programmatically. You can poke at individual agents through Studio if interested.

---

## CORS

Not needed. In production, frontend and API are same origin (Hono serves both). In development, Vite proxy handles it.

If you want to enable CORS for external testing (e.g., curl from a different origin):

```ts
import { cors } from 'hono/cors';
app.use('/api/*', cors());
```

---

## Error Handling Strategy

| Error Source                        | How to Handle                                                   |
| ----------------------------------- | --------------------------------------------------------------- |
| Invalid JSON body                   | Return 400 with clear message                                   |
| Validation failure (Zod)            | Return 400 with first issue message                             |
| Workflow failed                     | Return 500 with error message from Mastra                       |
| Gemini API error (rate limit, auth) | Caught by workflow step, bubbles to 500                         |
| Structured output parse failure     | Agent uses `errorStrategy: 'warn'`, continues with partial data |
| Unknown error                       | Generic 500 with error.message                                  |

Wrap the entire route handler in try/catch. Never expose stack traces to the client.

---

## Static File Serving (Production)

In production, Hono serves the built Vite app:

```
web/dist/
├── index.html          # SPA entry
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
```

Routes order matters:

1. `/api/*` routes (API)
2. `/*` static middleware (Vite assets)
3. `*` SPA fallback (index.html for any path)

The static middleware should NOT intercept `/api/*` paths. Hono processes routes in order, so `/api` routes registered first win.
