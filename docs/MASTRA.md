# Mastra Integration Specification

## Overview

Mastra is the AI orchestration layer. It provides:

- **Agents** — LLM-powered agents with structured output (Zod schemas)
- **Workflows** — Graph-based execution engine with `.then()`, `.parallel()`, `.branch()` control flow
- **MastraServer adapter** — Auto-exposes agents/workflows as HTTP endpoints via Hono

Our pipeline uses 4 agents inside a single workflow with parallel execution.

## Model Configuration

All agents use the same model:

```ts
const MODEL = 'google/gemini-2.5-flash';
```

Mastra reads `GOOGLE_GENERATIVE_AI_API_KEY` from environment automatically when it encounters the `google/` prefix.

Gemini 2.5 Flash specifics:

- Supports `response_format` for structured output → no need for `jsonPromptInjection`
- Supports tool calling (not used in this demo, but available)
- Each request uses ~4 LLM calls (1 classify + 3 parallel)

---

## Agents

### Design Principle

Each agent is a focused specialist. It receives clear input and returns structured output via Zod. No tools needed — these are pure extraction/generation agents.

All agents follow the same pattern:

```ts
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';

export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  instructions: `...`,
  model: 'google/gemini-2.5-flash',
});
```

The structured output schema is passed at **call time** (in the workflow step's `execute` function), not at agent definition time. This keeps agents reusable.

---

### 1. Intent Classifier Agent

**File:** `agents/intent-classifier.ts`

**Purpose:** Parse the raw advisor note and extract all structured information.

**Why a separate step:** The classifier output feeds into all 3 parallel agents. Running it first ensures downstream agents get clean, structured input instead of raw text.

```ts
import { Agent } from '@mastra/core/agent';

export const intentClassifierAgent = new Agent({
  id: 'intent-classifier',
  name: 'Intent Classifier',
  instructions: `You are a real estate data extraction specialist working for a luxury real estate agency.

Your job is to parse advisor notes and extract structured information.

Rules:
- Extract names, contact info, property preferences, budgets, timelines, and locations.
- If a value is not mentioned, return null for that field.
- Infer sentiment: "hot" = ready to act soon, "warm" = interested but no urgency, "cold" = just browsing.
- Identify the source of the interaction (open house, phone call, referral, walk-in, etc.).
- If a follow-up timeframe is relative ("next week", "in a few days"), preserve the relative expression.
- Preserve the full original context in rawContext — downstream agents need the complete picture.
- Be precise with numbers. "$2M" → 2000000. "2BR" → "2BR" (keep as-is).
- Make reasonable inferences but don't hallucinate. If in doubt, return null.`,
  model: 'google/gemini-2.5-flash',
});
```

**Input:** Raw note string (passed via agent.generate)
**Output:** `ClassifiedNoteSchema` (via structuredOutput)

---

### 2. CRM Writer Agent

**File:** `agents/crm-writer.ts`

**Purpose:** Generate a structured CRM contact record from the classified note.

```ts
import { Agent } from '@mastra/core/agent';

export const crmWriterAgent = new Agent({
  id: 'crm-writer',
  name: 'CRM Writer',
  instructions: `You are a CRM data specialist for a luxury real estate agency.

Your job is to create structured contact records from extracted advisor note data.

Rules:
- Generate relevant tags based on the interaction context. Tags should be lowercase, short, and useful for filtering.
  Examples: buyer, seller, 2br, condo, luxury, referral, open-house, first-time, investor
- Score the lead 1-10 based on:
  - Budget alignment (higher budget = higher score)
  - Timeline urgency (sooner = higher score)
  - Engagement level (multiple touches = higher score)
  - Sentiment (hot > warm > cold)
- Set appropriate status:
  - "new" if this is a first interaction
  - "contacted" if the advisor already spoke with them
  - "active" if there's ongoing engagement
  - "closed" if the lead is no longer viable
- Write concise but complete notes summarizing the interaction.
- If email/phone is not provided, return null. Do not invent contact details.`,
  model: 'google/gemini-2.5-flash',
});
```

**Input:** ClassifiedNote (JSON string in prompt)
**Output:** `ContactRecordSchema` (via structuredOutput)

---

### 3. Email Drafter Agent

**File:** `agents/email-drafter.ts`

**Purpose:** Draft a personalized follow-up email based on the classified note.

```ts
import { Agent } from '@mastra/core/agent';

