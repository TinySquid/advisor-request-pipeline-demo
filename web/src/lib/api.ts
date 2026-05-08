import type { PipelineProgress, PipelineResult, PipelineStepId, StepStatus } from '@repo/shared';
import { PIPELINE_STEPS, PipelineResultSchema } from '@repo/shared';

const TRACKED_STEP_IDS = new Set<string>(PIPELINE_STEPS.map((s) => s.id));

function createInitialProgress(): PipelineProgress {
  return {
    steps: PIPELINE_STEPS.map((s) => ({ ...s, status: 'pending' })),
    result: null,
    error: null,
  };
}

type ProgressCallback = (progress: PipelineProgress) => void;

function cloneProgress(progress: PipelineProgress): PipelineProgress {
  return { ...progress, steps: progress.steps.map((s) => ({ ...s })) };
}

export interface StreamResult {
  result: Promise<PipelineResult>;
  abort: () => void;
}

/**
 * Streams pipeline execution via SSE.
 * Calls `onProgress` on every step update.
 * Returns a `StreamResult` with the final PipelineResult promise and an `abort` function
 * to cancel the request and stop the server-side workflow.
 */
export function processRequestStream(note: string, onProgress: ProgressCallback): StreamResult {
  const progress = createInitialProgress();
  onProgress(cloneProgress(progress));

  const abortController = new AbortController();

  const resPromise = fetch('/api/process-request/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
    signal: abortController.signal,
  });

  const abort = () => {
    abortController.abort();
  };

  const resultPromise = (async () => {
    const res = await resPromise;

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.details ?? err.error ?? 'Request failed');
    }

    if (!res.body) throw new Error('Empty response');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    function emit() {
      onProgress(cloneProgress(progress));
    }

    function updateStep(stepId: PipelineStepId, status: StepStatus) {
      const step = progress.steps.find((s) => s.id === stepId);
      if (step) step.status = status;
    }

    function handleEvent(eventType: string, parsed: unknown) {
      switch (eventType) {
        case 'workflow-start': {
          emit();
          break;
        }

        case 'workflow-step-start': {
          const stepId = (
            (parsed as Record<string, unknown>)?.payload as Record<string, unknown> | undefined
          )?.id as PipelineStepId;
          if (TRACKED_STEP_IDS.has(stepId)) {
            updateStep(stepId, 'running');
            emit();
          }
          break;
        }

        case 'workflow-step-result': {
          const payload = (parsed as Record<string, unknown>)?.payload as
            | Record<string, unknown>
            | undefined;
          const stepId = payload?.id as PipelineStepId;
          if (TRACKED_STEP_IDS.has(stepId)) {
            const status: StepStatus = payload?.status === 'failed' ? 'failed' : 'success';
            updateStep(stepId, status);
            emit();
          }
          break;
        }

        case 'result': {
          const validated = PipelineResultSchema.safeParse(parsed);
          if (!validated.success) {
            throw new Error(
              `Invalid pipeline result: ${validated.error.issues.map((i) => i.message).join(', ')}`,
            );
          }
          progress.result = validated.data;
          emit();
          break;
        }

        case 'error': {
          const p = parsed as Record<string, unknown>;
          progress.error = (p?.message as string) ?? 'Unknown error';
          throw new Error(progress.error!);
        }
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop()!;

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventType = '';
          let data = '';

          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            else if (line.startsWith('data: ')) data = line.slice(6);
          }

          if (!data) continue;

          handleEvent(eventType, JSON.parse(data));
        }
      }

      // Process any remaining buffer after stream closes
      if (buffer.trim()) {
        let eventType = '';
        let data = '';
        for (const line of buffer.split('\n')) {
          if (line.startsWith('event: ')) eventType = line.slice(7);
          else if (line.startsWith('data: ')) data = line.slice(6);
        }
        if (data) {
          handleEvent(eventType, JSON.parse(data));
        }
      }

      if (!progress.result) {
        const failedStep = progress.steps.find((s) => s.status === 'failed');
        throw new Error(
          failedStep
            ? `Pipeline failed at step: ${failedStep.label}`
            : 'Stream ended unexpectedly without result',
        );
      }

      return progress.result;
    } finally {
      reader.releaseLock();
    }
  })();

  return { result: resultPromise, abort };
}
