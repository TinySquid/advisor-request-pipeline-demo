import type { PipelineResult } from './schemas.js';

// ─── Pipeline Progress ────────────────────────────────────────────────

export type PipelineStepId =
  | 'intent-classifier'
  | 'crm-writer'
  | 'email-drafter'
  | 'task-creator'
  | 'assemble';

export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  status: StepStatus;
}

export interface PipelineProgress {
  steps: PipelineStep[];
  result: PipelineResult | null;
  error: string | null;
}

/** step IDs → labels → order */
export const PIPELINE_STEPS: readonly { id: PipelineStepId; label: string }[] = [
  { id: 'intent-classifier', label: 'Classify' },
  { id: 'crm-writer', label: 'CRM' },
  { id: 'email-drafter', label: 'Email' },
  { id: 'task-creator', label: 'Task' },
  { id: 'assemble', label: 'Assemble' },
] as const;

/** Human-readable descriptions for running steps */
export const STEP_DESCRIPTIONS: Record<PipelineStepId, string> = {
  'intent-classifier': 'Classifying the request intent…',
  'crm-writer': 'Generating CRM contact record…',
  'email-drafter': 'Drafting follow-up email…',
  'task-creator': 'Creating follow-up task…',
  assemble: 'Assembling pipeline result…',
};