export const emailDrafterAgent = new Agent({
  id: 'email-drafter',
  name: 'Email Drafter',
  instructions: `You are a communications specialist for a luxury real estate agency.

Your job is to draft personalized follow-up emails to leads and contacts.

Rules:
- Match the tone to the lead temperature:
  - Hot leads: enthusiastic, action-oriented, suggest next steps
  - Warm leads: friendly, informative, offer value
  - Cold leads: gentle check-in, no pressure
- Reference specific details from the interaction (where they met, what they're looking for).
- Include a clear call-to-action (schedule a viewing, send listings, phone call, etc.).
- Keep emails concise — 3-5 short paragraphs max.
- Sign off as "Best regards" (no specific agent name — the advisor will customize).
- If no email was provided, use "contact@email.com" as a placeholder in the "to" field.
- Subject line should be specific and reference the interaction context.
- Never be pushy or salesy. Professional warmth.`,
  model: 'google/gemini-2.5-flash',
});
```

**Input:** ClassifiedNote (JSON string in prompt)
**Output:** `EmailDraftSchema` (via structuredOutput)

---

### 4. Task Creator Agent

**File:** `agents/task-creator.ts`

**Purpose:** Create a follow-up task with a calculated due date and appropriate priority.

```ts
import { Agent } from '@mastra/core/agent';

export const taskCreatorAgent = new Agent({
  id: 'task-creator',
  name: 'Task Creator',
  instructions: `You are a task management specialist for a luxury real estate agency.

Your job is to create follow-up tasks from advisor notes.

Rules:
- Calculate the due date based on the followUpTimeframe relative to today's date.
  - "next week" → today + 7 days
  - "tomorrow" → today + 1 day
  - "in a few days" → today + 3 days
  - "in a couple weeks" → today + 14 days
  - If no timeframe specified, default to today + 3 days.
  - Always return ISO date format: YYYY-MM-DD
- Set priority based on sentiment and urgency:
  - "urgent" → hot lead with immediate timeline (ASAP, today, this week)
  - "high" → hot lead or warm lead with near-term follow-up
  - "medium" → warm lead with no urgency
  - "low" → cold lead or just browsing
- Category mapping:
  - "lead-follow-up" → following up with a lead
  - "showing" → scheduling or confirming a property showing
  - "closing" → closing-related activities
  - "administrative" → paperwork, CRM updates
  - "other" → anything that doesn't fit above
- Assignee is always "advisor" (the person who created the note).
- Description should be actionable: "Follow up with [Name]" or "Send listings to [Name]".`,
  model: 'google/gemini-2.5-flash',
});
```

**Input:** ClassifiedNote (JSON string in prompt)
**Output:** `TaskSchema` (via structuredOutput)

---

## Workflow (`workflows/advisor-request.ts`)

### Visual Flow

```
Input: { note: string }
  │
  ▼
┌─────────────────────────┐
│  Step 1: Classify        │  1 LLM call
│  (Intent Classifier)     │  → ClassifiedNote
└──────────┬───────────────┘
           │
     ┌─────┼─────────────────┐
     │     │                 │
     ▼     ▼                 ▼
┌────────┐ ┌──────────┐ ┌──────────┐
│ CRM    │ │ Email    │ │ Task     │  3 LLM calls in parallel
│ Writer │ │ Drafter  │ │ Creator  │  → ContactRecord
└────────┘ └──────────┘ └──────────┘  → EmailDraft
     │     │                 │        → Task
     └─────┼─────────────────┘
           │
           ▼
