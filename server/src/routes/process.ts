import { Hono } from 'hono';
import { z } from 'zod';
import { mastra } from '../mastra/index.js';

// SSE events for frontend
const FORWARDED_EVENTS = new Set([
  'workflow-start',
  'workflow-step-start',
  'workflow-step-result',
  'workflow-finish',
]);

const IDLE_TIMEOUT_MS = 30_000;
const WORKFLOW_TIMEOUT_MS = 60_000;

export const processRoute = new Hono();

const payloadSchema = z.object({
  note: z.string().min(1, 'note is required and must be a non-empty string'),
});

processRoute.post('/process-request/stream', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { note } = parsed.data;

  const workflow = mastra.getWorkflow('advisorRequestWorkflow');
  const run = await workflow.createRun();
  const runOutput = run.stream({ inputData: { note } });

  const encoder = new TextEncoder();

  const sseStream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const getErrorMessage = (err: unknown, fallback: string): string =>
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : ((err as { message?: string })?.message ?? fallback);

      let workflowFinished = false;
      let workflowStatus: string | null = null;
      let failedStepMessage: string | null = null;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;

      const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          runOutput.fullStream.cancel();
        }, IDLE_TIMEOUT_MS);
      };

      resetIdleTimer();

      try {
        for await (const event of runOutput.fullStream) {
          resetIdleTimer();

          if (FORWARDED_EVENTS.has(event.type)) {
            send(event.type, event);
          }

          const payload = event.payload as Record<string, unknown> | undefined;

          if (event.type === 'workflow-finish' && payload) {
            workflowFinished = true;
            workflowStatus = (payload.workflowStatus as string) ?? null;
          }

          // only workflow-step-result has status field
          if (event.type === 'workflow-step-result' && payload?.status === 'failed') {
            failedStepMessage = getErrorMessage(
              payload.error,
              `Step "${payload.id ?? 'unknown'}" failed`,
            );
            break; // stop waiting — remaining parallel steps may hang
          }
        }

        if (failedStepMessage) {
          send('error', { message: failedStepMessage });
          return;
        }

        if (workflowFinished && workflowStatus !== 'success') {
          send('error', { message: `Workflow ${workflowStatus ?? 'failed'}` });
          return;
        }

        const result = await Promise.race([
          runOutput.result,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Workflow timed out')), WORKFLOW_TIMEOUT_MS),
          ),
        ]);

        if (result.status === 'success') {
          send('result', result.result);
        } else if (result.status === 'failed') {
          const error = result.error as { message?: string } | undefined;
          send('error', { message: error?.message ?? 'Workflow failed' });
        } else {
          send('error', { message: `Unexpected status: ${result.status}` });
        }
      } catch (err) {
        send('error', {
          message: err instanceof Error ? err.message : 'Stream interrupted',
        });
      } finally {
        if (idleTimer) clearTimeout(idleTimer);
        controller.close();
      }
    },
  });

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
