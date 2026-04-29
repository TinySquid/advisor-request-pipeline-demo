// Schemas (Zod + inferred types)
export {
  ClassifiedNoteSchema,
  ContactRecordSchema,
  EmailDraftSchema,
  TaskSchema,
  PropertySearchSchema,
  PipelineResultSchema,
  WorkflowInputSchema,
} from './schemas.js';

export type {
  ClassifiedNote,
  ContactRecord,
  EmailDraft,
  Task,
  PropertySearch,
  PipelineResult,
} from './schemas.js';

// Frontend-only types & constants
export type { PipelineStepId, StepStatus, PipelineStep, PipelineProgress } from './types.js';
export { PIPELINE_STEPS, STEP_DESCRIPTIONS } from './types.js';