┌─────────────────────────┐
│  Step 3: Assemble        │  0 LLM calls (pure TypeScript)
│  (Merge outputs +        │  → PipelineResult
│   extract property)      │
└─────────────────────────┘
           │
           ▼
Output: PipelineResult
```

### Total LLM Calls: 4 per request

- 1 sequential (classify)
- 3 parallel (crm, email, task)
- 0 for assembly (pure logic)

---

`MastraServer.init()` reads the registered agents and workflows from the Mastra instance and creates Hono routes for them:

| Registration Key         | Auto-Exposed Route                                 |
| ------------------------ | -------------------------------------------------- |
| `intentClassifierAgent`  | `POST /api/agents/intentClassifierAgent/generate`  |
| `crmWriterAgent`         | `POST /api/agents/crmWriterAgent/generate`         |
| `emailDrafterAgent`      | `POST /api/agents/emailDrafterAgent/generate`      |
| `taskCreatorAgent`       | `POST /api/agents/taskCreatorAgent/generate`       |
| `advisorRequestWorkflow` | `POST /api/workflows/advisorRequestWorkflow/start` |

Our custom route (`POST /api/process-request`) calls the workflow programmatically:

```ts
const workflow = mastra.getWorkflow('advisorRequestWorkflow');
const run = await workflow.createRun();
const result = await run.start({ inputData: { note: '...' } });
```

This is better than the auto-exposed workflow endpoint because:

1. Cleaner URL (`/api/process-request` vs `/api/workflows/advisorRequestWorkflow/start`)
2. Input validation with Zod
3. Custom error formatting
4. No Mastra-specific request shape required

---

## Structured Output Notes

All agents use Mastra's `structuredOutput` option at call time:

```ts
const result = await agent.generate(prompt, {
  structuredOutput: { schema: MyZodSchema },
});
const data = result.object; // typed as z.infer<typeof MyZodSchema>
```

**Gemini 2.5 Flash compatibility:**

- Supports `response_format` natively ✅
- `jsonPromptInjection` not needed ✅
- If we add tools later, need `jsonPromptInjection: true` for Gemini 2.5 ⚠️

**Error handling:**
Default `errorStrategy` is `'strict'` (throws on validation failure). For production, consider `'warn'` to log and continue. For this demo, `'strict'` is fine — if schema validation fails, the workflow step fails and the user gets a 500.

---

## Performance Expectations

| Step                          | Est. Time | Notes                                        |
| ----------------------------- | --------- | -------------------------------------------- |
| Classify                      | 2-4s      | Single LLM call, Gemini Flash is fast        |
| Parallel (CRM + Email + Task) | 3-5s      | 3 concurrent LLM calls, bottleneck = slowest |
| Assemble                      | <100ms    | Pure TypeScript, no LLM                      |
| **Total**                     | **5-9s**  |                                              |

The parallel step is the key performance win. Sequential would be ~15s. Parallel brings it down to ~8s.

---

## Studio Integration

Mastra Studio (local dev UI) can visualize the workflow:

```bash
npx mastra dev
```

This opens Studio at `http://localhost:4111` showing:

- **Agents tab** — test each agent individually with custom prompts
- **Workflows tab** — visual graph of the workflow, run it with test input, see step-by-step results
- **Live execution** — watch each step complete in real-time

---

## Testing Agents Individually

Without the workflow, you can test each agent directly:

```bash
# Classify
curl -X POST http://localhost:3000/api/agents/intentClassifierAgent/generate \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Extract info: Met Sarah Chen at open house"}]}'

# CRM Writer
curl -X POST http://localhost:3000/api/agents/crmWriterAgent/generate \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Create CRM record: { classified JSON }"}]}'
```

Or use Studio's UI for a better experience.
